import {
  Coins,
  CreditCard,
  FileText,
  Gauge,
  Hash,
  LineChart,
  LogOut,
  Power,
  Settings2,
  SquarePen,
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
import { GATEWAY_MODEL_BASE_URL } from "@/lib/gateway/constants";
import type { AppId } from "@/lib/api";
import type { VisibleApps } from "@/types";
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
  isCreatingKey: boolean;
  isUpdatingKey: boolean;
  isCreatingOrder: boolean;
  onSwitchApp: (appId: AppId) => void;
  onApplyToolConfig: () => void;
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
  isCreatingKey,
  isUpdatingKey,
  isCreatingOrder,
  onSwitchApp,
  onApplyToolConfig,
  onCreateKey,
  onSelectKey,
  onUpdateKeyGroup,
  onDeleteKey,
  onCreateOrder,
  onOpenExternal,
  onLogout,
  onOpenAdvancedProviders,
}: GatewayDashboardProps) {
  const selectedKey = keySelection?.selectedKey ?? null;
  const hasKeySecret = Boolean(selectedKey?.secret);
  const currentGroupName =
    selectedKey?.groupName ??
    groups.find((group) => group.id === selectedKey?.groupId)?.name ??
    groups[0]?.name;

  return (
    <main className="min-h-full overflow-y-auto bg-white px-6 pb-12 pt-4 text-slate-950 dark:bg-background dark:text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <section className="rounded-lg border border-blue-400 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-6 shadow-sm dark:border-blue-500/35 dark:from-blue-950/30 dark:via-background dark:to-cyan-950/20">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border-default dark:bg-card">
                <span className="text-2xl font-black text-slate-950 dark:text-white">
                  THQ
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">
                    ManyTokens
                  </h1>
                  <Badge className="border-transparent bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 dark:text-blue-300">
                    {hasKeySecret ? "使用中" : "待创建"}
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
                  来ManyTokens使用更有性价比的产品
                </p>
                <p className="mt-2 truncate text-xs text-slate-500 dark:text-muted-foreground">
                  Model Base：{GATEWAY_MODEL_BASE_URL}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                size="icon"
                className="bg-white"
                onClick={onApplyToolConfig}
                aria-label="写入本地配置"
                disabled={isApplyingToolConfig}
              >
                <SquarePen className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="bg-white"
                onClick={onLogout}
                aria-label="退出登录"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <div className="flex flex-col items-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-300/35">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-emerald-200 bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                  <Power className="h-12 w-12" />
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                {hasKeySecret ? "使用中" : "待创建"}
              </p>
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
