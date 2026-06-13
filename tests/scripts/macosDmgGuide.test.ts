import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const buildScript = readFileSync(resolve(root, "scripts/build-macos-dmg.sh"), "utf8");
const workflow = readFileSync(resolve(root, ".github/workflows/release.yml"), "utf8");
const docs = readFileSync(resolve(root, "docs/macos-notarized-release.md"), "utf8");

describe("macOS DMG install guide", () => {
  it("guides users to run the DMG helper with bash before dragging the script path", () => {
    for (const source of [buildScript, workflow, docs]) {
      expect(source).toContain("bash ");
      expect(source).toContain("3-install.sh");
      expect(source).not.toContain("3-drag-then-press-return.sh");
      expect(source).not.toContain("看到 Terminal 里出现脚本路径后，按 Return");
    }
  });
});
