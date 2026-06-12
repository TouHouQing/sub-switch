import { providersApi, type AppId } from "@/lib/api";
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
  const provider = buildGatewayProviderForApp(appId, { apiKey, models });
  const providers = await providersApi.getAll(appId);

  if (providers[GATEWAY_PROVIDER_ID]) {
    await providersApi.update(provider, appId);
  } else {
    await providersApi.add(provider, appId, true);
  }

  await providersApi.switch(GATEWAY_PROVIDER_ID, appId);
};
