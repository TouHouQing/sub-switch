import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkForUpdate } from "./updater";

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn(),
}));

describe("checkForUpdate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the latest GitHub release even when it is a prerelease", async () => {
    const { getVersion } = await import("@tauri-apps/api/app");
    vi.mocked(getVersion).mockResolvedValue("3.16.23");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          tag_name: "v3.16.24",
          body: "minor fix",
          published_at: "2026-06-27T13:31:30Z",
          prerelease: true,
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkForUpdate();

    expect(result.status).toBe("available");
    if (result.status === "available") {
      expect(result.info.availableVersion).toBe("3.16.24");
      expect(result.info.notes).toBe("minor fix");
    }
    expect(fetchMock).toHaveBeenCalled();
  });
});
