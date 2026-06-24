import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayApiClient } from "@/lib/gateway/api";
import type { GatewaySession } from "@/types/gateway";
import { server } from "../msw/server";
import { http, HttpResponse } from "msw";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const textResponse = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain" },
  });

const fetchInputUrl = (input: Parameters<typeof fetch>[0]): string =>
  typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

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
      saveSession: (nextSession) => {
        session = nextSession;
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
      "https://sub.tohoqing.com/api/v1/keys",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-1",
        }),
      }),
    );
  });

  it("creates API keys with the selected numeric official group id", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ data: { id: "key-1", name: "Desktop Client" } }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: [] }));

    await client.createKey({ name: "Desktop Client", groupId: "123" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://sub.tohoqing.com/api/v1/keys",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Desktop Client",
          group_id: 123,
        }),
      }),
    );
  });

  it("updates existing API key groups through the official key update endpoint with numeric group ids", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: "key-1" } }));

    await client.updateKey("key-1", { groupId: "456" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sub.tohoqing.com/api/v1/keys/key-1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ group_id: 456 }),
      }),
    );
  });

  it("loads available key groups from the official groups endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            id: "group-openai",
            name: "OpenAI",
            platform: "openai",
            user_rate: 1,
          },
        ],
      }),
    );

    await expect(client.keyGroups()).resolves.toEqual([
      {
        id: "group-openai",
        name: "OpenAI",
        platform: "openai",
        description: undefined,
        rate: undefined,
        userRate: 1,
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sub.tohoqing.com/api/v1/groups/available",
      expect.any(Object),
    );
  });

  it("loads the user profile from the official profile endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          id: 42,
          email: "owner@tohoqing.com",
          username: "owner",
          balance: 123.45,
        },
      }),
    );

    const profile = await client.profile();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sub.tohoqing.com/api/v1/user/profile",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-1",
        }),
      }),
    );
    expect(profile).toMatchObject({
      id: "42",
      email: "owner@tohoqing.com",
      username: "owner",
      balance: 123.45,
    });
  });

  it("uses the official profile endpoint for me()", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 42 } }));

    await client.me();

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://sub.tohoqing.com/api/v1/user/profile",
    );
  });

  it("uses the model base URL and provided API key for model requests", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await client.modelsWithApiKey("sk-test");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sub.tohoqing.com/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test",
        }),
      }),
    );
    expect(fetchMock.mock.calls[0]?.[0]).not.toContain("/api/v1");
  });

  it("merges profile balance into dashboard stats", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            today_actual_cost: 1.5,
            total_actual_cost: 9.25,
            today_tokens: 1000,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            id: 42,
            balance: 123.45,
          },
        }),
      );

    await expect(client.dashboardStats()).resolves.toMatchObject({
      balance: 123.45,
      todayUsage: 1.5,
      totalUsage: 9.25,
      todayTokens: 1000,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://sub.tohoqing.com/api/v1/usage/dashboard/stats",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://sub.tohoqing.com/api/v1/user/profile",
      expect.any(Object),
    );
  });

  it("creates payment orders with the official checkout payload", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          order_id: 88,
          amount: 20,
          pay_url: "https://pay.example/checkout",
        },
      }),
    );

    await expect(
      client.createPaymentOrder({
        planId: "plan-1",
        amount: 20,
        paymentType: "alipay",
        orderType: "subscription",
      }),
    ).resolves.toMatchObject({
      id: "88",
      amount: 20,
      paymentUrl: "https://pay.example/checkout",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sub.tohoqing.com/api/v1/payment/orders",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          amount: 20,
          payment_type: "alipay",
          order_type: "subscription",
          is_mobile: false,
          payment_source: "hosted_redirect",
          plan_id: "plan-1",
          return_url: "https://sub.tohoqing.com/payment/result",
        }),
      }),
    );
  });

  it("creates balance recharge orders without subscription plan ids", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          order_id: 89,
          amount: 50,
          pay_url: "https://pay.example/recharge",
        },
      }),
    );

    await expect(
      client.createPaymentOrder({
        amount: 50,
        paymentType: "alipay_direct",
        orderType: "balance",
      }),
    ).resolves.toMatchObject({
      id: "89",
      amount: 50,
      paymentUrl: "https://pay.example/recharge",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sub.tohoqing.com/api/v1/payment/orders",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          amount: 50,
          payment_type: "alipay",
          order_type: "balance",
          is_mobile: false,
          payment_source: "hosted_redirect",
          return_url: "https://sub.tohoqing.com/payment/result",
        }),
      }),
    );
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain("plan_id");
  });

  it("requests desktop QR-code payment for Alipay balance recharge", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          order_id: 90,
          amount: 20,
          qr_code: "https://qr.example/alipay",
          payment_mode: "qrcode",
        },
      }),
    );

    await expect(
      client.createPaymentOrder({
        amount: 20,
        paymentType: "alipay",
        orderType: "balance",
        forceQRCode: true,
      }),
    ).resolves.toMatchObject({
      id: "90",
      qrCode: "https://qr.example/alipay",
      paymentMode: "qrcode",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sub.tohoqing.com/api/v1/payment/orders",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"is_mobile":false'),
      }),
    );
  });

  it("loads payment channels from the official checkout info endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          methods: {
            alipay: { available: true, single_min: 10 },
          },
        },
      }),
    );

    await expect(client.paymentChannels()).resolves.toEqual([
      {
        id: "alipay",
        name: "alipay",
        enabled: true,
        minAmount: 10,
        maxAmount: undefined,
        feeRate: undefined,
        currency: undefined,
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sub.tohoqing.com/api/v1/payment/checkout-info",
      expect.any(Object),
    );
  });

  it("refreshes once after a management 401 and retries the original request", async () => {
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
      "https://sub.tohoqing.com/api/v1/auth/refresh",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://sub.tohoqing.com/api/v1/keys",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-2",
        }),
      }),
    );
    expect(session?.accessToken).toBe("access-2");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("refreshes before management requests when the session is near expiry", async () => {
    session = {
      accessToken: "almost-expired",
      refreshToken: "refresh-1",
      expiresAt: Date.now() + 60_000,
    };
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "fresh-access",
          refreshToken: "fresh-refresh",
          expiresAt: Date.now() + 3_600_000,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: [] }));

    await client.keys();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://sub.tohoqing.com/api/v1/auth/refresh",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://sub.tohoqing.com/api/v1/keys",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fresh-access",
        }),
      }),
    );
    expect(session?.refreshToken).toBe("fresh-refresh");
  });

  it("treats numeric expires_at as an absolute unix timestamp in seconds", async () => {
    const expiresAtSeconds = Math.floor((Date.now() + 3_600_000) / 1000);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access_token: "access-absolute",
        refresh_token: "refresh-absolute",
        expires_at: expiresAtSeconds,
      }),
    );

    await client.login("a@example.com", "secret123");

    expect(session?.expiresAt).toBe(expiresAtSeconds * 1000);
  });

  it("clears the session when refresh fails", async () => {
    session = {
      accessToken: "almost-expired",
      refreshToken: "refresh-1",
      expiresAt: Date.now() + 60_000,
    };
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: "refresh failed" }, 401),
    );

    await expect(client.keys()).rejects.toThrow("refresh failed");

    expect(session).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sub.tohoqing.com/api/v1/auth/refresh",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("keeps the session when refresh hits a temporary server error", async () => {
    const previousSession = {
      accessToken: "almost-expired",
      refreshToken: "refresh-1",
      expiresAt: Date.now() + 60_000,
    };
    session = previousSession;
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: "try later" }, 500),
    );

    await expect(client.keys()).rejects.toThrow("try later");

    expect(session).toEqual(previousSession);
  });

  it("normalizes non-json gateway errors", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("upstream unavailable", 502));

    await expect(client.keys()).rejects.toThrow(
      "Gateway request failed with 502: upstream unavailable",
    );
  });

  it("routes the default client through the Tauri backend to avoid WebView CORS failures", async () => {
    session = null;
    const originalFetch = globalThis.fetch;
    const browserFetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = fetchInputUrl(input);
        if (url.startsWith("https://sub.tohoqing.com")) {
          return Promise.reject(
            new Error("direct gateway fetch should not be used"),
          );
        }
        return originalFetch(input, init);
      });

    server.use(
      http.post(
        "http://tauri.local/gateway_http_request",
        async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          expect(body).toMatchObject({
            url: "https://sub.tohoqing.com/api/v1/auth/login",
            method: "POST",
            body: JSON.stringify({
              email: "owner@tohoqing.com",
              password: "secret123",
            }),
          });
          const headers = body.headers as Record<string, string>;
          expect(headers.accept ?? headers.Accept).toBe("application/json");
          expect(headers["content-type"] ?? headers["Content-Type"]).toBe(
            "application/json",
          );
          return HttpResponse.json({
            status: 200,
            body: {
              access_token: "access-tauri",
              refresh_token: "refresh-tauri",
              expires_in: 3600,
            },
          });
        },
      ),
    );

    const defaultClient = new GatewayApiClient({
      loadSession: () => session,
      saveSession: (nextSession) => {
        session = nextSession;
      },
      clearSession: () => {
        session = null;
      },
    });

    await expect(
      defaultClient.login("owner@tohoqing.com", "secret123"),
    ).resolves.toMatchObject({
      accessToken: "access-tauri",
      refreshToken: "refresh-tauri",
    });
    expect(
      browserFetch.mock.calls.some(([input]) =>
        fetchInputUrl(input).startsWith("https://sub.tohoqing.com"),
      ),
    ).toBe(false);
  });

  it("handles empty successful Tauri gateway responses", async () => {
    server.use(
      http.post("http://tauri.local/gateway_http_request", () =>
        HttpResponse.json({ status: 204, body: null }),
      ),
    );

    const defaultClient = new GatewayApiClient({
      loadSession: () => session,
      saveSession: (nextSession) => {
        session = nextSession;
      },
      clearSession: () => {
        session = null;
      },
    });

    await expect(defaultClient.logout()).resolves.toBeUndefined();
  });
});
