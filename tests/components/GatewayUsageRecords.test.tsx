import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GatewayUsageRecords } from "@/components/gateway/GatewayUsageRecords";

describe("GatewayUsageRecords", () => {
  it("does not render the status column", () => {
    render(
      <GatewayUsageRecords
        loading={false}
        records={[
          {
            id: "req_1",
            createdAt: "2026-06-26T10:00:00.000Z",
            model: "gpt-5",
            promptTokens: 1000,
            completionTokens: 200,
            totalTokens: 1200,
            cost: 1.5,
            status: "success",
          },
        ]}
      />,
    );

    const table = screen.getByRole("table");

    expect(within(table).queryByText("状态")).not.toBeInTheDocument();
    expect(within(table).queryByText("success")).not.toBeInTheDocument();
  });
});
