import { useEffect, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatGatewayNumber } from "@/components/gateway/format";
import type {
  GatewayOrder,
  GatewayPaymentChannel,
  GatewayPaymentPlan,
} from "@/types/gateway";

interface GatewayRechargePanelProps {
  plans: GatewayPaymentPlan[];
  channels: GatewayPaymentChannel[];
  loading: boolean;
  isCreatingOrder: boolean;
  onCreateOrder: (
    planId: string,
    channelId: string,
  ) => Promise<GatewayOrder | void> | GatewayOrder | void;
  onOpenExternal: (url: string) => void;
}

export function GatewayRechargePanel({
  plans,
  channels,
  loading,
  isCreatingOrder,
  onCreateOrder,
  onOpenExternal,
}: GatewayRechargePanelProps) {
  const enabledChannels = useMemo(
    () => channels.filter((channel) => channel.enabled),
    [channels],
  );
  const [planId, setPlanId] = useState("");
  const [channelId, setChannelId] = useState("");

  useEffect(() => {
    setPlanId((current) => current || plans[0]?.id || "");
  }, [plans]);

  useEffect(() => {
    setChannelId((current) => current || enabledChannels[0]?.id || "");
  }, [enabledChannels]);

  const handleCreateOrder = async () => {
    if (!planId || !channelId) return;
    const order = await onCreateOrder(planId, channelId);
    if (order?.paymentUrl) {
      onOpenExternal(order.paymentUrl);
    }
  };

  return (
    <section className="rounded-lg border border-border-default bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold">充值</h3>
        </div>
        <Badge variant="outline">{enabledChannels.length} 个渠道</Badge>
      </div>

      {loading ? (
        <div className="mt-4 h-32 animate-pulse rounded-md bg-muted" />
      ) : plans.length === 0 || enabledChannels.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-border-default bg-muted/30 p-4 text-sm text-muted-foreground">
          暂无可用充值方案
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              className="h-9 rounded-md border border-border-default bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              value={planId}
              onChange={(event) => setPlanId(event.target.value)}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {formatGatewayNumber(plan.amount)}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-border-default bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
            >
              {enabledChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => void handleCreateOrder()}
            disabled={!planId || !channelId || isCreatingOrder}
          >
            <CreditCard className="h-4 w-4" />
            {isCreatingOrder ? "创建订单中..." : "充值"}
          </Button>
        </div>
      )}
    </section>
  );
}
