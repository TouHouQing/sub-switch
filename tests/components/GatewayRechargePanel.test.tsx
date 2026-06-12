import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GatewayRechargePanel } from "@/components/gateway/GatewayRechargePanel";

describe("GatewayRechargePanel", () => {
  it("creates a balance recharge order from the selected amount and payment channel", async () => {
    const handleCreateOrder = vi.fn().mockResolvedValue({
      id: "order-1",
      amount: 20,
      paymentUrl: "https://pay.example/checkout",
    });
    const handleOpenExternal = vi.fn();

    render(
      <GatewayRechargePanel
        channels={[
          { id: "alipay_direct", name: "支付宝", enabled: true },
          { id: "wxpay_direct", name: "微信支付", enabled: true },
        ]}
        loading={false}
        isCreatingOrder={false}
        onCreateOrder={handleCreateOrder}
        onOpenExternal={handleOpenExternal}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "充值" }));

    await waitFor(() => {
      expect(handleCreateOrder).toHaveBeenCalledWith({
        amount: 20,
        paymentType: "alipay_direct",
        orderType: "balance",
      });
    });
    expect(handleOpenExternal).toHaveBeenCalledWith("https://pay.example/checkout");
  });
});
