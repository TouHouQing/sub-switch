import { providersApi, type AppId } from "@/lib/api";
import { proxyApi } from "@/lib/api/proxy";
import { GATEWAY_PROVIDER_ID } from "@/lib/gateway/constants";
import { buildGatewayProviderForApp } from "@/lib/gateway/toolConfig";
import type { GatewayModel } from "@/types/gateway";

export interface ApplyGatewayToolConfigInput {
  appId: AppId;
  apiKey: string;
  models: GatewayModel[];
}

export const applyGatewayToolConfig = async ({
  appId,
  apiKey,
  models,
}: ApplyGatewayToolConfigInput): Promise<void> => {
  await ensureGatewayToolProvider({ appId, apiKey, models });
  await providersApi.switch(GATEWAY_PROVIDER_ID, appId);
};

export const ensureGatewayToolProvider = async ({
  appId,
  apiKey,
  models,
}: ApplyGatewayToolConfigInput): Promise<void> => {
  const provider = buildGatewayProviderForApp(appId, { apiKey, models });
  await providersApi.upsertThqProvider(provider, appId);
};

export const enableGatewayRouteForApp = async (
  input: ApplyGatewayToolConfigInput,
): Promise<void> => {
  await ensureGatewayToolProvider(input);
  await proxyApi.enableThqRouteForApp(input.appId, GATEWAY_PROVIDER_ID);
};

export const enableGatewayClaudeDesktopRoute = async (
  input: ApplyGatewayToolConfigInput,
): Promise<void> => {
  await ensureGatewayToolProvider(input);
  await providersApi.switch(GATEWAY_PROVIDER_ID, "claude-desktop");
  await proxyApi.startProxyServer();
};

export const disableGatewayRouteForApp = async (
  appId: AppId,
): Promise<void> => {
  await proxyApi.disableThqRouteForApp(appId);
};
