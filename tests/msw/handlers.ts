import { http, HttpResponse } from "msw";
import type { AppId } from "@/lib/api/types";
import type { McpServer, Provider, Settings } from "@/types";
import {
  addProvider,
  deleteProvider,
  deleteSession,
  getCurrentProviderId,
  getLiveProviderIds,
  getSessionMessages,
  getProviders,
  listProviders,
  listSessions,
  resetProviderState,
  setCurrentProviderId,
  updateProvider,
  updateSortOrder,
  getSettings,
  setSettings,
  getAppConfigDirOverride,
  setAppConfigDirOverrideState,
  getMcpConfig,
  setMcpServerEnabled,
  upsertMcpServer,
  deleteMcpServer,
  getProxyTakeoverState,
  getClaudeDesktopStatusState,
  isProxyRunningState,
  setProxyTakeoverForApp,
  setProxyRunningState,
  setClaudeDesktopConfiguredState,
} from "./state";

const TAURI_ENDPOINT = "http://tauri.local";

const withJson = async <T>(request: Request): Promise<T> => {
  try {
    const body = await request.text();
    if (!body) return {} as T;
    return JSON.parse(body) as T;
  } catch {
    return {} as T;
  }
};

const success = <T>(payload: T) => HttpResponse.json(payload as any);

export const handlers = [
  http.post(`${TAURI_ENDPOINT}/get_migration_result`, () => success(false)),
  http.post(`${TAURI_ENDPOINT}/get_skills_migration_result`, () =>
    success(null),
  ),
  http.post(`${TAURI_ENDPOINT}/get_providers`, async ({ request }) => {
    const { app } = await withJson<{ app: AppId }>(request);
    return success(getProviders(app));
  }),

  http.post(`${TAURI_ENDPOINT}/get_current_provider`, async ({ request }) => {
    const { app } = await withJson<{ app: AppId }>(request);
    return success(getCurrentProviderId(app));
  }),

  http.post(
    `${TAURI_ENDPOINT}/update_providers_sort_order`,
    async ({ request }) => {
      const { updates = [], app } = await withJson<{
        updates: { id: string; sortIndex: number }[];
        app: AppId;
      }>(request);
      updateSortOrder(app, updates);
      return success(true);
    },
  ),

  http.post(`${TAURI_ENDPOINT}/update_tray_menu`, () => success(true)),

  http.post(`${TAURI_ENDPOINT}/get_opencode_live_provider_ids`, () =>
    success(getLiveProviderIds("opencode")),
  ),

  http.post(`${TAURI_ENDPOINT}/get_openclaw_live_provider_ids`, () =>
    success(getLiveProviderIds("openclaw")),
  ),

  http.post(`${TAURI_ENDPOINT}/get_openclaw_default_model`, () =>
    success({ primary: null, fallback: [] }),
  ),

  http.post(`${TAURI_ENDPOINT}/scan_openclaw_config_health`, () => success([])),

  http.post(`${TAURI_ENDPOINT}/switch_provider`, async ({ request }) => {
    const { id, app } = await withJson<{ id: string; app: AppId }>(request);
    const providers = listProviders(app);
    if (!providers[id]) {
      return HttpResponse.json(false, { status: 404 });
    }
    setCurrentProviderId(app, id);
    if (app === "claude-desktop") {
      setClaudeDesktopConfiguredState(id !== "claude-desktop-official");
    }
    return success(true);
  }),

  http.post(`${TAURI_ENDPOINT}/add_provider`, async ({ request }) => {
    const { provider, app } = await withJson<{
      provider: Provider & { id?: string };
      app: AppId;
    }>(request);

    const newId = provider.id ?? `mock-${Date.now()}`;
    addProvider(app, { ...provider, id: newId });
    return success(true);
  }),

  http.post(`${TAURI_ENDPOINT}/update_provider`, async ({ request }) => {
    const { provider, app } = await withJson<{
      provider: Provider;
      app: AppId;
    }>(request);
    updateProvider(app, provider);
    return success(true);
  }),

  http.post(`${TAURI_ENDPOINT}/upsert_thq_provider`, async ({ request }) => {
    const { provider, app } = await withJson<{
      provider: Provider;
      app: AppId;
    }>(request);
    if (listProviders(app)[provider.id]) {
      updateProvider(app, provider);
    } else {
      addProvider(app, provider);
    }
    return success(true);
  }),

  http.post(`${TAURI_ENDPOINT}/delete_provider`, async ({ request }) => {
    const { id, app } = await withJson<{ id: string; app: AppId }>(request);
    deleteProvider(app, id);
    return success(true);
  }),

  http.post(`${TAURI_ENDPOINT}/import_default_config`, async () => {
    resetProviderState();
    return success(true);
  }),

  http.post(`${TAURI_ENDPOINT}/open_external`, () => success(true)),

  http.post(`${TAURI_ENDPOINT}/list_sessions`, () => success(listSessions())),

  http.post(`${TAURI_ENDPOINT}/get_session_messages`, async ({ request }) => {
    const { providerId, sourcePath } = await withJson<{
      providerId: string;
      sourcePath: string;
    }>(request);
    return success(getSessionMessages(providerId, sourcePath));
  }),

  http.post(`${TAURI_ENDPOINT}/delete_session`, async ({ request }) => {
    const { providerId, sessionId, sourcePath } = await withJson<{
      providerId: string;
      sessionId: string;
      sourcePath: string;
    }>(request);
    return success(deleteSession(providerId, sessionId, sourcePath));
  }),

  http.post(`${TAURI_ENDPOINT}/delete_sessions`, async ({ request }) => {
    const { items = [] } = await withJson<{
      items?: {
        providerId: string;
        sessionId: string;
        sourcePath: string;
      }[];
    }>(request);

    return success(
      items.map((item) => ({
        providerId: item.providerId,
        sessionId: item.sessionId,
        sourcePath: item.sourcePath,
        success: deleteSession(
          item.providerId,
          item.sessionId,
          item.sourcePath,
        ),
      })),
    );
  }),

  // MCP APIs
  http.post(`${TAURI_ENDPOINT}/get_mcp_config`, async ({ request }) => {
    const { app } = await withJson<{ app: AppId }>(request);
    return success(getMcpConfig(app));
  }),

  http.post(`${TAURI_ENDPOINT}/import_mcp_from_claude`, () => success(1)),
  http.post(`${TAURI_ENDPOINT}/import_mcp_from_codex`, () => success(1)),

  http.post(`${TAURI_ENDPOINT}/set_mcp_enabled`, async ({ request }) => {
    const { app, id, enabled } = await withJson<{
      app: AppId;
      id: string;
      enabled: boolean;
    }>(request);
    setMcpServerEnabled(app, id, enabled);
    return success(true);
  }),

  http.post(
    `${TAURI_ENDPOINT}/upsert_mcp_server_in_config`,
    async ({ request }) => {
      const { app, id, spec } = await withJson<{
        app: AppId;
        id: string;
        spec: McpServer;
      }>(request);
      upsertMcpServer(app, id, spec);
      return success(true);
    },
  ),

  http.post(
    `${TAURI_ENDPOINT}/delete_mcp_server_in_config`,
    async ({ request }) => {
      const { app, id } = await withJson<{ app: AppId; id: string }>(request);
      deleteMcpServer(app, id);
      return success(true);
    },
  ),

  http.post(`${TAURI_ENDPOINT}/restart_app`, () => success(true)),

  http.post(`${TAURI_ENDPOINT}/get_settings`, () => success(getSettings())),

  http.post(`${TAURI_ENDPOINT}/check_env_conflicts`, () => success([])),

  http.post(`${TAURI_ENDPOINT}/save_settings`, async ({ request }) => {
    const { settings } = await withJson<{ settings: Settings }>(request);
    setSettings(settings);
    return success(true);
  }),

  http.post(
    `${TAURI_ENDPOINT}/set_app_config_dir_override`,
    async ({ request }) => {
      const { path } = await withJson<{ path: string | null }>(request);
      setAppConfigDirOverrideState(path ?? null);
      return success(true);
    },
  ),

  http.post(`${TAURI_ENDPOINT}/get_app_config_dir_override`, () =>
    success(getAppConfigDirOverride()),
  ),

  http.post(
    `${TAURI_ENDPOINT}/apply_claude_plugin_config`,
    async ({ request }) => {
      const { official } = await withJson<{ official: boolean }>(request);
      setSettings({ enableClaudePluginIntegration: !official });
      return success(true);
    },
  ),

  http.post(`${TAURI_ENDPOINT}/apply_claude_onboarding_skip`, () =>
    success(true),
  ),

  http.post(`${TAURI_ENDPOINT}/clear_claude_onboarding_skip`, () =>
    success(true),
  ),

  http.post(`${TAURI_ENDPOINT}/get_config_dir`, async ({ request }) => {
    const { app } = await withJson<{ app: AppId }>(request);
    return success(app === "claude" ? "/default/claude" : "/default/codex");
  }),

  http.post(`${TAURI_ENDPOINT}/is_portable_mode`, () => success(false)),

  http.post(
    `${TAURI_ENDPOINT}/select_config_directory`,
    async ({ request }) => {
      const { defaultPath, default_path } = await withJson<{
        defaultPath?: string;
        default_path?: string;
      }>(request);
      const initial = defaultPath ?? default_path;
      return success(initial ? `${initial}/picked` : "/mock/selected-dir");
    },
  ),

  http.post(`${TAURI_ENDPOINT}/pick_directory`, async ({ request }) => {
    const { defaultPath, default_path } = await withJson<{
      defaultPath?: string;
      default_path?: string;
    }>(request);
    const initial = defaultPath ?? default_path;
    return success(initial ? `${initial}/picked` : "/mock/selected-dir");
  }),

  http.post(`${TAURI_ENDPOINT}/open_file_dialog`, () =>
    success("/mock/import-settings.json"),
  ),

  http.post(
    `${TAURI_ENDPOINT}/import_config_from_file`,
    async ({ request }) => {
      const { filePath } = await withJson<{ filePath: string }>(request);
      if (!filePath) {
        return success({ success: false, message: "Missing file" });
      }
      setSettings({ language: "en" });
      return success({ success: true, backupId: "backup-123" });
    },
  ),

  http.post(`${TAURI_ENDPOINT}/export_config_to_file`, async ({ request }) => {
    const { filePath } = await withJson<{ filePath: string }>(request);
    if (!filePath) {
      return success({ success: false, message: "Invalid destination" });
    }
    return success({ success: true, filePath });
  }),

  http.post(`${TAURI_ENDPOINT}/save_file_dialog`, () =>
    success("/mock/export-settings.json"),
  ),

  // Sync current providers live (no-op success)
  http.post(`${TAURI_ENDPOINT}/sync_current_providers_live`, () =>
    success({ success: true }),
  ),

  http.post(`${TAURI_ENDPOINT}/gateway_http_request`, async ({ request }) => {
    const { url, method = "GET" } = await withJson<{
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    }>(request);
    const parsed = new URL(url);
    const path = parsed.pathname;

    if (path.endsWith("/user/profile")) {
      return success({
        status: 200,
        body: {
          data: {
            id: "user-1",
            email: "user@example.com",
            balance: 88.8,
          },
        },
      });
    }

    if (path.endsWith("/usage/dashboard/stats")) {
      return success({
        status: 200,
        body: {
          data: {
            balance: 88.8,
            today_usage: 12.5,
            today_tokens: 3456,
            total_usage: 98.7,
            today_requests: 9,
            total_requests: 88,
          },
        },
      });
    }

    if (path.endsWith("/keys")) {
      return success({
        status: 200,
        body:
          method.toUpperCase() === "POST"
            ? {
                data: [
                  {
                    id: "key-1",
                    name: "Desktop Client",
                    secret: "sk-thq-test",
                    prefix: "sk-thq",
                  },
                ],
              }
            : {
                data: [
                  {
                    id: "key-1",
                    name: "Desktop Client",
                    secret: "sk-thq-test",
                    prefix: "sk-thq",
                  },
                ],
              },
      });
    }

    if (path.endsWith("/groups/available")) {
      return success({
        status: 200,
        body: {
          data: [{ id: "group-1", name: "默认分组", platform: "all" }],
        },
      });
    }

    if (path.endsWith("/channels/available")) {
      return success({
        status: 200,
        body: {
          data: [
            { id: "gpt-5.5", name: "GPT-5.5", enabled: true },
            {
              id: "claude-sonnet-4-20250514",
              name: "Claude Sonnet",
              enabled: true,
            },
          ],
        },
      });
    }

    if (path.endsWith("/usage")) {
      return success({ status: 200, body: { data: [] } });
    }

    if (path.endsWith("/payment/orders/my")) {
      return success({ status: 200, body: { data: [] } });
    }

    if (path.endsWith("/payment/checkout-info")) {
      return success({
        status: 200,
        body: {
          data: [{ id: "alipay", name: "支付宝", enabled: true }],
        },
      });
    }

    if (path.endsWith("/payment/plans") || path.endsWith("/payment/channels")) {
      return success({ status: 200, body: { data: [] } });
    }

    return success({ status: 200, body: { data: {} } });
  }),

  // Proxy status (for SettingsPage / ProxyPanel hooks)
  http.post(`${TAURI_ENDPOINT}/get_proxy_status`, () =>
    success({
      running: isProxyRunningState(),
      address: "127.0.0.1",
      port: isProxyRunningState() ? 15721 : 0,
      active_connections: 0,
      total_requests: 0,
      success_requests: 0,
      failed_requests: 0,
      success_rate: 0,
      uptime_seconds: 0,
      current_provider: null,
      current_provider_id: null,
      last_request_at: null,
      last_error: null,
      failover_count: 0,
      active_targets: [],
    }),
  ),

  http.post(`${TAURI_ENDPOINT}/get_proxy_takeover_status`, () =>
    success(getProxyTakeoverState()),
  ),

  http.post(`${TAURI_ENDPOINT}/get_claude_desktop_status`, () =>
    success(getClaudeDesktopStatusState()),
  ),

  http.post(`${TAURI_ENDPOINT}/start_proxy_server`, () => {
    setProxyRunningState(true);
    return success({
      address: "127.0.0.1",
      port: 15721,
      started_at: new Date().toISOString(),
    });
  }),

  http.post(`${TAURI_ENDPOINT}/stop_proxy_server`, () => {
    setProxyRunningState(false);
    return success(true);
  }),

  http.post(`${TAURI_ENDPOINT}/stop_proxy_with_restore`, () => {
    for (const app of [
      "claude",
      "codex",
      "gemini",
      "opencode",
      "openclaw",
      "hermes",
    ] as const) {
      setProxyTakeoverForApp(app, false);
    }
    setProxyRunningState(false);
    return success(true);
  }),

  http.post(
    `${TAURI_ENDPOINT}/set_proxy_takeover_for_app`,
    async ({ request }) => {
      const {
        appType,
        app_type,
        enabled = false,
      } = await withJson<{
        appType?: string;
        app_type?: string;
        enabled?: boolean;
      }>(request);
      const app = (appType ?? app_type) as
        | "claude"
        | "codex"
        | "gemini"
        | "opencode"
        | "openclaw"
        | "hermes";
      if (app) {
        setProxyTakeoverForApp(app, enabled);
      }
      return success(true);
    },
  ),

  http.post(
    `${TAURI_ENDPOINT}/enable_thq_route_for_app`,
    async ({ request }) => {
      const { appType, app_type, providerId, provider_id } = await withJson<{
        appType?: string;
        app_type?: string;
        providerId?: string;
        provider_id?: string;
      }>(request);
      const app = (appType ?? app_type) as
        | "claude"
        | "codex"
        | "gemini"
        | "opencode"
        | "openclaw"
        | "hermes";
      const target = providerId ?? provider_id;
      if (app && target) {
        setCurrentProviderId(app, target);
        setProxyTakeoverForApp(app, true);
      }
      return success(true);
    },
  ),

  http.post(
    `${TAURI_ENDPOINT}/disable_thq_route_for_app`,
    async ({ request }) => {
      const { appType, app_type } = await withJson<{
        appType?: string;
        app_type?: string;
      }>(request);
      const app = (appType ?? app_type) as
        | "claude"
        | "codex"
        | "gemini"
        | "opencode"
        | "openclaw"
        | "hermes";
      if (app) {
        setProxyTakeoverForApp(app, false);
      }
      return success(true);
    },
  ),

  http.post(`${TAURI_ENDPOINT}/is_live_takeover_active`, () =>
    success(Object.values(getProxyTakeoverState()).some(Boolean)),
  ),

  // Failover / circuit breaker defaults
  http.post(`${TAURI_ENDPOINT}/get_failover_queue`, () => success([])),
  http.post(`${TAURI_ENDPOINT}/get_available_providers_for_failover`, () =>
    success([]),
  ),
  http.post(`${TAURI_ENDPOINT}/add_to_failover_queue`, () => success(true)),
  http.post(`${TAURI_ENDPOINT}/remove_from_failover_queue`, () =>
    success(true),
  ),
  http.post(`${TAURI_ENDPOINT}/reorder_failover_queue`, () => success(true)),
  http.post(`${TAURI_ENDPOINT}/set_failover_item_enabled`, () => success(true)),

  http.post(`${TAURI_ENDPOINT}/get_circuit_breaker_config`, () =>
    success({
      failureThreshold: 3,
      successThreshold: 2,
      timeoutSeconds: 60,
      errorRateThreshold: 50,
      minRequests: 5,
    }),
  ),
  http.post(`${TAURI_ENDPOINT}/update_circuit_breaker_config`, () =>
    success(true),
  ),
  http.post(`${TAURI_ENDPOINT}/get_provider_health`, () =>
    success({
      provider_id: "mock-provider",
      app_type: "claude",
      is_healthy: true,
      consecutive_failures: 0,
      last_success_at: null,
      last_failure_at: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    }),
  ),
  http.post(`${TAURI_ENDPOINT}/reset_circuit_breaker`, () => success(true)),
  http.post(`${TAURI_ENDPOINT}/get_circuit_breaker_stats`, () => success(null)),
];
