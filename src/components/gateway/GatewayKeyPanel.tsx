import { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { maskGatewaySecret } from "@/components/gateway/format";
import type {
  GatewayApiKey,
  GatewayCreateKeyInput,
  GatewayKeyGroup,
  GatewayKeySelection,
} from "@/types/gateway";

interface GatewayKeyPanelProps {
  keys: GatewayApiKey[];
  groups: GatewayKeyGroup[];
  keySelection?: GatewayKeySelection;
  loading: boolean;
  groupsLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  onCreateKey: (input: GatewayCreateKeyInput) => void;
  onSelectKey: (keyId: string) => void;
  onUpdateKeyGroup: (keyId: string, groupId: string) => void;
  onDeleteKey: (keyId: string) => void;
}

export function GatewayKeyPanel({
  keys,
  groups,
  keySelection,
  loading,
  groupsLoading,
  isCreating,
  isUpdating,
  onCreateKey,
  onSelectKey,
  onUpdateKeyGroup,
  onDeleteKey,
}: GatewayKeyPanelProps) {
  const selectedKey = keySelection?.selectedKey ?? null;
  const hasKeys = keys.length > 0;
  const selectedValue = selectedKey?.id ?? keys[0]?.id ?? "";
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createKeyName, setCreateKeyName] = useState("Desktop Client");
  const [createGroupId, setCreateGroupId] = useState("");

  useEffect(() => {
    setCreateGroupId((current) =>
      groups.some((group) => group.id === current)
        ? current
        : groups[0]?.id || "",
    );
  }, [groups]);

  const groupOptions = groups.map((group) => (
    <option key={group.id} value={group.id}>
      {group.name}
      {group.platform ? ` · ${group.platform}` : ""}
    </option>
  ));

  const createDisabled = isCreating || groupsLoading;
  const handleOpenCreateDialog = () => {
    setCreateKeyName("Desktop Client");
    setIsCreateDialogOpen(true);
  };

  const handleCreateKey = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreateKey({
      name: createKeyName.trim() || "Desktop Client",
      groupId: createGroupId || undefined,
    });
    setIsCreateDialogOpen(false);
  };

  return (
    <section className="rounded-lg border border-border-default bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-cyan-500" />
            <h3 className="text-sm font-semibold">API Key</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            默认使用列表中的第一个 Key
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleOpenCreateDialog}
          disabled={createDisabled}
        >
          <Plus className="h-4 w-4" />
          创建 Key
        </Button>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <form onSubmit={handleCreateKey}>
            <DialogHeader>
              <DialogTitle>创建 API Key</DialogTitle>
              <DialogDescription>
                填写 Key 名称，并选择该 Key 使用的分组。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="gateway-create-key-name"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Key 名称
                </label>
                <Input
                  id="gateway-create-key-name"
                  value={createKeyName}
                  onChange={(event) => setCreateKeyName(event.target.value)}
                  placeholder="例如 Desktop Client"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="gateway-create-key-group"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Key 分组
                </label>
                <select
                  id="gateway-create-key-group"
                  className="h-9 w-full rounded-md border border-border-default bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={createGroupId}
                  onChange={(event) => setCreateGroupId(event.target.value)}
                  disabled={groupsLoading || groups.length === 0}
                >
                  {groups.length === 0 ? (
                    <option value="">暂无可选分组</option>
                  ) : (
                    groupOptions
                  )}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={createDisabled}>
                创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  <p className="truncate text-sm font-medium">
                    {selectedKey.name}
                  </p>
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
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-1.5">
                  <label
                    htmlFor="gateway-edit-key-group"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    编辑 Key 分组
                  </label>
                  <select
                    id="gateway-edit-key-group"
                    className="h-9 w-full rounded-md border border-border-default bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={selectedKey.groupId ?? ""}
                    onChange={(event) =>
                      onUpdateKeyGroup(selectedKey.id, event.target.value)
                    }
                    disabled={groupsLoading || isUpdating}
                  >
                    <option value="">未设置分组</option>
                    {groupOptions}
                  </select>
                </div>
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
              {selectedKey.groupName ? (
                <Badge variant="secondary" className="mt-3">
                  {selectedKey.groupName}
                </Badge>
              ) : null}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
