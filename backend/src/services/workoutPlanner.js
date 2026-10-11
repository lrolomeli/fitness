const exerciseLibrary = require('../db/repos/exerciseLibrary');

const BLOCKS = ['empuje', 'traccion', 'pierna', 'core'];
const BLOCK_LABELS = {
  empuje: 'Empuje',
  traccion: 'Tracción',
  pierna: 'Pierna',
  core: 'Core',
};

// Objetivo del catálogo curado: 30 ejercicios activos por bloque.
const BLOCK_TARGETS = { empuje: 8, traccion: 8, pierna: 8, core: 6 };
const POOL_TARGET = Object.values(BLOCK_TARGETS).reduce((a, b) => a + b, 0);

// Catálogo semilla (se inserta una sola vez, como activos).
const SEED = [
  { block: 'empuje', name: 'Press banca con barra', equipment: 'Barra' },
  { block: 'empuje', name: 'Press inclinado con mancuernas', equipment: 'Mancuernas' },
  { block: 'empuje', name: 'Press militar', equipment: 'Barra' },
  { block: 'empuje', name: 'Fondos en paralelas', equipment: 'Peso corporal' },
  { block: 'empuje', name: 'Aperturas con mancuernas', equipment: 'Mancuernas' },
  { block: 'empuje', name: 'Elevaciones laterales', equipment: 'Mancuernas' },
  { block: 'empuje', name: 'Extensión de tríceps en polea', equipment: 'Polea' },
  { block: 'empuje', name: 'Press cerrado', equipment: 'Barra' },
  { block: 'traccion', name: 'Jalón al pecho', equipment: 'Polea' },
  { block: 'traccion', name: 'Remo con barra', equipment: 'Barra' },
  { block: 'traccion', name: 'Remo con mancuerna', equipment: 'Mancuernas' },
  { block: 'traccion', name: 'Dominadas', equipment: 'Peso corporal' },
  { block: 'traccion', name: 'Remo en polea baja', equipment: 'Polea' },
  { block: 'traccion', name: 'Curl con barra', equipment: 'Barra' },
  { block: 'traccion', name: 'Curl martillo', equipment: 'Mancuernas' },
  { block: 'traccion', name: 'Face pull', equipment: 'Polea' },
  { block: 'pierna', name: 'Sentadilla con barra', equipment: 'Barra' },
  { block: 'pierna', name: 'Prensa de piernas', equipment: 'Máquina' },
  { block: 'pierna', name: 'Peso muerto rumano', equipment: 'Barra' },
  { block: 'pierna', name: 'Zancadas con mancuernas', equipment: 'Mancuernas' },
  { block: 'pierna', name: 'Extensión de cuádriceps', equipment: 'Máquina' },
  { block: 'pierna', name: 'Curl femoral', equipment: 'Máquina' },
  { block: 'pierna', name: 'Hip thrust', equipment: 'Barra' },
  { block: 'pierna', name: 'Elevación de gemelos', equipment: 'Máquina' },
  { block: 'core', name: 'Plancha abdominal', equipment: 'Peso corporal' },
  { block: 'core', name: 'Crunch en polea', equipment: 'Polea' },
  { block: 'core', name: 'Elevación de piernas colgado', equipment: 'Peso corporal' },
  { block: 'core', name: 'Rueda abdominal', equipment: 'Rueda' },
  { block: 'core', name: 'Russian twist', equipment: 'Disco' },
  { block: 'core', name: 'Crunch bicicleta', equipment: 'Peso corporal' },
];

let seeded = false;

function ensureSeeded() {
  if (seeded) return;
  SEED.forEach((s) => {
    exerciseLibrary.upsertExercise({ ...s, source: 'seed', status: 'active' });
  });
  seeded = true;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function coverageByBlock() {
  ensureSeeded();
  const counts = exerciseLibrary.countActiveByBlock();
  return BLOCKS.reduce((acc, block) => {
    acc[block] = counts[block] || 0;
    return acc;
  }, {});
}

function poolDeficit() {
  const counts = exerciseLibrary.countActiveByBlock();
  return BLOCKS.reduce((acc, block) => {
    const have = counts[block] || 0;
    acc[block] = Math.max(0, BLOCK_TARGETS[block] - have);
    return acc;
  }, {});
}

function localAlternatives(block, { excludeNames = [] } = {}) {
  ensureSeeded();
  const excluded = new Set(excludeNames.map((n) => String(n).trim().toLowerCase()));
  return exerciseLibrary
    .listActive(block)
    .filter((ex) => !excluded.has(String(ex.name).trim().toLowerCase()));
}

// Acepta tanto la clave del bloque ("empuje") como su etiqueta ("Empuje").
function normalizeBlock(value) {
  const v = String(value || '').trim().toLowerCase();
  if (BLOCKS.includes(v)) return v;
  const found = Object.entries(BLOCK_LABELS).find(([, label]) => label.toLowerCase() === v);
  return found ? found[0] : null;
}

function phaseParameters(phase) {
  if (phase >= 2) {
    return { sets: 4, reps: '8-10', coreReps: '12-15', rir: '1-2' };
  }
  return { sets: 3, reps: '8-12', coreReps: '12-15', rir: '2-3' };
}

const TEMPLATES = {
  full_body: [
    { title: 'Full body A', focus: 'Cuerpo completo', parts: [{ block: 'empuje', count: 1 }, { block: 'traccion', count: 1 }, { block: 'pierna', count: 1 }, { block: 'core', count: 1 }] },
    { title: 'Full body B', focus: 'Cuerpo completo', parts: [{ block: 'pierna', count: 1 }, { block: 'empuje', count: 1 }, { block: 'traccion', count: 1 }, { block: 'core', count: 1 }] },
    { title: 'Full body C', focus: 'Cuerpo completo', parts: [{ block: 'traccion', count: 1 }, { block: 'pierna', count: 1 }, { block: 'empuje', count: 1 }, { block: 'core', count: 1 }] },
  ],
  torso_pierna: [
    { title: 'Torso', focus: 'Empuje y jalón', parts: [{ block: 'empuje', count: 2 }, { block: 'traccion', count: 2 }, { block: 'core', count: 1 }] },
    { title: 'Pierna', focus: 'Tren inferior', parts: [{ block: 'pierna', count: 3 }, { block: 'core', count: 1 }] },
  ],
  ppl4: [
    { title: 'Empuje', focus: 'Pecho, hombro y tríceps', parts: [{ block: 'empuje', count: 3 }, { block: 'core', count: 1 }] },
    { title: 'Tracción', focus: 'Espalda y bíceps', parts: [{ block: 'traccion', count: 3 }, { block: 'core', count: 1 }] },
    { title: 'Pierna', focus: 'Tren inferior', parts: [{ block: 'pierna', count: 3 }, { block: 'core', count: 1 }] },
    { title: 'Torso', focus: 'Empuje y jalón', parts: [{ block: 'empuje', count: 2 }, { block: 'traccion', count: 2 }, { block: 'core', count: 1 }] },
  ],
  ppl5: [
    { title: 'Empuje', focus: 'Pecho, hombro y tríceps', parts: [{ block: 'empuje', count: 3 }, { block: 'core', count: 1 }] },
    { title: 'Tracción', focus: 'Espalda y bíceps', parts: [{ block: 'traccion', count: 3 }, { block: 'core', count: 1 }] },
    { title: 'Pierna', focus: 'Tren inferior', parts: [{ block: 'pierna', count: 3 }, { block: 'core', count: 1 }] },
    { title: 'Empuje', focus: 'Pecho, hombro y tríceps', parts: [{ block: 'empuje', count: 3 }, { block: 'core', count: 1 }] },
    { title: 'Tracción', focus: 'Espalda y bíceps', parts: [{ block: 'traccion', count: 3 }, { block: 'core', count: 1 }] },
  ],
};

// Reparte los días de entrenamiento y descanso según fase y experiencia.
function splitFor(ctx) {
  const phase = ctx.phase || 1;
  const experience = ctx.experience_level || 'beginner';
  const advanced = ['intermediate', 'advanced'].includes(experience);

  let trainingDays;
  if (phase >= 2) {
    trainingDays = experience === 'advanced' ? [0, 1, 2, 4, 5] : [0, 1, 2, 4];
  } else if (advanced) {
    trainingDays = [0, 1, 3, 4];
  } else {
    trainingDays = [0, 2, 4];
  }

  const key = phase >= 2 ? (trainingDays.length === 5 ? 'ppl5' : 'ppl4') : advanced ? 'torso_pierna' : 'full_body';
  const templates = TEMPLATES[key];
  const params = phaseParameters(phase);

  const days = [];
  let t = 0;
  for (let day = 0; day < 7; day += 1) {
    if (!trainingDays.includes(day)) {
      days.push({ day, type: 'rest', title: 'Descanso', focus: 'Recuperación' });
      continue;
    }
    const template = templates[t % templates.length];
    t += 1;
    days.push({
      day,
      type: 'training',
      title: template.title,
      focus: template.focus,
      rir: params.rir,
      parts: template.parts,
    });
  }
  return days;
}

function pickExercises(parts, pools, usedThisWeek) {
  const chosen = [];
  const chosenIds = new Set();
  for (const { block, count } of parts) {
    const pool = pools[block] || [];
    let options = pool.filter((ex) => !usedThisWeek.has(ex.id) && !chosenIds.has(ex.id));
    if (options.length < count) {
      options = pool.filter((ex) => !chosenIds.has(ex.id));
    }
    for (let i = 0; i < count && options.length; i += 1) {
      const ex = options.shift();
      chosen.push(ex);
      chosenIds.add(ex.id);
    }
  }
  return chosen;
}

function buildWeek(ctx) {
  ensureSeeded();
  const params = phaseParameters(ctx.phase || 1);
  const days = splitFor(ctx);

  const pools = {};
  for (const block of BLOCKS) {
    pools[block] = shuffle(exerciseLibrary.listActive(block));
  }

  const usedThisWeek = new Set();
  const usedIds = new Set();

  const result = days.map((day) => {
    if (day.type === 'rest') {
      return { day: day.day, type: 'rest', title: day.title, focus: day.focus };
    }

    const picked = pickExercises(day.parts || [], pools, usedThisWeek);
    picked.forEach((ex) => {
      usedIds.add(ex.id);
      usedThisWeek.add(ex.id);
    });

    const exercises = picked.map((ex) => ({
      name: ex.name,
      muscle: ex.block,
      sets: params.sets,
      reps: ex.block === 'core' ? params.coreReps : params.reps,
      suggested_weight_kg: 0,
      rir: params.rir,
      notes: ex.equipment ? `Equipo: ${ex.equipment}` : '',
    }));

    return {
      day: day.day,
      type: 'training',
      title: day.title,
      focus: day.focus,
      rir: params.rir,
      exercises,
    };
  });

  exerciseLibrary.markUsed([...usedIds]);

  return { days: result, provider: null };
}

module.exports = {
  BLOCKS,
  BLOCK_LABELS,
  BLOCK_TARGETS,
  POOL_TARGET,
  ensureSeeded,
  coverageByBlock,
  poolDeficit,
  localAlternatives,
  normalizeBlock,
  splitFor,
  buildWeek,
};
