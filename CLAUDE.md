# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

Always communicate with the user in **Spanish**, regardless of the language used in code, comments, or commit messages.

All generated **code, comments, variable names, file names, commit messages, and annotations must be written in English**.

## Skills

Before writing any code, **read** the corresponding SKILL.md file and **print the skill name visibly** in the response using the format `[skill: <name>]`. This must appear before any code or implementation detail.

| Situation | Skills to load | Path |
|-----------|---------------|------|
| Backend changes | `golang-pro` | `.claude/skills/golang-pro/SKILL.md` |
| Frontend / UI changes | `vercel-react-best-practices` **+** `ui-ux-pro-max` | `.claude/skills/vercel-react-best-practices/SKILL.md` · `.claude/skills/ui-ux-pro-max/SKILL.md` |

`vercel-react-best-practices` and `ui-ux-pro-max` are complementary and must always be loaded together for any frontend or UI work.

**This is mandatory and non-negotiable.** The user explicitly requires seeing `[skill: <name>]` printed in the response to verify correct skill usage.

---

## Development commands

The project uses [Taskfile](https://taskfile.dev) as the primary task runner.

```bash
task dev            # start backend (:8080) + frontend (:5173) in parallel
task build          # compile backend (bin/server) + frontend (dist/)
task test           # run all tests
task lint           # golangci-lint + ESLint
task setup          # go mod tidy + npm install
```

Individual tasks: `task dev:backend`, `task dev:frontend`, `task test:backend`, `task test:frontend`, `task build:backend`, `task build:frontend`.

### Running a single test
```bash
# Go — specific package or test
go test -race ./internal/service/...
go test -race -run TestCalculatorService_Calculate ./internal/service/

# Frontend — specific file
cd frontend && npx vitest run src/components/__tests__/OfferCard.test.tsx
```

### Server environment variables
- `ADDR` — listen address (default `:8080`)
- `DB_PATH` — SQLite file path (default `energy-savings.db`, use `:memory:` in tests)

### WSL environment
Vite listens on `0.0.0.0:5173` to be reachable from Windows. To get the WSL IP:
```bash
wsl hostname -I   # run from PowerShell on Windows
```
Then open in the Windows browser: `http://<wsl-ip>:5173`

### Docker Compose
```bash
docker compose up --build   # backend → :8080, frontend → :5173
```

---

## Architecture

### Overview
Monorepo with an independent Go backend and React frontend communicating via REST API.

```
cmd/server/main.go          ← entry point, dependency wiring
internal/
  domain/                   ← pure entities (Offer, SimulationRequest, BillBreakdown)
  database/                 ← SQLite connection + schema migration
  repository/               ← data access (OfferRepository on top of database/sql)
  service/                  ← business logic (OfferService, CalculatorService)
  api/                      ← HTTP handlers + Chi router + JSON helpers
frontend/src/
  types/                    ← TypeScript types mirroring the Go domain
  api/client.ts             ← typed fetch wrapper (offersApi, simulationApi)
  hooks/                    ← React Query wrappers (useOffers, useSimulation)
  components/               ← OfferCard, OfferForm, SimulationForm, SimulationResult, Layout
  pages/                    ← DashboardPage, OffersPage
```

### Backend dependency flow
`main` → `api.Handler` → `service` → `repository` → `database/sql (SQLite)`

Interfaces (`offerRepo`, `offerService`, `calculator`) are defined on the consumer side to enable in-process mocks in tests.

### Electricity bill calculation
`CalculatorService.Calculate` implements the structure of a standard Spanish electricity bill:
1. **Energy term** = consumption kWh × price €/kWh
2. **Power term** = contracted kW × €/kW·year × days/365
3. **Surplus compensation** (negative credit, solar installations only)
4. **Electricity tax** = 5.11269% on (energy term + power term)
5. **Meter rental** = 0.026557 €/day × days
6. **VAT** = 21% on the subtotal

The constants (`ElectricityTaxRate`, `IVARate`, `MeterRentalDailyRate`) are exported so tests can reference them directly.

### Database
SQLite via `modernc.org/sqlite` (pure Go, no CGO). Schema migration runs on startup inside `database.Open`. Schema defined in `internal/database/db.go`.

### Frontend design system
Glassmorphism on `#0F172A` background, amber/gold primary (`#F59E0B`), violet CTA (`#8B5CF6`), Plus Jakarta Sans typeface. Configured in `tailwind.config.js`.

---

## Test conventions

- **Go**: table-driven tests (`[]struct{ ... }`), subtests with `t.Run`, always `-race`. Repository tests use SQLite `:memory:`. Services use in-process mocks.
- **Frontend**: Vitest + Testing Library. One `__tests__/` file per component. Do not mock fetch directly — use `vi.fn()` on hooks when needed.
