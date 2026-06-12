import { describe, expect, it } from "vitest";
import type { AppId } from "@/lib/api";
import { GATEWAY_MODEL_BASE_URL } from "@/lib/gateway/constants";
import { buildGatewayProviderForApp } from "@/lib/gateway/toolConfig";

const apps: AppId[] = [
  "claude",
  "claude-desktop",
  "codex",
  "gemini",
  "opencode",
  "openclaw",
  "hermes",
];

describe("THQ gateway tool config", () => {
  it.each(apps)(
    "builds a fixed provider for %s without management API base",
    (appId) => {
      const provider = buildGatewayProviderForApp(appId, {
        apiKey: "sk-thq",
        models: [{ id: "gpt-5.5", name: "GPT-5.5", enabled: true }],
      });
      const serialized = JSON.stringify(provider);

      expect(provider.id).toBe("thq-gateway");
      expect(serialized).toContain(GATEWAY_MODEL_BASE_URL);
      expect(serialized).toContain("sk-thq");
      expect(serialized).not.toContain("https://sub.tohoqing.com/api/v1");
    },
  );

  it("uses responses wire api for Codex", () => {
    const provider = buildGatewayProviderForApp("codex", {
      apiKey: "sk-thq",
      models: [],
    });

    expect(String(provider.settingsConfig.config)).toContain(
      'base_url = "https://sub.tohoqing.com/v1"',
    );
    expect(String(provider.settingsConfig.config)).toContain(
      'wire_api = "responses"',
    );
  });
});
