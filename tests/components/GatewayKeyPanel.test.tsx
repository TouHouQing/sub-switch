import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GatewayKeyPanel } from "@/components/gateway/GatewayKeyPanel";

describe("GatewayKeyPanel", () => {
  it("opens a dialog to create keys with a custom name and selected group", () => {
    const handleCreateKey = vi.fn();

    render(
      <GatewayKeyPanel
        keys={[]}
        groups={[
          { id: "group-openai", name: "OpenAI", platform: "openai" },
          { id: "group-claude", name: "Claude", platform: "anthropic" },
        ]}
        keySelection={{ status: "empty", selectedKey: null }}
        loading={false}
        groupsLoading={false}
        isCreating={false}
        isUpdating={false}
        onCreateKey={handleCreateKey}
        onSelectKey={vi.fn()}
        onUpdateKeyGroup={vi.fn()}
        onDeleteKey={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "创建 Key" }));
    fireEvent.change(screen.getByLabelText("Key 名称"), {
      target: { value: "测试 Key" },
    });
    fireEvent.change(screen.getByLabelText("Key 分组"), {
      target: { value: "group-claude" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    expect(handleCreateKey).toHaveBeenCalledWith({
      name: "测试 Key",
      groupId: "group-claude",
    });
    expect(screen.queryByText("创建 Key 分组")).not.toBeInTheDocument();
  });

  it("edits the group for an existing key", () => {
    const handleUpdateKeyGroup = vi.fn();

    render(
      <GatewayKeyPanel
        keys={[
          {
            id: "key-1",
            name: "Main",
            secret: "sk-main",
            groupId: "group-openai",
            groupName: "OpenAI",
          },
        ]}
        groups={[
          { id: "group-openai", name: "OpenAI", platform: "openai" },
          { id: "group-claude", name: "Claude", platform: "anthropic" },
        ]}
        keySelection={{
          status: "ready",
          selectedKey: {
            id: "key-1",
            name: "Main",
            secret: "sk-main",
            groupId: "group-openai",
            groupName: "OpenAI",
          },
        }}
        loading={false}
        groupsLoading={false}
        isCreating={false}
        isUpdating={false}
        onCreateKey={vi.fn()}
        onSelectKey={vi.fn()}
        onUpdateKeyGroup={handleUpdateKeyGroup}
        onDeleteKey={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("编辑 Key 分组"), {
      target: { value: "group-claude" },
    });

    expect(handleUpdateKeyGroup).toHaveBeenCalledWith("key-1", "group-claude");
  });
});
