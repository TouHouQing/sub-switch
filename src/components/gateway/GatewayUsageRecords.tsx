import { Activity } from "lucide-react";
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
import type { GatewayUsageRecord } from "@/types/gateway";

interface GatewayUsageRecordsProps {
  records: GatewayUsageRecord[];
  loading: boolean;
}

export function GatewayUsageRecords({
  records,
  loading,
}: GatewayUsageRecordsProps) {
  return (
    <section className="rounded-lg border border-border-default bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">使用记录</h3>
        </div>
        <Badge variant="outline">{records.length}</Badge>
      </div>

      {loading ? (
        <div className="mt-4 h-48 animate-pulse rounded-md bg-muted" />
      ) : records.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-border-default bg-muted/30 p-4 text-sm text-muted-foreground">
          暂无使用记录
        </p>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="px-2">时间</TableHead>
              <TableHead className="px-2">模型</TableHead>
              <TableHead className="px-2 text-right">Token</TableHead>
              <TableHead className="px-2 text-right">用量</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.slice(0, 8).map((record, index) => (
              <TableRow key={record.id || index}>
                <TableCell className="whitespace-nowrap px-2 text-xs text-muted-foreground">
                  {formatGatewayDateTime(record.createdAt)}
                </TableCell>
                <TableCell className="max-w-[180px] truncate px-2 text-xs">
                  {record.model || "--"}
                </TableCell>
                <TableCell className="px-2 text-right text-xs tabular-nums">
                  {formatGatewayNumber(record.totalTokens)}
                </TableCell>
                <TableCell className="px-2 text-right text-xs tabular-nums">
                  {formatGatewayNumber(record.cost)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
