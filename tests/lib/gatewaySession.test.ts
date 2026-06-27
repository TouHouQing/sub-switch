import { beforeEach, describe, expect, it } from "vitest";
import { GATEWAY_SESSION_STORAGE_KEY } from "@/lib/gateway/constants";
import {
  clearGatewaySession,
  isGatewaySessionExpired,
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
      expiresAt: Date.now() + 1_800_000,
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
    expect(localStorage.getItem(GATEWAY_SESSION_STORAGE_KEY)).toBeNull();

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

  it("keeps structurally valid expired sessions so requests can refresh them", () => {
    const session = {
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: Date.now() - 1,
    };
    localStorage.setItem(
      GATEWAY_SESSION_STORAGE_KEY,
      JSON.stringify(session),
    );

    expect(loadGatewaySession()).toEqual(session);
  });

  it("detects expired sessions", () => {
    const now = 1_000_000;

    expect(
      isGatewaySessionExpired({
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: now,
      }, now),
    ).toBe(true);

    expect(
      isGatewaySessionExpired({
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: now + 1,
      }, now),
    ).toBe(false);
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
