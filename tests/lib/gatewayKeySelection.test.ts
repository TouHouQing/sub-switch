import { beforeEach, describe, expect, it } from "vitest";
import type { GatewayApiKey } from "@/types/gateway";
import {
  clearStoredGatewaySelectedKeyId,
  loadGatewaySelectedKeyId,
  resolveGatewayKeySelection,
  saveGatewaySelectedKeyId,
} from "@/lib/gateway/keySelection";
import { gatewayKeys } from "@/lib/query/gateway";

const keys: GatewayApiKey[] = [
  { id: "key-1", name: "First" },
  { id: "key-2", name: "Second" },
];

describe("gateway key selection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to the first key", () => {
    expect(resolveGatewayKeySelection(keys)).toEqual({
      status: "ready",
      selectedKey: keys[0],
    });
  });

  it("prefers the stored key when it still exists", () => {
    saveGatewaySelectedKeyId("key-2");

    expect(resolveGatewayKeySelection(keys)).toEqual({
      status: "ready",
      selectedKey: keys[1],
    });
  });

  it("falls back to the first key when the stored key is stale", () => {
    saveGatewaySelectedKeyId("missing-key");

    expect(resolveGatewayKeySelection(keys)).toEqual({
      status: "ready",
      selectedKey: keys[0],
    });
  });

  it("returns empty selection when no keys exist", () => {
    expect(resolveGatewayKeySelection([])).toEqual({
      status: "empty",
      selectedKey: null,
    });
  });

  it("clears the stored id and restores first-key behavior", () => {
    saveGatewaySelectedKeyId("key-2");
    clearStoredGatewaySelectedKeyId();

    expect(loadGatewaySelectedKeyId()).toBeNull();
    expect(resolveGatewayKeySelection(keys)).toEqual({
      status: "ready",
      selectedKey: keys[0],
    });
  });
});

describe("gateway query keys", () => {
  it("does not expose raw API keys in model query keys", () => {
    const rawKey = "sk-secret-value";
    const queryKey = gatewayKeys.models(rawKey);

    expect(queryKey).not.toContain(rawKey);
    expect(queryKey).toEqual(["gateway", "models", expect.stringMatching(/^with-key-/)]);
  });
});
