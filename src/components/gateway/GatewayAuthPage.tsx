import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GATEWAY_ORIGIN } from "@/lib/gateway/constants";
import { normalizeGatewayEmail } from "@/lib/gateway/email";

export interface GatewayAuthCredentials {
  email: string;
  password: string;
}

export interface GatewayRegisterCredentials extends GatewayAuthCredentials {
  verificationCode: string;
}

interface GatewayAuthPageProps {
  isLoading: boolean;
  isSendingVerificationCode?: boolean;
  error?: string;
  onLogin: (credentials: GatewayAuthCredentials) => Promise<void> | void;
  onRegister: (credentials: GatewayRegisterCredentials) => Promise<void> | void;
  onSendRegisterCode?: (email: string) => Promise<void> | void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthMode = "login" | "register" | "verify";

export function GatewayAuthPage({
  isLoading,
  isSendingVerificationCode = false,
  error,
  onLogin,
  onRegister,
  onSendRegisterCode,
}: GatewayAuthPageProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingRegistration, setPendingRegistration] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [localError, setLocalError] = useState("");
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [autoSent, setAutoSent] = useState(false);

  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isVerify = mode === "verify";
  const normalizedEmail = normalizeGatewayEmail(email);
  const isEmailValid = EMAIL_PATTERN.test(normalizedEmail);
  const shownError = localError || error;

  const resetVerification = () => {
    setMode("register");
    setVerificationCode("");
    setPendingRegistration(null);
    setCodeCooldown(0);
    setAutoSent(false);
    setLocalError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (!isEmailValid) {
      setLocalError(
        t("gateway.auth.invalidEmail", {
          defaultValue: "请输入有效的邮箱地址",
        }),
      );
      return;
    }

    const credentials = {
      email: normalizedEmail,
      password,
    };

    if (isLogin) {
      await onLogin(credentials);
      return;
    }

    if (isRegister) {
      setPendingRegistration(credentials);
      setVerificationCode("");
      setMode("verify");
      return;
    }

    if (!pendingRegistration) {
      setLocalError(
        t("gateway.auth.registerSessionMissing", {
          defaultValue: "请先重新发起注册流程",
        }),
      );
      return;
    }

    const code = verificationCode.trim();
    if (!code) {
      setLocalError(
        t("gateway.auth.verificationCodeRequired", {
          defaultValue: "请输入邮箱验证码",
        }),
      );
      return;
    }

    await onRegister({
      ...pendingRegistration,
      verificationCode: code,
    });
  };

  const handleSendCode = async (targetEmail?: string) => {
    setLocalError("");
    const emailToUse = normalizeGatewayEmail(
      targetEmail ?? pendingRegistration?.email ?? email,
    );
    if (!EMAIL_PATTERN.test(emailToUse)) {
      setLocalError(
        t("gateway.auth.invalidEmail", {
          defaultValue: "请输入有效的邮箱地址",
        }),
      );
      return;
    }
    if (!onSendRegisterCode) return;
    await onSendRegisterCode(emailToUse);
    setCodeCooldown(60);
  };

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCodeCooldown((seconds) => Math.max(seconds - 1, 0)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [codeCooldown]);

  useEffect(() => {
    if (!isVerify || autoSent || !pendingRegistration?.email) return;
    setAutoSent(true);
    void handleSendCode(pendingRegistration.email);
    // Keep the auto-send bootstrap lightweight; the resend button is still available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerify, autoSent, pendingRegistration?.email]);

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setVerificationCode("");
    setPendingRegistration(null);
    setCodeCooldown(0);
    setAutoSent(false);
    setLocalError("");
  };

  return (
    <main className="flex min-h-full items-center justify-center px-6 py-10">
      <section className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-lg border border-border-default bg-card shadow-sm md:grid-cols-[1fr_420px]">
        <div className="flex min-h-[460px] flex-col justify-between bg-zinc-950 p-8 text-white dark:bg-zinc-950">
          <div>
            <div className="inline-flex items-center rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
              THQ AI Gateway
            </div>
            <h1 className="mt-8 max-w-lg text-3xl font-semibold tracking-normal">
              {t("gateway.auth.title", {
                defaultValue: "登录后管理你的 AI 中转站额度与本地工具配置",
              })}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-zinc-300">
              {t("gateway.auth.subtitle", {
                defaultValue:
                  "余额、用量、模型、订单和本地工具写入集中在一个工作台里。",
              })}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-zinc-300">
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <p className="text-zinc-500">Base</p>
              <p className="mt-1 font-medium text-zinc-100">/v1</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <p className="text-zinc-500">Key</p>
              <p className="mt-1 font-medium text-zinc-100">
                {t("gateway.auth.firstKey", { defaultValue: "默认第一个" })}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <p className="text-zinc-500">API</p>
              <p className="mt-1 font-medium text-zinc-100">
                {t("gateway.auth.fixedGateway", { defaultValue: "统一管理" })}
              </p>
            </div>
          </div>
        </div>

        <form
          className="flex flex-col justify-center p-8"
          onSubmit={handleSubmit}
          noValidate
        >
          <div>
            <div className="flex items-center gap-2">
              {isLogin ? (
                <LogIn className="h-5 w-5 text-cyan-500" />
              ) : (
                <UserPlus className="h-5 w-5 text-emerald-500" />
              )}
              <h2 className="text-xl font-semibold">
                {isVerify
                  ? t("gateway.auth.verifyTitle", {
                      defaultValue: "验证邮箱",
                    })
                  : isRegister
                    ? t("gateway.auth.registerTitle", {
                        defaultValue: "注册账号",
                      })
                    : t("gateway.auth.loginTitle", {
                        defaultValue: "账号登录",
                      })}
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {GATEWAY_ORIGIN}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gateway-email">
                {t("gateway.auth.email", { defaultValue: "邮箱" })}
              </Label>
              <Input
                id="gateway-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setLocalError("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gateway-password">
                {t("gateway.auth.password", { defaultValue: "密码" })}
              </Label>
              <Input
                id="gateway-password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setLocalError("");
                }}
                placeholder="••••••••"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={6}
              />
            </div>

            {isVerify && pendingRegistration && (
              <div className="space-y-2">
                <div className="rounded-md border border-border-default bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {pendingRegistration.email}
                </div>
              </div>
            )}

            {isVerify && pendingRegistration && (
              <div className="space-y-2">
                <Label htmlFor="gateway-verification-code">
                  {t("gateway.auth.verificationCode", {
                    defaultValue: "邮箱验证码",
                  })}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="gateway-verification-code"
                    value={verificationCode}
                    onChange={(event) => {
                      setVerificationCode(event.target.value);
                      setLocalError("");
                    }}
                    placeholder={t("gateway.auth.verificationCodePlaceholder", {
                      defaultValue: "请输入验证码",
                    })}
                    autoComplete="one-time-code"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    disabled={
                      isLoading ||
                      isSendingVerificationCode ||
                      codeCooldown > 0
                    }
                    onClick={() => void handleSendCode(pendingRegistration.email)}
                  >
                    {isSendingVerificationCode
                      ? t("common.loading", { defaultValue: "加载中..." })
                      : codeCooldown > 0
                        ? t("gateway.auth.resendCodeCountdown", {
                            defaultValue: "{{seconds}}s",
                            seconds: codeCooldown,
                          })
                        : t("gateway.auth.sendVerificationCode", {
                            defaultValue: "发送验证码",
                          })}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {shownError && (
            <p className="mt-4 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-500 dark:text-red-300">
              {shownError}
            </p>
          )}

          <Button type="submit" className="mt-6" disabled={isLoading}>
            {isLoading
              ? t("common.loading", { defaultValue: "加载中..." })
              : isVerify
                ? t("gateway.auth.verifyAndCreate", {
                    defaultValue: "完成注册",
                  })
                : isRegister
                  ? t("gateway.auth.register", { defaultValue: "注册" })
                  : t("gateway.auth.login", { defaultValue: "登录" })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="mt-2"
            onClick={isVerify ? resetVerification : switchMode}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isVerify
              ? t("gateway.auth.backToRegistration", {
                  defaultValue: "返回注册",
                })
              : isRegister
                ? t("gateway.auth.backToLogin", {
                    defaultValue: "返回登录",
                  })
                : t("gateway.auth.registerAccount", {
                    defaultValue: "注册账号",
                  })}
          </Button>
        </form>
      </section>
    </main>
  );
}
