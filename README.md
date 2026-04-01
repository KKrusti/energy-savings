# Energy Savings

Herramienta de comparación y simulación de facturas eléctricas en el mercado español.

Permite registrar ofertas de distintas comercializadoras, introducir el consumo mensual real y simular el coste anual completo para encontrar la tarifa más barata.

---

## ¿Qué hace?

- **Gestión de ofertas** — CRUD completo de tarifas eléctricas con soporte para:
  - Precio de energía fijo o discriminación horaria punta/llano/valle.
  - Término de potencia con precio único o diferenciado punta/valle.
  - Compensación de excedentes solares y cláusula de permanencia.
  - Marcado de la **tarifa actual** (`is_current`) para usar como referencia en comparativas.
- **Simulación anual** — introduce hasta 12 meses de consumo real desglosado por franjas (punta/llano/valle, potencia contratada punta/valle, excedentes solares) y obtén el coste anual total para cada oferta registrada. Los días de facturación se derivan automáticamente del calendario.
- **Historial de consumo** — los datos mensuales se guardan en servidor al calcular y se restauran automáticamente en la siguiente sesión.
- **Dashboard** — KPIs con las 3 mejores alternativas a la tarifa actual (ahorro en € y %), gráfico de coste anual comparativo y gráfico de desglose mensual por oferta seleccionada.
- **Ranking de ofertas** — cuando hay simulación disponible, las ofertas se ordenan de mejor (más barata) a peor, con distintivo de pódium (oro/plata/bronce) para las tres más económicas.
- **Factura desglosada** — calcula por partidas: término de energía, término de potencia, compensación de excedentes, impuesto eléctrico (5,11269%), alquiler de contador y IVA (21%).

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
  domain/                   Entidades puras (Offer, SimulationRequest, BillBreakdown,
                            MonthlyConsumption, AnnualSimulationRequest/Response)
  database/                 Conexión SQLite + runner de migraciones versionadas
  repository/               OfferRepository, ConsumptionRepository — SQL con database/sql
  service/                  OfferService (validación), CalculatorService (cálculo de factura)
  api/                      Handlers HTTP + router Chi + helpers JSON
frontend/src/
  types/                    Tipos TypeScript espejo del dominio Go
  api/client.ts             Wrapper tipado de fetch
  hooks/                    useOffers, useAnnualSimulation, useLastAnnualSimulation,
                            useConsumptionHistory
  components/               OfferCard, OfferForm, MonthlyInputTable, MonthlyDetailDrawer,
                            AnnualCostChart, MonthlyBreakdownChart, Layout
  pages/                    DashboardPage (/), OffersPage (/offers)
  context/                  ThemeContext (dark / light mode)
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
go test -race ./internal/service/...
go test -race -run TestCalculatorService_Calculate ./internal/service/

# Frontend
cd frontend && npx vitest run src/components/__tests__/OfferCard.test.tsx
```

### Variables de entorno (backend)

| Variable | Por defecto | Descripción |
|---|---|---|
| `ADDR` | `:8080` | Dirección de escucha |
| `DB_PATH` | `energy-savings.db` | Ruta del fichero SQLite; usar `:memory:` en tests |
| `CORS_ALLOWED_ORIGINS` | _(vacío)_ | Orígenes permitidos, separados por coma (e.g. `http://localhost:5173`) |

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

### Ofertas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/offers` | Lista todas las ofertas |
| `POST` | `/api/offers` | Crea una oferta |
| `GET` | `/api/offers/:id` | Obtiene una oferta por ID |
| `PUT` | `/api/offers/:id` | Actualiza una oferta (reemplaza completamente) |
| `DELETE` | `/api/offers/:id` | Elimina una oferta |

> Al crear o actualizar una oferta con `is_current: true`, el backend desactiva automáticamente la tarifa actual anterior.

### Simulación

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/simulate` | Simula una factura puntual; `offer_id=0` simula todas las ofertas |
| `POST` | `/api/simulate/annual` | Simulación anual con hasta 12 meses de consumo por franjas |

### Historial de consumo

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/consumption/history` | Devuelve los meses guardados en orden cronológico |
| `PUT` | `/api/consumption/history` | Inserta o reemplaza meses (upsert por mes+año) |

---

## Cálculo de la factura

`CalculatorService` implementa la estructura de una factura eléctrica española estándar:

1. **Término de energía** = consumo (kWh) × precio (€/kWh)
   - Precio único (tarifa plana) o diferenciado por franjas horarias punta / llano / valle.
2. **Término de potencia** = potencia contratada (kW) × precio (€/kW·año) × días/365
   - Precio único o diferenciado punta/valle.
3. **Compensación de excedentes** = excedentes solares (kWh) × tasa de compensación (crédito negativo).
4. **Impuesto eléctrico** = 5,11269% sobre (energía + potencia).
5. **Alquiler de contador** = 0,026557 €/día × días.
6. **IVA** = 21% sobre el subtotal.

En la simulación anual, los días de cada mes se derivan automáticamente del calendario (mes y año del registro).
