import { GATEWAY_SESSION_STORAGE_KEY } from "@/lib/gateway/constants";
import type { GatewaySession } from "@/types/gateway";

const isGatewaySession = (value: unknown): value is GatewaySession => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<GatewaySession>;
  return (
    typeof record.accessToken === "string" &&
    record.accessToken.length > 0 &&
    typeof record.refreshToken === "string" &&
    record.refreshToken.length > 0 &&
    typeof record.expiresAt === "number" &&
    Number.isFinite(record.expiresAt)
  );
};

export const loadGatewaySession = (): GatewaySession | null => {
  try {
    const raw = localStorage.getItem(GATEWAY_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isGatewaySession(parsed) ? parsed : null;
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
