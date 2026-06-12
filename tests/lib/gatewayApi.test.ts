import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayApiClient } from "@/lib/gateway/api";
import type { GatewaySession } from "@/types/gateway";

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
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "refresh failed" }, 401));

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
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "try later" }, 500));

    await expect(client.keys()).rejects.toThrow("try later");

    expect(session).toEqual(previousSession);
  });

  it("normalizes non-json gateway errors", async () => {
    fetchMock.mockResolvedValueOnce(textResponse("upstream unavailable", 502));

    await expect(client.keys()).rejects.toThrow(
      "Gateway request failed with 502: upstream unavailable",
    );
  });
});
