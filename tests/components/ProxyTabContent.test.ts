import { describe, expect, it, vi } from "vitest";
import { enableDefaultProxyTakeovers } from "@/components/settings/ProxyTabContent";

describe("enableDefaultProxyTakeovers", () => {
  it("enables Claude, Codex, and Gemini takeover by default", async () => {
    const setTakeoverForApp = vi.fn().mockResolvedValue(undefined);

    await enableDefaultProxyTakeovers(setTakeoverForApp);

    expect(setTakeoverForApp).toHaveBeenCalledTimes(3);
    expect(setTakeoverForApp.mock.calls).toEqual([
      [{ appType: "claude", enabled: true }],
      [{ appType: "codex", enabled: true }],
      [{ appType: "gemini", enabled: true }],
    ]);
  });
});
