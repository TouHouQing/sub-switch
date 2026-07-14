import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayApp } from "@/components/gateway/GatewayApp";
import { GATEWAY_PROVIDER_ID } from "@/lib/gateway/constants";
import { createTestQueryClient } from "../utils/testQueryClient";

const apiMocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  switchProvider: vi.fn(),
  settingsOpenExternal: vi.fn(),
}));

const gatewayQueryState = vi.hoisted(() => ({
  session: {
    isLoading: false,
    data: { accessToken: "session-token" } as { accessToken: string } | null,
  },
  profile: {
    isLoading: false,
    isSuccess: true,
    error: null as Error | null,
  },
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    providersApi: {
      getAll: apiMocks.getAll,
      add: apiMocks.add,
      update: apiMocks.update,
      switch: apiMocks.switchProvider,
    },
    settingsApi: {
      openExternal: apiMocks.settingsOpenExternal,
    },
  };
});

vi.mock("@/hooks/useProxyStatus", () => ({
  useProxyStatus: () => ({
    isRunning: false,
    startProxyServer: vi.fn(),
    stopWithRestore: vi.fn(),
    isStarting: false,
    isStopping: false,
  }),
}));

vi.mock("@/lib/query/gateway", () => ({
  useGatewaySessionQuery: () => gatewayQueryState.session,
  useGatewayProfileQuery: () => gatewayQueryState.profile,
  useGatewayLoginMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGatewayRegisterMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGatewayRegisterVerificationCodeMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGatewayLogoutMutation: () => ({ mutateAsync: vi.fn(), error: null }),
  useGatewayCreateKeyMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGatewayUpdateKeyMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGatewayDeleteKeyMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGatewayCreatePaymentOrderMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useGatewaySelectKeyMutation: () => ({ mutateAsync: vi.fn() }),
  useGatewayStatsQuery: () => ({ isLoading: false, data: undefined }),
  useGatewayKeysQuery: () => ({ isLoading: false, data: [] }),
  useGatewayKeyGroupsQuery: () => ({ isLoading: false, data: [] }),
  useGatewayKeySelectionQuery: () => ({
    isLoading: false,
    data: {
      selectedKey: {
        id: "key-1",
        name: "Key 1",
        secret: "sk-thq",
        createdAt: "2026-06-26T00:00:00.000Z",
      },
    },
  }),
  useGatewayModelsQuery: () => ({
    isLoading: false,
    data: [{ id: "gpt-5.5", enabled: true }],
  }),
  useGatewayUsageQuery: () => ({ isLoading: false, data: [] }),
  useGatewayOrdersQuery: () => ({ isLoading: false, data: [] }),
  useGatewayPaymentChannelsQuery: () => ({ isLoading: false, data: [] }),
}));

describe("GatewayApp", () => {
  beforeEach(() => {
    gatewayQueryState.session = {
      isLoading: false,
      data: { accessToken: "session-token" },
    };
    gatewayQueryState.profile = {
      isLoading: false,
      isSuccess: true,
      error: null,
    };
    apiMocks.getAll.mockReset();
    apiMocks.add.mockReset();
    apiMocks.update.mockReset();
    apiMocks.switchProvider.mockReset();
    apiMocks.settingsOpenExternal.mockReset();
  });

  it("shows the login page when no gateway session exists", () => {
    gatewayQueryState.session = {
      isLoading: false,
      data: null,
    };

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <GatewayApp
          activeApp="codex"
          onSwitchApp={vi.fn()}
          onOpenAdvancedProviders={vi.fn()}
          onEditToolProvider={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "閰嶇疆鍒?Codex" })).toBeNull();
  });

  it("keeps the login page visible when the stored session is not verified", () => {
    gatewayQueryState.profile = {
      isLoading: false,
      isSuccess: false,
      error: new Error("unauthorized"),
    };

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <GatewayApp
          activeApp="codex"
          onSwitchApp={vi.fn()}
          onOpenAdvancedProviders={vi.fn()}
          onEditToolProvider={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "閰嶇疆鍒?Codex" })).toBeNull();
  });

  it("refreshes provider cache after applying a tool config before edit", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const handleEditToolProvider = vi.fn();
    const handleSwitchApp = vi.fn();

    apiMocks.getAll.mockResolvedValue({});
    apiMocks.add.mockResolvedValue(true);
    apiMocks.switchProvider.mockResolvedValue({ warnings: [] });

    render(
      <QueryClientProvider client={queryClient}>
        <GatewayApp
          activeApp="codex"
          onSwitchApp={handleSwitchApp}
          onOpenAdvancedProviders={vi.fn()}
          onEditToolProvider={handleEditToolProvider}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "配置到 Codex" }));

    await waitFor(() => {
      expect(apiMocks.add).toHaveBeenCalledWith(
        expect.objectContaining({ id: GATEWAY_PROVIDER_ID }),
        "codex",
        true,
      );
    });
    expect(apiMocks.switchProvider).toHaveBeenCalledWith(
      GATEWAY_PROVIDER_ID,
      "codex",
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["providers", "codex"],
    });
    expect(handleSwitchApp).toHaveBeenCalledWith("codex");
  });

  it("opens Claude Code model mapping editor before applying an unconfigured route", async () => {
    const handleEditToolProvider = vi.fn();
    const handleSwitchApp = vi.fn();

    apiMocks.getAll.mockResolvedValue({});

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <GatewayApp
          activeApp="claude"
          onSwitchApp={handleSwitchApp}
          onOpenAdvancedProviders={vi.fn()}
          onEditToolProvider={handleEditToolProvider}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "配置到 Claude Code" }));

    await waitFor(() => {
      expect(handleEditToolProvider).toHaveBeenCalledWith(
        "claude",
        expect.objectContaining({
          id: GATEWAY_PROVIDER_ID,
          settingsConfig: expect.objectContaining({
            env: expect.not.objectContaining({
              ANTHROPIC_MODEL: expect.any(String),
              ANTHROPIC_DEFAULT_SONNET_MODEL: expect.any(String),
            }),
          }),
        }),
      );
    });
    expect(handleSwitchApp).toHaveBeenCalledWith("claude");
    expect(apiMocks.add).not.toHaveBeenCalled();
    expect(apiMocks.switchProvider).not.toHaveBeenCalled();
  });

  it("switches Claude Code to an existing gateway provider when model mapping is configured", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const handleEditToolProvider = vi.fn();

    apiMocks.getAll.mockResolvedValue({
      [GATEWAY_PROVIDER_ID]: {
        id: GATEWAY_PROVIDER_ID,
        name: "THQ Gateway",
        settingsConfig: {
          env: {
            ANTHROPIC_BASE_URL: "https://sub.thqllm.com/v1",
            ANTHROPIC_AUTH_TOKEN: "sk-thq",
            ANTHROPIC_DEFAULT_SONNET_MODEL: "gpt-5.5",
          },
        },
      },
    });
    apiMocks.switchProvider.mockResolvedValue({ warnings: [] });

    render(
      <QueryClientProvider client={queryClient}>
        <GatewayApp
          activeApp="claude"
          onSwitchApp={vi.fn()}
          onOpenAdvancedProviders={vi.fn()}
          onEditToolProvider={handleEditToolProvider}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "配置到 Claude Code" }));

    await waitFor(() => {
      expect(apiMocks.switchProvider).toHaveBeenCalledWith(
        GATEWAY_PROVIDER_ID,
        "claude",
      );
    });
    expect(handleEditToolProvider).not.toHaveBeenCalled();
    expect(apiMocks.add).not.toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["providers", "claude"],
    });
  });
});
