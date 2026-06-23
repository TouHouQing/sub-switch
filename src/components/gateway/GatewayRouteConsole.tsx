import {
  CheckCircle2,
  Coins,
  CreditCard,
  Gauge,
  Hash,
  KeyRound,
  LineChart,
  LogOut,
  MonitorCog,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  Terminal,
  WalletCards,
} from "lucide-react";
import { GatewayKeyPanel } from "@/components/gateway/GatewayKeyPanel";
import { GatewayMetricCard } from "@/components/gateway/GatewayMetricCard";
import { GatewayModelsPanel } from "@/components/gateway/GatewayModelsPanel";
import { GatewayOrdersPanel } from "@/components/gateway/GatewayOrdersPanel";
import { GatewayRechargePanel } from "@/components/gateway/GatewayRechargePanel";
import { GatewayUsageRecords } from "@/components/gateway/GatewayUsageRecords";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatGatewayNumber } from "@/components/gateway/format";
import { GATEWAY_MODEL_BASE_URL } from "@/lib/gateway/constants";
import { cn } from "@/lib/utils";
import type { AppId } from "@/lib/api";
import type {
  GatewayApiKey,
  GatewayCreateKeyInput,
  GatewayCreatePaymentOrderInput,
  GatewayDashboardStats,
  GatewayKeyGroup,
  GatewayKeySelection,
  GatewayModel,
  GatewayOrder,
  GatewayPaymentChannel,
  GatewayUsageRecord,
} from "@/types/gateway";

type RouteToolId = "claude" | "codex" | "gemini" | "claude-desktop";

export interface GatewayRouteConsoleProps {
  activeApp: AppId;
  stats?: GatewayDashboardStats;
  statsLoading: boolean;
  keySelection?: GatewayKeySelection;
  keys: GatewayApiKey[];
  keysLoading: boolean;
  groups: GatewayKeyGroup[];
  groupsLoading: boolean;
  models: GatewayModel[];
  modelsLoading: boolean;
  usageRecords: GatewayUsageRecord[];
  usageLoading: boolean;
  orders: GatewayOrder[];
  ordersLoading: boolean;
  channels: GatewayPaymentChannel[];
  paymentsLoading: boolean;
  routeStatus: Record<RouteToolId, boolean>;
  routeBusyApp: RouteToolId | null;
  isCreatingKey: boolean;
  isUpdatingKey: boolean;
  isCreatingOrder: boolean;
  onEnableRoute: (appId: RouteToolId) => void;
  onDisableRoute: (appId: RouteToolId) => void;
  onRefresh: () => void;
  onCreateKey: (input: GatewayCreateKeyInput) => void;
  onSelectKey: (keyId: string) => void;
  onUpdateKeyGroup: (keyId: string, groupId: string) => void;
  onDeleteKey: (keyId: string) => void;
  onCreateOrder: (
    input: GatewayCreatePaymentOrderInput,
  ) => Promise<GatewayOrder | void> | GatewayOrder | void;
  onOpenExternal: (url: string) => void;
  onLogout: () => void;
  onOpenClaudeMapping?: () => void;
}

const routeTools: Array<{
  id: RouteToolId;
  name: string;
  title: string;
  detail: string;
  icon: typeof Terminal;
}> = [
  {
    id: "claude",
    name: "Claude Code",
    title: "Claude Code 路由",
    detail: "保留现有 settings.json，启用时只接管到本地路由。",
    icon: Terminal,
  },
  {
    id: "codex",
    name: "Codex",
    title: "Codex 路由",
    detail: "保留 auth/config，暂停后恢复启用前的 Codex 配置。",
    icon: KeyRound,
  },
  {
    id: "gemini",
    name: "Gemini",
    title: "Gemini 路由",
    detail: "将 Gemini 请求转到本地代理，再转发到 THQ。",
    icon: MonitorCog,
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    title: "Claude Desktop 路由",
    detail: "使用 Claude Desktop 3P 本地路由，支持模型映射。",
    icon: RefreshCw,
  },
];

const routeLabel = (enabled: boolean) => (enabled ? "使用中" : "暂停中");

const routeStateCopy = (toolName: string, enabled: boolean) =>
  enabled
    ? {
        status: "使用中",
        headline: `${toolName} 正在通过 THQ 路由`,
        detail: "当前请求会写入本地代理配置，并转发到 sub.tohoqing.com。",
        action: `暂停 ${toolName} 路由`,
      }
    : {
        status: "暂停中",
        headline: `${toolName} 当前未接管配置`,
        detail: "工具会继续使用暂停前恢复的原配置；启用后会重新备份并接管。",
        action: `启用 ${toolName} 路由`,
      };

export function GatewayRouteConsole({
  activeApp,
  stats,
  statsLoading,
  keySelection,
  keys,
  keysLoading,
  groups,
  groupsLoading,
  models,
  modelsLoading,
  usageRecords,
  usageLoading,
  orders,
  ordersLoading,
  channels,
  paymentsLoading,
  routeStatus,
  routeBusyApp,
  isCreatingKey,
  isUpdatingKey,
  isCreatingOrder,
  onEnableRoute,
  onDisableRoute,
  onRefresh,
  onCreateKey,
  onSelectKey,
  onUpdateKeyGroup,
  onDeleteKey,
  onCreateOrder,
  onOpenExternal,
  onLogout,
  onOpenClaudeMapping,
}: GatewayRouteConsoleProps) {
  const selectedKey = keySelection?.selectedKey ?? null;
  const hasKeySecret = Boolean(selectedKey?.secret);
  const activeRoutes = routeTools.filter((tool) => routeStatus[tool.id]).length;
  const activeRouteTool = routeTools.find((tool) => tool.id === activeApp);
  const activeTool = activeRouteTool?.name ?? "Claude Code";
  const activeRouteEnabled = activeRouteTool
    ? routeStatus[activeRouteTool.id]
    : false;
  const activeRouteBusy = activeRouteTool
    ? routeBusyApp === activeRouteTool.id
    : false;
  const activeRouteCopy = routeStateCopy(activeTool, activeRouteEnabled);

  return (
    <main className="min-h-full overflow-y-auto bg-[#f7f8f5] px-4 pb-10 pt-4 text-slate-950 dark:bg-background dark:text-foreground sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border-default dark:bg-card">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div className="border-b border-slate-200 p-5 dark:border-border-default xl:border-b-0 xl:border-r">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">
                      THQ 路由控制台
                    </h1>
                    <Badge className="border-transparent bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                      固定 sub.tohoqing.com
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-slate-50 text-slate-700 dark:border-border-default dark:bg-background"
                    >
                      {activeRoutes} 个工具启用
                    </Badge>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-muted-foreground">
                    打开软件后默认使用 THQ
                    作为路由目标。启用会先备份当前工具配置，暂停会恢复启用前的配置。
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-muted-foreground">
                    <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-muted/40">
                      当前工具：{activeTool}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-muted/40">
                      Model Base：
                      <span>{GATEWAY_MODEL_BASE_URL}</span>
                    </span>
                  </div>

                  {activeRouteTool ? (
                    <div
                      role="status"
                      aria-label={`当前工具 ${activeTool} ${activeRouteCopy.status}`}
                      className={cn(
                        "mt-4 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
                        activeRouteEnabled
                          ? "border-emerald-300/70 bg-emerald-50 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                          : "border-amber-300/70 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border",
                            activeRouteEnabled
                              ? "border-emerald-300 bg-white/70 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
                              : "border-amber-300 bg-white/70 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
                          )}
                        >
                          {activeRouteEnabled ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Pause className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">
                              {activeRouteCopy.headline}
                            </p>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                activeRouteEnabled
                                  ? "bg-emerald-600 text-white dark:bg-emerald-400 dark:text-emerald-950"
                                  : "bg-amber-600 text-white dark:bg-amber-300 dark:text-amber-950",
                              )}
                            >
                              {activeRouteCopy.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 opacity-80">
                            {activeRouteCopy.detail}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs font-medium opacity-80 sm:text-right">
                        下一步：{activeRouteCopy.action}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeRouteTool ? (
                    <Button
                      type="button"
                      variant={activeRouteEnabled ? "outline" : "mcp"}
                      size="sm"
                      className={
                        activeRouteEnabled
                          ? "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100 hover:text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20"
                          : undefined
                      }
                      disabled={activeRouteBusy || !hasKeySecret}
                      aria-label={
                        activeRouteEnabled
                          ? `暂停当前工具 ${activeRouteTool.name} 路由`
                          : `启用当前工具 ${activeRouteTool.name} 路由`
                      }
                      onClick={() =>
                        activeRouteEnabled
                          ? onDisableRoute(activeRouteTool.id)
                          : onEnableRoute(activeRouteTool.id)
                      }
                    >
                      {activeRouteEnabled ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {activeRouteBusy
                        ? "处理中..."
                        : activeRouteEnabled
                          ? `暂停 ${activeRouteTool.name} 路由`
                          : `启用 ${activeRouteTool.name} 路由`}
                    </Button>
                  ) : null}
                  {onOpenClaudeMapping ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white dark:bg-card"
                      onClick={onOpenClaudeMapping}
                    >
                      <Settings2 className="h-4 w-4" />
                      Claude Desktop 模型映射
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white dark:bg-card"
                    onClick={onRefresh}
                  >
                    <RefreshCw className="h-4 w-4" />
                    刷新
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="bg-white dark:bg-card"
                    onClick={onLogout}
                    aria-label="退出登录"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <GatewayMetricCard
                  title="账户余额"
                  value={stats?.balance}
                  icon={Coins}
                  tone="cyan"
                  detail="THQ 可用余额"
                  loading={statsLoading}
                />
                <GatewayMetricCard
                  title="今日用量"
                  value={stats?.todayUsage}
                  icon={Gauge}
                  tone="emerald"
                  detail={`${formatGatewayNumber(stats?.todayRequests)} 次请求`}
                  loading={statsLoading}
                />
                <GatewayMetricCard
                  title="今日 Tokens"
                  value={stats?.todayTokens}
                  icon={Hash}
                  tone="amber"
                  detail={`${formatGatewayNumber(stats?.todayRequests)} 次请求`}
                  loading={statsLoading}
                />
                <GatewayMetricCard
                  title="累计用量"
                  value={stats?.totalUsage}
                  icon={LineChart}
                  tone="rose"
                  detail={`${formatGatewayNumber(stats?.totalRequests)} 次请求`}
                  loading={statsLoading}
                />
              </div>
            </div>

            <div className="flex flex-col justify-between gap-4 bg-slate-50 p-5 dark:bg-background/40">
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  账户状态
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-muted-foreground">
                  {hasKeySecret
                    ? `正在使用 API Key：${selectedKey?.name ?? selectedKey?.id}`
                    : "还没有可用 API Key，请先创建或选择一个 Key。"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-white dark:bg-card"
                  onClick={() =>
                    document
                      .getElementById("gateway-usage-records")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  使用记录
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-white dark:bg-card"
                  onClick={() =>
                    document
                      .getElementById("gateway-orders-panel")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <WalletCards className="h-4 w-4" />
                  订单
                </Button>
                <Button
                  type="button"
                  className="col-span-2"
                  onClick={() =>
                    document
                      .getElementById("gateway-recharge-panel")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <CreditCard className="h-4 w-4" />
                  充值
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-border-default dark:bg-card">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                工具路由
              </h2>
              <p className="text-sm text-slate-600 dark:text-muted-foreground">
                默认显示 Claude Code、Codex、Gemini、Claude Desktop。
              </p>
            </div>
            <Badge
              variant="outline"
              className="w-fit border-slate-200 bg-slate-50 text-slate-700 dark:border-border-default dark:bg-background"
            >
              只使用 sub.tohoqing.com
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {routeTools.map((tool) => {
              const enabled = routeStatus[tool.id];
              const busy = routeBusyApp === tool.id;
              const Icon = tool.icon;
              const copy = routeStateCopy(tool.name, enabled);
              return (
                <article
                  key={tool.id}
                  className={cn(
                    "flex min-h-[214px] flex-col justify-between rounded-lg border p-4 transition-colors",
                    enabled
                      ? "border-emerald-300/70 bg-emerald-50/70 shadow-sm hover:border-emerald-400 dark:border-emerald-400/30 dark:bg-emerald-500/10"
                      : "border-slate-200 bg-slate-50 hover:border-amber-300 dark:border-border-default dark:bg-background/50 dark:hover:border-amber-400/30",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm",
                          enabled
                            ? "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
                            : "border-slate-200 bg-white text-slate-700 dark:border-border-default dark:bg-card dark:text-foreground",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge
                        className={
                          enabled
                            ? "border-transparent bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-400 dark:text-emerald-950"
                            : "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-400/15 dark:text-amber-200"
                        }
                      >
                        {routeLabel(enabled)}
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">
                      {tool.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-muted-foreground">
                      {tool.detail}
                    </p>
                    <div
                      className={cn(
                        "mt-3 rounded-md border px-3 py-2 text-sm",
                        enabled
                          ? "border-emerald-200 bg-white/70 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                          : "border-amber-200 bg-white/70 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200",
                      )}
                    >
                      <p className="font-medium">{copy.headline}</p>
                      <p className="mt-0.5 text-xs opacity-75">
                        {enabled ? "请求经 THQ" : "保留原配置"}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant={enabled ? "outline" : "mcp"}
                    className={cn(
                      "mt-4 w-full",
                      enabled
                        ? "border-amber-300 bg-white text-amber-900 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20"
                        : undefined,
                    )}
                    disabled={busy || !hasKeySecret}
                    aria-label={
                      enabled
                        ? `暂停 ${tool.name} 路由`
                        : `启用 ${tool.name} 路由`
                    }
                    onClick={() =>
                      enabled ? onDisableRoute(tool.id) : onEnableRoute(tool.id)
                    }
                  >
                    {enabled ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {busy
                      ? "处理中..."
                      : enabled
                        ? `暂停 ${tool.name} 路由`
                        : `启用 ${tool.name} 路由`}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <GatewayKeyPanel
              keys={keys}
              groups={groups}
              keySelection={keySelection}
              loading={keysLoading}
              groupsLoading={groupsLoading}
              isCreating={isCreatingKey}
              isUpdating={isUpdatingKey}
              onCreateKey={onCreateKey}
              onSelectKey={onSelectKey}
              onUpdateKeyGroup={onUpdateKeyGroup}
              onDeleteKey={onDeleteKey}
            />
            <div id="gateway-recharge-panel">
              <GatewayRechargePanel
                channels={channels}
                loading={paymentsLoading}
                isCreatingOrder={isCreatingOrder}
                onCreateOrder={onCreateOrder}
                onOpenExternal={onOpenExternal}
              />
            </div>
          </div>

          <GatewayModelsPanel models={models} loading={modelsLoading} />
        </div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <div id="gateway-usage-records">
            <GatewayUsageRecords
              records={usageRecords}
              loading={usageLoading}
            />
          </div>
          <div id="gateway-orders-panel">
            <GatewayOrdersPanel
              orders={orders}
              loading={ordersLoading}
              onOpenExternal={onOpenExternal}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
