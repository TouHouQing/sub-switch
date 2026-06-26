import { toast } from "sonner";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AppId } from "@/lib/api";
import { settingsApi } from "@/lib/api";
import { applyGatewayToolConfig } from "@/lib/gateway/applyToolConfig";
import {
  useGatewayCreateKeyMutation,
  useGatewayCreatePaymentOrderMutation,
  useGatewayDeleteKeyMutation,
  useGatewayKeyGroupsQuery,
  useGatewayKeySelectionQuery,
  useGatewayKeysQuery,
  useGatewayLoginMutation,
  useGatewayLogoutMutation,
  useGatewayModelsQuery,
  useGatewayOrdersQuery,
  useGatewayPaymentChannelsQuery,
  useGatewayRegisterMutation,
  useGatewaySelectKeyMutation,
  useGatewaySessionQuery,
  useGatewayStatsQuery,
  useGatewayUpdateKeyMutation,
  useGatewayUsageQuery,
} from "@/lib/query/gateway";
import { useProxyStatus } from "@/hooks/useProxyStatus";
import { extractErrorMessage } from "@/utils/errorUtils";
import {
  GatewayAuthPage,
  type GatewayAuthCredentials,
} from "./GatewayAuthPage";
import { GatewayDashboard } from "./GatewayDashboard";
import type { VisibleApps } from "@/types";

interface GatewayAppProps {
  activeApp: AppId;
  visibleApps?: VisibleApps;
  onSwitchApp: (appId: AppId) => void;
  onOpenAdvancedProviders: () => void;
  onEditToolProvider: (appId: AppId) => void;
}

export function GatewayApp({
  activeApp,
  visibleApps,
  onSwitchApp,
  onOpenAdvancedProviders,
  onEditToolProvider,
}: GatewayAppProps) {
  const [isApplyingToolConfig, setIsApplyingToolConfig] = useState(false);
  const queryClient = useQueryClient();
  const sessionQuery = useGatewaySessionQuery();
  const hasSession = Boolean(sessionQuery.data?.accessToken);

  const loginMutation = useGatewayLoginMutation();
  const registerMutation = useGatewayRegisterMutation();
  const logoutMutation = useGatewayLogoutMutation();
  const createKeyMutation = useGatewayCreateKeyMutation();
  const updateKeyMutation = useGatewayUpdateKeyMutation();
  const selectKeyMutation = useGatewaySelectKeyMutation();
  const deleteKeyMutation = useGatewayDeleteKeyMutation();
  const createOrderMutation = useGatewayCreatePaymentOrderMutation();

  const statsQuery = useGatewayStatsQuery(hasSession);
  const keysQuery = useGatewayKeysQuery(hasSession);
  const keyGroupsQuery = useGatewayKeyGroupsQuery(hasSession);
  const keySelectionQuery = useGatewayKeySelectionQuery(hasSession);
  const selectedKey = keySelectionQuery.data?.selectedKey ?? null;
  const modelsQuery = useGatewayModelsQuery(hasSession, selectedKey?.secret);
  const usageQuery = useGatewayUsageQuery(hasSession);
  const ordersQuery = useGatewayOrdersQuery(hasSession);
  const channelsQuery = useGatewayPaymentChannelsQuery(hasSession);
  const {
    isRunning: isRouteRunning,
    startProxyServer,
    stopWithRestore,
    isStarting,
    isStopping,
  } = useProxyStatus();

  const handleLogin = async (credentials: GatewayAuthCredentials) => {
    try {
      await loginMutation.mutateAsync(credentials);
      toast.success("登录成功");
    } catch (error) {
      toast.error(extractErrorMessage(error) || "登录失败");
    }
  };

  const handleRegister = async (credentials: GatewayAuthCredentials) => {
    try {
      await registerMutation.mutateAsync(credentials);
      toast.success("注册成功");
    } catch (error) {
      toast.error(extractErrorMessage(error) || "注册失败");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast.success("已退出登录");
    } catch (error) {
      toast.error(extractErrorMessage(error) || "退出登录失败");
    }
  };

  const handleCreateKey = async (input?: {
    name?: string;
    groupId?: string;
  }) => {
    try {
      await createKeyMutation.mutateAsync(input ?? { name: "Desktop Client" });
      toast.success("API Key 已创建");
    } catch (error) {
      toast.error(extractErrorMessage(error) || "创建 API Key 失败");
    }
  };

  const handleUpdateKeyGroup = async (keyId: string, groupId: string) => {
    try {
      await updateKeyMutation.mutateAsync({
        id: keyId,
        input: { groupId },
      });
      toast.success("API Key 分组已更新");
    } catch (error) {
      toast.error(extractErrorMessage(error) || "更新 API Key 分组失败");
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await deleteKeyMutation.mutateAsync(keyId);
      toast.success("API Key 已删除");
    } catch (error) {
      toast.error(extractErrorMessage(error) || "删除 API Key 失败");
    }
  };

  const handleApplyToolConfig = async (targetApp: AppId) => {
    if (!selectedKey?.secret) {
      toast.warning("Key 待创建或不可用");
      return;
    }
    try {
      setIsApplyingToolConfig(true);
      await applyGatewayToolConfig({
        appId: targetApp,
        apiKey: selectedKey.secret,
        models: modelsQuery.data ?? [],
      });
      await queryClient.invalidateQueries({
        queryKey: ["providers", targetApp],
      });
      toast.success("已写入本地工具配置");
    } catch (error) {
      toast.error(extractErrorMessage(error) || "写入本地工具配置失败");
    } finally {
      setIsApplyingToolConfig(false);
    }
  };

  const handleToggleRoutePower = async () => {
    try {
      if (isRouteRunning) {
        await stopWithRestore();
      } else {
        await startProxyServer();
      }
    } catch (error) {
      console.error("[GatewayApp] Toggle route power failed:", error);
    }
  };

  const handleOpenExternal = async (url: string) => {
    try {
      await settingsApi.openExternal(url);
    } catch (error) {
      toast.error(extractErrorMessage(error) || "链接打开失败");
    }
  };

  if (sessionQuery.isLoading) {
    return (
      <main className="flex min-h-full items-center justify-center px-6">
        <div className="rounded-lg border border-border-default bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          加载 THQ AI Gateway...
        </div>
      </main>
    );
  }

  if (!hasSession) {
    const authError = extractErrorMessage(
      loginMutation.error ?? registerMutation.error ?? undefined,
    );
    return (
      <GatewayAuthPage
        isLoading={loginMutation.isPending || registerMutation.isPending}
        error={authError}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <GatewayDashboard
      activeApp={activeApp}
      visibleApps={visibleApps}
      stats={statsQuery.data}
      statsLoading={statsQuery.isLoading}
      keySelection={keySelectionQuery.data}
      keys={keysQuery.data ?? []}
      keysLoading={keysQuery.isLoading || keySelectionQuery.isLoading}
      groups={keyGroupsQuery.data ?? []}
      groupsLoading={keyGroupsQuery.isLoading}
      models={modelsQuery.data ?? []}
      modelsLoading={modelsQuery.isLoading}
      usageRecords={usageQuery.data ?? []}
      usageLoading={usageQuery.isLoading}
      orders={ordersQuery.data ?? []}
      ordersLoading={ordersQuery.isLoading}
      channels={channelsQuery.data ?? []}
      paymentsLoading={channelsQuery.isLoading}
      isApplyingToolConfig={isApplyingToolConfig}
      isRouteRunning={isRouteRunning}
      isRoutePowerPending={isStarting || isStopping}
      isCreatingKey={createKeyMutation.isPending}
      isUpdatingKey={updateKeyMutation.isPending}
      isCreatingOrder={createOrderMutation.isPending}
      onSwitchApp={onSwitchApp}
      onApplyToolConfig={(appId) => void handleApplyToolConfig(appId)}
      onToggleRoutePower={() => void handleToggleRoutePower()}
      onCreateKey={(input) => void handleCreateKey(input)}
      onSelectKey={(keyId) => void selectKeyMutation.mutateAsync(keyId)}
      onUpdateKeyGroup={(keyId, groupId) =>
        void handleUpdateKeyGroup(keyId, groupId)
      }
      onDeleteKey={(keyId) => void handleDeleteKey(keyId)}
      onCreateOrder={(input) => createOrderMutation.mutateAsync(input)}
      onOpenExternal={(url) => void handleOpenExternal(url)}
      onLogout={() => void handleLogout()}
      onOpenAdvancedProviders={onOpenAdvancedProviders}
      onEditToolProvider={onEditToolProvider}
    />
  );
}
