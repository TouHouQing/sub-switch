import { useMemo, useState } from "react";
import { Boxes, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { GatewayModel } from "@/types/gateway";

interface GatewayModelsPanelProps {
  models: GatewayModel[];
  loading: boolean;
}

export function GatewayModelsPanel({ models, loading }: GatewayModelsPanelProps) {
  const [query, setQuery] = useState("");
  const filteredModels = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return models;
    return models.filter((model) =>
      [model.id, model.name, model.provider]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [models, query]);

  return (
    <section className="rounded-lg border border-border-default bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold">可用模型</h3>
        </div>
        <Badge variant="outline">{models.length}</Badge>
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索模型"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-11 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : filteredModels.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-border-default bg-muted/30 p-4 text-sm text-muted-foreground">
          暂无可用模型
        </p>
      ) : (
        <div className="mt-4 max-h-[338px] space-y-2 overflow-y-auto pr-1">
          {filteredModels.slice(0, 80).map((model) => (
            <div
              key={`${model.provider ?? "gateway"}:${model.id}`}
              className="flex min-h-[48px] items-center justify-between gap-3 rounded-md border border-border-default bg-muted/25 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{model.name}</p>
                <p className="truncate text-xs text-muted-foreground">{model.id}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {model.provider && <Badge variant="secondary">{model.provider}</Badge>}
                <Badge
                  variant="outline"
                  className={
                    model.enabled
                      ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                      : "border-zinc-500/30 text-muted-foreground"
                  }
                >
                  {model.enabled ? "启用" : "停用"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
