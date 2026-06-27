import { describe, expect, it } from "vitest";
import type { AppId } from "@/lib/api";
import { CLAUDE_DESKTOP_ROLE_ROUTE_IDS } from "@/config/claudeDesktopProviderPresets";
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
      'model_provider = "custom"',
    );
    expect(String(provider.settingsConfig.config)).toContain(
      "[model_providers.custom]",
    );
    expect(String(provider.settingsConfig.config)).toContain(
      'name = "THQ"',
    );
    expect(String(provider.settingsConfig.config)).toContain(
      'base_url = "https://sub.tohoqing.com/v1"',
    );
    expect(String(provider.settingsConfig.config)).toContain(
      'wire_api = "responses"',
    );
  });

  it("pins Codex gateway config below the upstream truncation point", () => {
    const provider = buildGatewayProviderForApp("codex", {
      apiKey: "sk-thq",
      models: [{ id: "gpt-5.5", name: "GPT-5.5", enabled: true }],
    });
    const config = String(provider.settingsConfig.config);

    expect(config).toContain("model_context_window = 600000");
    expect(config).toContain("model_auto_compact_token_limit = 220000");
    expect(config).toContain('model_auto_compact_token_limit_scope = "total"');
    expect(config).not.toContain("disable_response_storage");
  });

  it("uses Claude Desktop proxy mode with safe role routes for gateway models", () => {
    const provider = buildGatewayProviderForApp("claude-desktop", {
      apiKey: "sk-thq",
      models: [{ id: "gpt-5.5", name: "GPT 5.5", enabled: true }],
    });

    expect(provider.meta).toMatchObject({
      apiFormat: "openai_responses",
      claudeDesktopMode: "proxy",
      claudeDesktopModelRoutes: {
        [CLAUDE_DESKTOP_ROLE_ROUTE_IDS.sonnet]: {
          model: "gpt-5.5",
          labelOverride: "GPT 5.5",
        },
        [CLAUDE_DESKTOP_ROLE_ROUTE_IDS.opus]: {
          model: "gpt-5.5",
          labelOverride: "GPT 5.5",
        },
        [CLAUDE_DESKTOP_ROLE_ROUTE_IDS.haiku]: {
          model: "gpt-5.5",
          labelOverride: "GPT 5.5",
        },
      },
    });
  });
});
