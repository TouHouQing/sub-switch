import { useEffect, useState } from "react";
import { AlertTriangle, PlugZap } from "lucide-react";
import { AppSwitcher } from "@/components/AppSwitcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GATEWAY_MODEL_BASE_URL } from "@/lib/gateway/constants";
import type { AppId } from "@/lib/api";
import type { VisibleApps } from "@/types";
import type { GatewayApiKey, GatewayModel } from "@/types/gateway";

interface GatewayToolSwitcherProps {
  activeApp: AppId;
  visibleApps?: VisibleApps;
  selectedKey: GatewayApiKey | null;
  models: GatewayModel[];
  isApplying: boolean;
  onSwitchApp: (appId: AppId) => void;
  onApplyToolConfig: () => void;
}

const appDisplayName: Record<AppId, string> = {
  claude: "Claude Code",
  "claude-desktop": "Claude Desktop",
  codex: "Codex",
  gemini: "Gemini",
  opencode: "OpenCode",
  openclaw: "OpenClaw",
  hermes: "Hermes",
};

export function GatewayToolSwitcher({
  activeApp,
  visibleApps,
  selectedKey,
  models,
  isApplying,
  onSwitchApp,
  onApplyToolConfig,
}: GatewayToolSwitcherProps) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage("");
  }, [activeApp, selectedKey?.id]);

  const enabledModels = models.filter((model) => model.enabled).length;

  const handleApply = () => {
    if (!selectedKey?.secret) {
      setMessage("Key 待创建或不可用");
      return;
    }
    onApplyToolConfig();
  };

  return (
    <section className="rounded-lg border border-border-default bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">本地工具</h3>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 dark:text-cyan-300">
              固定 /v1
            </Badge>
          </div>
          <AppSwitcher
            activeApp={activeApp}
            onSwitch={onSwitchApp}
            visibleApps={visibleApps}
          />
        </div>

        <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 rounded-md border border-border-default bg-muted/40 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Model Base</p>
            <p className="truncate font-medium text-foreground">{GATEWAY_MODEL_BASE_URL}</p>
          </div>
          <div className="min-w-[120px] rounded-md border border-border-default bg-muted/40 px-3 py-2 text-xs">
            <p className="text-muted-foreground">可用模型</p>
            <p className="font-medium text-foreground">{enabledModels}</p>
          </div>
          <Button type="button" onClick={handleApply} disabled={isApplying}>
            <PlugZap className="h-4 w-4" />
            {isApplying ? "配置中..." : `配置到 ${appDisplayName[activeApp]}`}
          </Button>
        </div>
      </div>
      {message && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          {message}
        </div>
      )}
    </section>
  );
}
