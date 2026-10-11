# Fitness

Web app personal para **registrar dieta y entrenamiento** y generar cada semana,
con IA, comidas y rutinas alineadas con un plan de ganancia muscular progresiva.
Aprende de tus gustos: cuando algo no te gusta, lo vetas y deja de proponerse.

## Stack

- **Backend** — Node 22 + Express 4, sesiones con `express-session`
  (cookie `fitness.sid`), `express-rate-limit`, persistencia en SQLite vía
  `sql.js`, `dotenv`, y `@google/genai` (Gemini) para la generación.
- **Frontend** — Vite 5 + React 18 + Tailwind v4 (`@tailwindcss/vite`) +
  Chart.js (`react-chartjs-2`).
- **Infra** — Docker Compose (nginx sirve el frontend y proxya `/api` al
  backend) y `deploy.sh`.

## Estructura

```
backend/   # Express + sql.js
  src/
    app.js                  # Express; /api/auth público, resto default-deny
    index.js                # arranque
    db/init.js              # wrapper de sql.js (query/run/exec)
    db/schema.js            # definición de tablas
    db/repos/               # users, preferences, mealPlans, meals, workouts, progress, recipes
    services/nutrition.js   # BMR/TDEE + superávit + macros
    services/progression.js # mesociclos de 4 semanas (fases 1 y 2)
    services/estimator.js   # estimación de macros por ingrediente
    services/planner.js     # arma la semana desde el recetario (sin IA)
    services/recipes/       # proveedor externo (TheMealDB)
    services/ai.js          # Gemini (JSON estricto)
    services/context.js     # arma el contexto enriquecido para la IA
    routes/                 # profile, preferences, plans, meals, recipes, workouts, progress, state
  data/                     # persistencia runtime (fitness.db)
frontend/  # Vite + React + Tailwind v4
  src/
    Dashboard.jsx           # tabs: Perfil, Comidas, Entreno, Progreso, Gustos
    sections/               # una vista por tab
    components/BanModal.jsx # elegir qué vetar tras un thumbs down
    components/ui/          # primitivas (Card, Banner, Tabs, ...)
    hooks/ lib/ context/ views/
```

## Modelo de datos

- `users` — perfil (sexo, talla, peso, actividad, experiencia, objetivo, inicio).
- `preferences` — `favorite` / `banned` / `restriction`.
- `meal_plans` — semana generada: fase, calorías y macros objetivo.
- `meals` — comidas por día y momento, con ingredientes y feedback.
- `workouts` + `exercises` — rutina diaria, series, reps, peso y RIR.
- `progress_logs` — peso, calorías reales y marcas del gimnasio.
- `recipes` — **recetario** que crece: platillos aceptados o no rechazados para
  volver a sugerirse.

## Lógica

- **Nutrición:** BMR (Mifflin-St Jeor) → TDEE según actividad → superávit por
  fase → macros (proteína ~2 g/kg, grasa ~1 g/kg, resto carbohidratos).
- **Progresión (mesociclos de 4 semanas):**
  - *Fase 1 (sem 1-4) — Adaptación:* +200-300 kcal, full body / torso-pierna 3-4
    días, RIR 2-3.
  - *Fase 2 (sem 5-8) — Intensificación:* +150-200 kcal extra en carbohidratos,
    más series o RIR 1-2; la app sugiere subir peso/reps.
- **IA (Gemini):** el backend arma un contexto con restricciones, favoritos,
  vetados, fase, macros y tu recetario, y pide a Gemini un JSON estricto
  (`responseJsonSchema`) con 7 días de comidas y 7 días de rutina.
- **Planner sin IA:** si no hay `GEMINI_API_KEY`, la semana se arma desde el
  **recetario** (y del proveedor externo si está activo), filtrando vetados,
  rotando platillos y escalando porciones a los macros objetivo.
- **Recetario que aprende:** al marcar 👍 un platillo se guarda al instante, y
  al regenerar la semana se guardan todas las comidas no rechazadas. Con IA, el
  recetario se le inyecta para reutilizarlas.
- **Feedback loop:** al marcar 👎 eliges manualmente qué vetar (ingredientes y/o
  el plato completo); se guarda en `preferences` y no se vuelve a proponer.
- **Proveedor de recetas (opcional):** `RECIPE_PROVIDER=themealdb` trae recetas
  reales (gratis) y estima sus macros con `estimator.js`; si falla la red, cae
  al recetario local.

## Macros estimados

TheMealDB (y las recetas manuales sin macros) se calculan con una tabla local de
~70 ingredientes comunes y un parser de cantidades (`estimator.js`). Es
**aproximado**: sirve para armar el plan y luego puedes ajustar porciones.

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

Copia `backend/.env.example` a `backend/.env`:

```
PORT=3000
SESSION_SECRET=change_me_to_a_long_random_string
COOKIE_SECURE=false
ADMIN_USER=admin
ADMIN_PASSWORD=change_me
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# Fuente externa de recetas (opcional): none | themealdb
RECIPE_PROVIDER=none
# Key de TheMealDB (la de prueba es "1").
RECIPE_API_KEY=
```

> En desarrollo hay valores por defecto inseguros. Cámbialos siempre en
> producción. Consigue una API key de Gemini en https://aistudio.google.com/apikey

## Deploy (Docker)

```bash
./deploy.sh          # git pull + rebuild + up
```

O manualmente:

```bash
docker compose up -d --build
```

Sirve la UI en `http://localhost:8086` y proxya `/api` al backend.

## Auth

Todo `/api` requiere sesión (default-deny) excepto `/api/auth/*`. La UI gatea en
`App.jsx` según `SessionContext`.
