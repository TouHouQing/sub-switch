import { GATEWAY_SELECTED_KEY_STORAGE_KEY } from "@/lib/gateway/constants";
import type { GatewayApiKey, GatewayKeySelection } from "@/types/gateway";

const isBrowserStorageAvailable = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const loadGatewaySelectedKeyId = (): string | null => {
  if (!isBrowserStorageAvailable()) return null;
  try {
    return window.localStorage.getItem(GATEWAY_SELECTED_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const saveGatewaySelectedKeyId = (keyId: string): void => {
  if (!isBrowserStorageAvailable()) return;
  try {
    window.localStorage.setItem(GATEWAY_SELECTED_KEY_STORAGE_KEY, keyId);
  } catch {
    // Ignore storage failures so selection remains best-effort.
  }
};

export const clearStoredGatewaySelectedKeyId = (): void => {
  if (!isBrowserStorageAvailable()) return;
  try {
    window.localStorage.removeItem(GATEWAY_SELECTED_KEY_STORAGE_KEY);
  } catch {
    // Ignore storage failures so callers can still proceed.
  }
};

export const resolveGatewayKeySelection = (
  keys: GatewayApiKey[],
  storedKeyId = loadGatewaySelectedKeyId(),
): GatewayKeySelection => {
  if (keys.length === 0) {
    return { status: "empty", selectedKey: null };
  }

  if (storedKeyId) {
    const storedKey = keys.find((key) => key.id === storedKeyId);
    if (storedKey) {
      return { status: "ready", selectedKey: storedKey };
    }
  }

  return { status: "ready", selectedKey: keys[0] ?? null };
};
