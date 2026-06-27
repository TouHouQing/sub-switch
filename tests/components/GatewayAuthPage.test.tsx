import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GatewayAuthPage } from "@/components/gateway/GatewayAuthPage";

describe("GatewayAuthPage", () => {
  it("renders the login form", () => {
    render(
      <GatewayAuthPage
        isLoading={false}
        onLogin={vi.fn()}
        onRegister={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "账号登录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "注册账号" })).toBeInTheDocument();
  });

  it("submits login credentials", async () => {
    const handleLogin = vi.fn().mockResolvedValue(undefined);

    render(
      <GatewayAuthPage
        isLoading={false}
        onLogin={handleLogin}
        onRegister={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "owner@tohoqing.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(handleLogin).toHaveBeenCalledWith({
        email: "owner@tohoqing.com",
        password: "correct horse battery staple",
      });
    });
  });

  it("moves from registration to verification and then submits the verification code", async () => {
    const handleRegister = vi.fn().mockResolvedValue(undefined);
    const handleSendCode = vi.fn().mockResolvedValue(undefined);

    render(
      <GatewayAuthPage
        isLoading={false}
        onLogin={vi.fn()}
        onRegister={handleRegister}
        onSendRegisterCode={handleSendCode}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "注册账号" }));
    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "new@tohoqing.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "minimum-eight" },
    });
    fireEvent.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "验证邮箱" })).toBeInTheDocument();
      expect(handleSendCode).toHaveBeenCalledWith("new@tohoqing.com");
    });

    fireEvent.change(screen.getByLabelText("邮箱验证码"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "完成注册" }));

    await waitFor(() => {
      expect(handleRegister).toHaveBeenCalledWith({
        email: "new@tohoqing.com",
        password: "minimum-eight",
        verificationCode: "123456",
      });
    });
  });

  it("returns to registration from verify mode", async () => {
    const handleSendCode = vi.fn().mockResolvedValue(undefined);

    render(
      <GatewayAuthPage
        isLoading={false}
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        onSendRegisterCode={handleSendCode}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "注册账号" }));
    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "new@tohoqing.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "minimum-eight" },
    });
    fireEvent.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => {
      expect(handleSendCode).toHaveBeenCalledWith("new@tohoqing.com");
    });

    fireEvent.click(screen.getByRole("button", { name: "返回注册" }));

    expect(screen.getByRole("heading", { name: "注册账号" })).toBeInTheDocument();
  });

  it("normalizes email before sending verification code from the form", async () => {
    const handleSendCode = vi.fn().mockResolvedValue(undefined);

    render(
      <GatewayAuthPage
        isLoading={false}
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        onSendRegisterCode={handleSendCode}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "注册账号" }));
    fireEvent.change(screen.getByLabelText("邮箱"), {
      target: { value: "  new@tohoqing.com\u200b " },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "minimum-eight" },
    });
    fireEvent.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => {
      expect(handleSendCode).toHaveBeenCalledWith("new@tohoqing.com");
    });
  });
});
