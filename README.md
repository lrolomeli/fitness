# Fitness

Web app personal para **registrar dieta y entrenamiento**. La dieta se arma
desde un **recetario curado con una meta de ~30 recetas activas** (puedes tener
más) y la rutina desde un **catálogo de ~30 ejercicios activos** que tú apruebas
y guardas; la IA solo
**propone** recetas/ejercicios nuevos cuando falta variedad y ayuda a **cambiar
una comida o un ejercicio** concreto. Aprende de tus gustos: lo que no te gusta
lo vetas y deja de proponerse.

## Stack

- **Backend** — Node 22 + Express 4, sesiones con `express-session`
  (cookie `fitness.sid`), `express-rate-limit`, persistencia en SQLite vía
  `sql.js`, `dotenv`, y `@google/genai` (Gemini) para propuestas y cambios de comida.
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
    db/repos/               # users, preferences, mealPlans, meals, workouts, exerciseLibrary, progress, recipes
    services/nutrition.js   # BMR/TDEE + superávit + macros
    services/progression.js # mesociclos de 4 semanas (fases 1 y 2)
    services/estimator.js   # estimación de macros por ingrediente
    services/planner.js     # arma la semana desde el recetario curado (sin IA)
    services/workoutPlanner.js # arma la rutina desde el catálogo de ejercicios (sin IA)
    services/recipes/       # proveedor externo (TheMealDB)
    services/ai.js          # Gemini (propuestas de recetas/ejercicios y swaps; JSON estricto)
    services/context.js     # arma el contexto enriquecido para la IA
    routes/                 # profile, preferences, plans, meals, recipes, exercises, workouts, progress, state
  data/                     # persistencia runtime (fitness.db)
frontend/  # Vite + React + Tailwind v4
  src/
    Dashboard.jsx           # tabs: Perfil, Comidas, Recetario, Entreno, Ejercicios, Progreso, Gustos
    sections/               # una vista por tab (incluye RecipesSection y ExercisesSection)
    components/BanModal.jsx # elegir qué vetar tras un thumbs down
    components/SwapModal.jsx # cambiar una sola comida (local o con IA)
    components/RecipeForm.jsx # alta manual de recetas (entra como propuesta)
    components/ExerciseForm.jsx # alta manual de ejercicios (entra como propuesta)
    components/ExerciseSwapModal.jsx # cambiar un ejercicio (local o con IA)
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
- `recipes` — **recetario curado**. Cada platillo tiene estado: `active` (cuenta
  para la meta de ~30 y se usa en la dieta), `proposed` (propuesta manual o de IA, espera
  aprobación y **persiste hasta que la borres**) o `disabled` (oculto porque te
  cansaste).
- `exercise_library` — **catálogo de ejercicios** con el mismo esquema de estado
  que `recipes`, agrupado por bloque: `empuje`, `traccion`, `pierna`, `core`. La
  tabla `exercises` sigue guardando las instancias de cada día.

## Lógica

- **Nutrición:** BMR (Mifflin-St Jeor) → TDEE según actividad → superávit por
  fase → macros (proteína ~2 g/kg, grasa ~1 g/kg, resto carbohidratos).
- **Progresión (mesociclos de 4 semanas):**
  - *Fase 1 (sem 1-4) — Adaptación:* +200-300 kcal, full body / torso-pierna 3-4
    días, RIR 2-3.
  - *Fase 2 (sem 5-8) — Intensificación:* +150-200 kcal extra en carbohidratos,
    más series o RIR 1-2; la app sugiere subir peso/reps.
- **Recetario curado (meta ~30, sin tope):** la dieta se arma **solo** con recetas
  `active`, repartidas por momento del día (meta de 7 desayunos / 8 comidas / 8
  cenas / 7 snacks; puedes tener más). La IA **no** genera la semana: el *planner*
  solo rota esas recetas y escala porciones a los macros objetivo.
- **Guardar con un clic:** 👍 o «Guardar» pasan la receta a `active`; «Guardar
  semana» activa todo el plan. El **formulario manual** y las **propuestas IA**
  entran como `proposed` y no cuentan hasta que las apruebes.
- **Propuestas IA:** «Propuestas IA» pide a Gemini (JSON estricto,
  `responseJsonSchema`) al menos 10 recetas nuevas, repartidas según el déficit por
  slot o entre los slots si la meta ya está cubierta, respetando vetados,
  restricciones y disgustos. Las propuestas **persisten indefinidamente**; solo
  desaparecen si las borras explícitamente.
- **Cambiar una comida:** `POST /api/meals/:id/swap` reemplaza una sola comida.
  Sin instrucción toma otra receta `active` del recetario (sin IA); con una
  instrucción («más ligero», «sin lácteos»…) la IA crea una nueva que se usa en
  el plan pero no se guarda hasta que la guardes. El feedback 👍/👎 se reinicia.
- **Catálogo de ejercicios (meta ~30, sin tope):** misma idea para la rutina. El split se
  elige automáticamente por fase/experiencia (full body → torso/pierna →
  push/pull/legs) y la semana se arma **solo** con ejercicios `active`, con
  series/reps/RIR según `progression`. Los bloques son empuje / tracción / pierna
  / core (default 8/8/8/6 activos). «Propuestas IA» repone hasta 10 según el
  déficit; `POST /api/workouts/:id/exercises/:exId/swap` cambia un ejercicio por
  otro del mismo bloque (local o con IA).
- **Feedback loop:** al marcar 👎 eliges manualmente qué vetar (ingredientes y/o
  el plato completo); se guarda en `preferences` y no se vuelve a proponer.
- **Proveedor de recetas (TheMealDB, activo por defecto):** `RECIPE_PROVIDER=themealdb`
  trae recetas reales con el test key `1` (endpoints **V1**, gratis para dev/uso
  personal) y estima sus macros con `estimator.js`; si falla la red, cae al
  recetario local. Para una app pública, TheMealDB pide una key de supporter.
  Se desactiva con `RECIPE_PROVIDER=none`.

## Macros estimados

TheMealDB (y las recetas manuales sin macros) se calculan con una tabla local de
~70 ingredientes comunes y un parser de cantidades (`estimator.js`). Es
**aproximado**: sirve para armar el plan y luego puedes ajustar porciones. Las
recetas de TheMealDB llegan en inglés.

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
GEMINI_MODEL=gemini-3.1-flash-lite

# Fuente externa de recetas: themealdb | none
RECIPE_PROVIDER=themealdb
# Key de TheMealDB (la de prueba es "1"; usa tu key de supporter si la tienes).
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
