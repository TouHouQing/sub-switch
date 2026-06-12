import { Coins, Gauge, Hash, LineChart } from "lucide-react";
import { GatewayKeyPanel } from "@/components/gateway/GatewayKeyPanel";
import { GatewayMetricCard } from "@/components/gateway/GatewayMetricCard";
import { GatewayModelsPanel } from "@/components/gateway/GatewayModelsPanel";
import { GatewayOrdersPanel } from "@/components/gateway/GatewayOrdersPanel";
import { GatewayPowerStatus } from "@/components/gateway/GatewayPowerStatus";
import { GatewayRechargePanel } from "@/components/gateway/GatewayRechargePanel";
import { GatewayToolSwitcher } from "@/components/gateway/GatewayToolSwitcher";
import { GatewayUsageRecords } from "@/components/gateway/GatewayUsageRecords";
import type { AppId } from "@/lib/api";
import type { VisibleApps } from "@/types";
import type {
  GatewayApiKey,
  GatewayDashboardStats,
  GatewayKeySelection,
  GatewayModel,
  GatewayOrder,
  GatewayPaymentChannel,
  GatewayPaymentPlan,
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
  models: GatewayModel[];
  modelsLoading: boolean;
  usageRecords: GatewayUsageRecord[];
  usageLoading: boolean;
  orders: GatewayOrder[];
  ordersLoading: boolean;
  plans: GatewayPaymentPlan[];
  channels: GatewayPaymentChannel[];
  paymentsLoading: boolean;
  isApplyingToolConfig: boolean;
  isCreatingKey: boolean;
  isCreatingOrder: boolean;
  onSwitchApp: (appId: AppId) => void;
  onApplyToolConfig: () => void;
  onCreateKey: () => void;
  onSelectKey: (keyId: string) => void;
  onDeleteKey: (keyId: string) => void;
  onCreateOrder: (
    planId: string,
    channelId: string,
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
  models,
  modelsLoading,
  usageRecords,
  usageLoading,
  orders,
  ordersLoading,
  plans,
  channels,
  paymentsLoading,
  isApplyingToolConfig,
  isCreatingKey,
  isCreatingOrder,
  onSwitchApp,
  onApplyToolConfig,
  onCreateKey,
  onSelectKey,
  onDeleteKey,
  onCreateOrder,
  onOpenExternal,
  onLogout,
  onOpenAdvancedProviders,
}: GatewayDashboardProps) {
  const selectedKey = keySelection?.selectedKey ?? null;

  return (
    <main className="min-h-full overflow-y-auto px-6 pb-12 pt-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <GatewayPowerStatus
          keySelection={keySelection}
          onLogout={onLogout}
          onOpenAdvancedProviders={onOpenAdvancedProviders}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GatewayMetricCard
            title="余额"
            value={stats?.balance}
            icon={Coins}
            tone="cyan"
            detail="账户当前可用额度"
            loading={statsLoading}
          />
          <GatewayMetricCard
            title="今日用量"
            value={stats?.todayUsage}
            icon={Gauge}
            tone="emerald"
            detail={`${stats?.todayRequests ?? 0} 次请求`}
            loading={statsLoading}
          />
          <GatewayMetricCard
            title="今日 Token"
            value={stats?.todayTokens}
            icon={Hash}
            tone="amber"
            detail="输入与输出合计"
            loading={statsLoading}
          />
          <GatewayMetricCard
            title="累计用量"
            value={stats?.totalUsage}
            icon={LineChart}
            tone="rose"
            detail={`${stats?.totalRequests ?? 0} 次累计请求`}
            loading={statsLoading}
          />
        </div>

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
              keySelection={keySelection}
              loading={keysLoading}
              isCreating={isCreatingKey}
              onCreateKey={onCreateKey}
              onSelectKey={onSelectKey}
              onDeleteKey={onDeleteKey}
            />
            <GatewayRechargePanel
              plans={plans}
              channels={channels}
              loading={paymentsLoading}
              isCreatingOrder={isCreatingOrder}
              onCreateOrder={onCreateOrder}
              onOpenExternal={onOpenExternal}
            />
          </div>

          <GatewayModelsPanel models={models} loading={modelsLoading} />
        </div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <GatewayUsageRecords records={usageRecords} loading={usageLoading} />
          <GatewayOrdersPanel
            orders={orders}
            loading={ordersLoading}
            onOpenExternal={onOpenExternal}
          />
        </div>
      </div>
    </main>
  );
}
