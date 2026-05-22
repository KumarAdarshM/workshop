# Workshop Pro — Installation Guide

For workshop owners and IT staff installing the desktop application.

## System requirements

| Platform | Requirement |
|----------|-------------|
| Windows | Windows 10 or later (64-bit) |
| macOS | macOS 11 (Big Sur) or later |
| RAM | 4 GB minimum, 8 GB recommended |
| Disk | 500 MB for app + space for database and backups |

Internet is optional. The app works fully offline after installation.

## Install on Windows

1. Download `Workshop Pro Setup x.x.x.exe` from your vendor.
2. If Windows SmartScreen appears, choose **More info → Run anyway** (only after you trust the publisher; signed builds reduce this prompt).
3. Run the installer and choose an install location if prompted.
4. Launch **Workshop Pro** from the Start menu.
5. Complete **first-time setup**: workshop details, admin account, and license acceptance.
6. Sign in with the admin email and PIN you created during setup.

## Install on macOS

1. Download `Workshop Pro-x.x.x.dmg`.
2. Open the DMG and drag **Workshop Pro** to Applications.
3. On first launch, if macOS blocks the app, open **System Settings → Privacy & Security** and click **Open Anyway** (signed and notarized builds open without this step).
4. Complete first-time setup and sign in.

## Where your data is stored

- **Database:** application user data folder (`workshop.db`)
- **Backups:** `backups/` under the same folder (enable auto-backup in Settings)
- **PDFs:** `Documents/WorkshopPro/`

Back up the database file regularly to an external drive or NAS.

## After installation

1. Open **Settings** and confirm workshop name, GSTIN, and invoice prefixes.
2. Add staff accounts (Admin → Staff) with unique PINs.
3. Create a manual backup before going live with real customers.
4. Train staff on job cards, billing, and inventory workflows.

## Updates

When auto-update is configured by your vendor, the app notifies you of new versions. Otherwise, install the newer build over the existing installation; your database is preserved.

## Uninstall

Uninstalling the app may leave data in the user data folder. To remove all data, delete the `workshop-pro` folder in application data after uninstalling.

## Support

Use the contact channel provided with your license (email or phone). Include app version (Settings or About) and operating system when reporting issues.
