import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProviderForm } from "@/components/providers/forms/ProviderForm";
import { createTestQueryClient } from "../utils/testQueryClient";

vi.mock("@/lib/api", () => ({
  providersApi: {
    getAll: vi.fn().mockResolvedValue({}),
    getCurrent: vi.fn().mockResolvedValue(""),
    getOpenCodeLiveProviderIds: vi.fn().mockResolvedValue([]),
    getOpenClawLiveProviderIds: vi.fn().mockResolvedValue([]),
    getHermesLiveProviderIds: vi.fn().mockResolvedValue([]),
  },
  settingsApi: {
    get: vi.fn().mockResolvedValue({ commonConfigConfirmed: true }),
    save: vi.fn(),
  },
  configApi: {
    getCommonConfigSnippet: vi.fn().mockResolvedValue(""),
    setCommonConfigSnippet: vi.fn().mockResolvedValue(undefined),
    extractCommonConfigSnippet: vi.fn().mockResolvedValue(""),
  },
  openclawApi: {
    getLiveProvider: vi.fn(),
  },
}));

vi.mock("@/components/JsonEditor", () => ({
  default: ({ value, language }: { value: string; language?: string }) => (
    <textarea
      aria-label={`json-editor-${language ?? "plain"}`}
      readOnly
      value={value}
    />
  ),
}));

vi.mock("@/components/providers/forms/CommonConfigEditor", () => ({
  CommonConfigEditor: ({ value }: { value: string }) => (
    <textarea aria-label="common-config-editor" readOnly value={value} />
  ),
}));

vi.mock("@/components/providers/forms/CodexConfigEditor", () => ({
  default: ({
    authValue,
    configValue,
  }: {
    authValue: string;
    configValue: string;
  }) => (
    <div>
      <textarea aria-label="auth.json" readOnly value={authValue} />
      <textarea aria-label="config.toml" readOnly value={configValue} />
    </div>
  ),
}));

const renderForm = (
  overrides: Partial<React.ComponentProps<typeof ProviderForm>> = {},
) => {
  const queryClient = createTestQueryClient();
  const onSubmit = vi.fn();

  const view = render(
    <QueryClientProvider client={queryClient}>
      <ProviderForm
        appId="codex"
        providerId="thq-gateway"
        submitLabel="Save"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        initialData={{
          name: "THQ Gateway",
          websiteUrl: "https://sub.tohoqing.com",
          notes: "hidden",
          category: "aggregator",
          settingsConfig: {
            auth: { OPENAI_API_KEY: "sk-thq" },
            config:
              'model_provider = "thq-gateway"\n[model_providers.thq-gateway]\nbase_url = "https://sub.tohoqing.com/v1"\n',
            modelCatalog: {
              models: [
                {
                  model: "gpt-5.5",
                  displayName: "GPT 5.5",
                  contextWindow: 128000,
                },
              ],
            },
          },
          meta: {
            apiFormat: "openai_chat",
            testConfig: { enabled: true, testModel: "gpt-5.5" },
          },
        }}
        showButtons={false}
        variant="tool-route-advanced"
        {...overrides}
      />
    </QueryClientProvider>,
  );

  return { ...view, onSubmit };
};

describe("ProviderForm tool route advanced mode", () => {
  it("hides provider identity fields while keeping config editors and advanced options editable", async () => {
    renderForm();

    await waitFor(() => {
      expect(screen.getByLabelText("auth.json")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("config.toml")).toBeInTheDocument();
    expect(screen.getByText("模型映射")).toBeInTheDocument();
    expect(screen.getByDisplayValue("GPT 5.5")).toBeInTheDocument();
    expect(screen.getByText("模型测试配置")).toBeInTheDocument();

    expect(screen.queryByLabelText("provider.name")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("provider.websiteUrl"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("API Key")).not.toBeInTheDocument();
    expect(
      screen.queryByText("providerForm.apiEndpoint"),
    ).not.toBeInTheDocument();
  });

  it("preserves hidden provider metadata when saving the restricted editor", async () => {
    const { onSubmit } = renderForm({
      showButtons: true,
      initialData: {
        name: "THQ Gateway",
        websiteUrl: "https://sub.tohoqing.com",
        notes: "hidden",
        category: "aggregator",
        settingsConfig: {
          auth: { OPENAI_API_KEY: "sk-thq" },
          config:
            'model_provider = "thq-gateway"\n[model_providers.thq-gateway]\nbase_url = "https://sub.tohoqing.com/v1"\n',
        },
        icon: "openai",
        iconColor: "#0EA5E9",
        meta: {
          apiFormat: "openai_responses",
          commonConfigEnabled: false,
          codexChatReasoning: {
            supportsThinking: true,
            supportsEffort: true,
            effortValueMode: "openrouter",
          },
          customUserAgent: "THQ-Switch-Test",
          providerType: "codex_oauth",
          authBinding: {
            source: "managed_account",
            authProvider: "codex_oauth",
            accountId: "acct-1",
          },
          codexFastMode: true,
          testConfig: { enabled: true, testModel: "gpt-5.5" },
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("auth.json")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: "THQ Gateway",
      websiteUrl: "https://sub.tohoqing.com",
      notes: "hidden",
      icon: "openai",
      iconColor: "#0EA5E9",
      presetCategory: "aggregator",
      meta: {
        apiFormat: "openai_responses",
        commonConfigEnabled: false,
        codexChatReasoning: {
          supportsThinking: true,
          supportsEffort: true,
          effortValueMode: "openrouter",
        },
        customUserAgent: "THQ-Switch-Test",
        providerType: "codex_oauth",
        authBinding: {
          source: "managed_account",
          authProvider: "codex_oauth",
          accountId: "acct-1",
        },
        codexFastMode: true,
        testConfig: { enabled: true, testModel: "gpt-5.5" },
      },
    });
  });

  it("shows advanced options for JSON-config tool routes", async () => {
    renderForm({
      appId: "opencode",
      initialData: {
        name: "THQ Gateway",
        websiteUrl: "https://sub.tohoqing.com",
        category: "aggregator",
        settingsConfig: {
          npm: "@ai-sdk/openai-compatible",
          options: {
            baseURL: "https://sub.tohoqing.com/v1",
            apiKey: "sk-thq",
          },
          models: {},
        },
        meta: {
          testConfig: { enabled: true, testModel: "gpt-5.5" },
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("json-editor-json")).toBeInTheDocument();
    });
    expect(screen.getByText("Models")).toBeInTheDocument();
    expect(screen.getByText("模型测试配置")).toBeInTheDocument();
    expect(screen.queryByLabelText("provider.name")).not.toBeInTheDocument();
    expect(screen.queryByText("API Key")).not.toBeInTheDocument();
  });
});
