# Energy Savings

Herramienta de comparación y simulación de facturas eléctricas en el mercado español.

Permite registrar ofertas de distintas comercializadoras y simular el coste de una factura real para encontrar la tarifa más barata.

---

## ¿Qué hace?

- **Gestión de ofertas** — CRUD completo de tarifas eléctricas con precios de energía (precio fijo o discriminación horaria punta/llano/valle), término de potencia (precio único o punta/valle), compensación de excedentes solares y permanencia.
- **Simulación de factura** — dado un consumo, potencia contratada, excedentes solares y días del período, calcula la factura completa desglosada por partidas: término de energía, término de potencia, impuesto eléctrico (5,11269%), alquiler de contador y IVA (21%).
- **Comparativa** — simula contra todas las ofertas a la vez y presenta un ranking ordenado por coste total, destacando la opción más económica.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Go 1.22, chi router, SQLite (pure-Go via `modernc.org/sqlite`) |
| Frontend | React 18, TypeScript, Vite, TanStack Query, React Hook Form, Tailwind CSS |
| Tests | Go `testing` + testify, Vitest + Testing Library |
| Linting | golangci-lint, ESLint 9 |
| Tareas | Taskfile (+ Makefile como alias) |
| Deploy | Docker Compose (backend + nginx frontend) |

---

## Arquitectura

Monorepo con backend Go y frontend React desacoplados comunicados por REST API.

```
cmd/server/main.go          Punto de entrada — inyección de dependencias
internal/
  domain/                   Entidades puras (Offer, SimulationRequest, BillBreakdown)
  database/                 Conexión SQLite + runner de migraciones versionadas
  repository/               OfferRepository — SQL con database/sql
  service/                  OfferService (validación), CalculatorService (cálculo de factura)
  api/                      Handlers HTTP + router Chi + helpers JSON
frontend/src/
  types/                    Tipos TypeScript espejo del dominio Go
  api/client.ts             Wrapper tipado de fetch
  hooks/                    Hooks React Query (useOffers, useSimulation…)
  components/               OfferCard, OfferForm, SimulationForm, SimulationResult, Layout
  pages/                    DashboardPage (/), OffersPage (/offers)
```

Flujo de dependencias del backend:
```
main → api.Handler → service → repository → database/sql (SQLite)
```

En desarrollo, Vite actúa como proxy de `/api` hacia `http://localhost:8080`.

---

## Desarrollo

### Requisitos

- Go 1.22+
- Node 18+
- [`task`](https://taskfile.dev) CLI

### Comandos principales

```bash
task setup          # instala dependencias Go + npm
task dev            # arranca backend (:8080) + frontend (:5173) en paralelo
task test           # ejecuta todos los tests
task lint           # golangci-lint + ESLint
task build          # compila backend (bin/server) + frontend (dist/)
```

Tareas individuales:

```bash
task dev:backend
task dev:frontend
task test:backend
task test:frontend
task build:backend
task build:frontend
```

### Test específico

```bash
# Go
go test ./internal/service/...
go test -run TestCalculatorService_Calculate ./internal/service/

# Frontend
cd frontend && npx vitest run src/components/__tests__/OfferCard.test.tsx
```

### Variables de entorno (backend)

| Variable | Por defecto | Descripción |
|---|---|---|
| `ADDR` | `:8080` | Dirección de escucha |
| `DB_PATH` | `energy-savings.db` | Ruta del fichero SQLite; usar `:memory:` en tests |

> **WSL:** Vite escucha en `0.0.0.0:5173`. Obtén la IP con `wsl hostname -I` y abre `http://<ip-wsl>:5173` desde Windows.

---

## Docker

```bash
docker compose up --build
```

- Backend disponible en `http://localhost:8080`
- Frontend disponible en `http://localhost:5173`

La base de datos SQLite se persiste en un volumen Docker (`db-data`).

---

## API REST

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/offers` | Lista todas las ofertas |
| `POST` | `/api/offers` | Crea una oferta |
| `GET` | `/api/offers/:id` | Obtiene una oferta por ID |
| `PUT` | `/api/offers/:id` | Actualiza una oferta |
| `DELETE` | `/api/offers/:id` | Elimina una oferta |
| `POST` | `/api/simulate` | Simula la factura (offer_id=0 para todas) |

---

## Cálculo de la factura

`CalculatorService` implementa la estructura de una factura eléctrica española estándar:

1. **Término de energía** = consumo (kWh) × precio (€/kWh)
2. **Término de potencia** = potencia contratada (kW) × precio (€/kW·año) × días/365
3. **Compensación de excedentes** = excedentes (kWh) × tasa compensación (crédito negativo)
4. **Impuesto eléctrico** = 5,11269% sobre (energía + potencia)
5. **Alquiler de contador** = 0,026557 €/día × días
6. **IVA** = 21% sobre el subtotal
