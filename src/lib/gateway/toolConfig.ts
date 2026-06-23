import type { AppId } from "@/lib/api";
import {
  GATEWAY_DEFAULT_CLAUDE_MODEL,
  GATEWAY_DEFAULT_GEMINI_MODEL,
  GATEWAY_DEFAULT_MODEL,
  GATEWAY_MODEL_BASE_URL,
  GATEWAY_ORIGIN,
  GATEWAY_PROVIDER_ID,
  GATEWAY_PROVIDER_NAME,
} from "@/lib/gateway/constants";
import type { GatewayModel } from "@/types/gateway";
import type { OpenClawModel, Provider } from "@/types";

interface BuildGatewayProviderOptions {
  apiKey: string;
  models: GatewayModel[];
}

const modelIds = (models: GatewayModel[]): string[] => {
  const ids = models
    .filter((model) => model.enabled)
    .map((model) => model.id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : [GATEWAY_DEFAULT_MODEL];
};

const namedModel = (models: GatewayModel[], fallback: string): string =>
  modelIds(models)[0] ?? fallback;

const CODEX_GATEWAY_PROVIDER_ID = "custom";

const baseProvider = (
  settingsConfig: Provider["settingsConfig"],
): Provider => ({
  id: GATEWAY_PROVIDER_ID,
  name: GATEWAY_PROVIDER_NAME,
  settingsConfig,
  websiteUrl: GATEWAY_ORIGIN,
  category: "aggregator",
  icon: "openai",
  iconColor: "#0EA5E9",
  meta: {
    apiFormat: "openai_responses",
  },
  inFailoverQueue: false,
});

const tomlString = (value: string): string => JSON.stringify(value);

const buildCodexConfig = (models: GatewayModel[]): string => {
  const model = namedModel(models, GATEWAY_DEFAULT_MODEL);
  return `model_provider = "${CODEX_GATEWAY_PROVIDER_ID}"
model = ${tomlString(model)}
model_reasoning_effort = "high"
disable_response_storage = true

[model_providers.${CODEX_GATEWAY_PROVIDER_ID}]
name = ${tomlString(GATEWAY_PROVIDER_NAME)}
base_url = ${tomlString(GATEWAY_MODEL_BASE_URL)}
wire_api = "responses"
requires_openai_auth = true`;
};

const buildOpenCodeModels = (models: GatewayModel[]) =>
  Object.fromEntries(
    modelIds(models).map((id) => [
      id,
      {
        name: id,
      },
    ]),
  );

const buildOpenClawModels = (models: GatewayModel[]): OpenClawModel[] =>
  modelIds(models).map((id) => ({
    id,
    name: id,
  }));

export const buildGatewayProviderForApp = (
  appId: AppId,
  options: BuildGatewayProviderOptions,
): Provider => {
  const { apiKey, models } = options;

  if (appId === "claude" || appId === "claude-desktop") {
    const defaultModel = namedModel(models, GATEWAY_DEFAULT_CLAUDE_MODEL);
    const claudeDesktopModelRoutes =
      appId === "claude-desktop"
        ? {
            "claude-haiku-4-5": {
              model: defaultModel,
              labelOverride: defaultModel,
              supports1m: true,
            },
            "claude-sonnet-4-6": {
              model: defaultModel,
              labelOverride: defaultModel,
              supports1m: true,
            },
            "claude-opus-4-8": {
              model: defaultModel,
              labelOverride: defaultModel,
              supports1m: true,
            },
          }
        : undefined;

    return {
      ...baseProvider({
        env: {
          ANTHROPIC_BASE_URL: GATEWAY_MODEL_BASE_URL,
          ANTHROPIC_AUTH_TOKEN: apiKey,
          ANTHROPIC_MODEL: defaultModel,
          ANTHROPIC_DEFAULT_HAIKU_MODEL: defaultModel,
          ANTHROPIC_DEFAULT_SONNET_MODEL: defaultModel,
          ANTHROPIC_DEFAULT_OPUS_MODEL: defaultModel,
        },
      }),
      meta: {
        apiFormat: "openai_responses",
        claudeDesktopMode: appId === "claude-desktop" ? "proxy" : undefined,
        claudeDesktopModelRoutes,
      },
    };
  }

  if (appId === "codex") {
    return baseProvider({
      auth: {
        OPENAI_API_KEY: apiKey,
      },
      config: buildCodexConfig(models),
    });
  }

  if (appId === "gemini") {
    return baseProvider({
      env: {
        GOOGLE_GEMINI_BASE_URL: GATEWAY_MODEL_BASE_URL,
        GEMINI_API_KEY: apiKey,
        GEMINI_MODEL: namedModel(models, GATEWAY_DEFAULT_GEMINI_MODEL),
      },
    });
  }

  if (appId === "opencode") {
    return baseProvider({
      npm: "@ai-sdk/openai-compatible",
      name: GATEWAY_PROVIDER_NAME,
      options: {
        baseURL: GATEWAY_MODEL_BASE_URL,
        apiKey,
      },
      models: buildOpenCodeModels(models),
    });
  }

  if (appId === "openclaw") {
    return baseProvider({
      baseUrl: GATEWAY_MODEL_BASE_URL,
      apiKey,
      api: "openai-completions",
      models: buildOpenClawModels(models),
    });
  }

  return baseProvider({
    name: GATEWAY_PROVIDER_NAME,
    base_url: GATEWAY_MODEL_BASE_URL,
    api_key: apiKey,
    api_mode: "responses",
    models: modelIds(models).map((id) => ({
      default: id,
      provider: GATEWAY_PROVIDER_ID,
      base_url: GATEWAY_MODEL_BASE_URL,
    })),
  });
};
