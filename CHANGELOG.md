# Changelog

All notable changes to Workshop Pro are documented here.

## [1.0.0] — 2026-05-22

### Added

- First-time setup wizard for production installs (workshop profile, admin account, EULA)
- Proprietary license, EULA, and privacy policy (`legal/`)
- Customer installation guide (`docs/INSTALL.md`)
- Code signing documentation (`docs/SIGNING.md`)

### Changed

- Production builds no longer auto-seed demo users or sample data
- Login screen no longer pre-fills demo credentials
- Package license changed from MIT to proprietary (see `LICENSE`)

### Security

- Blocks common weak PINs (e.g. 0000, 1234) on packaged builds during setup

### Development

- `npm run db:seed` still loads full demo data for local testing
- Optional sample data during setup wizard (development builds only)
