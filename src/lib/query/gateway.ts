import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gatewayApiClient } from "@/lib/gateway/api";
import {
  clearStoredGatewaySelectedKeyId,
  loadGatewaySelectedKeyId,
  resolveGatewayKeySelection,
  saveGatewaySelectedKeyId,
} from "@/lib/gateway/keySelection";
import { clearGatewaySession, loadGatewaySession } from "@/lib/gateway/session";
import type {
  GatewayCreateKeyInput,
  GatewayCreatePaymentOrderInput,
  GatewayRegisterCredentials,
  GatewayUpdateKeyInput,
} from "@/types/gateway";

const gatewayModelsScopeKey = (apiKey?: string): string => {
  if (!apiKey) return "available";

  // Avoid putting the raw secret into React Query cache keys or devtools.
  let hash = 0x811c9dc5;
  for (let index = 0; index < apiKey.length; index += 1) {
    hash ^= apiKey.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `with-key-${(hash >>> 0).toString(36)}`;
};

export const gatewayKeys = {
  all: ["gateway"] as const,
  session: () => [...gatewayKeys.all, "session"] as const,
  profile: () => [...gatewayKeys.all, "profile"] as const,
  login: () => [...gatewayKeys.all, "login"] as const,
  register: () => [...gatewayKeys.all, "register"] as const,
  registerVerificationCode: () =>
    [...gatewayKeys.all, "register-verification-code"] as const,
  logout: () => [...gatewayKeys.all, "logout"] as const,
  keys: () => [...gatewayKeys.all, "keys"] as const,
  keyGroups: () => [...gatewayKeys.all, "key-groups"] as const,
  keySelection: () => [...gatewayKeys.all, "key-selection"] as const,
  createKey: () => [...gatewayKeys.all, "create-key"] as const,
  updateKey: () => [...gatewayKeys.all, "update-key"] as const,
  stats: () => [...gatewayKeys.all, "stats"] as const,
  models: (apiKey?: string) =>
    [...gatewayKeys.all, "models", gatewayModelsScopeKey(apiKey)] as const,
  usage: () => [...gatewayKeys.all, "usage"] as const,
  orders: () => [...gatewayKeys.all, "orders"] as const,
  paymentPlans: () => [...gatewayKeys.all, "payment-plans"] as const,
  paymentChannels: () => [...gatewayKeys.all, "payment-channels"] as const,
};

export function useGatewaySessionQuery(enabled = true) {
  return useQuery({
    queryKey: gatewayKeys.session(),
    queryFn: () => loadGatewaySession(),
    enabled,
  });
}

export function useGatewayProfileQuery(enabled = true) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: gatewayKeys.profile(),
    queryFn: async () => {
      try {
        return await gatewayApiClient.profile();
      } catch (error) {
        if (!loadGatewaySession()) {
          clearGatewaySession();
          clearStoredGatewaySelectedKeyId();
          queryClient.setQueryData(gatewayKeys.session(), null);
        }
        throw error;
      }
    },
    enabled,
    retry: false,
  });
}

export function useGatewayLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      gatewayApiClient.login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.session() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.profile() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keys() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keySelection() });
    },
  });
}

export function useGatewayRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: GatewayRegisterCredentials) =>
      gatewayApiClient.register(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.session() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.profile() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keys() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keySelection() });
    },
  });
}

export function useGatewayRegisterVerificationCodeMutation() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) =>
      gatewayApiClient.sendRegisterVerificationCode(email),
  });
}

export function useGatewayLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gatewayApiClient.logout(),
    onSuccess: () => {
      clearStoredGatewaySelectedKeyId();
      queryClient.invalidateQueries({ queryKey: gatewayKeys.session() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.profile() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keys() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keySelection() });
    },
  });
}

export function useGatewayKeysQuery(enabled = true) {
  return useQuery({
    queryKey: gatewayKeys.keys(),
    queryFn: () => gatewayApiClient.keys(),
    enabled,
  });
}

export function useGatewayKeyGroupsQuery(enabled = true) {
  return useQuery({
    queryKey: gatewayKeys.keyGroups(),
    queryFn: () => gatewayApiClient.keyGroups(),
    enabled,
  });
}

export function useGatewayKeySelectionQuery(enabled = true) {
  return useQuery({
    queryKey: gatewayKeys.keySelection(),
    queryFn: async () => {
      const keys = await gatewayApiClient.keys();
      return resolveGatewayKeySelection(keys, loadGatewaySelectedKeyId());
    },
    enabled,
  });
}

export function useGatewayCreateKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: string | GatewayCreateKeyInput) =>
      gatewayApiClient.createKey(input),
    onSuccess: (keys) => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keys() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keySelection() });
      queryClient.invalidateQueries({
        queryKey: [...gatewayKeys.all, "models"],
      });
      if (keys[0]?.id) {
        saveGatewaySelectedKeyId(keys[0].id);
      }
    },
  });
}

export function useGatewayUpdateKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: GatewayUpdateKeyInput }) =>
      gatewayApiClient.updateKey(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keys() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keySelection() });
      queryClient.invalidateQueries({
        queryKey: [...gatewayKeys.all, "models"],
      });
    },
  });
}

export function useGatewaySelectKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => {
      saveGatewaySelectedKeyId(keyId);
      return Promise.resolve(keyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keySelection() });
    },
  });
}

export function useGatewayDeleteKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => gatewayApiClient.deleteKey(keyId),
    onSuccess: (_result, keyId) => {
      if (loadGatewaySelectedKeyId() === keyId) {
        clearStoredGatewaySelectedKeyId();
      }
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keys() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.keySelection() });
      queryClient.invalidateQueries({
        queryKey: [...gatewayKeys.all, "models"],
      });
    },
  });
}

export function useGatewayStatsQuery(enabled = true) {
  return useQuery({
    queryKey: gatewayKeys.stats(),
    queryFn: () => gatewayApiClient.dashboardStats(),
    enabled,
  });
}

export function useGatewayModelsQuery(enabled = true, apiKey?: string) {
  return useQuery({
    queryKey: gatewayKeys.models(apiKey),
    queryFn: async () => {
      const availableModels = await gatewayApiClient.availableModels();
      if (availableModels.length > 0 || !apiKey) {
        return availableModels;
      }
      return gatewayApiClient.modelsWithApiKey(apiKey);
    },
    enabled,
  });
}

export function useGatewayUsageQuery(enabled = true) {
  return useQuery({
    queryKey: gatewayKeys.usage(),
    queryFn: () => gatewayApiClient.usageRecords(),
    enabled,
  });
}

export function useGatewayOrdersQuery(enabled = true) {
  return useQuery({
    queryKey: gatewayKeys.orders(),
    queryFn: () => gatewayApiClient.orders(),
    enabled,
  });
}

export function useGatewayPaymentPlansQuery(enabled = true) {
  return useQuery({
    queryKey: gatewayKeys.paymentPlans(),
    queryFn: () => gatewayApiClient.paymentPlans(),
    enabled,
  });
}

export function useGatewayPaymentChannelsQuery(enabled = true) {
  return useQuery({
    queryKey: gatewayKeys.paymentChannels(),
    queryFn: () => gatewayApiClient.paymentChannels(),
    enabled,
  });
}

export function useGatewayCreatePaymentOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GatewayCreatePaymentOrderInput) =>
      gatewayApiClient.createPaymentOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.orders() });
      queryClient.invalidateQueries({ queryKey: gatewayKeys.stats() });
    },
  });
}
