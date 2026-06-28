import { extractErrorMessage } from "@/utils/errorUtils";

export type GatewayErrorAction =
  | "login"
  | "register"
  | "send-code"
  | "logout"
  | "profile"
  | "general";

const FALLBACK_MESSAGES: Record<GatewayErrorAction, string> = {
  login: "登录失败，请检查邮箱和密码后重试",
  register: "注册失败，请检查信息后重试",
  "send-code": "验证码发送失败，请稍后再试",
  logout: "退出登录失败，请稍后再试",
  profile: "登录状态已过期，请重新登录",
  general: "请求失败，请稍后再试",
};

const containsAny = (message: string, patterns: string[]) =>
  patterns.some((pattern) => message.includes(pattern));

export const getGatewayErrorMessage = (
  error: unknown,
  action: GatewayErrorAction = "general",
): string => {
  const rawMessage = extractErrorMessage(error).trim();
  if (!rawMessage) return FALLBACK_MESSAGES[action];

  const message = rawMessage.toLowerCase();

  if (
    containsAny(message, [
      "error sending request",
      "failed to fetch",
      "networkerror",
      "network error",
      "load failed",
      "timed out",
      "timeout",
      "econnrefused",
      "enotfound",
    ])
  ) {
    return "网络连接失败，请检查网络后重试";
  }

  if (
    containsAny(message, [
      "registerrequest.email",
      "sendverifycoderequest.email",
      "loginrequest.email",
      "field validation for 'email'",
      "failed on the 'email' tag",
      "email failed on the 'email'",
    ])
  ) {
    return "邮箱格式不正确，请检查是否有空格或输入错误";
  }

  if (
    containsAny(message, [
      "password",
      "field validation for 'password'",
      "failed on the 'min'",
      "failed on the 'required'",
    ]) &&
    !message.includes("email")
  ) {
    return "密码格式不正确，请至少输入 6 位密码";
  }

  if (
    containsAny(message, [
      "verify_code",
      "verificationcode",
      "verification code",
      "验证码",
      "invalid code",
      "expired code",
    ])
  ) {
    return "验证码不正确或已过期，请重新获取验证码";
  }

  if (
    containsAny(message, ["401", "403", "unauthorized", "forbidden", "token"])
  ) {
    return "登录状态已过期，请重新登录";
  }

  if (message.includes("404")) {
    return action === "send-code"
      ? "验证码服务暂时不可用，请稍后再试"
      : "服务接口暂时不可用，请稍后再试";
  }

  if (message.includes("409") || message.includes("already")) {
    return "该邮箱可能已注册，请直接登录或换一个邮箱";
  }

  if (message.includes("400")) {
    return FALLBACK_MESSAGES[action];
  }

  return rawMessage;
};
