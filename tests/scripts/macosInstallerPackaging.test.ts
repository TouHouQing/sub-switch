import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("macOS installer packaging", () => {
  it("keeps the DMG focused on the no-Terminal consumer install flow", () => {
    const dmgScript = read("scripts/build-macos-dmg.sh");

    expect(dmgScript).toContain("右键打开");
    expect(dmgScript).toContain("Control + 点击");
    expect(dmgScript).toContain("Applications");
    expect(dmgScript).not.toContain("2 Open Terminal.app");
    expect(dmgScript).not.toContain("3-install.sh");
    expect(dmgScript).not.toContain("bash /Volumes");
  });

  it("makes the release page recommend DMG for normal users and CLI for advanced users", () => {
    const releaseWorkflow = read(".github/workflows/release.yml");

    expect(releaseWorkflow).toContain("macOS 普通安装");
    expect(releaseWorkflow).toContain("右键/Control 点按");
    expect(releaseWorkflow).toContain("macOS 命令行安装（高级）");
    expect(releaseWorkflow).not.toContain(
      "打开 DMG 后按窗口里的 1 → 2 → 3 → 4",
    );
    expect(releaseWorkflow).not.toContain("3-install.sh");
  });
});
