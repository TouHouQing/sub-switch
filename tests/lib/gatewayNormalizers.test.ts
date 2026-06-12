import { describe, expect, it } from "vitest";
import {
  GATEWAY_MANAGEMENT_BASE_URL,
  GATEWAY_MODEL_BASE_URL,
  GATEWAY_ORIGIN,
} from "@/lib/gateway/constants";
import {
  normalizeGatewayPaymentChannels,
  normalizeGatewayOrders,
  normalizeGatewayKeys,
  normalizeGatewayModels,
  normalizeGatewayUsageRecords,
  normalizeGatewayStats,
} from "@/lib/gateway/normalizers";

describe("gateway constants", () => {
  it("keeps management and model API bases separate", () => {
    expect(GATEWAY_ORIGIN).toBe("https://sub.tohoqing.com");
    expect(GATEWAY_MANAGEMENT_BASE_URL).toBe("https://sub.tohoqing.com/api/v1");
    expect(GATEWAY_MODEL_BASE_URL).toBe("https://sub.tohoqing.com/v1");
    expect(GATEWAY_MODEL_BASE_URL).not.toContain("/api/v1");
  });
});

describe("normalizeGatewayStats", () => {
  it("normalizes the gateway dashboard metrics shape", () => {
    expect(
      normalizeGatewayStats({
        data: {
          balance: 975325,
          today_usage: 1405,
          today_tokens: 4680870,
          total_usage: 669700,
          today_requests: 1628,
          total_requests: 66000,
        },
      }),
    ).toEqual({
      balance: 975325,
      todayUsage: 1405,
      todayTokens: 4680870,
      totalUsage: 669700,
      todayRequests: 1628,
      totalRequests: 66000,
    });
  });
});

describe("normalizeGatewayKeys", () => {
  it("preserves order and maps key/token secrets", () => {
    expect(
      normalizeGatewayKeys({
        data: [
          { id: "main", name: "Main", key: "sk-main" },
          { id: "spare", name: "Spare", token: "sk-spare" },
        ],
      }),
    ).toEqual([
      {
        id: "main",
        name: "Main",
        secret: "sk-main",
        prefix: undefined,
        status: undefined,
        createdAt: undefined,
        lastUsedAt: undefined,
      },
      {
        id: "spare",
        name: "Spare",
        secret: "sk-spare",
        prefix: undefined,
        status: undefined,
        createdAt: undefined,
        lastUsedAt: undefined,
      },
    ]);
  });

  it("normalizes singleton key objects", () => {
    expect(normalizeGatewayKeys({ id: "k1", name: "Main", key: "sk" })).toEqual([
      {
        id: "k1",
        name: "Main",
        secret: "sk",
        prefix: undefined,
        status: undefined,
        createdAt: undefined,
        lastUsedAt: undefined,
      },
    ]);
  });
});

describe("normalizeGatewayUsageRecords", () => {
  it("derives totalTokens when total_tokens is missing", () => {
    expect(
      normalizeGatewayUsageRecords({
        data: [
          {
            id: "req-1",
            prompt_tokens: 10,
            completion_tokens: 5,
            cost: 1.25,
          },
        ],
      }),
    ).toEqual([
      {
        id: "req-1",
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        cost: 1.25,
        createdAt: undefined,
        model: undefined,
        apiKeyName: undefined,
        status: undefined,
      },
    ]);
  });
});

describe("normalizeGatewayModels", () => {
  it("normalizes channel metadata and defaults enabled on OpenAI list payloads", () => {
    expect(
      normalizeGatewayModels({
        data: {
          channel: "openai",
          models: [
            { id: "gpt-5.5", name: "GPT-5.5", provider: "openai" },
            { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic" },
          ],
        },
      }),
    ).toEqual([
      {
        id: "gpt-5.5",
        name: "GPT-5.5",
        provider: "openai",
        enabled: true,
        priceText: undefined,
        contextWindow: undefined,
      },
      {
        id: "claude-sonnet-4-20250514",
        name: "Claude Sonnet 4",
        provider: "anthropic",
        enabled: true,
        priceText: undefined,
        contextWindow: undefined,
      },
    ]);
  });

  it("uses singleton model name when id is missing", () => {
    expect(
      normalizeGatewayModels({ name: "GPT-5.5", provider: "openai" }),
    ).toEqual([
      {
        id: "GPT-5.5",
        name: "GPT-5.5",
        provider: "openai",
        enabled: true,
        priceText: undefined,
        contextWindow: undefined,
      },
    ]);
  });

  it("preserves wrapper provider hints for data arrays", () => {
    expect(normalizeGatewayModels({ provider: "openai", data: [{ id: "x" }] })).toEqual([
      {
        id: "x",
        name: "x",
        provider: "openai",
        enabled: true,
        priceText: undefined,
        contextWindow: undefined,
      },
    ]);
  });

  it("defaults OpenAI list items to id for name and enabled true", () => {
    expect(
      normalizeGatewayModels({
        data: {
          object: "list",
          data: [{ id: "x", object: "model" }],
        },
      }),
    ).toEqual([
      {
        id: "x",
        name: "x",
        enabled: true,
        provider: undefined,
        priceText: undefined,
        contextWindow: undefined,
      },
    ]);
  });

  it("treats disabled status as enabled false", () => {
    expect(
      normalizeGatewayModels({
        data: [
          { id: "x", object: "model", status: "disabled" },
          { id: "y", object: "model", state: "inactive" },
        ],
      }),
    ).toEqual([
      {
        id: "x",
        name: "x",
        enabled: false,
        provider: undefined,
        priceText: undefined,
        contextWindow: undefined,
      },
      {
        id: "y",
        name: "y",
        enabled: false,
        provider: undefined,
        priceText: undefined,
        contextWindow: undefined,
      },
    ]);
  });
});

describe("normalizeGatewayPaymentChannels", () => {
  it("treats disabled status as enabled false", () => {
    expect(
      normalizeGatewayPaymentChannels({
        data: [
          { id: "channel-1", name: "One", status: "disabled" },
          { id: "channel-2", name: "Two", state: "inactive" },
        ],
      }),
    ).toEqual([
      { id: "channel-1", name: "One", enabled: false },
      { id: "channel-2", name: "Two", enabled: false },
    ]);
  });
});

describe("normalizeGatewayOrders", () => {
  it("normalizes singleton order objects", () => {
    expect(normalizeGatewayOrders({ id: "o1", amount: 10 })).toEqual([
      {
        id: "o1",
        amount: 10,
        orderNo: undefined,
        status: undefined,
        createdAt: undefined,
        paidAt: undefined,
        paymentUrl: undefined,
      },
    ]);
  });
});
