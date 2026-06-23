import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getVersionMock = vi.hoisted(() => vi.fn());
const updaterCheckMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: getVersionMock,
}));

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: updaterCheckMock,
}));

import { checkForUpdate } from "@/lib/updater";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("checkForUpdate", () => {
  beforeEach(() => {
    getVersionMock.mockResolvedValue("3.16.20");
    updaterCheckMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to GitHub releases when the Tauri updater metadata is missing", async () => {
    updaterCheckMock.mockRejectedValue(
      new Error("HTTP status client error (404 Not Found)"),
    );
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse([
        {
          tag_name: "v3.16.21",
          body: "Fix update checking",
          published_at: "2026-06-23T01:56:19Z",
        },
        {
          tag_name: "v3.16.20",
          body: "Current release",
          published_at: "2026-06-22T01:56:19Z",
        },
      ]),
    );

    await expect(checkForUpdate()).resolves.toEqual({
      status: "available",
      info: {
        currentVersion: "3.16.20",
        availableVersion: "3.16.21",
        notes: "Fix update checking",
        pubDate: "2026-06-23T01:56:19Z",
        canInstall: false,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/TouHouQing/sub-switch/releases?per_page=20",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/vnd.github+json",
        }),
      }),
    );
  });

  it("treats GitHub fallback releases that are not newer as up to date", async () => {
    updaterCheckMock.mockRejectedValue(
      new Error("HTTP status client error (404 Not Found)"),
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse([
        {
          tag_name: "v3.16.20",
          body: "Current release",
          published_at: "2026-06-22T01:56:19Z",
        },
      ]),
    );

    await expect(checkForUpdate()).resolves.toEqual({ status: "up-to-date" });
  });
});
