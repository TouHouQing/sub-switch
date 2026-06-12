import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  onOpenExternal: (url: string) => void;
}

export function GatewayOrdersPanel({
  orders,
  loading,
  onOpenExternal,
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
              <TableHead className="px-2 text-right">操作</TableHead>
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
                  <Badge variant="secondary">{order.status || "--"}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 text-xs text-muted-foreground">
                  {formatGatewayDateTime(order.createdAt)}
                </TableCell>
                <TableCell className="px-2 text-right">
                  {order.paymentUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenExternal(order.paymentUrl!)}
                    >
                      支付
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
