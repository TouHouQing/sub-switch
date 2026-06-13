import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GatewayKeyPanel } from "@/components/gateway/GatewayKeyPanel";

describe("GatewayKeyPanel", () => {
  it("creates keys with the selected group", () => {
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

    fireEvent.change(screen.getByLabelText("创建 Key 分组"), {
      target: { value: "group-claude" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建 Key" }));

    expect(handleCreateKey).toHaveBeenCalledWith({
      name: "Desktop Client",
      groupId: "group-claude",
    });
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
