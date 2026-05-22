# Code signing and release builds

Production installers must be signed so customers can install without security warnings.

## macOS (required for broad distribution)

1. Enroll in [Apple Developer Program](https://developer.apple.com/programs/).
2. Create a **Developer ID Application** certificate in Xcode or Certificates portal.
3. Set environment variables before `npm run pack:mac`:

```bash
export CSC_LINK="/path/to/DeveloperID.p12"
export CSC_KEY_PASSWORD="your-cert-password"
export APPLE_ID="your@apple.id"
export APPLE_APP_SPECIFIC_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

4. Set `"notarize": true` in `package.json` under `build.mac` when Apple credentials are configured.
5. Staple notarization: handled by electron-builder when `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` are set.

## Windows

1. Purchase a code signing certificate (EV recommended for SmartScreen reputation).
2. Set:

```bash
export CSC_LINK="/path/to/certificate.pfx"
export CSC_KEY_PASSWORD="your-cert-password"
```

3. Run `npm run pack:win`.

## Auto-updates

1. Create a GitHub repository for releases (or S3 bucket).
2. Set `publish` in `package.json` or `GH_TOKEN` for electron-builder publish.
3. Each release: bump version, tag, build signed artifacts, upload to Releases.

```bash
npm version patch
npm run pack:mac
# electron-builder --publish always  (when ready)
```

## CI checklist

- [ ] Version bumped in `package.json`
- [ ] `CHANGELOG.md` updated
- [ ] Signed macOS DMG (arm64 + x64 if supporting Intel)
- [ ] Signed Windows NSIS installer
- [ ] Release notes uploaded
- [ ] Smoke test on clean VM
