import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  useGatewaySessionQuery: () => ({
    isLoading: false,
    data: { accessToken: "session-token" },
  }),
  useGatewayLoginMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGatewayRegisterMutation: () => ({
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
});
