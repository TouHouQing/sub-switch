import { beforeEach, describe, expect, it } from "vitest";
import { GATEWAY_SESSION_STORAGE_KEY } from "@/lib/gateway/constants";
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
    const session = {
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: 1_800_000,
      user: { id: "u1", email: "a@example.com" },
    };

    saveGatewaySession(session);

    expect(loadGatewaySession()).toEqual(session);
    clearGatewaySession();
    expect(loadGatewaySession()).toBeNull();
  });

  it("returns null for malformed or incomplete stored session data", () => {
    localStorage.setItem(GATEWAY_SESSION_STORAGE_KEY, "{bad json");
    expect(loadGatewaySession()).toBeNull();

    localStorage.setItem(
      GATEWAY_SESSION_STORAGE_KEY,
      JSON.stringify({ accessToken: "access", expiresAt: 1_800_000 }),
    );
    expect(loadGatewaySession()).toBeNull();

    localStorage.setItem(
      GATEWAY_SESSION_STORAGE_KEY,
      JSON.stringify({
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: "tomorrow",
      }),
    );
    expect(loadGatewaySession()).toBeNull();
  });

  it("treats sessions expiring within five minutes as expiring", () => {
    const now = 1_000_000;

    expect(
      isGatewaySessionExpiring({
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: now + 5 * 60 * 1000,
      }, now),
    ).toBe(true);

    expect(
      isGatewaySessionExpiring({
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: now + 5 * 60 * 1000 + 1,
      }, now),
    ).toBe(false);
  });
});
