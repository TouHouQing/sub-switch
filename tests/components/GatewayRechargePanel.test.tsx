import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as QRCode from "qrcode";
import { describe, expect, it, vi } from "vitest";
import { GatewayRechargePanel } from "@/components/gateway/GatewayRechargePanel";

vi.mock("qrcode", () => ({
  toString: vi.fn().mockResolvedValue("<svg><path /></svg>"),
}));

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
        forceQRCode: true,
      });
    });
    expect(handleOpenExternal).toHaveBeenCalledWith(
      "https://pay.example/checkout",
    );
  });

  it("shows a scan QR code instead of opening the Alipay redirect page", async () => {
    const handleCreateOrder = vi.fn().mockResolvedValue({
      id: "order-qr",
      amount: 20,
      paymentUrl:
        "https://render.alipay.com/p/yuyan/180020040001212700/?cid=wap_dc",
      qrCode: "https://qr.example/alipay",
      paymentMode: "qrcode",
    });
    const handleOpenExternal = vi.fn();

    render(
      <GatewayRechargePanel
        channels={[{ id: "alipay", name: "支付宝", enabled: true }]}
        loading={false}
        isCreatingOrder={false}
        onCreateOrder={handleCreateOrder}
        onOpenExternal={handleOpenExternal}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "充值" }));

    expect(await screen.findByAltText("支付宝付款二维码")).toBeInTheDocument();
    expect(screen.getByText("请使用支付宝扫码完成付款")).toBeInTheDocument();
    expect(handleOpenExternal).not.toHaveBeenCalledWith(
      "https://render.alipay.com/p/yuyan/180020040001212700/?cid=wap_dc",
    );
  });

  it("renders payment links as generated QR images instead of direct image sources", async () => {
    const alipayPaymentLink =
      "https://render.alipay.com/p/yuyan/180020040001212700/?cid=wap_dc";
    const handleCreateOrder = vi.fn().mockResolvedValue({
      id: "order-link-qr",
      amount: 20,
      qrCode: alipayPaymentLink,
      paymentMode: "qrcode",
    });
    const handleOpenExternal = vi.fn();

    render(
      <GatewayRechargePanel
        channels={[{ id: "alipay", name: "支付宝", enabled: true }]}
        loading={false}
        isCreatingOrder={false}
        onCreateOrder={handleCreateOrder}
        onOpenExternal={handleOpenExternal}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "充值" }));

    await waitFor(() => {
      expect(QRCode.toString).toHaveBeenCalledWith(
        alipayPaymentLink,
        expect.objectContaining({ type: "svg", width: 220 }),
      );
    });
    expect(await screen.findByAltText("支付宝付款二维码")).toHaveAttribute(
      "src",
      `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        "<svg><path /></svg>",
      )}`,
    );
  });
});
