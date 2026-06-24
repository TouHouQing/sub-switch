import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GatewayDashboard } from "@/components/gateway/GatewayDashboard";
import { GATEWAY_MODEL_BASE_URL } from "@/lib/gateway/constants";
import type { AppId } from "@/lib/api";
import type { GatewayDashboardProps } from "@/components/gateway/GatewayDashboard";

const baseProps = (overrides: Partial<GatewayDashboardProps> = {}) =>
  ({
    activeApp: "claude" as AppId,
    visibleApps: undefined,
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
    isApplyingToolConfig: false,
    isRouteRunning: false,
    isRoutePowerPending: false,
    isCreatingKey: false,
    isUpdatingKey: false,
    isCreatingOrder: false,
    onSwitchApp: vi.fn(),
    onApplyToolConfig: vi.fn(),
    onToggleRoutePower: vi.fn(),
    onCreateKey: vi.fn(),
    onSelectKey: vi.fn(),
    onUpdateKeyGroup: vi.fn(),
    onDeleteKey: vi.fn(),
    onCreateOrder: vi.fn(),
    onOpenExternal: vi.fn(),
    onLogout: vi.fn(),
    onOpenAdvancedProviders: vi.fn(),
    ...overrides,
  }) satisfies GatewayDashboardProps;

describe("GatewayDashboard", () => {
  it("renders gateway metrics and keeps model base URL separate from management API", () => {
    render(<GatewayDashboard {...baseProps()} />);

    expect(screen.getByText("账户余额")).toBeInTheDocument();
    expect(screen.getByText("975,325")).toBeInTheDocument();
    expect(screen.getByText("今日 Tokens")).toBeInTheDocument();
    expect(screen.getByText("4,680,870")).toBeInTheDocument();
    expect(screen.getAllByText("待创建 API Key").length).toBeGreaterThan(0);
    expect(screen.getByText(GATEWAY_MODEL_BASE_URL)).toBeInTheDocument();
    expect(screen.queryByText(/api\/v1/)).not.toBeInTheDocument();
  });

  it("uses the dashboard power button as the route master switch", () => {
    const handlePower = vi.fn();
    const handleApply = vi.fn();

    render(
      <GatewayDashboard
        {...baseProps({
          onToggleRoutePower: handlePower,
          onApplyToolConfig: handleApply,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "启动路由" }));

    expect(handlePower).toHaveBeenCalledTimes(1);
    expect(handleApply).not.toHaveBeenCalled();
    expect(screen.getByText("路由总开关")).toBeInTheDocument();
  });

  it("renders the THQ route console overview", () => {
    render(
      <GatewayDashboard
        {...baseProps({
          isRouteRunning: true,
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

    expect(
      screen.getByRole("heading", { name: "THQ 路由控制台" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("运行中").length).toBeGreaterThan(0);
    expect(screen.getByText("账户余额")).toBeInTheDocument();
    expect(screen.getByText("今日 Tokens")).toBeInTheDocument();
    expect(screen.getAllByText("ac-switch").length).toBeGreaterThan(0);
  });

  it("shows tool routes according to the main-page visibility setting", () => {
    render(
      <GatewayDashboard
        {...baseProps({
          visibleApps: {
            claude: true,
            "claude-desktop": false,
            codex: false,
            gemini: false,
            opencode: false,
            openclaw: false,
            hermes: true,
          },
        })}
      />,
    );

    expect(screen.getByText("工具路由")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "配置到 Claude Code" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "配置到 Hermes" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "配置到 Codex" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "配置到 Gemini" }),
    ).not.toBeInTheDocument();
  });

  it("disables tool configuration without a selected key secret", () => {
    const handleApply = vi.fn();
    render(
      <GatewayDashboard
        {...baseProps({
          onApplyToolConfig: handleApply,
          keySelection: {
            status: "ready",
            selectedKey: { id: "key_1", name: "Main" },
          },
          keys: [{ id: "key_1", name: "Main" }],
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "配置到 Claude Code" }));

    expect(screen.getByText("Key 待创建或不可用")).toBeInTheDocument();
    expect(handleApply).not.toHaveBeenCalled();
  });
});
