export type GatewayUser = {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  balance?: number;
};

export type GatewaySession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user?: GatewayUser;
};

export type GatewayApiKey = {
  id: string;
  name: string;
  secret?: string;
  prefix?: string;
  status?: string;
  groupId?: string;
  groupName?: string;
  createdAt?: string;
  lastUsedAt?: string;
};

export type GatewayKeyGroup = {
  id: string;
  name: string;
  platform?: string;
  description?: string;
  rate?: number;
  userRate?: number;
};

export type GatewayCreateKeyInput = {
  name?: string;
  groupId?: string;
};

export type GatewayUpdateKeyInput = {
  name?: string;
  groupId?: string;
  status?: string;
};

export type GatewayDashboardStats = {
  balance: number;
  todayUsage: number;
  todayTokens: number;
  totalUsage: number;
  todayRequests: number;
  totalRequests: number;
};

export type GatewayModel = {
  id: string;
  name: string;
  enabled: boolean;
  provider?: string;
  priceText?: string;
  contextWindow?: number;
};

export type GatewayUsageRecord = {
  id: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  createdAt?: string;
  model?: string;
  apiKeyName?: string;
  status?: string;
};

export type GatewayPaymentPlan = {
  id: string;
  name: string;
  amount: number;
  description?: string;
};

export type GatewayPaymentChannel = {
  id: string;
  name: string;
  enabled: boolean;
  minAmount?: number;
  maxAmount?: number;
  feeRate?: number;
  currency?: string;
};

export type GatewayCreatePaymentOrderInput = {
  amount: number;
  paymentType: string;
  orderType?: "balance" | "subscription";
  planId?: string;
  origin?: string;
  isMobile?: boolean;
  isWechatBrowser?: boolean;
  forceQRCode?: boolean;
};

export type GatewayOrder = {
  id: string;
  amount: number;
  orderNo?: string;
  status?: string;
  createdAt?: string;
  paidAt?: string;
  paymentUrl?: string;
  qrCode?: string;
  paymentMode?: string;
  expiresAt?: string;
};

export type GatewayKeySelection = {
  status: "ready" | "empty";
  selectedKey: GatewayApiKey | null;
};
