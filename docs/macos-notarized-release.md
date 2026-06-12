# macOS Notarized Release

macOS Gatekeeper shows "Apple could not verify this app is free of malware" when a downloaded app is not Developer ID signed and Apple notarized.

The release workflow requires these repository secrets before publishing macOS packages:

- `APPLE_CERTIFICATE`: base64 encoded exported `Developer ID Application` `.p12`.
- `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the `.p12`.
- `APPLE_ID`: Apple ID email.
- `APPLE_PASSWORD`: Apple ID app-specific password.
- `APPLE_TEAM_ID`: Apple Developer Team ID.

Create `APPLE_CERTIFICATE` from the exported `.p12`:

```bash
base64 -i /path/to/DeveloperIDApplication.p12 | pbcopy
```

The macOS release job verifies the `.app` signature, Gatekeeper assessment, notarization ticket, DMG signature, and DMG Gatekeeper assessment before uploading assets.
