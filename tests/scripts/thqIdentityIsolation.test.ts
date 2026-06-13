import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("THQ Switch identity isolation", () => {
  it("uses a unique Tauri bundle id, deep-link scheme, updater, package, and binary identity", () => {
    const tauriConfig = JSON.parse(read("src-tauri/tauri.conf.json"));
    const cargoToml = read("src-tauri/Cargo.toml");
    const mainRs = read("src-tauri/src/main.rs");
    const infoPlist = read("src-tauri/Info.plist");
    const windowsConfig = JSON.parse(read("src-tauri/tauri.windows.conf.json"));
    const releaseWorkflow = read(".github/workflows/release.yml");

    expect(tauriConfig.productName).toBe("THQ Switch");
    expect(tauriConfig.identifier).toBe("com.thq.switch.desktop");
    expect(tauriConfig.plugins["deep-link"].desktop.schemes).toEqual([
      "thqswitch",
    ]);
    expect(tauriConfig.plugins.updater.endpoints).toEqual([
      "https://github.com/TouHouQing/sub-switch/releases/latest/download/latest.json",
    ]);
    expect(cargoToml).toContain('name = "thq-switch"');
    expect(cargoToml).toContain('name = "thq_switch_lib"');
    expect(cargoToml).toContain(
      'repository = "https://github.com/TouHouQing/sub-switch"',
    );
    expect(mainRs).toContain("thq_switch_lib::run()");
    expect(infoPlist).toContain("<string>THQ Switch Deep Link</string>");
    expect(infoPlist).toContain("<string>thqswitch</string>");
    expect(windowsConfig.app.windows[0].title).toBe("THQ Switch");
    expect(releaseWorkflow).toContain("-Filter 'thq-switch.exe'");
    expect(releaseWorkflow).not.toContain("-Filter 'cc-switch.exe'");
  });

  it("uses separate local state paths and sync defaults from CC Switch", () => {
    const configRs = read("src-tauri/src/config.rs");
    const databaseMod = read("src-tauri/src/database/mod.rs");
    const databaseBackup = read("src-tauri/src/database/backup.rs");
    const panicHook = read("src-tauri/src/panic_hook.rs");
    const settingsRs = read("src-tauri/src/settings.rs");
    const directoryHook = read("src/hooks/useDirectorySettings.ts");
    const appTsx = read("src/App.tsx");
    const appSwitcher = read("src/components/AppSwitcher.tsx");
    const updateContext = read("src/contexts/UpdateContext.tsx");
    const codexConfig = read("src-tauri/src/codex_config.rs");
    const tray = read("src-tauri/src/tray.rs");
    const claudeDesktop = read("src-tauri/src/claude_desktop_config.rs");
    const syncProtocol = read("src-tauri/src/services/sync_protocol.rs");
    const locales = [
      read("src/i18n/locales/en.json"),
      read("src/i18n/locales/zh.json"),
      read("src/i18n/locales/zh-TW.json"),
      read("src/i18n/locales/ja.json"),
    ];

    for (const source of [
      configRs,
      directoryHook,
      ...locales,
    ]) {
      expect(source).toContain(".thq-switch");
      expect(source).not.toContain(".cc-switch");
    }

    for (const source of [databaseMod, databaseBackup]) {
      expect(source).toContain("APP_DATABASE_FILE_NAME");
      expect(source).not.toContain("cc-switch.db");
    }
    expect(panicHook).toContain("APP_CONFIG_DIR_NAME");
    expect(panicHook).not.toContain(".cc-switch");
    expect(settingsRs).toContain("APP_CONFIG_DIR_NAME");
    expect(settingsRs).toContain("SYNC_REMOTE_ROOT");
    expect(settingsRs).not.toContain(".cc-switch");
    expect(databaseMod).toContain("get_app_config_dir().join(APP_DATABASE_FILE_NAME)");
    expect(databaseBackup).toContain("APP_DATABASE_FILE_NAME");
    expect(directoryHook).toContain('join(home, ".thq-switch")');
    expect(appTsx).toContain('"thq-switch-last-app"');
    expect(appSwitcher).toContain('"thq-switch-last-app"');
    expect(updateContext).toContain('"thqswitch:update:dismissedVersion"');
    expect(updateContext).not.toContain("dismissedUpdateVersion");
    expect(codexConfig).toContain("CODEX_MODEL_CATALOG_FILE_NAME");
    expect(codexConfig).toContain("thq-switch-model-catalog.json");
    expect(codexConfig).not.toContain("cc-switch-model-catalog.json");
    expect(tray).toContain('assert_eq!(TRAY_ID, "thq-switch")');
    expect(claudeDesktop).toContain("CLAUDE_DESKTOP_PROFILE_ID");
    expect(claudeDesktop).toContain("APP_DISPLAY_NAME");
    expect(claudeDesktop).not.toContain('"CC Switch"');
    expect(syncProtocol).toContain("SYNC_PROTOCOL_FORMAT");
  });

  it("accepts only thqswitch deep links and rejects ccswitch links", () => {
    const parser = read("src-tauri/src/deeplink/parser.rs");
    const lib = read("src-tauri/src/lib.rs");
    const api = read("src/lib/api/deeplink.ts");
    const tests = read("src-tauri/src/deeplink/tests.rs");

    for (const source of [parser, lib, api, tests]) {
      expect(source).toContain("thqswitch://");
      expect(source).not.toContain("ccswitch://");
    }
    expect(parser).toContain("DEEP_LINK_SCHEME");
  });

  it("uses a distinct auto-launch app name and executable path", () => {
    const autoLaunch = read("src-tauri/src/auto_launch.rs");
    const identity = read("src-tauri/src/identity.rs");

    expect(identity).toContain('APP_DISPLAY_NAME: &str = "THQ Switch"');
    expect(autoLaunch).toContain("let app_name = crate::identity::APP_DISPLAY_NAME;");
    expect(autoLaunch).toContain("THQ Switch.app/Contents/MacOS/thq-switch");
    expect(autoLaunch).not.toContain("CC Switch.app/Contents/MacOS/CC Switch");
    expect(autoLaunch).not.toContain("/usr/local/bin/cc-switch");
  });
});
