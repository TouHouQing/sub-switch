import type {
  GatewayApiKey,
  GatewayDashboardStats,
  GatewayModel,
  GatewayOrder,
  GatewayPaymentChannel,
  GatewayPaymentPlan,
  GatewayUsageRecord,
  GatewayUser,
} from "@/types/gateway";

type UnknownRecord = Record<string, unknown>;

const COLLECTION_KEYS = ["data", "items", "records", "list", "models"] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick<T = unknown>(source: UnknownRecord, keys: readonly string[]): T | undefined {
  for (const key of keys) {
    if (key in source) return source[key] as T;
  }
  return undefined;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return toNumber(value);
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  return undefined;
}

function collect(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  for (const key of COLLECTION_KEYS) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function hasRecognizableFields(
  value: unknown,
  fields: readonly string[],
): value is UnknownRecord {
  return isRecord(value) && fields.some((field) => field in value);
}

function unwrap(value: unknown): unknown {
  let current = value;
  while (isRecord(current) && "data" in current) {
    const nested = current.data;
    if (nested === undefined || nested === null || nested === current) break;
    current = nested;
  }
  return current;
}

function normalizeStatsRecord(record: UnknownRecord): GatewayDashboardStats {
  return {
    balance: toNumber(
      pick(record, ["balance", "remainingBalance", "remaining_balance", "quota", "remaining_quota"]),
    ),
    todayUsage: toNumber(
      pick(record, [
        "todayUsage",
        "today_usage",
        "daily_cost",
        "dailyCost",
        "today_actual_cost",
        "actual_cost_today",
        "usageToday",
      ]),
    ),
    todayTokens: toNumber(
      pick(record, ["todayTokens", "today_tokens", "daily_tokens", "tokensToday"]),
    ),
    totalUsage: toNumber(
      pick(record, [
        "totalUsage",
        "total_usage",
        "used_total",
        "total_actual_cost",
        "actual_cost_total",
        "usageTotal",
      ]),
    ),
    todayRequests: toNumber(
      pick(record, ["todayRequests", "today_requests", "daily_requests", "requestsToday"]),
    ),
    totalRequests: toNumber(
      pick(record, ["totalRequests", "total_requests", "requestTotal", "requestsTotal"]),
    ),
  };
}

function normalizeUserRecord(record: UnknownRecord): GatewayUser | undefined {
  const id = toStringValue(pick(record, ["id", "user_id", "uuid"]));
  if (!id) return undefined;
  return {
    id,
    email: toStringValue(pick(record, ["email"])),
    username: toStringValue(pick(record, ["username", "name"])),
    displayName: toStringValue(pick(record, ["display_name", "displayName", "nickname"])),
    avatarUrl: toStringValue(pick(record, ["avatar_url", "avatarUrl"])),
    balance: toOptionalNumber(
      pick(record, ["balance", "remainingBalance", "remaining_balance", "quota", "remaining_quota"]),
    ),
  };
}

function normalizeKeyRecord(record: UnknownRecord, index: number): GatewayApiKey {
  const id = toStringValue(pick(record, ["id", "keyId", "key_id", "tokenId", "token_id"])) ?? "";
  return {
    id,
    name:
      toStringValue(pick(record, ["name", "label"])) ?? `API Key ${index + 1}`,
    secret: toStringValue(pick(record, ["secret", "key", "token", "apiKey", "api_key"])),
    prefix: toStringValue(pick(record, ["prefix", "keyPrefix", "key_prefix"])),
    status: toStringValue(pick(record, ["status", "state"])),
    createdAt: normalizeTimestamp(pick(record, ["createdAt", "created_at"])),
    lastUsedAt: normalizeTimestamp(pick(record, ["lastUsedAt", "last_used_at"])),
  };
}

function normalizeModelRecord(
  record: UnknownRecord,
  providerHint?: string,
  channelHint?: string,
): GatewayModel {
  const name =
    toStringValue(pick(record, ["name", "displayName", "display_name"])) ??
    toStringValue(pick(record, ["id", "model", "modelId", "model_id", "slug"])) ??
    "";
  const enabledValue = pick(record, ["enabled", "isEnabled", "is_enabled"]);
  const metadata = isRecord(record.meta)
    ? record.meta
    : isRecord(record.metadata)
      ? record.metadata
      : undefined;
  const recordProvider =
    toStringValue(pick(record, ["provider", "providerId", "provider_id"])) ??
    toStringValue(pick(record, ["ownedBy", "owned_by"]));
  const provider = recordProvider ?? providerHint ?? channelHint;
  const statusValue = toStringValue(pick(record, ["status", "state"]))?.toLowerCase();
  const enabled =
    typeof enabledValue === "boolean"
      ? enabledValue
      : statusValue === "disabled" ||
          statusValue === "inactive" ||
          statusValue === "off" ||
          statusValue === "false"
        ? false
        : true;

  return {
    id: toStringValue(pick(record, ["id", "model", "modelId", "model_id", "slug"])) ?? "",
    name,
    provider,
    enabled,
    priceText:
      toStringValue(pick(record, ["priceText", "price_text"])) ??
      (toOptionalNumber(pick(record, ["price", "amount", "inputPrice", "outputPrice"])) !==
      undefined
        ? String(
            pick(record, ["priceText", "price_text"]) ??
              pick(record, ["price", "amount", "inputPrice", "outputPrice"]),
          )
        : undefined),
    contextWindow: toOptionalNumber(
      pick(record, ["contextWindow", "context_window"]) ??
        pick(metadata ?? {}, ["contextWindow", "context_window", "max_context_tokens"]),
    ),
  };
}

function normalizeUsageRecord(record: UnknownRecord): GatewayUsageRecord {
  const apiKey = isRecord(record.api_key) ? record.api_key : undefined;
  const promptTokens = toNumber(
    pick(record, ["promptTokens", "prompt_tokens", "inputTokens", "input_tokens"]),
  );
  const completionTokens = toNumber(
    pick(record, [
      "completionTokens",
      "completion_tokens",
      "outputTokens",
      "output_tokens",
    ]),
  );
  const cacheReadTokens = toNumber(pick(record, ["cacheReadTokens", "cache_read_tokens"]));
  const cacheCreationTokens = toNumber(
    pick(record, ["cacheCreationTokens", "cache_creation_tokens"]),
  );
  const explicitTotalTokens = toNumber(pick(record, ["totalTokens", "total_tokens"]));
  return {
    id: toStringValue(pick(record, ["id", "requestId", "request_id"])) ?? "",
    promptTokens,
    completionTokens,
    totalTokens:
      explicitTotalTokens > 0
        ? explicitTotalTokens
        : promptTokens + completionTokens + cacheReadTokens + cacheCreationTokens,
    cost: toNumber(
      pick(record, ["cost", "actualCost", "actual_cost", "totalCost", "total_cost"]),
    ),
    createdAt: normalizeTimestamp(pick(record, ["createdAt", "created_at"])),
    model: toStringValue(pick(record, ["model"])),
    apiKeyName:
      toStringValue(pick(record, ["apiKeyName", "api_key_name", "keyName", "key_name"])) ??
      toStringValue(pick(apiKey ?? {}, ["name", "label"])),
    status: toStringValue(pick(record, ["status"])),
  };
}

function normalizePaymentPlanRecord(record: UnknownRecord): GatewayPaymentPlan {
  return {
    id: toStringValue(pick(record, ["id", "planId", "plan_id"])) ?? "",
    name:
      toStringValue(pick(record, ["name", "title"])) ??
      `Plan ${toStringValue(pick(record, ["id", "planId", "plan_id"])) ?? ""}`,
    amount: toNumber(pick(record, ["amount", "price"])),
    description: toStringValue(pick(record, ["description", "desc"])),
  };
}

function normalizePaymentChannelRecord(
  record: UnknownRecord,
  idHint?: string,
): GatewayPaymentChannel {
  const enabledValue = pick(record, ["enabled", "isEnabled", "is_enabled", "available"]);
  const statusValue = toStringValue(pick(record, ["status", "state"]))?.toLowerCase();
  const id =
    toStringValue(pick(record, ["id", "channelId", "channel_id", "type", "payment_type"])) ??
    idHint ??
    "";
  return {
    id,
    name: toStringValue(pick(record, ["name", "title"])) ?? id,
    enabled:
      typeof enabledValue === "boolean"
        ? enabledValue
        : statusValue === "disabled" ||
            statusValue === "inactive" ||
            statusValue === "off" ||
            statusValue === "false"
          ? false
          : true,
    minAmount: toOptionalNumber(pick(record, ["minAmount", "min_amount", "single_min"])),
    maxAmount: toOptionalNumber(pick(record, ["maxAmount", "max_amount", "single_max"])),
    feeRate: toOptionalNumber(pick(record, ["feeRate", "fee_rate"])),
    currency: toStringValue(pick(record, ["currency"])),
  };
}

function normalizeOrderRecord(record: UnknownRecord): GatewayOrder {
  const status = toStringValue(pick(record, ["status", "state"]));
  return {
    id: toStringValue(pick(record, ["id", "orderId", "order_id"])) ?? "",
    amount: toNumber(
      pick(record, [
        "amount",
        "price",
        "actualAmount",
        "actual_amount",
        "totalAmount",
        "total_amount",
      ]),
    ),
    orderNo: toStringValue(pick(record, ["orderNo", "order_no", "outTradeNo", "out_trade_no"])),
    status,
    createdAt: normalizeTimestamp(pick(record, ["createdAt", "created_at"])),
    paidAt: normalizeTimestamp(pick(record, ["paidAt", "paid_at"])),
    paymentUrl: toStringValue(
      pick(record, [
        "paymentUrl",
        "payment_url",
        "payUrl",
        "pay_url",
        "checkoutUrl",
        "checkout_url",
        "qrCodeUrl",
        "qr_code_url",
        "qrCode",
        "qr_code",
      ]),
    ),
  };
}

export function normalizeGatewayStats(value: unknown): GatewayDashboardStats {
  const unwrapped = unwrap(value);
  return isRecord(unwrapped) ? normalizeStatsRecord(unwrapped) : normalizeStatsRecord({});
}

export function normalizeGatewayUser(value: unknown): GatewayUser | undefined {
  const unwrapped = unwrap(value);
  return isRecord(unwrapped) ? normalizeUserRecord(unwrapped) : undefined;
}

export function normalizeGatewayKeys(value: unknown): GatewayApiKey[] {
  const unwrapped = unwrap(value);
  const list = collect(unwrapped);
  if (list.length > 0) return list.filter(isRecord).map(normalizeKeyRecord);
  if (hasRecognizableFields(unwrapped, ["id", "keyId", "key_id", "tokenId", "token_id"])) {
    return [normalizeKeyRecord(unwrapped, 0)];
  }
  return [];
}

export function normalizeGatewayModels(value: unknown): GatewayModel[] {
  const wrapper = isRecord(value) ? value : undefined;
  const unwrapped = unwrap(value);
  if (!isRecord(unwrapped) && !Array.isArray(unwrapped)) return [];

  if (Array.isArray(unwrapped)) {
    const providerHint = toStringValue(
      pick(wrapper ?? {}, ["provider", "providerId", "provider_id", "ownedBy", "owned_by"]),
    );
    const channelHint = toStringValue(pick(wrapper ?? {}, ["channel", "channelId", "channel_id"]));
    return unwrapped
      .filter(isRecord)
      .map((record) => normalizeModelRecord(record, providerHint, channelHint));
  }

  const providerHint = toStringValue(
    pick(wrapper ?? unwrapped, ["provider", "providerId", "provider_id", "ownedBy", "owned_by"]),
  );
  const channelHint = toStringValue(pick(wrapper ?? unwrapped, ["channel", "channelId", "channel_id"]));

  const list = collect(unwrapped);
  if (list.length > 0) {
    return list
      .filter(isRecord)
      .map((record) => normalizeModelRecord(record, providerHint, channelHint));
  }

  const singleId = toStringValue(pick(unwrapped, ["id", "model", "modelId", "model_id", "slug"]));
  if (singleId) return [normalizeModelRecord(unwrapped, providerHint, channelHint)];

  const singletonName = toStringValue(pick(unwrapped, ["name", "displayName", "display_name"]));
  if (!singletonName) return [];
  return [
    normalizeModelRecord(
      { ...unwrapped, id: singletonName },
      providerHint,
      channelHint,
    ),
  ];
}

export function normalizeGatewayUsageRecords(value: unknown): GatewayUsageRecord[] {
  const unwrapped = unwrap(value);
  const list = collect(unwrapped);
  if (list.length > 0) return list.filter(isRecord).map(normalizeUsageRecord);
  if (hasRecognizableFields(unwrapped, ["id", "requestId", "request_id"])) {
    return [normalizeUsageRecord(unwrapped)];
  }
  return [];
}

export function normalizeGatewayPaymentPlans(value: unknown): GatewayPaymentPlan[] {
  const unwrapped = unwrap(value);
  const list = collect(unwrapped);
  if (list.length > 0) return list.filter(isRecord).map(normalizePaymentPlanRecord);
  if (hasRecognizableFields(unwrapped, ["id", "planId", "plan_id"])) {
    return [normalizePaymentPlanRecord(unwrapped)];
  }
  return [];
}

export function normalizeGatewayPaymentChannels(value: unknown): GatewayPaymentChannel[] {
  const unwrapped = unwrap(value);
  const list = collect(unwrapped);
  if (list.length > 0) {
    return list.filter(isRecord).map((record) => normalizePaymentChannelRecord(record));
  }
  if (isRecord(unwrapped) && isRecord(unwrapped.methods)) {
    return Object.entries(unwrapped.methods)
      .filter((entry): entry is [string, UnknownRecord] => isRecord(entry[1]))
      .map(([id, record]) => normalizePaymentChannelRecord(record, id));
  }
  if (hasRecognizableFields(unwrapped, ["id", "channelId", "channel_id"])) {
    return [normalizePaymentChannelRecord(unwrapped)];
  }
  return [];
}

export function normalizeGatewayOrders(value: unknown): GatewayOrder[] {
  const unwrapped = unwrap(value);
  const list = collect(unwrapped);
  if (list.length > 0) return list.filter(isRecord).map(normalizeOrderRecord);
  if (hasRecognizableFields(unwrapped, ["id", "orderId", "order_id"])) {
    return [normalizeOrderRecord(unwrapped)];
  }
  return [];
}
