# THQ Gateway Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current custom-provider switcher into a THQ AI Gateway desktop client for `sub.thqllm.com` with login/register, balance, usage, tokens, models, recharge, records, orders, and fixed local tool configuration.

**Architecture:** Add a focused gateway client layer beside the existing Tauri/provider system, then make the React app default to a gateway dashboard. The gateway layer owns THQ account/session, management API calls, key selection, dashboard data, payment/order data, and fixed provider generation; existing provider APIs remain the write path for local tool configuration.

**Tech Stack:** React 18, TypeScript, Vite, Tauri invoke APIs, TanStack Query, Vitest, Testing Library, Tailwind, lucide-react, existing shadcn-style UI primitives.

---

## Confirmed Boundaries

- Management API base: `https://sub.thqllm.com/api/v1`
- Model request base URL for local tools and model probes: `https://sub.thqllm.com/v1`
- No automatic API key creation after login.
- Default selected API key is the first key returned from `/keys`.
- If no key exists, show an empty state with a user-triggered create-key action.
- Fixed tool provider generation must never write `https://sub.thqllm.com/api/v1` as a model base URL.
- Existing provider CRUD and arbitrary custom `base_url` controls are removed from the primary flow and kept only as an advanced path if retained.

## File Structure Map

- Create `src/lib/gateway/constants.ts`: THQ URLs, storage keys, provider id, default display name, default model fallbacks.
- Create `src/types/gateway.ts`: stable frontend gateway types for session, user, keys, metrics, models, usage records, plans, channels, and orders.
- Create `src/lib/gateway/normalizers.ts`: maps gateway responses with small field variations into stable frontend types.
- Create `src/lib/gateway/session.ts`: local session persistence and expiry helpers.
- Create `src/lib/gateway/api.ts`: fetch-based management/model API client with bearer auth, refresh, and retry-once semantics.
- Create `src/lib/gateway/keySelection.ts`: default-first key selection and selected-key storage helpers.
- Create `src/lib/gateway/toolConfig.ts`: fixed THQ provider builders for each supported local tool.
- Create `src/lib/gateway/applyToolConfig.ts`: upsert/switch fixed providers through existing `providersApi`.
- Create `src/lib/query/gateway.ts`: TanStack Query keys, queries, and mutations for gateway data.
- Modify `src/lib/query/index.ts`: export gateway query module.
- Modify `src/lib/api/index.ts`: export gateway client helpers only if a direct public import is needed by components.
- Create `src/components/gateway/GatewayApp.tsx`: logged-out/logged-in shell.
- Create `src/components/gateway/GatewayAuthPage.tsx`: login/register form.
- Create `src/components/gateway/GatewayDashboard.tsx`: dashboard page matching the approved screenshot structure.
- Create `src/components/gateway/GatewayMetricCard.tsx`: compact metric card.
- Create `src/components/gateway/GatewayPowerStatus.tsx`: central connection/status button.
- Create `src/components/gateway/GatewayToolSwitcher.tsx`: local tool selector and fixed config action.
- Create `src/components/gateway/GatewayKeyPanel.tsx`: selected key, empty key state, create/delete/select actions.
- Create `src/components/gateway/GatewayModelsPanel.tsx`: searchable available model list.
- Create `src/components/gateway/GatewayUsageRecords.tsx`: usage records table.
- Create `src/components/gateway/GatewayOrdersPanel.tsx`: order list and order status actions.
- Create `src/components/gateway/GatewayRechargePanel.tsx`: plans/channels and payment handoff.
- Modify `src/App.tsx`: default to gateway dashboard and move legacy provider list behind advanced navigation.
- Modify `src/i18n/locales/zh.json`, `src/i18n/locales/en.json`, `src/i18n/locales/zh-TW.json`, `src/i18n/locales/ja.json`: add gateway strings.
- Test `tests/lib/gatewayNormalizers.test.ts`: normalizer coverage.
- Test `tests/lib/gatewaySession.test.ts`: session persistence and expiry checks.
- Test `tests/lib/gatewayApi.test.ts`: auth headers, refresh, route boundaries.
- Test `tests/lib/gatewayKeySelection.test.ts`: default-first/no-key/stale-selection behavior.
- Test `tests/lib/gatewayToolConfig.test.ts`: fixed base URL and per-app config generation.
- Test `tests/components/GatewayAuthPage.test.tsx`: auth mode switching and submit payload.
- Test `tests/components/GatewayDashboard.test.tsx`: metrics, no-key state, and fixed base display.

---

### Task 1: Gateway Constants, Types, And Normalizers

**Files:**
- Create: `src/lib/gateway/constants.ts`
- Create: `src/types/gateway.ts`
- Create: `src/lib/gateway/normalizers.ts`
- Test: `tests/lib/gatewayNormalizers.test.ts`

- [ ] **Step 1: Write the failing normalizer tests**

Create `tests/lib/gatewayNormalizers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  normalizeGatewayKeys,
  normalizeGatewayModels,
  normalizeGatewayStats,
} from "@/lib/gateway/normalizers";
import {
  GATEWAY_MANAGEMENT_BASE_URL,
  GATEWAY_MODEL_BASE_URL,
} from "@/lib/gateway/constants";

describe("gateway normalizers", () => {
  it("keeps management and model API bases separate", () => {
    expect(GATEWAY_MANAGEMENT_BASE_URL).toBe("https://sub.thqllm.com/api/v1");
    expect(GATEWAY_MODEL_BASE_URL).toBe("https://sub.thqllm.com/v1");
    expect(GATEWAY_MODEL_BASE_URL).not.toContain("/api/v1");
  });

  it("normalizes dashboard stats from common response shapes", () => {
    const stats = normalizeGatewayStats({
      data: {
        balance: 975325,
        today_usage: 1405,
        today_tokens: 4680870,
        total_usage: 669700,
        today_requests: 1628,
        total_requests: 66000,
      },
    });

    expect(stats).toEqual({
      balance: 975325,
      todayUsage: 1405,
      todayTokens: 4680870,
      totalUsage: 669700,
      todayRequests: 1628,
      totalRequests: 66000,
    });
  });

  it("normalizes api keys and preserves first-key ordering", () => {
    const keys = normalizeGatewayKeys({
      data: [
        { id: "key_1", name: "Main", key: "sk-main", created_at: "2026-06-12" },
        { id: "key_2", name: "Spare", token: "sk-spare" },
      ],
    });

    expect(keys.map((key) => key.id)).toEqual(["key_1", "key_2"]);
    expect(keys[0]?.secret).toBe("sk-main");
    expect(keys[1]?.secret).toBe("sk-spare");
  });

  it("normalizes channel metadata and OpenAI model list payloads", () => {
    expect(
      normalizeGatewayModels({
        data: [{ id: "gpt-5.5", name: "GPT-5.5", provider: "openai" }],
      }),
    ).toEqual([
      { id: "gpt-5.5", name: "GPT-5.5", provider: "openai", enabled: true },
    ]);

    expect(
      normalizeGatewayModels({
        object: "list",
        data: [{ id: "claude-sonnet-4-20250514", object: "model" }],
      }),
    ).toEqual([
      {
        id: "claude-sonnet-4-20250514",
        name: "claude-sonnet-4-20250514",
        provider: undefined,
        enabled: true,
      },
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm vitest run tests/lib/gatewayNormalizers.test.ts`

Expected: FAIL because `@/lib/gateway/normalizers` and `@/lib/gateway/constants` do not exist.

- [ ] **Step 3: Add constants and types**

Create `src/lib/gateway/constants.ts`:

```ts
export const GATEWAY_ORIGIN = "https://sub.thqllm.com";
export const GATEWAY_MANAGEMENT_BASE_URL = `${GATEWAY_ORIGIN}/api/v1`;
export const GATEWAY_MODEL_BASE_URL = `${GATEWAY_ORIGIN}/v1`;
export const GATEWAY_SESSION_STORAGE_KEY = "thq-gateway-session-v1";
export const GATEWAY_SELECTED_KEY_STORAGE_KEY = "thq-gateway-selected-key-id";
export const GATEWAY_PROVIDER_ID = "thq-gateway";
export const GATEWAY_PROVIDER_NAME = "THQ Gateway";
export const GATEWAY_DEFAULT_MODEL = "gpt-5.5";
export const GATEWAY_DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
export const GATEWAY_DEFAULT_GEMINI_MODEL = "gemini-2.5-pro";
```

Create `src/types/gateway.ts`:

```ts
export interface GatewayUser {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface GatewaySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user?: GatewayUser;
}

export interface GatewayApiKey {
  id: string;
  name: string;
  secret?: string;
  prefix?: string;
  status?: string;
  createdAt?: string;
  lastUsedAt?: string;
}

export interface GatewayDashboardStats {
  balance: number;
  todayUsage: number;
  todayTokens: number;
  totalUsage: number;
  todayRequests: number;
  totalRequests: number;
}

export interface GatewayModel {
  id: string;
  name: string;
  provider?: string;
  enabled: boolean;
  priceText?: string;
  contextWindow?: number;
}

export interface GatewayUsageRecord {
  id: string;
  createdAt?: string;
  model?: string;
  apiKeyName?: string;
  status?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export interface GatewayPaymentPlan {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

export interface GatewayPaymentChannel {
  id: string;
  name: string;
  enabled: boolean;
}

export interface GatewayOrder {
  id: string;
  orderNo?: string;
  status?: string;
  amount: number;
  createdAt?: string;
  paidAt?: string;
  paymentUrl?: string;
}

export interface GatewayKeySelection {
  status: "ready" | "empty";
  selectedKey: GatewayApiKey | null;
}
```

- [ ] **Step 4: Add normalizers**

Create `src/lib/gateway/normalizers.ts`:

```ts
import type {
  GatewayApiKey,
  GatewayDashboardStats,
  GatewayModel,
  GatewayOrder,
  GatewayPaymentChannel,
  GatewayPaymentPlan,
  GatewayUsageRecord,
} from "@/types/gateway";

const unwrapData = (value: unknown): unknown => {
  if (value && typeof value === "object" && "data" in value) {
    return (value as { data: unknown }).data;
  }
  return value;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] => {
  const data = unwrapData(value);
  if (Array.isArray(data)) return data;
  const record = asRecord(data);
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.list)) return record.list;
  return [];
};

const stringField = (
  record: Record<string, unknown>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return undefined;
};

const numberField = (
  record: Record<string, unknown>,
  keys: string[],
): number => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
};

export const normalizeGatewayStats = (
  response: unknown,
): GatewayDashboardStats => {
  const record = asRecord(unwrapData(response));
  return {
    balance: numberField(record, ["balance", "quota", "remaining_balance"]),
    todayUsage: numberField(record, ["today_usage", "todayUsage", "daily_cost"]),
    todayTokens: numberField(record, ["today_tokens", "todayTokens", "daily_tokens"]),
    totalUsage: numberField(record, ["total_usage", "totalUsage", "used_total"]),
    todayRequests: numberField(record, ["today_requests", "todayRequests", "daily_requests"]),
    totalRequests: numberField(record, ["total_requests", "totalRequests", "request_count"]),
  };
};

export const normalizeGatewayKeys = (response: unknown): GatewayApiKey[] =>
  asArray(response).map((item, index) => {
    const record = asRecord(item);
    const id = stringField(record, ["id", "key_id", "uuid"]) ?? `key-${index + 1}`;
    return {
      id,
      name: stringField(record, ["name", "label", "remark"]) ?? `API Key ${index + 1}`,
      secret: stringField(record, ["key", "token", "secret", "api_key"]),
      prefix: stringField(record, ["prefix", "key_prefix"]),
      status: stringField(record, ["status", "state"]),
      createdAt: stringField(record, ["created_at", "createdAt"]),
      lastUsedAt: stringField(record, ["last_used_at", "lastUsedAt"]),
    };
  });

export const normalizeGatewayModels = (response: unknown): GatewayModel[] =>
  asArray(response).map((item) => {
    const record = asRecord(item);
    const id = stringField(record, ["id", "model", "name"]) ?? "unknown-model";
    const disabled = record.enabled === false || record.status === "disabled";
    return {
      id,
      name: stringField(record, ["display_name", "displayName", "name", "id"]) ?? id,
      provider: stringField(record, ["provider", "platform", "channel"]),
      enabled: !disabled,
      priceText: stringField(record, ["price", "price_text", "pricing"]),
      contextWindow: numberField(record, ["context_window", "contextWindow", "context"]),
    };
  });

export const normalizeGatewayUsageRecords = (
  response: unknown,
): GatewayUsageRecord[] =>
  asArray(response).map((item, index) => {
    const record = asRecord(item);
    const promptTokens = numberField(record, ["prompt_tokens", "promptTokens", "input_tokens"]);
    const completionTokens = numberField(record, [
      "completion_tokens",
      "completionTokens",
      "output_tokens",
    ]);
    return {
      id: stringField(record, ["id", "request_id"]) ?? `usage-${index + 1}`,
      createdAt: stringField(record, ["created_at", "createdAt", "time"]),
      model: stringField(record, ["model", "model_name"]),
      apiKeyName: stringField(record, ["api_key_name", "key_name"]),
      status: stringField(record, ["status", "state"]),
      promptTokens,
      completionTokens,
      totalTokens:
        numberField(record, ["total_tokens", "totalTokens"]) ||
        promptTokens + completionTokens,
      cost: numberField(record, ["cost", "amount", "usage"]),
    };
  });

export const normalizeGatewayPaymentPlans = (
  response: unknown,
): GatewayPaymentPlan[] =>
  asArray(response).map((item, index) => {
    const record = asRecord(item);
    return {
      id: stringField(record, ["id", "plan_id"]) ?? `plan-${index + 1}`,
      name: stringField(record, ["name", "title"]) ?? `Plan ${index + 1}`,
      amount: numberField(record, ["amount", "price", "value"]),
      description: stringField(record, ["description", "desc"]),
    };
  });

export const normalizeGatewayPaymentChannels = (
  response: unknown,
): GatewayPaymentChannel[] =>
  asArray(response).map((item, index) => {
    const record = asRecord(item);
    return {
      id: stringField(record, ["id", "channel_id", "type"]) ?? `channel-${index + 1}`,
      name: stringField(record, ["name", "label", "type"]) ?? `Channel ${index + 1}`,
      enabled: record.enabled !== false && record.status !== "disabled",
    };
  });

export const normalizeGatewayOrders = (response: unknown): GatewayOrder[] =>
  asArray(response).map((item, index) => {
    const record = asRecord(item);
    return {
      id: stringField(record, ["id", "order_id"]) ?? `order-${index + 1}`,
      orderNo: stringField(record, ["order_no", "orderNo", "trade_no"]),
      status: stringField(record, ["status", "state"]),
      amount: numberField(record, ["amount", "price", "value"]),
      createdAt: stringField(record, ["created_at", "createdAt"]),
      paidAt: stringField(record, ["paid_at", "paidAt"]),
      paymentUrl: stringField(record, ["payment_url", "paymentUrl", "pay_url", "url"]),
    };
  });
```

- [ ] **Step 5: Run the focused test**

Run: `pnpm vitest run tests/lib/gatewayNormalizers.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gateway/constants.ts src/types/gateway.ts src/lib/gateway/normalizers.ts tests/lib/gatewayNormalizers.test.ts
git commit -m "feat: add THQ gateway data primitives"
```

---

### Task 2: Session Storage And Gateway API Client

**Files:**
- Create: `src/lib/gateway/session.ts`
- Create: `src/lib/gateway/api.ts`
- Test: `tests/lib/gatewaySession.test.ts`
- Test: `tests/lib/gatewayApi.test.ts`

- [ ] **Step 1: Write failing session tests**

Create `tests/lib/gatewaySession.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearGatewaySession,
  isGatewaySessionExpiring,
  loadGatewaySession,
  saveGatewaySession,
} from "@/lib/gateway/session";

describe("gateway session storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves, loads, and clears the session", () => {
    saveGatewaySession({
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: Date.now() + 60_000,
      user: { id: "u1", email: "a@example.com" },
    });

    expect(loadGatewaySession()?.accessToken).toBe("access");
    clearGatewaySession();
    expect(loadGatewaySession()).toBeNull();
  });

  it("treats sessions expiring within five minutes as expiring", () => {
    expect(
      isGatewaySessionExpiring({
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: Date.now() + 120_000,
      }),
    ).toBe(true);

    expect(
      isGatewaySessionExpiring({
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: Date.now() + 900_000,
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Write failing API client tests**

Create `tests/lib/gatewayApi.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayApiClient } from "@/lib/gateway/api";
import type { GatewaySession } from "@/types/gateway";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("GatewayApiClient", () => {
  let session: GatewaySession | null;
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: GatewayApiClient;

  beforeEach(() => {
    session = {
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresAt: Date.now() + 900_000,
    };
    fetchMock = vi.fn();
    client = new GatewayApiClient({
      fetchImpl: fetchMock,
      loadSession: () => session,
      saveSession: (next) => {
        session = next;
      },
      clearSession: () => {
        session = null;
      },
    });
  });

  it("sends bearer token to management endpoints", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await client.keys();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sub.thqllm.com/api/v1/keys",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-1",
        }),
      }),
    );
  });

  it("uses the model base URL for model list fallback", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await client.modelsWithApiKey("sk-test");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sub.thqllm.com/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test",
        }),
      }),
    );
  });

  it("refreshes once after a management 401 and retries original request", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "access-2",
          refresh_token: "refresh-2",
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: [] }));

    await client.keys();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://sub.thqllm.com/api/v1/auth/refresh",
      expect.any(Object),
    );
    expect(session?.accessToken).toBe("access-2");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 3: Run focused tests and verify they fail**

Run: `pnpm vitest run tests/lib/gatewaySession.test.ts tests/lib/gatewayApi.test.ts`

Expected: FAIL because session and API modules do not exist.

- [ ] **Step 4: Add session helpers**

Create `src/lib/gateway/session.ts`:

```ts
import { GATEWAY_SESSION_STORAGE_KEY } from "@/lib/gateway/constants";
import type { GatewaySession } from "@/types/gateway";

export const loadGatewaySession = (): GatewaySession | null => {
  try {
    const raw = localStorage.getItem(GATEWAY_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GatewaySession>;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) {
      return null;
    }
    return parsed as GatewaySession;
  } catch {
    return null;
  }
};

export const saveGatewaySession = (session: GatewaySession): void => {
  localStorage.setItem(GATEWAY_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearGatewaySession = (): void => {
  localStorage.removeItem(GATEWAY_SESSION_STORAGE_KEY);
};

export const isGatewaySessionExpiring = (
  session: GatewaySession,
  now = Date.now(),
): boolean => session.expiresAt - now <= 5 * 60 * 1000;
```

- [ ] **Step 5: Add gateway API client**

Create `src/lib/gateway/api.ts`:

```ts
import {
  GATEWAY_MANAGEMENT_BASE_URL,
  GATEWAY_MODEL_BASE_URL,
} from "@/lib/gateway/constants";
import {
  clearGatewaySession,
  isGatewaySessionExpiring,
  loadGatewaySession,
  saveGatewaySession,
} from "@/lib/gateway/session";
import {
  normalizeGatewayKeys,
  normalizeGatewayModels,
  normalizeGatewayOrders,
  normalizeGatewayPaymentChannels,
  normalizeGatewayPaymentPlans,
  normalizeGatewayStats,
  normalizeGatewayUsageRecords,
} from "@/lib/gateway/normalizers";
import type {
  GatewayApiKey,
  GatewayDashboardStats,
  GatewayModel,
  GatewayOrder,
  GatewayPaymentChannel,
  GatewayPaymentPlan,
  GatewaySession,
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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const unwrapData = (value: unknown): unknown =>
  value && typeof value === "object" && "data" in value
    ? (value as { data: unknown }).data
    : value;

const readToken = (
  record: Record<string, unknown>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
};

const readExpiresAt = (record: Record<string, unknown>): number => {
  const direct = record.expires_at ?? record.expiresAt;
  if (typeof direct === "number" && direct > 10_000_000_000) return direct;
  if (typeof direct === "string") {
    const parsed = Date.parse(direct);
    if (Number.isFinite(parsed)) return parsed;
  }

  const expiresIn = record.expires_in ?? record.expiresIn;
  const seconds =
    typeof expiresIn === "number"
      ? expiresIn
      : typeof expiresIn === "string"
        ? Number(expiresIn)
        : 3600;
  return Date.now() + Math.max(Number.isFinite(seconds) ? seconds : 3600, 60) * 1000;
};

const normalizeUser = (value: unknown): GatewayUser | undefined => {
  const record = asRecord(value);
  const id = readToken(record, ["id", "user_id", "uuid"]);
  if (!id) return undefined;
  return {
    id,
    email: readToken(record, ["email"]),
    username: readToken(record, ["username", "name"]),
    displayName: readToken(record, ["display_name", "displayName", "nickname"]),
    avatarUrl: readToken(record, ["avatar_url", "avatarUrl"]),
  };
};

const normalizeSession = (
  response: unknown,
  fallbackRefreshToken?: string,
): GatewaySession => {
  const data = asRecord(unwrapData(response));
  const accessToken = readToken(data, ["access_token", "accessToken", "token"]);
  const refreshToken =
    readToken(data, ["refresh_token", "refreshToken"]) ?? fallbackRefreshToken;
  if (!accessToken || !refreshToken) {
    throw new Error("Gateway auth response is missing tokens");
  }
  return {
    accessToken,
    refreshToken,
    expiresAt: readExpiresAt(data),
    user: normalizeUser(data.user),
  };
};

export class GatewayApiClient {
  private fetchImpl: typeof fetch;
  private loadSession: () => GatewaySession | null;
  private saveSession: (session: GatewaySession) => void;
  private clearSession: () => void;

  constructor(options: GatewayApiClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.loadSession = options.loadSession ?? loadGatewaySession;
    this.saveSession = options.saveSession ?? saveGatewaySession;
    this.clearSession = options.clearSession ?? clearGatewaySession;
  }

  async login(email: string, password: string): Promise<GatewaySession> {
    const response = await this.managementRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      retryAuth: false,
    });
    const session = normalizeSession(response);
    this.saveSession(session);
    return session;
  }

  async register(email: string, password: string): Promise<GatewaySession> {
    const response = await this.managementRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      retryAuth: false,
    });
    const session = normalizeSession(response);
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
    return normalizeUser(unwrapData(await this.managementRequest("/auth/me")));
  }

  async profile(): Promise<unknown> {
    return this.managementRequest("/user/profile");
  }

  async keys(): Promise<GatewayApiKey[]> {
    return normalizeGatewayKeys(await this.managementRequest("/keys"));
  }

  async createKey(name = "Desktop Client"): Promise<GatewayApiKey[]> {
    await this.managementRequest("/keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return this.keys();
  }

  async deleteKey(id: string): Promise<void> {
    await this.managementRequest(`/keys/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  async dashboardStats(): Promise<GatewayDashboardStats> {
    return normalizeGatewayStats(
      await this.managementRequest("/usage/dashboard/stats"),
    );
  }

  async availableModels(): Promise<GatewayModel[]> {
    return normalizeGatewayModels(
      await this.managementRequest("/channels/available"),
    );
  }

  async modelsWithApiKey(apiKey: string): Promise<GatewayModel[]> {
    const response = await this.fetchImpl(`${GATEWAY_MODEL_BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    return normalizeGatewayModels(await this.readJson(response));
  }

  async usageRecords(searchParams?: URLSearchParams): Promise<GatewayUsageRecord[]> {
    const suffix = searchParams?.toString() ? `?${searchParams.toString()}` : "";
    return normalizeGatewayUsageRecords(
      await this.managementRequest(`/usage${suffix}`),
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
    return normalizeGatewayPaymentChannels(
      await this.managementRequest("/payment/channels"),
    );
  }

  async createPaymentOrder(planId: string, channelId: string): Promise<GatewayOrder> {
    const response = await this.managementRequest("/payment/orders", {
      method: "POST",
      body: JSON.stringify({ plan_id: planId, channel_id: channelId }),
    });
    return normalizeGatewayOrders({ data: [unwrapData(response)] })[0]!;
  }

  private async managementRequest(
    path: string,
    options: GatewayRequestOptions = {},
  ): Promise<unknown> {
    const session = await this.ensureFreshSession(options.retryAuth !== false);
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (session?.accessToken) {
      headers.set("Authorization", `Bearer ${session.accessToken}`);
    }

    const response = await this.fetchImpl(`${GATEWAY_MANAGEMENT_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && options.retryAuth !== false) {
      const refreshed = await this.refresh();
      const retryHeaders = new Headers(headers);
      retryHeaders.set("Authorization", `Bearer ${refreshed.accessToken}`);
      return this.readJson(
        await this.fetchImpl(`${GATEWAY_MANAGEMENT_BASE_URL}${path}`, {
          ...options,
          headers: retryHeaders,
          retryAuth: false,
        } as RequestInit),
      );
    }

    return this.readJson(response);
  }

  private async ensureFreshSession(required: boolean): Promise<GatewaySession | null> {
    const session = this.loadSession();
    if (!session || !required || !isGatewaySessionExpiring(session)) {
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
    const session = normalizeSession(await this.readJson(response), current.refreshToken);
    this.saveSession(session);
    return session;
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const record = asRecord(body);
      throw new Error(
        readToken(record, ["message", "error", "detail"]) ??
          `Gateway request failed with ${response.status}`,
      );
    }
    return body;
  }
}

export const gatewayApiClient = new GatewayApiClient();
```

- [ ] **Step 6: Run focused tests**

Run: `pnpm vitest run tests/lib/gatewaySession.test.ts tests/lib/gatewayApi.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/gateway/session.ts src/lib/gateway/api.ts tests/lib/gatewaySession.test.ts tests/lib/gatewayApi.test.ts
git commit -m "feat: add THQ gateway API client"
```

---

### Task 3: Key Selection And Query Hooks

**Files:**
- Create: `src/lib/gateway/keySelection.ts`
- Create: `src/lib/query/gateway.ts`
- Modify: `src/lib/query/index.ts`
- Test: `tests/lib/gatewayKeySelection.test.ts`

- [ ] **Step 1: Write failing key-selection tests**

Create `tests/lib/gatewayKeySelection.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredGatewaySelectedKeyId,
  resolveGatewayKeySelection,
  saveGatewaySelectedKeyId,
} from "@/lib/gateway/keySelection";
import type { GatewayApiKey } from "@/types/gateway";

const keys: GatewayApiKey[] = [
  { id: "first", name: "First", secret: "sk-first" },
  { id: "second", name: "Second", secret: "sk-second" },
];

describe("gateway key selection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("selects the first key by default", () => {
    expect(resolveGatewayKeySelection(keys).selectedKey?.id).toBe("first");
  });

  it("uses a stored key id when it still exists", () => {
    saveGatewaySelectedKeyId("second");
    expect(resolveGatewayKeySelection(keys).selectedKey?.id).toBe("second");
  });

  it("falls back to the first key when the stored key was deleted", () => {
    saveGatewaySelectedKeyId("deleted");
    expect(resolveGatewayKeySelection(keys).selectedKey?.id).toBe("first");
  });

  it("returns empty state when no key exists", () => {
    expect(resolveGatewayKeySelection([])).toEqual({
      status: "empty",
      selectedKey: null,
    });
  });

  it("clears the stored key id", () => {
    saveGatewaySelectedKeyId("second");
    clearStoredGatewaySelectedKeyId();
    expect(resolveGatewayKeySelection(keys).selectedKey?.id).toBe("first");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm vitest run tests/lib/gatewayKeySelection.test.ts`

Expected: FAIL because `@/lib/gateway/keySelection` does not exist.

- [ ] **Step 3: Add key-selection helper**

Create `src/lib/gateway/keySelection.ts`:

```ts
import { GATEWAY_SELECTED_KEY_STORAGE_KEY } from "@/lib/gateway/constants";
import type { GatewayApiKey, GatewayKeySelection } from "@/types/gateway";

export const loadGatewaySelectedKeyId = (): string | null =>
  localStorage.getItem(GATEWAY_SELECTED_KEY_STORAGE_KEY);

export const saveGatewaySelectedKeyId = (keyId: string): void => {
  localStorage.setItem(GATEWAY_SELECTED_KEY_STORAGE_KEY, keyId);
};

export const clearStoredGatewaySelectedKeyId = (): void => {
  localStorage.removeItem(GATEWAY_SELECTED_KEY_STORAGE_KEY);
};

export const resolveGatewayKeySelection = (
  keys: GatewayApiKey[],
  storedKeyId = loadGatewaySelectedKeyId(),
): GatewayKeySelection => {
  if (keys.length === 0) {
    return { status: "empty", selectedKey: null };
  }

  const selectedKey =
    keys.find((key) => key.id === storedKeyId) ??
    keys[0] ??
    null;

  return selectedKey
    ? { status: "ready", selectedKey }
    : { status: "empty", selectedKey: null };
};
```

- [ ] **Step 4: Add gateway query hooks**

Create `src/lib/query/gateway.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gatewayApiClient } from "@/lib/gateway/api";
import { loadGatewaySession } from "@/lib/gateway/session";
import {
  resolveGatewayKeySelection,
  saveGatewaySelectedKeyId,
} from "@/lib/gateway/keySelection";

export const gatewayKeys = {
  session: ["gateway", "session"] as const,
  me: ["gateway", "me"] as const,
  profile: ["gateway", "profile"] as const,
  keys: ["gateway", "keys"] as const,
  stats: ["gateway", "stats"] as const,
  models: ["gateway", "models"] as const,
  usage: ["gateway", "usage"] as const,
  orders: ["gateway", "orders"] as const,
  plans: ["gateway", "payment", "plans"] as const,
  channels: ["gateway", "payment", "channels"] as const,
};

export const useGatewaySessionQuery = () =>
  useQuery({
    queryKey: gatewayKeys.session,
    queryFn: async () => loadGatewaySession(),
    staleTime: 30_000,
  });

export const useGatewayLoginMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      gatewayApiClient.login(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gateway"] });
    },
  });
};

export const useGatewayRegisterMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      gatewayApiClient.register(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gateway"] });
    },
  });
};

export const useGatewayLogoutMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gatewayApiClient.logout(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gateway"] });
    },
  });
};

export const useGatewayKeysQuery = (enabled: boolean) =>
  useQuery({
    queryKey: gatewayKeys.keys,
    queryFn: () => gatewayApiClient.keys(),
    enabled,
  });

export const useGatewayKeySelectionQuery = (enabled: boolean) => {
  const keysQuery = useGatewayKeysQuery(enabled);
  return {
    ...keysQuery,
    selection: resolveGatewayKeySelection(keysQuery.data ?? []),
  };
};

export const useGatewayCreateKeyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => gatewayApiClient.createKey(name),
    onSuccess: async (keys) => {
      const firstKey = keys[0];
      if (firstKey) saveGatewaySelectedKeyId(firstKey.id);
      await queryClient.invalidateQueries({ queryKey: gatewayKeys.keys });
    },
  });
};

export const useGatewayStatsQuery = (enabled: boolean) =>
  useQuery({
    queryKey: gatewayKeys.stats,
    queryFn: () => gatewayApiClient.dashboardStats(),
    enabled,
    refetchInterval: enabled ? 60_000 : false,
  });

export const useGatewayModelsQuery = (enabled: boolean, apiKey?: string) =>
  useQuery({
    queryKey: [...gatewayKeys.models, apiKey],
    queryFn: async () => {
      const managementModels = await gatewayApiClient.availableModels();
      if (managementModels.length > 0 || !apiKey) return managementModels;
      return gatewayApiClient.modelsWithApiKey(apiKey);
    },
    enabled,
  });

export const useGatewayUsageQuery = (enabled: boolean) =>
  useQuery({
    queryKey: gatewayKeys.usage,
    queryFn: () => gatewayApiClient.usageRecords(),
    enabled,
  });

export const useGatewayOrdersQuery = (enabled: boolean) =>
  useQuery({
    queryKey: gatewayKeys.orders,
    queryFn: () => gatewayApiClient.orders(),
    enabled,
  });

export const useGatewayPaymentPlansQuery = (enabled: boolean) =>
  useQuery({
    queryKey: gatewayKeys.plans,
    queryFn: () => gatewayApiClient.paymentPlans(),
    enabled,
  });

export const useGatewayPaymentChannelsQuery = (enabled: boolean) =>
  useQuery({
    queryKey: gatewayKeys.channels,
    queryFn: () => gatewayApiClient.paymentChannels(),
    enabled,
  });
```

Modify `src/lib/query/index.ts`:

```ts
export * from "./queryClient";
export * from "./queries";
export * from "./mutations";
export * from "./proxy";
export * from "./subscription";
export * from "./gateway";
```

- [ ] **Step 5: Run focused tests**

Run: `pnpm vitest run tests/lib/gatewayKeySelection.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gateway/keySelection.ts src/lib/query/gateway.ts src/lib/query/index.ts tests/lib/gatewayKeySelection.test.ts
git commit -m "feat: add THQ gateway key state"
```

---

### Task 4: Fixed THQ Tool Provider Generation

**Files:**
- Create: `src/lib/gateway/toolConfig.ts`
- Create: `src/lib/gateway/applyToolConfig.ts`
- Test: `tests/lib/gatewayToolConfig.test.ts`

- [ ] **Step 1: Write failing fixed-base tests**

Create `tests/lib/gatewayToolConfig.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GATEWAY_MODEL_BASE_URL } from "@/lib/gateway/constants";
import { buildGatewayProviderForApp } from "@/lib/gateway/toolConfig";
import type { AppId } from "@/lib/api";

const apps: AppId[] = [
  "claude",
  "claude-desktop",
  "codex",
  "gemini",
  "opencode",
  "openclaw",
  "hermes",
];

describe("THQ gateway tool config", () => {
  it.each(apps)("builds a fixed provider for %s without management API base", (appId) => {
    const provider = buildGatewayProviderForApp(appId, {
      apiKey: "sk-thq",
      models: [{ id: "gpt-5.5", name: "GPT-5.5", enabled: true }],
    });
    const serialized = JSON.stringify(provider);

    expect(provider.id).toBe("thq-gateway");
    expect(serialized).toContain(GATEWAY_MODEL_BASE_URL);
    expect(serialized).toContain("sk-thq");
    expect(serialized).not.toContain("https://sub.thqllm.com/api/v1");
  });

  it("uses responses wire api for Codex", () => {
    const provider = buildGatewayProviderForApp("codex", {
      apiKey: "sk-thq",
      models: [],
    });
    expect(String(provider.settingsConfig.config)).toContain(
      'base_url = "https://sub.thqllm.com/v1"',
    );
    expect(String(provider.settingsConfig.config)).toContain('wire_api = "responses"');
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm vitest run tests/lib/gatewayToolConfig.test.ts`

Expected: FAIL because `@/lib/gateway/toolConfig` does not exist.

- [ ] **Step 3: Add fixed provider builder**

Create `src/lib/gateway/toolConfig.ts`:

```ts
import type { AppId } from "@/lib/api";
import {
  GATEWAY_DEFAULT_CLAUDE_MODEL,
  GATEWAY_DEFAULT_GEMINI_MODEL,
  GATEWAY_DEFAULT_MODEL,
  GATEWAY_MODEL_BASE_URL,
  GATEWAY_PROVIDER_ID,
  GATEWAY_PROVIDER_NAME,
} from "@/lib/gateway/constants";
import type { GatewayModel } from "@/types/gateway";
import type { OpenClawModel, Provider } from "@/types";

interface BuildGatewayProviderOptions {
  apiKey: string;
  models: GatewayModel[];
}

const modelIds = (models: GatewayModel[]): string[] => {
  const ids = models
    .filter((model) => model.enabled)
    .map((model) => model.id)
    .filter(Boolean);
  return ids.length > 0 ? ids : [GATEWAY_DEFAULT_MODEL];
};

const namedModel = (models: GatewayModel[], fallback: string): string =>
  modelIds(models)[0] ?? fallback;

const baseProvider = (settingsConfig: Provider["settingsConfig"]): Provider => ({
  id: GATEWAY_PROVIDER_ID,
  name: GATEWAY_PROVIDER_NAME,
  settingsConfig,
  websiteUrl: "https://sub.thqllm.com",
  category: "aggregator",
  icon: "openai",
  iconColor: "#0ea5e9",
  meta: {
    apiFormat: "openai_responses",
  },
  inFailoverQueue: false,
});

const buildCodexConfig = (models: GatewayModel[]): string => {
  const model = namedModel(models, GATEWAY_DEFAULT_MODEL);
  return `model_provider = "thq-gateway"
model = "${model}"
model_reasoning_effort = "high"
disable_response_storage = true

[model_providers.thq-gateway]
name = "THQ Gateway"
base_url = "${GATEWAY_MODEL_BASE_URL}"
wire_api = "responses"
requires_openai_auth = true`;
};

const buildOpenCodeModels = (models: GatewayModel[]) =>
  Object.fromEntries(
    modelIds(models).map((id) => [
      id,
      {
        name: id,
      },
    ]),
  );

const buildOpenClawModels = (models: GatewayModel[]): OpenClawModel[] =>
  modelIds(models).map((id) => ({
    id,
    name: id,
  }));

export const buildGatewayProviderForApp = (
  appId: AppId,
  options: BuildGatewayProviderOptions,
): Provider => {
  const { apiKey, models } = options;

  if (appId === "claude" || appId === "claude-desktop") {
    return {
      ...baseProvider({
        env: {
          ANTHROPIC_BASE_URL: GATEWAY_MODEL_BASE_URL,
          ANTHROPIC_AUTH_TOKEN: apiKey,
          ANTHROPIC_MODEL: namedModel(models, GATEWAY_DEFAULT_CLAUDE_MODEL),
          ANTHROPIC_DEFAULT_HAIKU_MODEL: namedModel(
            models,
            GATEWAY_DEFAULT_CLAUDE_MODEL,
          ),
          ANTHROPIC_DEFAULT_SONNET_MODEL: namedModel(
            models,
            GATEWAY_DEFAULT_CLAUDE_MODEL,
          ),
          ANTHROPIC_DEFAULT_OPUS_MODEL: namedModel(
            models,
            GATEWAY_DEFAULT_CLAUDE_MODEL,
          ),
        },
      }),
      meta: {
        apiFormat: "openai_responses",
        claudeDesktopMode: appId === "claude-desktop" ? "direct" : undefined,
      },
    };
  }

  if (appId === "codex") {
    return baseProvider({
      auth: {
        OPENAI_API_KEY: apiKey,
      },
      config: buildCodexConfig(models),
    });
  }

  if (appId === "gemini") {
    return baseProvider({
      env: {
        GOOGLE_GEMINI_BASE_URL: GATEWAY_MODEL_BASE_URL,
        GEMINI_API_KEY: apiKey,
        GEMINI_MODEL: namedModel(models, GATEWAY_DEFAULT_GEMINI_MODEL),
      },
    });
  }

  if (appId === "opencode") {
    return baseProvider({
      npm: "@ai-sdk/openai-compatible",
      name: GATEWAY_PROVIDER_NAME,
      options: {
        baseURL: GATEWAY_MODEL_BASE_URL,
        apiKey,
      },
      models: buildOpenCodeModels(models),
    });
  }

  if (appId === "openclaw") {
    return baseProvider({
      baseUrl: GATEWAY_MODEL_BASE_URL,
      apiKey,
      api: "openai-completions",
      models: buildOpenClawModels(models),
    });
  }

  return baseProvider({
    name: GATEWAY_PROVIDER_NAME,
    base_url: GATEWAY_MODEL_BASE_URL,
    api_key: apiKey,
    models: modelIds(models).map((id) => ({
      default: id,
      provider: GATEWAY_PROVIDER_ID,
      base_url: GATEWAY_MODEL_BASE_URL,
    })),
  });
};
```

- [ ] **Step 4: Add apply helper using existing provider APIs**

Create `src/lib/gateway/applyToolConfig.ts`:

```ts
import { providersApi, type AppId } from "@/lib/api";
import { GATEWAY_PROVIDER_ID } from "@/lib/gateway/constants";
import { buildGatewayProviderForApp } from "@/lib/gateway/toolConfig";
import type { GatewayModel } from "@/types/gateway";

export interface ApplyGatewayToolConfigInput {
  appId: AppId;
  apiKey: string;
  models: GatewayModel[];
}

export const applyGatewayToolConfig = async ({
  appId,
  apiKey,
  models,
}: ApplyGatewayToolConfigInput): Promise<void> => {
  const provider = buildGatewayProviderForApp(appId, { apiKey, models });
  const providers = await providersApi.getAll(appId);

  if (providers[GATEWAY_PROVIDER_ID]) {
    await providersApi.update(provider, appId);
  } else {
    await providersApi.add(provider, appId, true);
  }

  await providersApi.switch(GATEWAY_PROVIDER_ID, appId);
};
```

- [ ] **Step 5: Run focused tests**

Run: `pnpm vitest run tests/lib/gatewayToolConfig.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gateway/toolConfig.ts src/lib/gateway/applyToolConfig.ts tests/lib/gatewayToolConfig.test.ts
git commit -m "feat: generate fixed THQ gateway tool configs"
```

---

### Task 5: Gateway Authentication UI

**Files:**
- Create: `src/components/gateway/GatewayAuthPage.tsx`
- Create: `tests/components/GatewayAuthPage.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `tests/components/GatewayAuthPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GatewayAuthPage } from "@/components/gateway/GatewayAuthPage";

describe("GatewayAuthPage", () => {
  it("submits login credentials", async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<GatewayAuthPage onLogin={onLogin} onRegister={vi.fn()} busy={false} />);

    await userEvent.type(screen.getByLabelText("邮箱"), "a@example.com");
    await userEvent.type(screen.getByLabelText("密码"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(onLogin).toHaveBeenCalledWith({
      email: "a@example.com",
      password: "secret123",
    });
  });

  it("switches to register mode", async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined);
    render(<GatewayAuthPage onLogin={vi.fn()} onRegister={onRegister} busy={false} />);

    await userEvent.click(screen.getByRole("button", { name: "注册账号" }));
    await userEvent.type(screen.getByLabelText("邮箱"), "new@example.com");
    await userEvent.type(screen.getByLabelText("密码"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "创建账号" }));

    expect(onRegister).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret123",
    });
  });
});
```

- [ ] **Step 2: Run component test and verify it fails**

Run: `pnpm vitest run tests/components/GatewayAuthPage.test.tsx`

Expected: FAIL because `GatewayAuthPage` does not exist.

- [ ] **Step 3: Create auth page**

Create `src/components/gateway/GatewayAuthPage.tsx`:

```tsx
import { useState } from "react";
import { KeyRound, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthPayload {
  email: string;
  password: string;
}

interface GatewayAuthPageProps {
  busy: boolean;
  error?: string;
  onLogin: (payload: AuthPayload) => Promise<void>;
  onRegister: (payload: AuthPayload) => Promise<void>;
}

export function GatewayAuthPage({
  busy,
  error,
  onLogin,
  onRegister,
}: GatewayAuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { email: email.trim(), password };
    if (mode === "login") {
      await onLogin(payload);
      return;
    }
    await onRegister(payload);
  };

  return (
    <div className="min-h-[calc(100vh-92px)] bg-background px-8 py-10 text-foreground">
      <div className="mx-auto grid max-w-5xl grid-cols-[1.1fr_0.9fr] gap-10 rounded-lg border border-border bg-card p-8 shadow-sm max-lg:grid-cols-1">
        <div className="flex flex-col justify-between gap-10">
          <div>
            <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-normal">THQ AI Gateway</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              登录后管理余额、用量、模型、订单，并把固定网关配置写入本地 AI 工具。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {["固定地址", "统一密钥", "用量看板"].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-background p-3">
                {item}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="rounded-lg border border-border bg-background p-6">
          <div className="mb-6 flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm",
                mode === "login" && "bg-card shadow-sm",
              )}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm",
                mode === "register" && "bg-card shadow-sm",
              )}
            >
              注册账号
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gateway-email">邮箱</Label>
              <Input
                id="gateway-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gateway-password">密码</Label>
              <Input
                id="gateway-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
              />
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button className="mt-6 w-full" disabled={busy}>
            <LogIn className="mr-2 h-4 w-4" />
            {mode === "login" ? "登录" : "创建账号"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run component test**

Run: `pnpm vitest run tests/components/GatewayAuthPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/gateway/GatewayAuthPage.tsx tests/components/GatewayAuthPage.test.tsx
git commit -m "feat: add THQ gateway auth page"
```

---

### Task 6: Gateway Dashboard Components

**Files:**
- Create: `src/components/gateway/GatewayMetricCard.tsx`
- Create: `src/components/gateway/GatewayPowerStatus.tsx`
- Create: `src/components/gateway/GatewayToolSwitcher.tsx`
- Create: `src/components/gateway/GatewayKeyPanel.tsx`
- Create: `src/components/gateway/GatewayModelsPanel.tsx`
- Create: `src/components/gateway/GatewayDashboard.tsx`
- Test: `tests/components/GatewayDashboard.test.tsx`

- [ ] **Step 1: Write failing dashboard tests**

Create `tests/components/GatewayDashboard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GatewayDashboard } from "@/components/gateway/GatewayDashboard";

const stats = {
  balance: 975325,
  todayUsage: 1405,
  todayTokens: 4680870,
  totalUsage: 669700,
  todayRequests: 1628,
  totalRequests: 66000,
};

describe("GatewayDashboard", () => {
  it("renders gateway metrics and fixed model base", () => {
    render(
      <GatewayDashboard
        activeApp="claude"
        stats={stats}
        keys={[{ id: "k1", name: "Main", secret: "sk-main" }]}
        selectedKey={{ id: "k1", name: "Main", secret: "sk-main" }}
        models={[{ id: "gpt-5.5", name: "GPT-5.5", enabled: true }]}
        onRefresh={vi.fn()}
        onRecharge={vi.fn()}
        onShowUsage={vi.fn()}
        onShowOrders={vi.fn()}
        onCreateKey={vi.fn()}
        onSelectKey={vi.fn()}
        onApplyTool={vi.fn()}
      />,
    );

    expect(screen.getByText("THQ")).toBeInTheDocument();
    expect(screen.getByText("账户余额")).toBeInTheDocument();
    expect(screen.getByText("今日 Tokens")).toBeInTheDocument();
    expect(screen.getByText("https://sub.thqllm.com/v1")).toBeInTheDocument();
    expect(screen.getByText("GPT-5.5")).toBeInTheDocument();
  });

  it("renders no-key state without creating a key automatically", () => {
    render(
      <GatewayDashboard
        activeApp="codex"
        stats={stats}
        keys={[]}
        selectedKey={null}
        models={[]}
        onRefresh={vi.fn()}
        onRecharge={vi.fn()}
        onShowUsage={vi.fn()}
        onShowOrders={vi.fn()}
        onCreateKey={vi.fn()}
        onSelectKey={vi.fn()}
        onApplyTool={vi.fn()}
      />,
    );

    expect(screen.getByText("待创建")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建 API Key" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run dashboard test and verify it fails**

Run: `pnpm vitest run tests/components/GatewayDashboard.test.tsx`

Expected: FAIL because dashboard components do not exist.

- [ ] **Step 3: Add small dashboard building blocks**

Create `src/components/gateway/GatewayMetricCard.tsx`:

```tsx
import type { LucideIcon } from "lucide-react";

interface GatewayMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}

export function GatewayMetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: GatewayMetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold tracking-normal">{value}</div>
      {hint ? <div className="mt-2 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
```

Create `src/components/gateway/GatewayPowerStatus.tsx`:

```tsx
import { Power } from "lucide-react";

interface GatewayPowerStatusProps {
  connected: boolean;
  label: string;
}

export function GatewayPowerStatus({ connected, label }: GatewayPowerStatusProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-400/20">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
          <Power className="h-10 w-10" />
        </div>
      </div>
      <div className="text-sm font-medium">{connected ? label : "未配置"}</div>
    </div>
  );
}
```

Create `src/components/gateway/GatewayToolSwitcher.tsx`:

```tsx
import { Check, Wrench } from "lucide-react";
import { AppSwitcher } from "@/components/AppSwitcher";
import { Button } from "@/components/ui/button";
import type { AppId } from "@/lib/api";
import type { VisibleApps } from "@/types";

interface GatewayToolSwitcherProps {
  activeApp: AppId;
  visibleApps: VisibleApps;
  onAppChange: (appId: AppId) => void;
  onApplyTool: () => void;
  disabled: boolean;
}

export function GatewayToolSwitcher({
  activeApp,
  visibleApps,
  onAppChange,
  onApplyTool,
  disabled,
}: GatewayToolSwitcherProps) {
  return (
    <div className="flex items-center gap-3">
      <AppSwitcher
        activeApp={activeApp}
        visibleApps={visibleApps}
        onChange={onAppChange}
      />
      <Button onClick={onApplyTool} disabled={disabled}>
        {disabled ? <Wrench className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
        写入当前工具
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Add key and model panels**

Create `src/components/gateway/GatewayKeyPanel.tsx`:

```tsx
import { KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GatewayApiKey } from "@/types/gateway";

interface GatewayKeyPanelProps {
  keys: GatewayApiKey[];
  selectedKey: GatewayApiKey | null;
  onCreateKey: () => void;
  onSelectKey: (keyId: string) => void;
}

export function GatewayKeyPanel({
  keys,
  selectedKey,
  onCreateKey,
  onSelectKey,
}: GatewayKeyPanelProps) {
  if (!selectedKey) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">API Key</div>
            <div className="mt-1 text-sm text-muted-foreground">待创建</div>
          </div>
          <Button onClick={onCreateKey}>
            <Plus className="mr-2 h-4 w-4" />
            创建 API Key
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <KeyRound className="h-4 w-4" />
        当前 API Key
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {keys.map((key) => (
          <button
            key={key.id}
            type="button"
            onClick={() => onSelectKey(key.id)}
            className={`rounded-md border px-3 py-2 text-sm ${
              key.id === selectedKey.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border"
            }`}
          >
            {key.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

Create `src/components/gateway/GatewayModelsPanel.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Boxes, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { GatewayModel } from "@/types/gateway";

interface GatewayModelsPanelProps {
  models: GatewayModel[];
}

export function GatewayModelsPanel({ models }: GatewayModelsPanelProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return models;
    return models.filter((model) =>
      `${model.id} ${model.name} ${model.provider ?? ""}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [models, query]);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold">
            <Boxes className="h-4 w-4 text-primary" />
            可用模型
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            有效价格，单位为人民币 / 100 万 tokens。
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
            aria-label="搜索模型"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
        {filtered.map((model) => (
          <div key={model.id} className="rounded-lg border border-border bg-card p-4">
            <div className="font-medium">{model.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{model.id}</div>
            {model.priceText ? (
              <div className="mt-3 text-sm text-muted-foreground">{model.priceText}</div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Add dashboard composition**

Create `src/components/gateway/GatewayDashboard.tsx`:

```tsx
import {
  BarChart3,
  CreditCard,
  FileText,
  RefreshCw,
  ReceiptText,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GATEWAY_MODEL_BASE_URL } from "@/lib/gateway/constants";
import type { AppId } from "@/lib/api";
import type { GatewayApiKey, GatewayDashboardStats, GatewayModel } from "@/types/gateway";
import { GatewayKeyPanel } from "@/components/gateway/GatewayKeyPanel";
import { GatewayMetricCard } from "@/components/gateway/GatewayMetricCard";
import { GatewayModelsPanel } from "@/components/gateway/GatewayModelsPanel";
import { GatewayPowerStatus } from "@/components/gateway/GatewayPowerStatus";

interface GatewayDashboardProps {
  activeApp: AppId;
  stats: GatewayDashboardStats;
  keys: GatewayApiKey[];
  selectedKey: GatewayApiKey | null;
  models: GatewayModel[];
  onRefresh: () => void;
  onRecharge: () => void;
  onShowUsage: () => void;
  onShowOrders: () => void;
  onCreateKey: () => void;
  onSelectKey: (keyId: string) => void;
  onApplyTool: () => void;
}

const money = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value / 100);

const compact = (value: number) =>
  new Intl.NumberFormat("zh-CN", { notation: "compact" }).format(value);

export function GatewayDashboard({
  activeApp,
  stats,
  keys,
  selectedKey,
  models,
  onRefresh,
  onRecharge,
  onShowUsage,
  onShowOrders,
  onCreateKey,
  onSelectKey,
  onApplyTool,
}: GatewayDashboardProps) {
  return (
    <div className="min-h-[calc(100vh-92px)] bg-background px-7 py-6 text-foreground">
      <section className="rounded-lg border border-primary/70 bg-primary/5 p-6">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-card text-2xl font-black">
              T
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-normal">THQ</h1>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  使用中
                </span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                固定模型地址：{GATEWAY_MODEL_BASE_URL}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={onShowUsage}>
              <BarChart3 className="mr-2 h-4 w-4" />
              使用记录
            </Button>
            <Button variant="outline" onClick={onShowOrders}>
              <FileText className="mr-2 h-4 w-4" />
              我的订单
            </Button>
            <Button onClick={onRecharge}>
              <CreditCard className="mr-2 h-4 w-4" />
              充值
            </Button>
            <Button variant="outline" size="icon" onClick={onRefresh} aria-label="刷新">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-8 flex justify-center">
          <GatewayPowerStatus connected={Boolean(selectedKey)} label="使用中" />
        </div>

        <div className="grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
          <GatewayMetricCard
            icon={Wallet}
            label="账户余额"
            value={money(stats.balance)}
            hint="THQ 可用余额"
          />
          <GatewayMetricCard
            icon={ReceiptText}
            label="今日用量"
            value={money(stats.todayUsage)}
            hint={`${stats.todayRequests} 次请求`}
          />
          <GatewayMetricCard
            icon={Zap}
            label="今日 Tokens"
            value={compact(stats.todayTokens)}
            hint={`${stats.todayRequests} 次请求`}
          />
          <GatewayMetricCard
            icon={Zap}
            label="累计用量"
            value={money(stats.totalUsage)}
            hint={`${compact(stats.totalRequests)} 次请求`}
          />
        </div>
      </section>

      <div className="mt-5 grid grid-cols-[1fr_320px] gap-4 max-lg:grid-cols-1">
        <GatewayModelsPanel models={models} />
        <div className="space-y-4">
          <GatewayKeyPanel
            keys={keys}
            selectedKey={selectedKey}
            onCreateKey={onCreateKey}
            onSelectKey={onSelectKey}
          />
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm font-medium">当前工具</div>
            <div className="mt-1 text-sm text-muted-foreground">{activeApp}</div>
            <Button
              className="mt-4 w-full"
              disabled={!selectedKey}
              onClick={onApplyTool}
            >
              写入当前工具
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run dashboard tests**

Run: `pnpm vitest run tests/components/GatewayDashboard.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/gateway/GatewayMetricCard.tsx src/components/gateway/GatewayPowerStatus.tsx src/components/gateway/GatewayToolSwitcher.tsx src/components/gateway/GatewayKeyPanel.tsx src/components/gateway/GatewayModelsPanel.tsx src/components/gateway/GatewayDashboard.tsx tests/components/GatewayDashboard.test.tsx
git commit -m "feat: add THQ gateway dashboard"
```

---

### Task 7: Usage Records, Orders, And Recharge Panels

**Files:**
- Create: `src/components/gateway/GatewayUsageRecords.tsx`
- Create: `src/components/gateway/GatewayOrdersPanel.tsx`
- Create: `src/components/gateway/GatewayRechargePanel.tsx`

- [ ] **Step 1: Add usage records table**

Create `src/components/gateway/GatewayUsageRecords.tsx`:

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GatewayUsageRecord } from "@/types/gateway";

interface GatewayUsageRecordsProps {
  records: GatewayUsageRecord[];
}

export function GatewayUsageRecords({ records }: GatewayUsageRecordsProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-4 text-lg font-semibold tracking-normal">使用记录</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>时间</TableHead>
            <TableHead>模型</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead>费用</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.createdAt ?? "-"}</TableCell>
              <TableCell>{record.model ?? "-"}</TableCell>
              <TableCell>{record.status ?? "-"}</TableCell>
              <TableCell>{record.totalTokens}</TableCell>
              <TableCell>{record.cost}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Add orders panel**

Create `src/components/gateway/GatewayOrdersPanel.tsx`:

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GatewayOrder } from "@/types/gateway";

interface GatewayOrdersPanelProps {
  orders: GatewayOrder[];
}

export function GatewayOrdersPanel({ orders }: GatewayOrdersPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-4 text-lg font-semibold tracking-normal">我的订单</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>订单号</TableHead>
            <TableHead>金额</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.orderNo ?? order.id}</TableCell>
              <TableCell>{order.amount}</TableCell>
              <TableCell>{order.status ?? "-"}</TableCell>
              <TableCell>{order.createdAt ?? "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Add recharge panel with external browser handoff**

Create `src/components/gateway/GatewayRechargePanel.tsx`:

```tsx
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GatewayPaymentChannel, GatewayPaymentPlan } from "@/types/gateway";

interface GatewayRechargePanelProps {
  plans: GatewayPaymentPlan[];
  channels: GatewayPaymentChannel[];
  selectedPlanId: string;
  selectedChannelId: string;
  onSelectPlan: (planId: string) => void;
  onSelectChannel: (channelId: string) => void;
  onCreateOrder: () => void;
  busy: boolean;
}

export function GatewayRechargePanel({
  plans,
  channels,
  selectedPlanId,
  selectedChannelId,
  onSelectPlan,
  onSelectChannel,
  onCreateOrder,
  busy,
}: GatewayRechargePanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-4 text-lg font-semibold tracking-normal">充值</h2>
      <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelectPlan(plan.id)}
            className={`rounded-lg border p-4 text-left ${
              selectedPlanId === plan.id ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            <div className="font-medium">{plan.name}</div>
            <div className="mt-2 text-2xl font-semibold">{plan.amount}</div>
            {plan.description ? (
              <div className="mt-2 text-sm text-muted-foreground">{plan.description}</div>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {channels.map((channel) => (
          <button
            key={channel.id}
            type="button"
            disabled={!channel.enabled}
            onClick={() => onSelectChannel(channel.id)}
            className={`rounded-md border px-3 py-2 text-sm ${
              selectedChannelId === channel.id ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            {channel.name}
          </button>
        ))}
      </div>

      <Button
        className="mt-5"
        disabled={busy || !selectedPlanId || !selectedChannelId}
        onClick={onCreateOrder}
      >
        <CreditCard className="mr-2 h-4 w-4" />
        创建订单并支付
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck on new panels**

Run: `pnpm typecheck`

Expected: PASS for the three new panel files.

- [ ] **Step 5: Commit**

```bash
git add src/components/gateway/GatewayUsageRecords.tsx src/components/gateway/GatewayOrdersPanel.tsx src/components/gateway/GatewayRechargePanel.tsx
git commit -m "feat: add THQ gateway usage orders recharge panels"
```

---

### Task 8: Gateway App Composition And Main App Integration

**Files:**
- Create: `src/components/gateway/GatewayApp.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create gateway composition component**

Create `src/components/gateway/GatewayApp.tsx`:

```tsx
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { settingsApi, type AppId } from "@/lib/api";
import {
  gatewayKeys,
  useGatewayCreateKeyMutation,
  useGatewayKeySelectionQuery,
  useGatewayLoginMutation,
  useGatewayLogoutMutation,
  useGatewayModelsQuery,
  useGatewayOrdersQuery,
  useGatewayPaymentChannelsQuery,
  useGatewayPaymentPlansQuery,
  useGatewayRegisterMutation,
  useGatewaySessionQuery,
  useGatewayStatsQuery,
  useGatewayUsageQuery,
} from "@/lib/query/gateway";
import { queryClient } from "@/lib/query";
import { applyGatewayToolConfig } from "@/lib/gateway/applyToolConfig";
import { saveGatewaySelectedKeyId } from "@/lib/gateway/keySelection";
import { GatewayAuthPage } from "@/components/gateway/GatewayAuthPage";
import { GatewayDashboard } from "@/components/gateway/GatewayDashboard";
import { GatewayOrdersPanel } from "@/components/gateway/GatewayOrdersPanel";
import { GatewayRechargePanel } from "@/components/gateway/GatewayRechargePanel";
import { GatewayUsageRecords } from "@/components/gateway/GatewayUsageRecords";

interface GatewayAppProps {
  activeApp: AppId;
}

const emptyStats = {
  balance: 0,
  todayUsage: 0,
  todayTokens: 0,
  totalUsage: 0,
  todayRequests: 0,
  totalRequests: 0,
};

export function GatewayApp({ activeApp }: GatewayAppProps) {
  const [panel, setPanel] = useState<"dashboard" | "usage" | "orders" | "recharge">(
    "dashboard",
  );
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState("");

  const sessionQuery = useGatewaySessionQuery();
  const loggedIn = Boolean(sessionQuery.data?.accessToken);
  const loginMutation = useGatewayLoginMutation();
  const registerMutation = useGatewayRegisterMutation();
  const logoutMutation = useGatewayLogoutMutation();
  const createKeyMutation = useGatewayCreateKeyMutation();

  const keyQuery = useGatewayKeySelectionQuery(loggedIn);
  const selectedKey = keyQuery.selection.selectedKey;
  const statsQuery = useGatewayStatsQuery(loggedIn);
  const modelsQuery = useGatewayModelsQuery(loggedIn, selectedKey?.secret);
  const usageQuery = useGatewayUsageQuery(loggedIn && panel === "usage");
  const ordersQuery = useGatewayOrdersQuery(loggedIn && panel === "orders");
  const plansQuery = useGatewayPaymentPlansQuery(loggedIn && panel === "recharge");
  const channelsQuery = useGatewayPaymentChannelsQuery(loggedIn && panel === "recharge");

  const busy = loginMutation.isPending || registerMutation.isPending;
  const authError = useMemo(() => {
    const error = loginMutation.error ?? registerMutation.error;
    return error instanceof Error ? error.message : undefined;
  }, [loginMutation.error, registerMutation.error]);

  if (!loggedIn) {
    return (
      <GatewayAuthPage
        busy={busy}
        error={authError}
        onLogin={(payload) => loginMutation.mutateAsync(payload)}
        onRegister={(payload) => registerMutation.mutateAsync(payload)}
      />
    );
  }

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["gateway"] });
  };

  const createKey = async () => {
    await createKeyMutation.mutateAsync("Desktop Client");
    toast.success("API Key 已创建");
  };

  const selectKey = (keyId: string) => {
    saveGatewaySelectedKeyId(keyId);
    void queryClient.invalidateQueries({ queryKey: gatewayKeys.keys });
  };

  const applyTool = async () => {
    if (!selectedKey?.secret) {
      toast.error("请先创建或选择 API Key");
      return;
    }
    await applyGatewayToolConfig({
      appId: activeApp,
      apiKey: selectedKey.secret,
      models: modelsQuery.data ?? [],
    });
    toast.success("已写入当前工具配置");
  };

  const createOrder = async () => {
    const { gatewayApiClient } = await import("@/lib/gateway/api");
    const order = await gatewayApiClient.createPaymentOrder(
      selectedPlanId,
      selectedChannelId,
    );
    if (order.paymentUrl) {
      await settingsApi.openExternal(order.paymentUrl);
    }
    await queryClient.invalidateQueries({ queryKey: gatewayKeys.orders });
    toast.success("订单已创建");
  };

  return (
    <div>
      {panel === "dashboard" ? (
        <GatewayDashboard
          activeApp={activeApp}
          stats={statsQuery.data ?? emptyStats}
          keys={keyQuery.data ?? []}
          selectedKey={selectedKey}
          models={modelsQuery.data ?? []}
          onRefresh={refreshAll}
          onRecharge={() => setPanel("recharge")}
          onShowUsage={() => setPanel("usage")}
          onShowOrders={() => setPanel("orders")}
          onCreateKey={createKey}
          onSelectKey={selectKey}
          onApplyTool={applyTool}
        />
      ) : null}
      {panel === "usage" ? (
        <GatewayUsageRecords records={usageQuery.data ?? []} />
      ) : null}
      {panel === "orders" ? (
        <GatewayOrdersPanel orders={ordersQuery.data ?? []} />
      ) : null}
      {panel === "recharge" ? (
        <GatewayRechargePanel
          plans={plansQuery.data ?? []}
          channels={channelsQuery.data ?? []}
          selectedPlanId={selectedPlanId}
          selectedChannelId={selectedChannelId}
          onSelectPlan={setSelectedPlanId}
          onSelectChannel={setSelectedChannelId}
          onCreateOrder={createOrder}
          busy={false}
        />
      ) : null}
      <button
        type="button"
        className="fixed bottom-4 right-4 rounded-md border border-border bg-card px-3 py-2 text-sm"
        onClick={() => logoutMutation.mutate()}
      >
        退出登录
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Integrate into `src/App.tsx`**

Modify `src/App.tsx`:

```tsx
// Add import near other page imports.
import { GatewayApp } from "@/components/gateway/GatewayApp";

// Add "gateway" to View.
type View =
  | "gateway"
  | "providers"
  | "settings"
  | "prompts"
  | "skills"
  | "skillsDiscovery"
  | "mcp"
  | "agents"
  | "universal"
  | "sessions"
  | "workspace"
  | "openclawEnv"
  | "openclawTools"
  | "openclawAgents"
  | "hermesMemory";

// Add "gateway" to VALID_VIEWS and make it the default.
const VALID_VIEWS: View[] = [
  "gateway",
  "providers",
  "settings",
  "prompts",
  "skills",
  "skillsDiscovery",
  "mcp",
  "agents",
  "universal",
  "sessions",
  "workspace",
  "openclawEnv",
  "openclawTools",
  "openclawAgents",
  "hermesMemory",
];

const getInitialView = (): View => {
  const saved = localStorage.getItem(VIEW_STORAGE_KEY) as View | null;
  if (saved && VALID_VIEWS.includes(saved)) {
    return saved;
  }
  return "gateway";
};

// In the main content switch, render the gateway page before the legacy providers page.
{currentView === "gateway" && <GatewayApp activeApp={activeApp} />}
```

Keep the legacy provider list reachable from an advanced button or existing settings path, but remove add-provider/custom-base buttons from the default gateway screen.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS or actionable TypeScript errors only in the files touched by this task.

- [ ] **Step 4: Commit**

```bash
git add src/components/gateway/GatewayApp.tsx src/App.tsx
git commit -m "feat: make THQ gateway the primary app view"
```

---

### Task 9: Localized Gateway Copy

**Files:**
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh-TW.json`
- Modify: `src/i18n/locales/ja.json`

- [ ] **Step 1: Add gateway namespace to Chinese locale**

Modify `src/i18n/locales/zh.json` by adding this top-level key:

```json
"gateway": {
  "title": "THQ",
  "subtitle": "固定模型地址：{{baseUrl}}",
  "login": "登录",
  "register": "注册账号",
  "createAccount": "创建账号",
  "email": "邮箱",
  "password": "密码",
  "balance": "账户余额",
  "todayUsage": "今日用量",
  "todayTokens": "今日 Tokens",
  "totalUsage": "累计用量",
  "usageRecords": "使用记录",
  "orders": "我的订单",
  "recharge": "充值",
  "availableModels": "可用模型",
  "createKey": "创建 API Key",
  "pendingCreate": "待创建",
  "applyTool": "写入当前工具",
  "logout": "退出登录"
}
```

- [ ] **Step 2: Add gateway namespace to English locale**

Modify `src/i18n/locales/en.json` by adding this top-level key:

```json
"gateway": {
  "title": "THQ",
  "subtitle": "Fixed model base URL: {{baseUrl}}",
  "login": "Log in",
  "register": "Register",
  "createAccount": "Create account",
  "email": "Email",
  "password": "Password",
  "balance": "Balance",
  "todayUsage": "Today usage",
  "todayTokens": "Today tokens",
  "totalUsage": "Total usage",
  "usageRecords": "Usage records",
  "orders": "My orders",
  "recharge": "Recharge",
  "availableModels": "Available models",
  "createKey": "Create API key",
  "pendingCreate": "Pending creation",
  "applyTool": "Apply to current tool",
  "logout": "Log out"
}
```

- [ ] **Step 3: Add gateway namespace to Traditional Chinese locale**

Modify `src/i18n/locales/zh-TW.json` by adding this top-level key:

```json
"gateway": {
  "title": "THQ",
  "subtitle": "固定模型地址：{{baseUrl}}",
  "login": "登入",
  "register": "註冊帳號",
  "createAccount": "建立帳號",
  "email": "信箱",
  "password": "密碼",
  "balance": "帳戶餘額",
  "todayUsage": "今日用量",
  "todayTokens": "今日 Tokens",
  "totalUsage": "累計用量",
  "usageRecords": "使用記錄",
  "orders": "我的訂單",
  "recharge": "充值",
  "availableModels": "可用模型",
  "createKey": "建立 API Key",
  "pendingCreate": "待建立",
  "applyTool": "寫入目前工具",
  "logout": "登出"
}
```

- [ ] **Step 4: Add gateway namespace to Japanese locale**

Modify `src/i18n/locales/ja.json` by adding this top-level key:

```json
"gateway": {
  "title": "THQ",
  "subtitle": "固定モデル Base URL: {{baseUrl}}",
  "login": "ログイン",
  "register": "アカウント登録",
  "createAccount": "アカウント作成",
  "email": "メール",
  "password": "パスワード",
  "balance": "残高",
  "todayUsage": "本日の使用量",
  "todayTokens": "本日の Tokens",
  "totalUsage": "累計使用量",
  "usageRecords": "使用記録",
  "orders": "注文履歴",
  "recharge": "チャージ",
  "availableModels": "利用可能モデル",
  "createKey": "API Key を作成",
  "pendingCreate": "未作成",
  "applyTool": "現在のツールへ適用",
  "logout": "ログアウト"
}
```

- [ ] **Step 5: Replace hard-coded Chinese in gateway components**

Update `src/components/gateway/*.tsx` to call `const { t } = useTranslation();` where visible text is stable product copy, using the keys above. Keep dynamic data such as model ids and URLs as plain values.

Example replacement in `GatewayDashboard.tsx`:

```tsx
const { t } = useTranslation();

<h1 className="text-2xl font-semibold tracking-normal">
  {t("gateway.title")}
</h1>
```

- [ ] **Step 6: Run JSON and type checks**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/locales/zh.json src/i18n/locales/en.json src/i18n/locales/zh-TW.json src/i18n/locales/ja.json src/components/gateway
git commit -m "feat: localize THQ gateway UI"
```

---

### Task 10: Verification And Visual QA

**Files:**
- Modify only files required by failures found in this task.

- [ ] **Step 1: Run full TypeScript verification**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 2: Run full unit test suite**

Run: `pnpm test:unit`

Expected: PASS.

- [ ] **Step 3: Start renderer dev server**

Run: `pnpm dev:renderer --host 127.0.0.1 --port 51402`

Expected: Vite prints a local URL, usually `http://127.0.0.1:51402/`.

- [ ] **Step 4: Visual check desktop viewport**

Open `http://127.0.0.1:51402/` in the in-app Browser. Verify:

- Logged-out view shows the THQ Gateway login/register screen.
- After a mocked or real login, the dashboard first viewport visually matches the approved screenshot structure: top action buttons, central green status button, four metrics, available models below.
- The visible model base URL is exactly `https://sub.thqllm.com/v1`.
- The primary flow does not show arbitrary custom `base_url` fields.
- Text does not overlap at 1000x768 and 1440x900.

- [ ] **Step 5: Visual check mobile/narrow viewport**

Resize Browser to a narrow viewport or use responsive mode. Verify:

- Metric cards stack cleanly.
- Login form fields and buttons remain readable.
- Model cards do not overflow.
- Recharge plan cards stack cleanly.

- [ ] **Step 6: Verify no management URL leaked into tool config builders**

Run: `pnpm vitest run tests/lib/gatewayToolConfig.test.ts`

Expected: PASS with assertions proving provider configs include `https://sub.thqllm.com/v1` and exclude `https://sub.thqllm.com/api/v1`.

- [ ] **Step 7: Commit fixes from verification**

If verification required changes:

```bash
git add src tests
git commit -m "fix: polish THQ gateway verification issues"
```

If no files changed, skip this commit.

---

## Self-Review

Spec coverage:

- Register/login: Task 2 API methods, Task 5 UI, Task 8 composition.
- Balance, today's usage, today's tokens, cumulative usage: Task 1 stats type/normalizer, Task 2 stats endpoint, Task 6 metric cards.
- Available models: Task 2 `/channels/available` and `/v1/models` fallback, Task 6 model panel.
- Recharge: Task 2 payment endpoints, Task 7 recharge panel, Task 8 payment URL handoff through `settingsApi.openExternal`.
- Usage records: Task 2 usage endpoint, Task 7 records table, Task 8 panel routing.
- My orders: Task 2 orders endpoint, Task 7 orders table, Task 8 panel routing.
- Default first key and no auto key creation: Task 3 key-selection tests and helper, Task 6 no-key empty state, Task 8 create-key only on button click.
- Fixed base URL: Task 1 constants, Task 4 provider builder tests, Task 10 explicit verification.
- `/api/v1` versus `/v1`: Task 2 API tests and Task 4 config tests.
- Primary UI hides custom provider/base URL editing: Task 8 makes gateway default, Task 10 visual check.

Forbidden text scan:

- Search command: use ripgrep against the no-placeholder phrases listed in the `superpowers:writing-plans` skill.
- Expected: no matches in this plan file.

Type consistency:

- `GatewayApiKey.secret` is the selected credential used by `applyGatewayToolConfig`.
- `GatewayDashboardStats.todayTokens` feeds the "今日 Tokens" metric.
- `GATEWAY_MODEL_BASE_URL` is the only model base consumed by `buildGatewayProviderForApp`.
- `GatewayApp` receives `activeApp: AppId` from `App.tsx` and passes it to `applyGatewayToolConfig`.
