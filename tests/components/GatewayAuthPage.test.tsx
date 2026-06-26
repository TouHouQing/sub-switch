import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GatewayAuthPage } from "@/components/gateway/GatewayAuthPage";

describe("GatewayAuthPage", () => {
  it("does not describe the gateway as fixed to sub.tohoqing.com", () => {
    render(
      <GatewayAuthPage
        isLoading={false}
        onLogin={vi.fn()}
        onRegister={vi.fn()}
      />,
    );

    expect(
      screen.queryByText(/固定.*sub\.tohoqing\.com/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Fixed to sub\.tohoqing\.com/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/固定中转站/)).not.toBeInTheDocument();
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

  it("switches to register mode and submits registration credentials", async () => {
    const handleRegister = vi.fn().mockResolvedValue(undefined);

    render(
      <GatewayAuthPage
        isLoading={false}
        onLogin={vi.fn()}
        onRegister={handleRegister}
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
      expect(handleRegister).toHaveBeenCalledWith({
        email: "new@tohoqing.com",
        password: "minimum-eight",
      });
    });
  });
});
