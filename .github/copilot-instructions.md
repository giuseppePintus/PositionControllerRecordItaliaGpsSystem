# Copilot Agent Instructions

## Project Overview
This is a GPS fleet tracking and management system ("Position Controller Record Italia GPS System") with:
- **Backend**: Node.js (Express) REST API with SQLite database (`better-sqlite3`)
- **Frontend**: React (Vite) SPA with Zustand state management, TailwindCSS, React Router
- **Real-time monitoring**: Geofencing, alarms, notifications (Telegram, WhatsApp, Web Push)
- **Maps**: Multi-provider (Google Maps, OpenStreetMap/Leaflet, Mapbox)
- **Gestionale Module**: Business management (anagrafiche, documenti di trasporto)

## Architecture
- `server/` — Express API server, `server/index.js` is the entrypoint
- `server/database/` — DatabaseService singleton, SQLite schemas and queries
- `server/routes/` — REST API routes (auth, api, gestionale, vehicleController)
- `server/services/` — Business logic services (geofence, monitoring, notifications)
- `client/src/` — React frontend (Vite)
- `client/src/pages/` — Route pages (Dashboard, Vehicles, Geofences, etc.)
- `client/src/pages/gestionale/` — Gestionale module pages
- `client/src/components/map/` — Map system with providers, delegates, drawables
- `client/src/controllers/` — Client-side controllers (MapController)
- `client/src/store/` — Zustand store
- `client/src/api/` — API client functions
- `docs/` — Architecture documentation

## Tech Stack
- **Runtime**: Node.js >= 18 (target 20)
- **Backend**: Express 4, better-sqlite3, JWT auth, bcryptjs
- **Frontend**: React 18, Vite, TailwindCSS, Zustand, React Query, React Router 6
- **Maps**: @react-google-maps/api, react-leaflet, react-map-gl (mapbox)
- **Language**: JavaScript (ES modules, `"type": "module"`)
- **No TypeScript** — this project uses plain JS with JSX

## Conventions
- Use ES module syntax (`import`/`export`)
- Backend routes go in `server/routes/`
- Frontend pages go in `client/src/pages/`
- UI components go in `client/src/components/`
- Use TailwindCSS utility classes for styling
- Database operations go through `DatabaseService` singleton
- Italian naming is acceptable for business domain entities (Autisti, Clienti, etc.)
- Environment variables are documented in `.env.example`
- Client env vars use `VITE_` prefix

## Development Commands
```bash
npm run setup     # Install all dependencies (root + client)
npm run dev       # Start both server and client in dev mode
npm run build     # Build the client for production
npm start         # Start production server
```

## Important Notes
- The `.env` file is gitignored — use `.env.example` as reference
- SQLite database files (`.sqlite`, `.db`) are gitignored
- The `client/dist/` folder is gitignored (built output)
- Docker support available via `Dockerfile` and `docker-compose.yml`
- When creating new gestionale pages, follow the pattern in `client/src/pages/gestionale/anagrafiche/`
- Map drawables follow the pattern in `client/src/components/map/drawables/`

## Git Branching & Pipeline

### Branch Structure
```
main          ← production-ready, deployed code (protected)
  └── preview ← pre-production staging for final QA
       └── develop ← integration branch, all features merge here first
            ├── copilot/issue-XX-description  ← cloud agent feature branches
            └── feature/XX-description        ← local developer feature branches
```

### Branch Rules

| Branch    | Purpose                         | Merges Into | Who Merges         |
|-----------|----------------------------------|-------------|--------------------|
| `main`    | Production release               | —           | Maintainer only    |
| `preview` | Staging / QA validation          | `main`      | Maintainer after QA|
| `develop` | Integration of all features      | `preview`   | After CI passes    |
| `copilot/*` | Cloud agent work (1 per issue) | `develop`   | PR review + merge  |
| `feature/*` | Local developer work           | `develop`   | PR review + merge  |

### Copilot Agent Branch Rules
- **ALWAYS** create your feature branch from `develop`, NOT from `main`
- **ALWAYS** target your Pull Request to merge into `develop`
- **NEVER** push directly to `main`, `preview`, or `develop`
- Branch naming: `copilot/issue-{number}-{short-description}` (e.g. `copilot/issue-42-add-ddt-page`)
- Keep PRs focused — one issue = one branch = one PR
- Include the issue number in PR title: `fix #42: Add DDT page`

### Promotion Pipeline
```
1. Agent/Developer creates feature branch from `develop`
2. Work is done → PR opened targeting `develop`
3. PR reviewed + approved → merged into `develop`
4. `develop` accumulates approved features
5. When ready for QA → PR from `develop` into `preview`
6. QA/testing on `preview` (staging environment)
7. All tests pass → PR from `preview` into `main`
8. `main` is deployed to production
```

### Commit Message Convention
Use conventional commits:
- `feat: add new feature` — new functionality
- `fix: resolve bug` — bug fix
- `refactor: restructure code` — code improvement
- `docs: update documentation` — documentation only
- `chore: maintenance task` — tooling, deps, config
