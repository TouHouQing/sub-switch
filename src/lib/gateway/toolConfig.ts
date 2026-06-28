import type { AppId } from "@/lib/api";
import { CLAUDE_DESKTOP_ROLE_ROUTE_IDS } from "@/config/claudeDesktopProviderPresets";
import { getCodexCustomTemplate } from "@/config/codexTemplates";
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

const hasMeaningfulClaudeModel = (values: unknown[]): boolean => {
  const configured = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    configured.length > 0 &&
    configured.some((value) => value !== GATEWAY_DEFAULT_CLAUDE_MODEL)
  );
};

const hasAnyClaudeModel = (values: unknown[]): boolean =>
  values.some((value) => typeof value === "string" && Boolean(value.trim()));

export const hasConfiguredGatewayProviderModels = (
  appId: AppId,
  provider: Provider | undefined,
): boolean => {
  if (!provider) return false;

  if (appId === "claude") {
    const env = provider.settingsConfig.env;
    if (!env || typeof env !== "object") return false;

    const values = [
      env.ANTHROPIC_MODEL,
      env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
      env.ANTHROPIC_DEFAULT_SONNET_MODEL,
      env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    ];

    return provider.meta?.gatewayModelMappingConfigured
      ? hasAnyClaudeModel(values)
      : hasMeaningfulClaudeModel(values);
  }

  if (appId === "claude-desktop") {
    const routes = provider.meta?.claudeDesktopModelRoutes;
    if (!routes || typeof routes !== "object") return false;

    const values = Object.values(routes).map((route) => route?.model);

    return provider.meta?.gatewayModelMappingConfigured
      ? hasAnyClaudeModel(values)
      : hasMeaningfulClaudeModel(values);
  }

  return true;
};

const namedModel = (models: GatewayModel[], fallback: string): string =>
  modelIds(models)[0] ?? fallback;

const namedGatewayModel = (
  models: GatewayModel[],
  fallback: string,
): { id: string; name: string } => {
  const selected = models.find((model) => model.enabled && model.id.trim());
  if (!selected) {
    return { id: fallback, name: fallback };
  }
  const id = selected.id.trim();
  return { id, name: selected.name.trim() || id };
};

const buildNamedGatewayModels = (
  models: GatewayModel[],
): Array<{
  id: string;
  name: string;
}> =>
  modelIds(models).map((id) => {
    const selected = models.find(
      (model) => model.enabled && model.id.trim() === id,
    );
    return {
      id,
      name: selected?.name.trim() || id,
    };
  });

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
  const template = getCodexCustomTemplate();
  const model = namedModel(models, GATEWAY_DEFAULT_MODEL);

  return template.config
    .replace('model = "gpt-5.5"', `model = ${tomlString(model)}`)
    .replace(
      '[model_providers.custom]\nname = "custom"',
      `[model_providers.custom]\nname = "custom"\nbase_url = ${tomlString(GATEWAY_MODEL_BASE_URL)}`,
    );
};

const buildOpenCodeModels = (models: GatewayModel[]) =>
  Object.fromEntries(
    buildNamedGatewayModels(models).map(({ id, name }) => [
      id,
      {
        name,
      },
    ]),
  );

const buildOpenClawModels = (models: GatewayModel[]): OpenClawModel[] =>
  buildNamedGatewayModels(models).map(({ id, name }) => ({
    id,
    name,
  }));

export const buildGatewayProviderForApp = (
  appId: AppId,
  options: BuildGatewayProviderOptions,
): Provider => {
  const { apiKey, models } = options;

  if (appId === "claude-desktop") {
    const model = namedGatewayModel(models, GATEWAY_DEFAULT_CLAUDE_MODEL);
    const route = () => ({
      model: model.id,
      labelOverride: model.name,
    });
    return {
      ...baseProvider({
        env: {
          ANTHROPIC_BASE_URL: GATEWAY_MODEL_BASE_URL,
          ANTHROPIC_AUTH_TOKEN: apiKey,
          ANTHROPIC_MODEL: model.id,
          ANTHROPIC_DEFAULT_HAIKU_MODEL: model.id,
          ANTHROPIC_DEFAULT_SONNET_MODEL: model.id,
          ANTHROPIC_DEFAULT_OPUS_MODEL: model.id,
        },
      }),
      meta: {
        apiFormat: "openai_responses",
        claudeDesktopMode: "proxy",
        claudeDesktopModelRoutes: {
          [CLAUDE_DESKTOP_ROLE_ROUTE_IDS.sonnet]: route(),
          [CLAUDE_DESKTOP_ROLE_ROUTE_IDS.opus]: route(),
          [CLAUDE_DESKTOP_ROLE_ROUTE_IDS.haiku]: route(),
        },
      },
    };
  }

  if (appId === "claude") {
    return {
      ...baseProvider({
        env: {
          ANTHROPIC_BASE_URL: GATEWAY_MODEL_BASE_URL,
          ANTHROPIC_AUTH_TOKEN: apiKey,
          ANTHROPIC_MODEL: namedModel(models, GATEWAY_DEFAULT_CLAUDE_MODEL),
          ANTHROPIC_DEFAULT_HAIKU_MODEL: namedModel(
            models,
            GATEWAY_DEFAULT_CLAUDE_MODEL,
          ),
          ANTHROPIC_DEFAULT_SONNET_MODEL: namedModel(
            models,
            GATEWAY_DEFAULT_CLAUDE_MODEL,
          ),
          ANTHROPIC_DEFAULT_OPUS_MODEL: namedModel(
            models,
            GATEWAY_DEFAULT_CLAUDE_MODEL,
          ),
        },
      }),
      meta: {
        apiFormat: "openai_responses",
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
      options: {
        baseURL: GATEWAY_MODEL_BASE_URL,
        apiKey,
        setCacheKey: true,
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

  if (appId === "hermes") {
    return baseProvider({
      name: GATEWAY_PROVIDER_ID,
      base_url: GATEWAY_MODEL_BASE_URL,
      api_key: apiKey,
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

export const buildGatewayProviderDraftForApp = (
  appId: AppId,
  apiKey: string,
): Provider => {
  const provider = buildGatewayProviderForApp(appId, {
    apiKey,
    models: [],
  });

  if (appId === "claude" || appId === "claude-desktop") {
    const env = provider.settingsConfig.env;
    if (env && typeof env === "object") {
      delete env.ANTHROPIC_MODEL;
      delete env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
      delete env.ANTHROPIC_DEFAULT_SONNET_MODEL;
      delete env.ANTHROPIC_DEFAULT_OPUS_MODEL;
    }
  }

  if (appId === "claude-desktop") {
    provider.meta = {
      ...(provider.meta ?? {}),
      claudeDesktopModelRoutes: {},
    };
  }

  return provider;
};
