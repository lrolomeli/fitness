const { GoogleGenAI } = require('@google/genai');

const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
// Modelos que ya no están disponibles para proyectos nuevos: si un .env antiguo
// los deja configurados, caemos al default en lugar de fallar con 404.
const UNAVAILABLE_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro']);

function resolveModel() {
  const configured = (process.env.GEMINI_MODEL || '').trim();
  if (!configured) return DEFAULT_MODEL;
  if (UNAVAILABLE_MODELS.has(configured)) {
    console.warn(`[ai] GEMINI_MODEL="${configured}" ya no está disponible; usando "${DEFAULT_MODEL}".`);
    return DEFAULT_MODEL;
  }
  return configured;
}

const MODEL = resolveModel();

let client = null;

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient() {
  if (!isConfigured()) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

async function generateJson({ system, prompt, schema }) {
  const ai = getClient();
  if (!ai) {
    throw Object.assign(new Error('GEMINI_API_KEY no configurada'), { status: 503 });
  }
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
    },
  });
  const text = typeof response.text === 'string' ? response.text : '';
  return JSON.parse(text);
}

// =========================
// Esquemas de salida
// =========================
const EXERCISE_FIELDS = {
  name: { type: 'string' },
  block: { type: 'string', enum: ['empuje', 'traccion', 'pierna', 'core'] },
  equipment: { type: 'string' },
  description: { type: 'string' },
};

const EXERCISE_PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: EXERCISE_FIELDS,
        required: ['name', 'block'],
      },
    },
  },
  required: ['exercises'],
};

const EXERCISE_SWAP_SCHEMA = {
  type: 'object',
  properties: EXERCISE_FIELDS,
  required: ['name', 'block'],
};

const RECIPE_FIELDS = {
  slot: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
  title: { type: 'string' },
  description: { type: 'string' },
  ingredients: { type: 'array', items: { type: 'string' } },
  kcal: { type: 'integer' },
  protein_g: { type: 'integer' },
  carbs_g: { type: 'integer' },
  fat_g: { type: 'integer' },
};

const RECIPE_PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        properties: RECIPE_FIELDS,
        required: ['slot', 'title', 'ingredients', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
      },
    },
  },
  required: ['recipes'],
};

const MEAL_SWAP_SCHEMA = {
  type: 'object',
  properties: RECIPE_FIELDS,
  required: ['slot', 'title', 'ingredients', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
};

// =========================
// Prompts
// =========================
const RECIPE_SYSTEM =
  'Eres un nutricionista deportivo. Propones platillos prácticos para ganar masa muscular, ' +
  'con ingredientes comunes de supermercado, en español y con porciones realistas. Respetas ' +
  'estrictamente las restricciones y alimentos vetados del usuario y evitas lo que no le gusta.';

const EXERCISE_SYSTEM =
  'Eres un entrenador personal. Propones ejercicios de hipertrofia con nombre común de gimnasio, ' +
  'en español. Clasificas cada ejercicio en uno de estos bloques: empuje (pecho, hombro, tríceps), ' +
  'traccion (espalda, bíceps), pierna (cuádriceps, femoral, glúteo, gemelo) o core (abdominales).';

function listBlock(title, items) {
  if (!items || !items.length) return '';
  return `\n${title}: ${items.join(', ')}`;
}

const SLOT_LABELS = {
  breakfast: 'desayuno',
  lunch: 'comida',
  dinner: 'cena',
  snack: 'snack',
};

function buildProposalPrompt(ctx, { deficit = {}, existingTitles = [] } = {}) {
  const t = ctx.targets;
  const total = Object.values(deficit).reduce((a, b) => a + b, 0);
  const detail = Object.entries(deficit)
    .filter(([, n]) => n > 0)
    .map(([slot, n]) => `${n} de ${SLOT_LABELS[slot] || slot}`)
    .join(', ');

  return (
    `Propón ${total} platillos nuevos para el recetario: ${detail}.\n\n` +
    `Objetivos diarios de referencia: ${t.target_calories} kcal — Proteína ${t.protein_g} g, ` +
    `Carbohidratos ${t.carbs_g} g, Grasa ${t.fat_g} g.\n` +
    `Fase actual: ${ctx.phaseName}. ${ctx.phaseNutrition}\n` +
    `Perfil: sexo ${ctx.sex || 'no especificado'}, peso ${ctx.weight_kg || '?'} kg.\n` +
    listBlock('Alimentos favoritos', ctx.favorites) +
    listBlock('VETADOS (no usar nunca)', ctx.banned) +
    listBlock('Restricciones', ctx.restrictions) +
    listBlock('Le gustaron antes', ctx.liked) +
    listBlock('No le gustaron (evitar)', ctx.disliked) +
    listBlock('Platillos que ya tiene (NO repetir estos títulos)', existingTitles) +
    `\n\nCada platillo debe indicar su momento del día (slot). No repitas títulos existentes ni entre sí. ` +
    `Los macros deben ser coherentes con los ingredientes.`
  );
}

function buildSwapPrompt(ctx, current, { instruction, usedTitles = [] } = {}) {
  const t = ctx.targets;
  return (
    `Sustituye UNA comida del plan.\n\n` +
    `Momento: ${SLOT_LABELS[current.slot] || current.slot}. Platillo actual: "${current.title}" ` +
    `(${current.kcal} kcal, P ${current.protein_g}, C ${current.carbs_g}, G ${current.fat_g}).\n` +
    `Devuelve un platillo distinto para ese mismo momento.\n` +
    (instruction ? `Petición del usuario: "${instruction}".\n` : '') +
    `Fase actual: ${ctx.phaseName}. Objetivos diarios: ${t.target_calories} kcal. ` +
    `Apunta a ~${Math.round(t.target_calories * 0.28)} kcal para este platillo.\n` +
    listBlock('VETADOS (no usar nunca)', ctx.banned) +
    listBlock('Restricciones', ctx.restrictions) +
    listBlock('Alimentos favoritos', ctx.favorites) +
    listBlock('No le gustaron (evitar)', ctx.disliked) +
    listBlock('Platillos ya usados esta semana (evitar repetir)', usedTitles) +
    `\n\nNo repitas el platillo actual ni los ya usados.`
  );
}

const BLOCK_LABELS = { empuje: 'empuje', traccion: 'tracción', pierna: 'pierna', core: 'core' };

function buildExerciseProposalPrompt(ctx, { deficit = {}, existingNames = [] } = {}) {
  const total = Object.values(deficit).reduce((a, b) => a + b, 0);
  const detail = Object.entries(deficit)
    .filter(([, n]) => n > 0)
    .map(([block, n]) => `${n} de ${BLOCK_LABELS[block] || block}`)
    .join(', ');

  return (
    `Propón ${total} ejercicios nuevos para el catálogo: ${detail}.\n\n` +
    `Fase actual: ${ctx.phaseName} (${ctx.phaseTraining}). RIR objetivo: ${ctx.phaseRir}.\n` +
    `Perfil: experiencia ${ctx.experience_level || 'principiante'}, peso ${ctx.weight_kg || '?'} kg.\n` +
    listBlock('Ejercicios que ya tiene (NO repetir estos nombres)', existingNames) +
    `\n\nCada ejercicio debe indicar su bloque (empuje, traccion, pierna o core) y el equipo típico ` +
    `(barra, mancuernas, polea, máquina o peso corporal). No repitas nombres existentes ni entre sí.`
  );
}

function buildExerciseSwapPrompt(ctx, current, { instruction, excludeNames = [] } = {}) {
  return (
    `Sustituye UN ejercicio de la rutina.\n\n` +
    `Ejercicio actual: "${current.name}" (bloque ${BLOCK_LABELS[current.muscle] || current.muscle}).\n` +
    `Devuelve un ejercicio distinto del MISMO bloque.\n` +
    (instruction ? `Petición del usuario: "${instruction}".\n` : '') +
    `Fase actual: ${ctx.phaseName} (${ctx.phaseTraining}). RIR objetivo: ${ctx.phaseRir}.\n` +
    listBlock('Ejercicios ya usados (evitar repetir)', excludeNames) +
    `\n\nNo repitas el actual ni los ya usados.`
  );
}

// =========================
// API pública
// =========================

// Genera propuestas de recetas para reponer el recetario curado.
// Devuelve un array (posiblemente vacío) de recetas SIN guardar.
async function generateRecipeProposals(ctx, opts = {}) {
  if (!isConfigured()) return [];
  const deficit = opts.deficit || {};
  const total = Object.values(deficit).reduce((a, b) => a + b, 0);
  if (!total) return [];
  const generated = await generateJson({
    system: RECIPE_SYSTEM,
    prompt: buildProposalPrompt(ctx, { ...opts, deficit }),
    schema: RECIPE_PROPOSAL_SCHEMA,
  });
  return Array.isArray(generated.recipes) ? generated.recipes : [];
}

// Genera una alternativa para una sola comida. Devuelve la comida o null.
async function generateMealSwap(ctx, current, opts = {}) {
  if (!isConfigured()) return null;
  const generated = await generateJson({
    system: RECIPE_SYSTEM,
    prompt: buildSwapPrompt(ctx, current, opts),
    schema: MEAL_SWAP_SCHEMA,
  });
  if (!generated || !generated.title) return null;
  return { ...generated, slot: current.slot };
}

async function generateExerciseProposals(ctx, opts = {}) {
  if (!isConfigured()) return [];
  const deficit = opts.deficit || {};
  const total = Object.values(deficit).reduce((a, b) => a + b, 0);
  if (!total) return [];
  const generated = await generateJson({
    system: EXERCISE_SYSTEM,
    prompt: buildExerciseProposalPrompt(ctx, { ...opts, deficit }),
    schema: EXERCISE_PROPOSAL_SCHEMA,
  });
  return Array.isArray(generated.exercises) ? generated.exercises : [];
}

// Genera una alternativa para un ejercicio. Devuelve el ejercicio o null.
async function generateExerciseSwap(ctx, current, opts = {}) {
  if (!isConfigured()) return null;
  const generated = await generateJson({
    system: EXERCISE_SYSTEM,
    prompt: buildExerciseSwapPrompt(ctx, current, opts),
    schema: EXERCISE_SWAP_SCHEMA,
  });
  if (!generated || !generated.name) return null;
  return generated;
}

module.exports = {
  MODEL,
  isConfigured,
  generateRecipeProposals,
  generateMealSwap,
  generateExerciseProposals,
  generateExerciseSwap,
};
