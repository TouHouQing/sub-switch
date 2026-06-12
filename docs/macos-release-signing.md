# macOS Release Signing

The GitHub release workflow builds macOS packages as Developer ID signed and Apple notarized downloads. Without this, macOS Gatekeeper can show a downloaded DMG as damaged even when the file is not corrupted.

## Required Apple Account

- Paid Apple Developer Program membership.
- A `Developer ID Application` certificate. Development certificates and free Apple accounts cannot produce a download-and-open public macOS release.
- An Apple ID app-specific password for notarization.

## GitHub Secrets

Configure these repository secrets before running the release workflow:

- `APPLE_CERTIFICATE`: base64 encoded exported `.p12` for the Developer ID Application certificate.
- `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the `.p12`.
- `APPLE_ID`: Apple ID email.
- `APPLE_PASSWORD`: Apple ID app-specific password.
- `APPLE_TEAM_ID`: Apple Developer Team ID.

Create the certificate secret from an exported `.p12`:

```bash
base64 -i /path/to/DeveloperIDApplication.p12 | pbcopy
```

Paste the clipboard content into the `APPLE_CERTIFICATE` secret.

## Release Notes

Use a new tag for a fixed macOS release, for example `v3.16.3`. Reusing an older tag can leave users with cached or already-downloaded unsigned assets.

The workflow verifies the `.app` signature, Gatekeeper assessment, DMG stapled notarization ticket, and DMG open assessment before uploading release assets.
