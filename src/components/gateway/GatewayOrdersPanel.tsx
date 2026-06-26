import { ReceiptText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  formatGatewayDateTime,
  formatGatewayNumber,
} from "@/components/gateway/format";
import type { GatewayOrder } from "@/types/gateway";

interface GatewayOrdersPanelProps {
  orders: GatewayOrder[];
  loading: boolean;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "待支付",
  unpaid: "待支付",
  awaiting_payment: "待支付",
  wait_pay: "待支付",
  paying: "支付中",
  processing: "处理中",
  paid: "已支付",
  success: "已支付",
  succeeded: "已支付",
  completed: "已支付",
  complete: "已支付",
  finished: "已支付",
  cancelled: "已取消",
  canceled: "已取消",
  closed: "已关闭",
  expired: "已过期",
  failed: "支付失败",
  refunded: "已退款",
};

function formatOrderStatus(status?: string) {
  const normalizedStatus = status?.trim();

  if (!normalizedStatus) {
    return "--";
  }

  return (
    ORDER_STATUS_LABELS[normalizedStatus.toLowerCase()] ?? normalizedStatus
  );
}

export function GatewayOrdersPanel({
  orders,
  loading,
}: GatewayOrdersPanelProps) {
  return (
    <section className="rounded-lg border border-border-default bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-rose-500" />
          <h3 className="text-sm font-semibold">我的订单</h3>
        </div>
        <Badge variant="outline">{orders.length}</Badge>
      </div>

      {loading ? (
        <div className="mt-4 h-40 animate-pulse rounded-md bg-muted" />
      ) : orders.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-border-default bg-muted/30 p-4 text-sm text-muted-foreground">
          暂无订单
        </p>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="px-2">订单</TableHead>
              <TableHead className="px-2 text-right">金额</TableHead>
              <TableHead className="px-2">状态</TableHead>
              <TableHead className="px-2">时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.slice(0, 8).map((order) => (
              <TableRow key={order.id}>
                <TableCell className="max-w-[160px] truncate px-2 text-xs">
                  {order.orderNo || order.id}
                </TableCell>
                <TableCell className="px-2 text-right text-xs tabular-nums">
                  {formatGatewayNumber(order.amount)}
                </TableCell>
                <TableCell className="px-2 text-xs">
                  <Badge variant="secondary">
                    {formatOrderStatus(order.status)}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 text-xs text-muted-foreground">
                  {formatGatewayDateTime(order.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
