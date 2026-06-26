import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Pencil, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProviderIcon } from "@/components/ProviderIcon";
import { GATEWAY_MODEL_BASE_URL } from "@/lib/gateway/constants";
import { cn } from "@/lib/utils";
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
  onApplyToolConfig: (appId: AppId) => void;
  onEditToolProvider: (appId: AppId) => void;
}

const defaultVisibleApps: VisibleApps = {
  claude: true,
  "claude-desktop": true,
  codex: true,
  gemini: true,
  opencode: true,
  openclaw: true,
  hermes: true,
};

const toolRoutes: Array<{
  id: AppId;
  name: string;
  icon: string;
  description: string;
}> = [
  {
    id: "claude",
    name: "Claude Code",
    icon: "claude",
    description: "写入 THQ Provider，并保留可恢复的本地配置。",
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    icon: "claude",
    description: "写入 Claude Desktop 配置，适配模型映射场景。",
  },
  {
    id: "codex",
    name: "Codex",
    icon: "openai",
    description: "写入 auth/config，让 Codex 请求走 THQ Model Base。",
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: "gemini",
    description: "写入 Gemini 本地配置，并使用 THQ 路由地址。",
  },
  {
    id: "opencode",
    name: "OpenCode",
    icon: "opencode",
    description: "添加 OpenCode provider 与模型列表。",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    icon: "openclaw",
    description: "写入 OpenClaw provider、协议与模型配置。",
  },
  {
    id: "hermes",
    name: "Hermes",
    icon: "hermes",
    description: "写入 Hermes Agent 模型供应商配置。",
  },
];

export function GatewayToolSwitcher({
  activeApp,
  visibleApps,
  selectedKey,
  models,
  isApplying,
  onSwitchApp,
  onApplyToolConfig,
  onEditToolProvider,
}: GatewayToolSwitcherProps) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage("");
  }, [activeApp, selectedKey?.id, visibleApps]);

  const enabledModels = models.filter((model) => model.enabled).length;
  const resolvedVisibleApps = visibleApps ?? defaultVisibleApps;
  const visibleToolRoutes = toolRoutes.filter((tool) => {
    return resolvedVisibleApps[tool.id] ?? true;
  });

  const handleApply = (appId: AppId) => {
    if (!selectedKey?.secret) {
      setMessage("Key 待创建或不可用");
      return;
    }
    onSwitchApp(appId);
    onApplyToolConfig(appId);
  };

  return (
    <section className="rounded-lg border border-border-default bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">工具路由</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            默认只显示设置中主页面开启的工具。
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 text-xs sm:min-w-[320px]">
          <div className="min-w-0 rounded-md border border-border-default bg-muted/40 px-3 py-2">
            <p className="text-muted-foreground">Model Base</p>
            <p className="truncate font-medium text-foreground">
              {GATEWAY_MODEL_BASE_URL}
            </p>
          </div>
          <div className="rounded-md border border-border-default bg-muted/40 px-3 py-2">
            <p className="text-muted-foreground">可用模型</p>
            <p className="font-medium text-foreground">{enabledModels}</p>
          </div>
        </div>
      </div>

      {message && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          {message}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visibleToolRoutes.map((tool) => {
          return (
            <article
              key={tool.id}
              className={cn(
                "flex min-h-[156px] flex-col rounded-lg border bg-background p-4 transition-colors",
                activeApp === tool.id
                  ? "border-blue-500/35 bg-blue-500/[0.03]"
                  : "border-border-default hover:border-border-hover",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-default bg-card">
                    <ProviderIcon
                      icon={tool.icon}
                      name={tool.name}
                      size={22}
                      showFallback={false}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold">
                      {tool.name}
                    </h4>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => onEditToolProvider(tool.id)}
                  aria-label={`编辑 ${tool.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => handleApply(tool.id)}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <PlugZap className="h-4 w-4" />
                  )}
                  {isApplying ? "配置中..." : `配置到 ${tool.name}`}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
