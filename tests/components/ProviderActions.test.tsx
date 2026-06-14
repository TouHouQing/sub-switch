import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProviderActions } from "@/components/providers/ProviderActions";

describe("ProviderActions", () => {
  it("keeps the current-provider button clickable and shows active pulse state", () => {
    const onSwitch = vi.fn();

    render(
      <ProviderActions
        appId="codex"
        isCurrent
        isActuallyActive
        onSwitch={onSwitch}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: /provider\.inUse/i });
    expect(button).not.toBeDisabled();
    expect(button.className).toContain("before:animate-pulse");

    fireEvent.click(button);
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });
});
