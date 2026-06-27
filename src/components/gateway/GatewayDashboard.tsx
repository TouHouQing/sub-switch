import {
  CirclePause,
  CirclePlay,
  Coins,
  CreditCard,
  FileText,
  Gauge,
  Hash,
  Image,
  LineChart,
  Loader2,
  LogOut,
  Power,
  Settings2,
  WalletCards,
} from "lucide-react";
import { GatewayKeyPanel } from "@/components/gateway/GatewayKeyPanel";
import { GatewayMetricCard } from "@/components/gateway/GatewayMetricCard";
import { GatewayModelsPanel } from "@/components/gateway/GatewayModelsPanel";
import { GatewayOrdersPanel } from "@/components/gateway/GatewayOrdersPanel";
import { GatewayRechargePanel } from "@/components/gateway/GatewayRechargePanel";
import { GatewayToolSwitcher } from "@/components/gateway/GatewayToolSwitcher";
import { GatewayUsageRecords } from "@/components/gateway/GatewayUsageRecords";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatGatewayNumber } from "@/components/gateway/format";
import type { AppId } from "@/lib/api";
import type { Provider, VisibleApps } from "@/types";
import type {
  GatewayApiKey,
  GatewayCreatePaymentOrderInput,
  GatewayDashboardStats,
  GatewayCreateKeyInput,
  GatewayKeyGroup,
  GatewayKeySelection,
  GatewayModel,
  GatewayOrder,
  GatewayPaymentChannel,
  GatewayUsageRecord,
} from "@/types/gateway";

export interface GatewayDashboardProps {
  activeApp: AppId;
  visibleApps?: VisibleApps;
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
  isApplyingToolConfig: boolean;
  isRouteRunning: boolean;
  isRoutePowerPending: boolean;
  isCreatingKey: boolean;
  isUpdatingKey: boolean;
  isCreatingOrder: boolean;
  onSwitchApp: (appId: AppId) => void;
  onApplyToolConfig: (appId: AppId) => void;
  onToggleRoutePower: () => void;
  onCreateKey: (input: GatewayCreateKeyInput) => void;
  onSelectKey: (keyId: string) => void;
  onUpdateKeyGroup: (keyId: string, groupId: string) => void;
  onDeleteKey: (keyId: string) => void;
  onCreateOrder: (
    input: GatewayCreatePaymentOrderInput,
  ) => Promise<GatewayOrder | void> | GatewayOrder | void;
  onOpenExternal: (url: string) => void;
  onLogout: () => void;
  onOpenAdvancedProviders: () => void;
  onEditToolProvider: (appId: AppId, draftProvider?: Provider) => void;
}

export function GatewayDashboard({
  activeApp,
  visibleApps,
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
  isApplyingToolConfig,
  isRouteRunning,
  isRoutePowerPending,
  isCreatingKey,
  isUpdatingKey,
  isCreatingOrder,
  onSwitchApp,
  onApplyToolConfig,
  onToggleRoutePower,
  onCreateKey,
  onSelectKey,
  onUpdateKeyGroup,
  onDeleteKey,
  onCreateOrder,
  onOpenExternal,
  onLogout,
  onOpenAdvancedProviders,
  onEditToolProvider,
}: GatewayDashboardProps) {
  const selectedKey = keySelection?.selectedKey ?? null;
  const currentGroupName =
    selectedKey?.groupName ??
    groups.find((group) => group.id === selectedKey?.groupId)?.name ??
    groups[0]?.name;
  const visibleToolCount = Object.values(
    visibleApps ?? {
      claude: true,
      "claude-desktop": true,
      codex: true,
      gemini: true,
      opencode: true,
      openclaw: true,
      hermes: true,
    },
  ).filter(Boolean).length;

  return (
    <main className="min-h-full overflow-y-auto bg-white px-6 pb-12 pt-4 text-slate-950 dark:bg-background dark:text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <section className="rounded-lg border border-border-default bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border-default dark:bg-card">
                <span className="text-2xl font-black text-slate-950 dark:text-white">
                  THQ
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">
                    THQ 路由控制台
                  </h1>
                  <Badge
                    className={
                      isRouteRunning
                        ? "border-transparent bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-transparent bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                    }
                  >
                    {isRouteRunning ? "运行中" : "暂停中"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-slate-200 bg-white text-slate-800 dark:border-border-default dark:bg-card dark:text-foreground"
                  >
                    {visibleToolCount} 个工具启用
                  </Badge>
                  {currentGroupName ? (
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-white text-slate-800 dark:border-border-default dark:bg-card dark:text-foreground"
                    >
                      {currentGroupName}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">
                  打开软件后默认使用 THQ
                  作为路由目标。启动会开启路由服务，暂停会恢复启用前的配置。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white"
                onClick={() => onOpenExternal("https://img.tohoqing.com")}
              >
                <Image className="h-4 w-4" />
                生图
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white"
                onClick={() =>
                  document
                    .getElementById("gateway-usage-records")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <FileText className="h-4 w-4" />
                使用记录
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white"
                onClick={() =>
                  document
                    .getElementById("gateway-orders-panel")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <WalletCards className="h-4 w-4" />
                我的订单
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  document
                    .getElementById("gateway-recharge-panel")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <CreditCard className="h-4 w-4" />
                充值
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="bg-white"
                onClick={onOpenAdvancedProviders}
                aria-label="高级供应商"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white"
                onClick={onLogout}
                aria-label="退出登录"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </Button>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border-default bg-gradient-to-r from-slate-50 to-white p-4 dark:from-muted/20 dark:to-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={
                    isRouteRunning
                      ? "flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      : "flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300"
                  }
                >
                  <Power className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold">路由总开关</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isRouteRunning
                      ? "当前路由服务已启动，下面的工具路由会转向 THQ。"
                      : "当前路由服务已暂停，工具会保留原配置等待恢复。"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="lg"
                variant={isRouteRunning ? "outline" : "default"}
                className={
                  isRouteRunning
                    ? "min-w-[132px] border-amber-500/35 bg-white text-amber-700 hover:bg-amber-50 dark:bg-card dark:text-amber-300 dark:hover:bg-amber-950/20"
                    : "min-w-[132px]"
                }
                onClick={onToggleRoutePower}
                disabled={isRoutePowerPending}
              >
                {isRoutePowerPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isRouteRunning ? (
                  <CirclePause className="h-4 w-4" />
                ) : (
                  <CirclePlay className="h-4 w-4" />
                )}
                {isRoutePowerPending
                  ? "处理中..."
                  : isRouteRunning
                    ? "暂停路由"
                    : "启动路由"}
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <GatewayMetricCard
              title="账户余额"
              value={stats?.balance}
              icon={Coins}
              tone="cyan"
              detail="ManyTokens 可用余额"
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
        </section>

        <GatewayToolSwitcher
          activeApp={activeApp}
          visibleApps={visibleApps}
          selectedKey={selectedKey}
          models={models}
          isApplying={isApplyingToolConfig}
          onSwitchApp={onSwitchApp}
          onApplyToolConfig={onApplyToolConfig}
          onEditToolProvider={onEditToolProvider}
        />

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
            <GatewayOrdersPanel orders={orders} loading={ordersLoading} />
          </div>
        </div>
      </div>
    </main>
  );
}
