import { KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { maskGatewaySecret } from "@/components/gateway/format";
import type { GatewayApiKey, GatewayKeySelection } from "@/types/gateway";

interface GatewayKeyPanelProps {
  keys: GatewayApiKey[];
  keySelection?: GatewayKeySelection;
  loading: boolean;
  isCreating: boolean;
  onCreateKey: () => void;
  onSelectKey: (keyId: string) => void;
  onDeleteKey: (keyId: string) => void;
}

export function GatewayKeyPanel({
  keys,
  keySelection,
  loading,
  isCreating,
  onCreateKey,
  onSelectKey,
  onDeleteKey,
}: GatewayKeyPanelProps) {
  const selectedKey = keySelection?.selectedKey ?? null;
  const hasKeys = keys.length > 0;
  const selectedValue = selectedKey?.id ?? keys[0]?.id ?? "";

  return (
    <section className="rounded-lg border border-border-default bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-cyan-500" />
            <h3 className="text-sm font-semibold">API Key</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">默认使用列表中的第一个 Key</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCreateKey}
          disabled={isCreating}
        >
          <Plus className="h-4 w-4" />
          创建 Key
        </Button>
      </div>

      {loading ? (
        <div className="mt-4 h-24 animate-pulse rounded-md bg-muted" />
      ) : !hasKeys ? (
        <div className="mt-4 rounded-md border border-dashed border-border-default bg-muted/30 p-4">
          <p className="text-sm font-medium">待创建 API Key</p>
          <p className="mt-1 text-xs text-muted-foreground">
            当前不会自动创建 Key，需要手动创建后再写入本地工具。
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <select
            className="h-9 w-full rounded-md border border-border-default bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            value={selectedValue}
            onChange={(event) => onSelectKey(event.target.value)}
          >
            {keys.map((key) => (
              <option key={key.id} value={key.id}>
                {key.name}
              </option>
            ))}
          </select>

          {selectedKey && (
            <div className="rounded-md border border-border-default bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedKey.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {maskGatewaySecret(selectedKey.secret, selectedKey.prefix)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    selectedKey.secret
                      ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                      : "border-amber-500/30 text-amber-600 dark:text-amber-300"
                  }
                >
                  {selectedKey.secret ? "可用" : "待创建"}
                </Badge>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 dark:text-red-300"
                  onClick={() => onDeleteKey(selectedKey.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
