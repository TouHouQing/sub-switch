import { toast } from "sonner";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AppId } from "@/lib/api";
import { providersApi, proxyApi, settingsApi } from "@/lib/api";
import {
  disableGatewayRouteForApp,
  enableGatewayClaudeDesktopRoute,
  enableGatewayRouteForApp,
} from "@/lib/gateway/applyToolConfig";
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
import { extractErrorMessage } from "@/utils/errorUtils";
import {
  GatewayAuthPage,
  type GatewayAuthCredentials,
} from "./GatewayAuthPage";
import { GatewayRouteConsole } from "./GatewayRouteConsole";
import type { VisibleApps } from "@/types";

type RouteToolId = "claude" | "codex" | "gemini" | "claude-desktop";

interface GatewayAppProps {
  activeApp: AppId;
  visibleApps?: VisibleApps;
  onSwitchApp?: (appId: AppId) => void;
  onOpenClaudeMapping?: () => void;
}

export function GatewayApp({
  activeApp,
  visibleApps,
  onOpenClaudeMapping,
}: GatewayAppProps) {
  void visibleApps;
  const [routeBusyApp, setRouteBusyApp] = useState<RouteToolId | null>(null);
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
  const proxyTakeoverQuery = useQuery({
    queryKey: ["proxyTakeoverStatus"],
    queryFn: () => proxyApi.getProxyTakeoverStatus(),
    enabled: hasSession,
    placeholderData: (previousData) => previousData,
  });
  const proxyStatusQuery = useQuery({
    queryKey: ["proxyStatus"],
    queryFn: () => proxyApi.getProxyStatus(),
    enabled: hasSession,
    placeholderData: (previousData) => previousData,
  });
  const claudeDesktopStatusQuery = useQuery({
    queryKey: ["claudeDesktopStatus"],
    queryFn: () => providersApi.getClaudeDesktopStatus(),
    enabled: hasSession,
    placeholderData: (previousData) => previousData,
  });

  const routeStatus: Record<RouteToolId, boolean> = {
    claude: Boolean(proxyTakeoverQuery.data?.claude),
    codex: Boolean(proxyTakeoverQuery.data?.codex),
    gemini: Boolean(proxyTakeoverQuery.data?.gemini),
    "claude-desktop": Boolean(
      claudeDesktopStatusQuery.data?.configured &&
        claudeDesktopStatusQuery.data.mode === "proxy" &&
        claudeDesktopStatusQuery.data.proxyRunning,
    ),
  };

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

  const handleRefresh = async () => {
    await Promise.all([
      statsQuery.refetch(),
      keysQuery.refetch(),
      keyGroupsQuery.refetch(),
      keySelectionQuery.refetch(),
      modelsQuery.refetch(),
      usageQuery.refetch(),
      ordersQuery.refetch(),
      channelsQuery.refetch(),
      proxyTakeoverQuery.refetch(),
      proxyStatusQuery.refetch(),
      claudeDesktopStatusQuery.refetch(),
    ]);
  };

  const handleOpenClaudeMapping = () => {
    if (onOpenClaudeMapping) {
      onOpenClaudeMapping();
      return;
    }
    toast.info("请从 Claude Desktop 供应商配置页打开模型映射");
  };

  const requireSelectedKey = () => {
    if (!selectedKey?.secret) {
      toast.warning("Key 待创建或不可用");
      return null;
    }
    return selectedKey.secret;
  };

  const handleEnableRoute = async (appId: RouteToolId) => {
    const apiKey = requireSelectedKey();
    if (!apiKey) return;

    try {
      setRouteBusyApp(appId);
      if (appId === "claude-desktop") {
        await enableGatewayClaudeDesktopRoute({
          appId,
          apiKey,
          models: modelsQuery.data ?? [],
        });
      } else {
        await enableGatewayRouteForApp({
          appId,
          apiKey,
          models: modelsQuery.data ?? [],
        });
      }
      await Promise.all([
        proxyTakeoverQuery.refetch(),
        proxyStatusQuery.refetch(),
        claudeDesktopStatusQuery.refetch(),
      ]);
      const label =
        appId === "claude"
          ? "Claude Code"
          : appId === "claude-desktop"
            ? "Claude Desktop"
            : appId === "codex"
              ? "Codex"
              : "Gemini";
      toast.success(`${label} 路由已启用`);
    } catch (error) {
      toast.error(extractErrorMessage(error) || "启用路由失败");
    } finally {
      setRouteBusyApp(null);
    }
  };

  const handleDisableRoute = async (appId: RouteToolId) => {
    try {
      setRouteBusyApp(appId);
      if (appId === "claude-desktop") {
        if (
          proxyTakeoverQuery.data?.claude ||
          proxyTakeoverQuery.data?.codex ||
          proxyTakeoverQuery.data?.gemini
        ) {
          toast.warning("其它工具正在使用路由，请先暂停对应工具。");
          return;
        }
        await proxyApi.stopProxyServer();
      } else {
        await disableGatewayRouteForApp(appId);
      }
      await Promise.all([
        proxyTakeoverQuery.refetch(),
        proxyStatusQuery.refetch(),
        claudeDesktopStatusQuery.refetch(),
      ]);
      const label =
        appId === "claude"
          ? "Claude Code"
          : appId === "claude-desktop"
            ? "Claude Desktop"
            : appId === "codex"
              ? "Codex"
              : "Gemini";
      toast.success(`${label} 路由已暂停`);
    } catch (error) {
      toast.error(extractErrorMessage(error) || "暂停路由失败");
    } finally {
      setRouteBusyApp(null);
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
    <GatewayRouteConsole
      activeApp={activeApp}
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
      routeStatus={routeStatus}
      routeBusyApp={routeBusyApp}
      isCreatingKey={createKeyMutation.isPending}
      isUpdatingKey={updateKeyMutation.isPending}
      isCreatingOrder={createOrderMutation.isPending}
      onEnableRoute={(appId) => void handleEnableRoute(appId)}
      onDisableRoute={(appId) => void handleDisableRoute(appId)}
      onRefresh={() => void handleRefresh()}
      onCreateKey={(input) => void handleCreateKey(input)}
      onSelectKey={(keyId) => void selectKeyMutation.mutateAsync(keyId)}
      onUpdateKeyGroup={(keyId, groupId) =>
        void handleUpdateKeyGroup(keyId, groupId)
      }
      onDeleteKey={(keyId) => void handleDeleteKey(keyId)}
      onCreateOrder={(input) => createOrderMutation.mutateAsync(input)}
      onOpenExternal={(url) => void handleOpenExternal(url)}
      onLogout={() => void handleLogout()}
      onOpenClaudeMapping={handleOpenClaudeMapping}
    />
  );
}
