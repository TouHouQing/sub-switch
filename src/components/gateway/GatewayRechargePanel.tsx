import { useEffect, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatGatewayNumber } from "@/components/gateway/format";
import type {
  GatewayCreatePaymentOrderInput,
  GatewayOrder,
  GatewayPaymentChannel,
} from "@/types/gateway";

const RECHARGE_AMOUNTS = [10, 20, 50, 100, 200, 500] as const;

interface GatewayRechargePanelProps {
  channels: GatewayPaymentChannel[];
  loading: boolean;
  isCreatingOrder: boolean;
  onCreateOrder: (
    input: GatewayCreatePaymentOrderInput,
  ) => Promise<GatewayOrder | void> | GatewayOrder | void;
  onOpenExternal: (url: string) => void;
}

export function GatewayRechargePanel({
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
  const [amount, setAmount] = useState<number>(RECHARGE_AMOUNTS[1]);
  const [channelId, setChannelId] = useState("");
  const selectedChannel = useMemo(
    () => enabledChannels.find((channel) => channel.id === channelId) ?? null,
    [channelId, enabledChannels],
  );

  useEffect(() => {
    setChannelId((current) =>
      enabledChannels.some((channel) => channel.id === current)
        ? current
        : enabledChannels[0]?.id || "",
    );
  }, [enabledChannels]);

  const amountAllowed = !selectedChannel
    ? false
    : (!selectedChannel.minAmount || amount >= selectedChannel.minAmount) &&
      (!selectedChannel.maxAmount || amount <= selectedChannel.maxAmount);

  const handleCreateOrder = async () => {
    if (!selectedChannel || !amountAllowed) return;
    const order = await onCreateOrder({
      amount,
      paymentType: selectedChannel.id,
      orderType: "balance",
    });
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
      ) : enabledChannels.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-border-default bg-muted/30 p-4 text-sm text-muted-foreground">
          暂无可用充值渠道
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              className="h-9 rounded-md border border-border-default bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              value={String(amount)}
              onChange={(event) => setAmount(Number(event.target.value))}
            >
              {RECHARGE_AMOUNTS.map((value) => (
                <option key={value} value={value}>
                  {formatGatewayNumber(value)}
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
            disabled={!selectedChannel || !amountAllowed || isCreatingOrder}
          >
            <CreditCard className="h-4 w-4" />
            {isCreatingOrder ? "创建订单中..." : "充值"}
          </Button>
          {!amountAllowed && selectedChannel ? (
            <p className="text-xs text-amber-600 dark:text-amber-300">
              当前渠道支持 {formatGatewayNumber(selectedChannel.minAmount ?? 0)} -{" "}
              {selectedChannel.maxAmount
                ? formatGatewayNumber(selectedChannel.maxAmount)
                : "不限"}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
