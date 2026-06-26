import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GatewayOrdersPanel } from "@/components/gateway/GatewayOrdersPanel";

describe("GatewayOrdersPanel", () => {
  it("displays known order statuses in Chinese", () => {
    render(
      <GatewayOrdersPanel
        loading={false}
        orders={[
          {
            id: "order_1",
            orderNo: "ORD-001",
            amount: 20,
            status: "paid",
            createdAt: "2026-06-26T10:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("已支付")).toBeInTheDocument();
    expect(screen.queryByText("paid")).not.toBeInTheDocument();
  });

  it("does not render the action column", () => {
    render(
      <GatewayOrdersPanel
        loading={false}
        orders={[
          {
            id: "order_1",
            orderNo: "ORD-001",
            amount: 20,
            status: "pending",
            paymentUrl: "https://pay.example/checkout",
          },
        ]}
      />,
    );

    expect(screen.queryByText("操作")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "支付" }),
    ).not.toBeInTheDocument();
  });
});
