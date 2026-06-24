import {
  GATEWAY_MANAGEMENT_BASE_URL,
  GATEWAY_ORIGIN,
  GATEWAY_MODEL_BASE_URL,
} from "@/lib/gateway/constants";
import { gatewayTauriFetch } from "@/lib/gateway/tauriTransport";
import {
  clearGatewaySession,
  isGatewaySessionExpiring,
  loadGatewaySession,
  saveGatewaySession,
} from "@/lib/gateway/session";
import {
  normalizeGatewayKeyGroups,
  normalizeGatewayKeys,
  normalizeGatewayModels,
  normalizeGatewayOrders,
  normalizeGatewayPaymentChannels,
  normalizeGatewayPaymentPlans,
  normalizeGatewayStats,
  normalizeGatewayUsageRecords,
  normalizeGatewayUser,
} from "@/lib/gateway/normalizers";
import type {
  GatewayApiKey,
  GatewayCreateKeyInput,
  GatewayCreatePaymentOrderInput,
  GatewayDashboardStats,
  GatewayKeyGroup,
  GatewayModel,
  GatewayOrder,
  GatewayPaymentChannel,
  GatewayPaymentPlan,
  GatewaySession,
  GatewayUpdateKeyInput,
  GatewayUsageRecord,
  GatewayUser,
} from "@/types/gateway";

interface GatewayApiClientOptions {
  fetchImpl?: typeof fetch;
  loadSession?: () => GatewaySession | null;
  saveSession?: (session: GatewaySession) => void;
  clearSession?: () => void;
}

interface GatewayRequestOptions extends RequestInit {
  retryAuth?: boolean;
}

class GatewayHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GatewayHttpError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const unwrapData = (value: unknown): unknown =>
  isRecord(value) && "data" in value ? value.data : value;

const stringField = (
  record: Record<string, unknown>,
  keys: readonly string[],
): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return undefined;
};

const numberField = (
  record: Record<string, unknown>,
  keys: readonly string[],
): number | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const readExpiresAt = (record: Record<string, unknown>): number => {
  const absolute = numberField(record, ["expiresAt", "expires_at"]);
  if (absolute !== undefined) {
    return absolute > 10_000_000_000 ? absolute : absolute * 1000;
  }

  const absoluteText = stringField(record, ["expiresAt", "expires_at"]);
  if (absoluteText) {
    const parsed = Date.parse(absoluteText);
    if (Number.isFinite(parsed)) return parsed;
    const numeric = Number(absoluteText);
    if (Number.isFinite(numeric)) {
      return numeric > 10_000_000_000 ? numeric : numeric * 1000;
    }
  }

  const expiresIn = numberField(record, ["expiresIn", "expires_in"]) ?? 3600;
  return Date.now() + Math.max(expiresIn, 60) * 1000;
};

const normalizeSession = (
  response: unknown,
  fallbackRefreshToken?: string,
): GatewaySession => {
  const record = isRecord(unwrapData(response))
    ? (unwrapData(response) as Record<string, unknown>)
    : {};
  const accessToken = stringField(record, [
    "accessToken",
    "access_token",
    "token",
  ]);
  const refreshToken =
    stringField(record, ["refreshToken", "refresh_token"]) ??
    fallbackRefreshToken;

  if (!accessToken || !refreshToken) {
    throw new Error("Gateway auth response is missing tokens");
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: readExpiresAt(record),
    user: normalizeGatewayUser(record.user),
  };
};

const normalizePaymentType = (value: string): string => {
  const normalized = value.trim();
  const aliases: Record<string, string> = {
    alipay_direct: "alipay",
    wxpay_direct: "wxpay",
  };
  return aliases[normalized] ?? normalized;
};

const buildPaymentOrderPayload = (
  input: GatewayCreatePaymentOrderInput,
): Record<string, unknown> => {
  const paymentType = normalizePaymentType(input.paymentType);
  const origin = (input.origin ?? GATEWAY_ORIGIN).trim().replace(/\/+$/, "");
  const isMobile =
    input.forceQRCode && paymentType === "alipay"
      ? false
      : (input.isMobile ?? false);
  const payload: Record<string, unknown> = {
    amount: input.amount,
    payment_type: paymentType,
    order_type: input.orderType ?? (input.planId ? "subscription" : "balance"),
    is_mobile: isMobile,
    payment_source:
      paymentType === "wxpay" && input.isWechatBrowser
        ? "wechat_in_app_resume"
        : "hosted_redirect",
  };

  if (input.planId) payload.plan_id = input.planId;
  if (origin) payload.return_url = `${origin}/payment/result`;
  return payload;
};

const parseGatewayGroupId = (
  groupId: string | undefined,
): number | undefined => {
  const trimmed = groupId?.trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("Gateway group id must be numeric");
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("Gateway group id is outside the supported range");
  }
  return parsed;
};

const buildCreateKeyPayload = (
  input?: string | GatewayCreateKeyInput,
): Record<string, unknown> => {
  const source = typeof input === "string" ? { name: input } : (input ?? {});
  const payload: Record<string, unknown> = {
    name: source.name?.trim() || "Desktop Client",
  };
  const groupId = parseGatewayGroupId(source.groupId);
  if (groupId !== undefined) payload.group_id = groupId;
  return payload;
};

const buildUpdateKeyPayload = (
  input: GatewayUpdateKeyInput,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  const groupId = parseGatewayGroupId(input.groupId);
  if (groupId !== undefined) payload.group_id = groupId;
  if (input.status !== undefined) payload.status = input.status;
  return payload;
};

export class GatewayApiClient {
  private readonly fetchImpl: typeof fetch;
  private readonly loadSession: () => GatewaySession | null;
  private readonly saveSession: (session: GatewaySession) => void;
  private readonly clearSession: () => void;

  constructor(options: GatewayApiClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? gatewayTauriFetch;
    this.loadSession = options.loadSession ?? loadGatewaySession;
    this.saveSession = options.saveSession ?? saveGatewaySession;
    this.clearSession = options.clearSession ?? clearGatewaySession;
  }

  async login(email: string, password: string): Promise<GatewaySession> {
    const session = normalizeSession(
      await this.managementRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        retryAuth: false,
      }),
    );
    this.saveSession(session);
    return session;
  }

  async register(email: string, password: string): Promise<GatewaySession> {
    const session = normalizeSession(
      await this.managementRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        retryAuth: false,
      }),
    );
    this.saveSession(session);
    return session;
  }

  async logout(): Promise<void> {
    try {
      await this.managementRequest("/auth/logout", { method: "POST" });
    } finally {
      this.clearSession();
    }
  }

  async me(): Promise<GatewayUser | undefined> {
    return this.profile();
  }

  async profile(): Promise<GatewayUser | undefined> {
    return normalizeGatewayUser(await this.managementRequest("/user/profile"));
  }

  async keys(): Promise<GatewayApiKey[]> {
    return normalizeGatewayKeys(await this.managementRequest("/keys"));
  }

  async keyGroups(): Promise<GatewayKeyGroup[]> {
    return normalizeGatewayKeyGroups(
      await this.managementRequest("/groups/available"),
    );
  }

  async createKey(
    input?: string | GatewayCreateKeyInput,
  ): Promise<GatewayApiKey[]> {
    await this.managementRequest("/keys", {
      method: "POST",
      body: JSON.stringify(buildCreateKeyPayload(input)),
    });
    return this.keys();
  }

  async updateKey(
    id: string,
    input: GatewayUpdateKeyInput,
  ): Promise<GatewayApiKey | undefined> {
    const response = await this.managementRequest(
      `/keys/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(buildUpdateKeyPayload(input)),
      },
    );
    const [key] = normalizeGatewayKeys(response);
    return key;
  }

  async deleteKey(id: string): Promise<void> {
    await this.managementRequest(`/keys/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  async dashboardStats(): Promise<GatewayDashboardStats> {
    const stats = normalizeGatewayStats(
      await this.managementRequest("/usage/dashboard/stats"),
    );
    const profile = await this.profile();
    return {
      ...stats,
      balance: profile?.balance ?? stats.balance,
    };
  }

  async availableModels(): Promise<GatewayModel[]> {
    return normalizeGatewayModels(
      await this.managementRequest("/channels/available"),
    );
  }

  async modelsWithApiKey(apiKey: string): Promise<GatewayModel[]> {
    const response = await this.fetchImpl(`${GATEWAY_MODEL_BASE_URL}/models`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return normalizeGatewayModels(await this.readJson(response));
  }

  async usageRecords(
    searchParams?: URLSearchParams,
  ): Promise<GatewayUsageRecord[]> {
    const query = searchParams?.toString();
    return normalizeGatewayUsageRecords(
      await this.managementRequest(`/usage${query ? `?${query}` : ""}`),
    );
  }

  async orders(): Promise<GatewayOrder[]> {
    return normalizeGatewayOrders(
      await this.managementRequest("/payment/orders/my"),
    );
  }

  async paymentPlans(): Promise<GatewayPaymentPlan[]> {
    return normalizeGatewayPaymentPlans(
      await this.managementRequest("/payment/plans"),
    );
  }

  async paymentChannels(): Promise<GatewayPaymentChannel[]> {
    const checkoutChannels = normalizeGatewayPaymentChannels(
      await this.managementRequest("/payment/checkout-info"),
    );
    if (checkoutChannels.length > 0) return checkoutChannels;
    return normalizeGatewayPaymentChannels(
      await this.managementRequest("/payment/channels"),
    );
  }

  async createPaymentOrder(
    input: GatewayCreatePaymentOrderInput,
  ): Promise<GatewayOrder> {
    const response = await this.managementRequest("/payment/orders", {
      method: "POST",
      body: JSON.stringify(buildPaymentOrderPayload(input)),
    });
    const [order] = normalizeGatewayOrders({ data: [unwrapData(response)] });
    if (!order) throw new Error("Gateway order response is empty");
    return order;
  }

  private async managementRequest(
    path: string,
    options: GatewayRequestOptions = {},
  ): Promise<unknown> {
    const session = await this.ensureFreshSession(options.retryAuth !== false);
    const headers = this.buildHeaders(options.headers, session?.accessToken);
    const requestOptions = this.toRequestInit(options, headers);
    const url = `${GATEWAY_MANAGEMENT_BASE_URL}${path}`;

    const response = await this.fetchImpl(url, requestOptions);
    if (response.status !== 401 || options.retryAuth === false) {
      return this.readJson(response);
    }

    const refreshed = await this.refresh();
    const retryHeaders = this.buildHeaders(
      options.headers,
      refreshed.accessToken,
    );
    return this.readJson(
      await this.fetchImpl(url, this.toRequestInit(options, retryHeaders)),
    );
  }

  private async ensureFreshSession(
    shouldRefresh: boolean,
  ): Promise<GatewaySession | null> {
    const session = this.loadSession();
    if (!session || !shouldRefresh || !isGatewaySessionExpiring(session)) {
      return session;
    }
    return this.refresh();
  }

  private async refresh(): Promise<GatewaySession> {
    const current = this.loadSession();
    if (!current?.refreshToken) {
      this.clearSession();
      throw new Error("Gateway session expired");
    }

    const response = await this.fetchImpl(
      `${GATEWAY_MANAGEMENT_BASE_URL}/auth/refresh`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: current.refreshToken }),
      },
    );

    try {
      const session = normalizeSession(
        await this.readJson(response),
        current.refreshToken,
      );
      this.saveSession(session);
      return session;
    } catch (error) {
      if (
        error instanceof GatewayHttpError &&
        (error.status === 401 || error.status === 403)
      ) {
        this.clearSession();
      }
      throw error;
    }
  }

  private buildHeaders(
    inputHeaders: HeadersInit | undefined,
    accessToken?: string,
  ): Record<string, string> {
    const headers = this.headersToRecord(inputHeaders);
    if (!this.hasHeader(headers, "Accept")) {
      headers.Accept = "application/json";
    }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }

  private toRequestInit(
    options: GatewayRequestOptions,
    headers: Record<string, string>,
  ): RequestInit {
    const { retryAuth: _retryAuth, ...rest } = options;
    const nextHeaders = { ...headers };
    if (rest.body && !this.hasHeader(nextHeaders, "Content-Type")) {
      nextHeaders["Content-Type"] = "application/json";
    }
    return { ...rest, headers: nextHeaders };
  }

  private headersToRecord(
    inputHeaders: HeadersInit | undefined,
  ): Record<string, string> {
    if (!inputHeaders) return {};
    if (inputHeaders instanceof Headers) {
      const result: Record<string, string> = {};
      inputHeaders.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    if (Array.isArray(inputHeaders)) {
      return Object.fromEntries(inputHeaders);
    }
    return { ...inputHeaders };
  }

  private hasHeader(headers: Record<string, string>, name: string): boolean {
    const target = name.toLowerCase();
    return Object.keys(headers).some((key) => key.toLowerCase() === target);
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();
    let body: unknown = null;
    let parseError: unknown;

    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch (error) {
        parseError = error;
        body = text;
      }
    }

    if (response.ok) return body;

    const record = isRecord(body) ? body : undefined;
    const detail =
      record && stringField(record, ["message", "error", "detail"])
        ? stringField(record, ["message", "error", "detail"])
        : typeof body === "string" && body.trim()
          ? body.trim().slice(0, 200)
          : parseError instanceof Error
            ? parseError.message
            : undefined;
    throw new GatewayHttpError(
      detail
        ? `Gateway request failed with ${response.status}: ${detail}`
        : `Gateway request failed with ${response.status}`,
      response.status,
    );
  }
}

export const gatewayApiClient = new GatewayApiClient();
