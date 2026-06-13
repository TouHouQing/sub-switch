# macOS Release Paths

macOS Gatekeeper shows "Apple could not verify this app is free of malware" when a downloaded app is not Developer ID signed and Apple notarized.

The release workflow supports two macOS distribution paths:

1. **Signed and notarized**: best user experience. Browser downloads can be opened after installing without Gatekeeper malware-verification prompts.
2. **Unsigned fallback**: no Apple account required. The workflow publishes a guided DMG, a ZIP archive, and an installer script. The DMG window tells users to drag the app into Applications, open Terminal from the DMG, type `bash `, drag the embedded shell helper into Terminal, and press Return.

## Signed and Notarized Path

Configure these repository secrets to enable Developer ID signing and Apple notarization:

- `APPLE_CERTIFICATE`: base64 encoded exported `Developer ID Application` `.p12`.
- `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the `.p12`.
- `APPLE_ID`: Apple ID email.
- `APPLE_PASSWORD`: Apple ID app-specific password.
- `APPLE_TEAM_ID`: Apple Developer Team ID.

Create `APPLE_CERTIFICATE` from the exported `.p12`:

```bash
base64 -i /path/to/DeveloperIDApplication.p12 | pbcopy
```

When all secrets are present, the macOS release job verifies the `.app` signature, Gatekeeper assessment, and notarization ticket before uploading assets.

## Unsigned Fallback Path

If any Apple secret is missing, the workflow still publishes macOS assets:

- `THQ-Switch-<tag>-macOS.dmg`: generated with `appdmg`, showing a 1 -> 2 -> 3 -> 4 installation guide, the app, an Applications shortcut, a Terminal shortcut, and an embedded `3-install.sh` helper to run through `bash`.
- `THQ-Switch-<tag>-macOS.zip`: ZIP archive of the `.app` bundle.
- `THQ-Switch-<tag>-install-macos.sh`: downloads the ZIP, installs `THQ Switch.app` into `/Applications`, removes `com.apple.quarantine`, and opens the app.

The unsigned DMG improves installation guidance but does not bypass Gatekeeper by itself. Finder double-click execution or direct Terminal execution of quarantined scripts is unreliable, and `.sh` files may open in the user's default editor such as VS Code. The embedded helper is intentionally named `3-install.sh` and should be run as `bash /Volumes/THQ\ Switch/3-install.sh` by typing `bash ` first, dragging the script into Terminal, and pressing Return. It removes the quarantine attribute from `/Applications/THQ Switch.app` and opens the app after the user has dragged it into Applications.
