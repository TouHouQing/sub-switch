import { LogOut, Settings2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GATEWAY_MODEL_BASE_URL, GATEWAY_ORIGIN } from "@/lib/gateway/constants";
import type { GatewayKeySelection } from "@/types/gateway";

interface GatewayPowerStatusProps {
  keySelection?: GatewayKeySelection;
  onLogout: () => void;
  onOpenAdvancedProviders: () => void;
}

export function GatewayPowerStatus({
  keySelection,
  onLogout,
  onOpenAdvancedProviders,
}: GatewayPowerStatusProps) {
  const selectedKey = keySelection?.selectedKey;
  const hasKeySecret = Boolean(selectedKey?.secret);

  return (
    <section className="rounded-lg border border-border-default bg-zinc-950 p-5 text-white shadow-sm dark:bg-zinc-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
            {hasKeySecret ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-normal">THQ AI Gateway</h2>
              <Badge
                variant="outline"
                className={
                  hasKeySecret
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                    : "border-amber-400/40 bg-amber-400/10 text-amber-200"
                }
              >
                {hasKeySecret ? "已连接" : "待创建 API Key"}
              </Badge>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-zinc-400 sm:grid-cols-2">
              <span className="truncate">站点：{GATEWAY_ORIGIN}</span>
              <span className="truncate">模型 Base：{GATEWAY_MODEL_BASE_URL}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white"
            onClick={onOpenAdvancedProviders}
          >
            <Settings2 className="h-4 w-4" />
            高级供应商
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-zinc-300 hover:bg-white/10 hover:text-white"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </div>
      </div>
    </section>
  );
}
