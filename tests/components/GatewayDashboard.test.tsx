import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GatewayRouteConsole } from "@/components/gateway/GatewayRouteConsole";
import { GATEWAY_MODEL_BASE_URL } from "@/lib/gateway/constants";
import type { AppId } from "@/lib/api";
import type { GatewayRouteConsoleProps } from "@/components/gateway/GatewayRouteConsole";

const baseProps = (overrides: Partial<GatewayRouteConsoleProps> = {}) =>
  ({
    activeApp: "claude" as AppId,
    stats: {
      balance: 975325,
      todayUsage: 1405,
      todayTokens: 4680870,
      totalUsage: 669700,
      todayRequests: 1628,
      totalRequests: 66000,
    },
    statsLoading: false,
    keySelection: {
      status: "empty" as const,
      selectedKey: null,
    },
    keys: [],
    keysLoading: false,
    groups: [],
    groupsLoading: false,
    models: [
      { id: "gpt-5.5", name: "GPT-5.5", provider: "openai", enabled: true },
      {
        id: "claude-sonnet-4-20250514",
        name: "Claude Sonnet 4",
        provider: "anthropic",
        enabled: true,
      },
    ],
    modelsLoading: false,
    usageRecords: [
      {
        id: "req_1",
        createdAt: "2026-06-12T10:00:00.000Z",
        model: "gpt-5.5",
        apiKeyName: "Main",
        status: "success",
        promptTokens: 1000,
        completionTokens: 250,
        totalTokens: 1250,
        cost: 12.5,
      },
    ],
    usageLoading: false,
    orders: [],
    ordersLoading: false,
    channels: [],
    paymentsLoading: false,
    routeStatus: {
      claude: false,
      codex: false,
      gemini: false,
      "claude-desktop": false,
    },
    routeBusyApp: null,
    isCreatingKey: false,
    isUpdatingKey: false,
    isCreatingOrder: false,
    onEnableRoute: vi.fn(),
    onDisableRoute: vi.fn(),
    onRefresh: vi.fn(),
    onCreateKey: vi.fn(),
    onSelectKey: vi.fn(),
    onUpdateKeyGroup: vi.fn(),
    onDeleteKey: vi.fn(),
    onCreateOrder: vi.fn(),
    onOpenExternal: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  }) satisfies GatewayRouteConsoleProps;

describe("GatewayRouteConsole", () => {
  it("renders gateway metrics and keeps model base URL separate from management API", () => {
    render(<GatewayRouteConsole {...baseProps()} />);

    expect(screen.getByText("THQ 路由控制台")).toBeInTheDocument();
    expect(screen.getByText("账户余额")).toBeInTheDocument();
    expect(screen.getByText("975,325")).toBeInTheDocument();
    expect(screen.getByText("今日 Tokens")).toBeInTheDocument();
    expect(screen.getByText("4,680,870")).toBeInTheDocument();
    expect(screen.getAllByText("待创建 API Key").length).toBeGreaterThan(0);
    expect(screen.getByText(GATEWAY_MODEL_BASE_URL)).toBeInTheDocument();
    expect(screen.queryByText(/api\/v1/)).not.toBeInTheDocument();
  });

  it("renders the default route tools", () => {
    render(
      <GatewayRouteConsole
        {...baseProps({
          keySelection: {
            status: "ready",
            selectedKey: {
              id: "key-1",
              name: "Main",
              secret: "sk-main",
              groupName: "ac-switch",
            },
          },
          keys: [
            {
              id: "key-1",
              name: "Main",
              secret: "sk-main",
              groupName: "ac-switch",
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Claude Code")).toBeInTheDocument();
    expect(screen.getByText("Codex")).toBeInTheDocument();
    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByText("Claude Desktop")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "启用 Claude Code 路由" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("ac-switch").length).toBeGreaterThan(0);
  });

  it("shows a primary route action for the active tool in the console header", () => {
    const handleEnable = vi.fn();
    render(
      <GatewayRouteConsole
        {...baseProps({
          activeApp: "codex" as AppId,
          keySelection: {
            status: "ready",
            selectedKey: {
              id: "key-1",
              name: "Main",
              secret: "sk-main",
            },
          },
          keys: [{ id: "key-1", name: "Main", secret: "sk-main" }],
          onEnableRoute: handleEnable,
        })}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "启用当前工具 Codex 路由" }),
    );

    expect(handleEnable).toHaveBeenCalledWith("codex");
  });

  it("makes the active tool route state explicit in the console header", () => {
    const { rerender } = render(
      <GatewayRouteConsole
        {...baseProps({
          activeApp: "codex" as AppId,
          keySelection: {
            status: "ready",
            selectedKey: {
              id: "key-1",
              name: "Main",
              secret: "sk-main",
            },
          },
          keys: [{ id: "key-1", name: "Main", secret: "sk-main" }],
          routeStatus: {
            claude: false,
            codex: true,
            gemini: false,
            "claude-desktop": false,
          },
        })}
      />,
    );

    const activeStatus = screen.getByRole("status", {
      name: "当前工具 Codex 使用中",
    });
    expect(activeStatus).toBeInTheDocument();
    expect(
      within(activeStatus).getByText("Codex 正在通过 THQ 路由"),
    ).toBeInTheDocument();

    rerender(
      <GatewayRouteConsole
        {...baseProps({
          activeApp: "codex" as AppId,
          keySelection: {
            status: "ready",
            selectedKey: {
              id: "key-1",
              name: "Main",
              secret: "sk-main",
            },
          },
          keys: [{ id: "key-1", name: "Main", secret: "sk-main" }],
          routeStatus: {
            claude: false,
            codex: false,
            gemini: false,
            "claude-desktop": false,
          },
        })}
      />,
    );

    const pausedStatus = screen.getByRole("status", {
      name: "当前工具 Codex 暂停中",
    });
    expect(pausedStatus).toBeInTheDocument();
    expect(
      within(pausedStatus).getByText("Codex 当前未接管配置"),
    ).toBeInTheDocument();
  });

  it("disables route enable without a selected key secret", () => {
    const handleEnable = vi.fn();
    render(
      <GatewayRouteConsole
        {...baseProps({
          onEnableRoute: handleEnable,
          keySelection: {
            status: "ready",
            selectedKey: { id: "key_1", name: "Main" },
          },
          keys: [{ id: "key_1", name: "Main" }],
        })}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "启用 Claude Code 路由" }),
    );

    expect(handleEnable).not.toHaveBeenCalled();
  });
});
