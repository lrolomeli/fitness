# App Template

Scaffold base para nuevos proyectos: backend y frontend independientes con
autenticación por sesión, persistencia en SQLite y un ejemplo mínimo de CRUD
para copiar el patrón. Reutiliza el stack de los proyectos de `home-apps`.

## Stack

- **Backend** — Node 18 + Express 4, sesiones con `express-session`
  (cookie `app.sid`), `express-rate-limit`, persistencia en SQLite vía
  `sql.js`, `dotenv`.
- **Frontend** — Vite 5 + React 18 + Tailwind v4 (`@tailwindcss/vite`) +
  Chart.js (`react-chartjs-2`).
- **Infra** — Docker Compose (nginx sirve el frontend y proxya `/api` al
  backend) y `deploy.sh`.

## Estructura

```
backend/   # Express + sql.js
  src/
    app.js                # Express; monta /api/auth (público) y /api/items (privado)
    index.js              # arranque
    db/init.js            # wrapper de sql.js (query/run/exec)
    db/store.js           # tabla `entries` genérica + CRUD por módulo
    routes/auth-routes.js # login / logout / me
    routes/item-routes.js # REST /api/items?module=<...>
    middleware/           # auth (default-deny) + rate-limit
  data/                   # persistencia runtime (app.db)
frontend/  # Vite + React + Tailwind v4
  src/
    Dashboard.jsx         # tabs por módulo
    sections/ItemsSection.jsx  # vista genérica CRUD
    components/ui/        # primitivas (Card, Banner, Tabs, Spinner, ...)
    components/chart/     # LineChart (multiserie)
    hooks/ lib/ context/ views/
    index.css             # Tailwind (@import + @theme)
  Dockerfile, nginx.conf, vite.config.js
```

## Módulos de ejemplo

Los módulos válidos están definidos en `backend/src/db/store.js`
(`MODULES`), por defecto solo `items`. Cada elemento se guarda en la tabla
`entries` con un campo `data` (JSON) para detalles libres, así que agregar
un módulo nuevo es tan simple como sumarlo a `MODULES`, a la lista de tabs
de `Dashboard.jsx` y a `MODULE_LABELS` en `ItemsSection.jsx`.

## Desarrollo

```bash
# Backend
npm install --prefix backend
npm run start --prefix backend        # http://localhost:3000

# Frontend (proxy /api → :3000)
npm install --prefix frontend
npm run dev --prefix frontend         # http://localhost:5173
```

## Variables de entorno (backend)

Copia `backend/.env.example` a `backend/.env`. Docker Compose lo carga
automáticamente vía `env_file` (servicio `backend`):

```
PORT=3000
SESSION_SECRET=change_me_to_a_long_random_string
COOKIE_SECURE=false
ADMIN_USER=admin
ADMIN_PASSWORD=change_me
```

> En desarrollo hay valores por defecto inseguros (`SESSION_SECRET`,
> `ADMIN_PASSWORD`). Cámbialos siempre en producción.

## Deploy (Docker)

```bash
./deploy.sh          # git pull + rebuild + up
```

O manualmente:

```bash
docker compose up -d --build
```

Sirve la UI en `http://localhost:8085` y proxya `/api` al backend.

## Auth

Todo `/api` requiere sesión (default-deny) excepto `/api/auth/*`. La UI
gatea en `App.jsx` según `SessionContext`.
