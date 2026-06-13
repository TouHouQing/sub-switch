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
  normalizeGatewayKeyGroups,
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

  it("normalizes the official dashboard cost field names", () => {
    expect(
      normalizeGatewayStats({
        data: {
          today_actual_cost: 1.2345,
          total_actual_cost: 98.7654,
          today_tokens: 12000,
          today_requests: 12,
          total_requests: 345,
        },
      }),
    ).toEqual({
      balance: 0,
      todayUsage: 1.2345,
      todayTokens: 12000,
      totalUsage: 98.7654,
      todayRequests: 12,
      totalRequests: 345,
    });
  });
});

describe("normalizeGatewayKeys", () => {
  it("preserves order and maps key/token secrets", () => {
    expect(
      normalizeGatewayKeys({
        data: [
          { id: "main", name: "Main", key: "sk-main" },
          {
            id: "spare",
            name: "Spare",
            token: "sk-spare",
            group_id: "group-openai",
            group: { name: "OpenAI", platform: "openai" },
          },
        ],
      }),
    ).toEqual([
      {
        id: "main",
        name: "Main",
        secret: "sk-main",
        prefix: undefined,
        status: undefined,
        groupId: undefined,
        groupName: undefined,
        createdAt: undefined,
        lastUsedAt: undefined,
      },
      {
        id: "spare",
        name: "Spare",
        secret: "sk-spare",
        prefix: undefined,
        status: undefined,
        groupId: "group-openai",
        groupName: "OpenAI",
        createdAt: undefined,
        lastUsedAt: undefined,
      },
    ]);
  });

  it("normalizes singleton key objects", () => {
    expect(normalizeGatewayKeys({ id: "k1", name: "Main", key: "sk" })).toEqual(
      [
        {
          id: "k1",
          name: "Main",
          secret: "sk",
          prefix: undefined,
          status: undefined,
          groupId: undefined,
          groupName: undefined,
          createdAt: undefined,
          lastUsedAt: undefined,
        },
      ],
    );
  });
});

describe("normalizeGatewayKeyGroups", () => {
  it("normalizes official available groups", () => {
    expect(
      normalizeGatewayKeyGroups({
        data: [
          {
            id: "group-openai",
            name: "OpenAI",
            platform: "openai",
            description: "通用模型组",
            rate: 1.2,
            user_rate: 1,
          },
        ],
      }),
    ).toEqual([
      {
        id: "group-openai",
        name: "OpenAI",
        platform: "openai",
        description: "通用模型组",
        rate: 1.2,
        userRate: 1,
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

  it("normalizes official usage records with nested API key data", () => {
    expect(
      normalizeGatewayUsageRecords({
        data: {
          items: [
            {
              id: 1001,
              input_tokens: 3000,
              output_tokens: 700,
              cache_read_tokens: 50,
              cache_creation_tokens: 25,
              actual_cost: "0.012345",
              total_cost: "0.024690",
              created_at: "2026-06-12T10:00:00Z",
              model: "gpt-5.5",
              api_key: { name: "Main" },
              status: "success",
            },
          ],
          total: 1,
        },
      }),
    ).toEqual([
      {
        id: "1001",
        promptTokens: 3000,
        completionTokens: 700,
        totalTokens: 3775,
        cost: 0.012345,
        createdAt: "2026-06-12T10:00:00Z",
        model: "gpt-5.5",
        apiKeyName: "Main",
        status: "success",
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
            {
              id: "claude-sonnet-4-20250514",
              name: "Claude Sonnet 4",
              provider: "anthropic",
            },
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
    expect(
      normalizeGatewayModels({ provider: "openai", data: [{ id: "x" }] }),
    ).toEqual([
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
  it("normalizes official checkout method maps", () => {
    expect(
      normalizeGatewayPaymentChannels({
        data: {
          methods: {
            alipay: {
              available: true,
              single_min: 5,
              single_max: 200,
              fee_rate: 1.5,
              currency: "CNY",
            },
            wxpay: { available: false, single_min: 10 },
          },
        },
      }),
    ).toEqual([
      {
        id: "alipay",
        name: "alipay",
        enabled: true,
        minAmount: 5,
        maxAmount: 200,
        feeRate: 1.5,
        currency: "CNY",
      },
      {
        id: "wxpay",
        name: "wxpay",
        enabled: false,
        minAmount: 10,
        maxAmount: undefined,
        feeRate: undefined,
        currency: undefined,
      },
    ]);
  });

  it("uses official payment method type fields as the channel id", () => {
    expect(
      normalizeGatewayPaymentChannels({
        data: [
          { type: "alipay", name: "Alipay", available: true },
          { payment_type: "wxpay", title: "WeChat Pay", available: false },
        ],
      }),
    ).toEqual([
      { id: "alipay", name: "Alipay", enabled: true },
      { id: "wxpay", name: "WeChat Pay", enabled: false },
    ]);
  });

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

  it("normalizes official paginated order and payment link aliases", () => {
    expect(
      normalizeGatewayOrders({
        data: {
          items: [
            {
              order_id: 88,
              out_trade_no: "THQ202606120001",
              actual_amount: "20.5",
              status: "PENDING",
              created_at: "2026-06-12T11:00:00Z",
              pay_url: "https://pay.example/checkout",
              qr_code: "https://qr.example/alipay",
              payment_mode: "qrcode",
              expires_at: "2026-06-12T11:10:00Z",
            },
          ],
          total: 1,
        },
      }),
    ).toEqual([
      {
        id: "88",
        amount: 20.5,
        orderNo: "THQ202606120001",
        status: "PENDING",
        createdAt: "2026-06-12T11:00:00Z",
        paidAt: undefined,
        paymentUrl: "https://pay.example/checkout",
        qrCode: "https://qr.example/alipay",
        paymentMode: "qrcode",
        expiresAt: "2026-06-12T11:10:00Z",
      },
    ]);
  });
});
