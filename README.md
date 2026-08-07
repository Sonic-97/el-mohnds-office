# المهندس - Real Estate Office

تطبيق سطح مكتب لإدارة مكتب عقاري (العقارات، العملاء، المطابقة الذكية، السوق، الخريطة).

## Setup on a New Windows PC

On the new development computer:

```bash
git clone https://github.com/Sonic-97/el-mohnds-office.git
cd el-mohnds-office
npm install
npm run dev
```

For a production build:

```bash
npm run dist
```

The production installer is generated at:

```
release\EngineerOffice-Setup.exe
```

Requirements: Node.js, npm, Git. No other tools are required.

## Application Data

All data is stored per-user under the Windows `%APPDATA%` folder and is **never** committed to Git:

- `%APPDATA%\al-mohands-real-state\al-mohands.db` — SQLite database
- `%APPDATA%\al-mohands-real-state\files\` — uploaded property images/documents
- `%APPDATA%\al-mohands-real-state\branding\` — custom logo/banner/background

## Office Installation (end users)

The engineer on the office PC only needs to run `EngineerOffice-Setup.exe`. No Node.js, npm, Git, or development tools required. The application creates its own local database on first launch.

## Development Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Run in development mode |
| `npm run build` | Build for production |
| `npm run dist` | Build the Windows installer |
| `npm run typecheck` | TypeScript type checking |
