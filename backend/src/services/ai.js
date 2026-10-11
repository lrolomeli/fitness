const { GoogleGenAI } = require('@google/genai');
const planner = require('./planner');

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

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
const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day: { type: 'integer', description: '0 = lunes ... 6 = domingo' },
          meals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slot: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
                title: { type: 'string' },
                description: { type: 'string' },
                ingredients: { type: 'array', items: { type: 'string' } },
                kcal: { type: 'integer' },
                protein_g: { type: 'integer' },
                carbs_g: { type: 'integer' },
                fat_g: { type: 'integer' },
              },
              required: ['slot', 'title', 'ingredients', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
            },
          },
        },
        required: ['day', 'meals'],
      },
    },
  },
  required: ['days'],
};

const WORKOUT_SCHEMA = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day: { type: 'integer', description: '0 = lunes ... 6 = domingo' },
          type: { type: 'string', enum: ['training', 'rest'] },
          title: { type: 'string' },
          focus: { type: 'string' },
          rir: { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                muscle: { type: 'string' },
                sets: { type: 'integer' },
                reps: { type: 'string' },
                suggested_weight_kg: { type: 'number' },
                rir: { type: 'string' },
                notes: { type: 'string' },
              },
              required: ['name', 'sets', 'reps'],
            },
          },
        },
        required: ['day', 'type'],
      },
    },
  },
  required: ['days'],
};

// =========================
// Prompts
// =========================
const MEAL_SYSTEM =
  'Eres un nutricionista deportivo. Diseñas dietas semanales prácticas para ganar masa muscular, ' +
  'con ingredientes comunes de supermercado, en español y con porciones realistas. Respetas estrictamente ' +
  'las restricciones y alimentos vetados del usuario.';

const WORKOUT_SYSTEM =
  'Eres un entrenador personal. Diseñas rutinas semanales de hipertrofia con sobrecarga progresiva, ' +
  'ejercicios comunes de gimnasio, en español, ajustando RIR y volumen a la fase del mesociclo.';

function listBlock(title, items) {
  if (!items || !items.length) return '';
  return `\n${title}: ${items.join(', ')}`;
}

function buildMealPrompt(ctx) {
  const t = ctx.targets;
  return (
    `Genera un plan de comidas para 7 días (día 0 = lunes).\n\n` +
    `Objetivos diarios: ${t.target_calories} kcal — Proteína ${t.protein_g} g, ` +
    `Carbohidratos ${t.carbs_g} g, Grasa ${t.fat_g} g.\n` +
    `Fase actual: ${ctx.phaseName}. ${ctx.phaseNutrition}\n` +
    `Perfil: sexo ${ctx.sex || 'no especificado'}, peso ${ctx.weight_kg || '?'} kg, ` +
    `experiencia ${ctx.experience_level || 'principiante'}, actividad ${ctx.activity_level || 'moderada'}.\n` +
    `Cada día incluye desayuno (breakfast), comida (lunch), cena (dinner) y una colación (snack).` +
    listBlock('Alimentos favoritos', ctx.favorites) +
    listBlock('VETADOS (no usar nunca)', ctx.banned) +
    listBlock('Restricciones', ctx.restrictions) +
    listBlock('Le gustaron antes', ctx.liked) +
    listBlock('No le gustaron (evitar)', ctx.disliked) +
    listBlock('Recetario que ya le gustó (reutiliza o adapta estos platillos)', ctx.library) +
    `\n\nReparte las calorías y macros para acercarte lo más posible al objetivo diario. ` +
    `Los macros de cada platillo deben ser coherentes con los ingredientes. ` +
    `Varía los platillos a lo largo de la semana y prioriza reutilizar los del recetario.`
  );
}

function buildWorkoutPrompt(ctx) {
  return (
    `Genera una rutina de entrenamiento para 7 días (día 0 = lunes).\n\n` +
    `Objetivo: ganar masa muscular. Fase actual: ${ctx.phaseName} (${ctx.phaseTraining}). RIR objetivo: ${ctx.phaseRir}.\n` +
    `Perfil: experiencia ${ctx.experience_level || 'principiante'}, peso ${ctx.weight_kg || '?'} kg.\n` +
    `Marca días de entrenamiento (type "training") y de descanso (type "rest"). ` +
    `Incluye 4-5 días de entrenamiento según la fase, con ejercicios, series, repeticiones, ` +
    `peso sugerido (si no aplica, 0) y RIR. Puedes incluir sugerencias de progresión en las notas.`
  );
}

// =========================
// API pública
// =========================
async function generateMealPlan(ctx) {
  if (isConfigured()) {
    try {
      const generated = await generateJson({
        system: MEAL_SYSTEM,
        prompt: buildMealPrompt(ctx),
        schema: MEAL_SCHEMA,
      });
      return { ...generated, provider: 'gemini' };
    } catch (err) {
      const fallback = await planner.generateMealPlan(ctx);
      return { ...fallback, fallbackError: err.message };
    }
  }
  return planner.generateMealPlan(ctx);
}

async function generateWorkoutPlan(ctx) {
  if (!isConfigured()) return mockWorkoutPlan(ctx);
  return generateJson({ system: WORKOUT_SYSTEM, prompt: buildWorkoutPrompt(ctx), schema: WORKOUT_SCHEMA });
}

// =========================
// Fallback de entrenamiento (sin API key)
// =========================
const TRAINING_DAYS = [
  { title: 'Full body A', focus: 'Cuerpo completo', exercises: ['Sentadilla', 'Press banca', 'Remo con barra', 'Press militar', 'Curl bíceps'] },
  { title: 'Full body B', focus: 'Cuerpo completo', exercises: ['Peso muerto', 'Press inclinado', 'Jalón al pecho', 'Elevaciones laterales', 'Extensión tríceps'] },
  { title: 'Torso', focus: 'Empuje y jalón', exercises: ['Press banca', 'Remo con mancuerna', 'Fondos', 'Curl martillo', 'Face pull'] },
  { title: 'Pierna', focus: 'Tren inferior', exercises: ['Prensa', 'Peso muerto rumano', 'Extensión de cuádriceps', 'Curl femoral', 'Gemelos'] },
];

function mockWorkoutPlan(ctx) {
  const phase = ctx.phase;
  const sets = phase >= 2 ? 4 : 3;
  const reps = phase >= 2 ? '6-8' : '8-12';
  const days = [];
  for (let day = 0; day < 7; day += 1) {
    const isRest = day === 3 || day === 6 || day >= 5;
    if (isRest) {
      days.push({ day, type: 'rest', title: 'Descanso', focus: 'Recuperación' });
      continue;
    }
    const template = TRAINING_DAYS[day % TRAINING_DAYS.length];
    days.push({
      day,
      type: 'training',
      title: template.title,
      focus: template.focus,
      rir: ctx.phaseRir,
      exercises: template.exercises.map((name) => ({
        name,
        muscle: '',
        sets,
        reps,
        suggested_weight_kg: 0,
        rir: ctx.phaseRir,
        notes: 'Ejemplo generado sin API key.',
      })),
    });
  }
  return { days };
}

module.exports = {
  MODEL,
  MEAL_SCHEMA,
  WORKOUT_SCHEMA,
  isConfigured,
  generateMealPlan,
  generateWorkoutPlan,
  mockWorkoutPlan,
};
