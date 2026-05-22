# Workshop Pro

Offline-first automobile workshop management ERP for Windows and macOS desktop. Built with Electron, React, TypeScript, Tailwind CSS, SQLite, and Prisma.

## Features

- **Authentication** — Admin login, PIN quick login, role-based access (Admin, Staff, Mechanic)
- **Dashboard** — Today's bookings, active jobs, revenue, low stock, charts
- **Customers & Vehicles** — Full CRUD, service history
- **Job Cards** — Digital job cards, mechanic assignment, parts, PDF export, thermal print
- **Billing** — GST invoices, Cash/UPI/Card payments, PDF invoices
- **Inventory** — Stock tracking, categories, low stock alerts
- **Staff** — Team management, mechanic tracking
- **Reports** — Revenue, top customers/services, pending payments, PDF export
- **Backup** — Auto & manual SQLite backup/restore

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron 36 |
| UI | React 19, TypeScript, Tailwind CSS |
| State | Zustand |
| Database | SQLite (offline) |
| ORM | Prisma |
| PDF | PDFKit |
| Packaging | electron-builder |

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client & push schema
npm run db:push

# Development (Vite + Electron)
npm run dev
```

### Development demo data

```bash
npm run db:seed   # Demo admin: admin@workshop.local / PIN 0000, staff PIN 1234
```

Production installers use the **first-time setup wizard** instead (no default passwords).

## Production & sales

| Document | Purpose |
|----------|---------|
| [docs/INSTALL.md](docs/INSTALL.md) | Customer installation guide |
| [docs/SIGNING.md](docs/SIGNING.md) | macOS/Windows code signing & releases |
| [legal/EULA.md](legal/EULA.md) | End user license |
| [legal/PRIVACY.md](legal/PRIVACY.md) | Privacy policy |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

Before selling: sign installers, replace `publish.url` in `package.json`, set `WORKSHOP_UPDATE_URL` for auto-updates, and complete a clean-install smoke test.

## Build installers

```bash
# Windows (NSIS installer)
npm run pack:win

# macOS (DMG + ZIP for updates) — run on a Mac
npm run pack:mac
```

Output in `release/` folder.

## Architecture

```
├── electron/           # Main process (secure IPC)
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc/
│   ├── database/
│   └── services/
├── src/                # React renderer
│   ├── components/
│   ├── pages/
│   ├── stores/
│   └── lib/
└── prisma/             # SQLite schema
```

### Security

- Context isolation enabled
- Node integration disabled
- Sandboxed renderer
- Preload bridge for typed IPC
- Session token validation on all API calls

### Data Storage

- Database: `%APPDATA%/workshop-pro/data/workshop.db`
- Images: `%APPDATA%/workshop-pro/uploads/`
- Backups: `%APPDATA%/workshop-pro/backups/`
- PDFs: `Documents/WorkshopPro/`

## Future-Ready

Architecture supports future: cloud sync, WhatsApp/SMS, multi-branch, mobile app, OBD integration.

## License

Proprietary — see [LICENSE](LICENSE). Third-party notices: [legal/NOTICE.md](legal/NOTICE.md).
