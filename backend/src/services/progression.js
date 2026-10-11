const WEEKS_PER_PHASE = 4;

function weekStart(date = new Date()) {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function currentWeekStart() {
  return weekStart(new Date());
}

function blockInfo(user) {
  const start = user && user.start_date ? new Date(user.start_date) : new Date();
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  const weeks = Math.max(0, Math.floor(days / 7));
  const cycleWeek = weeks % (WEEKS_PER_PHASE * 2);
  const phase = cycleWeek < WEEKS_PER_PHASE ? 1 : 2;
  const weekInPhase = (cycleWeek % WEEKS_PER_PHASE) + 1;
  const block = Math.floor(weeks / (WEEKS_PER_PHASE * 2)) + 1;
  return { week: weeks + 1, block, phase, weekInPhase, totalWeeks: weeks };
}

function phaseGuidance(phase) {
  if (phase >= 2) {
    return {
      name: 'Intensificación',
      rir: '1-2',
      nutrition:
        'Superávit mayor: +150-200 kcal extra repartidas en carbohidratos alrededor del entrenamiento.',
      training:
        'Aumentar series efectivas o acercarse al fallo (RIR 1-2). Subir peso o repeticiones cuando sea posible.',
    };
  }
  return {
    name: 'Adaptación',
    rir: '2-3',
    nutrition: 'Superávit moderado (+200-300 kcal). Alta ingesta proteica para síntesis muscular.',
    training:
      'Alta frecuencia (full body o torso/pierna, 3-4 días). Foco en técnica con RIR 2-3.',
  };
}

// Heurística simple: si hay dos marcas, sugiere progresar el peso.
function suggestNextWeight(marks = []) {
  if (!marks.length) return null;
  const sorted = [...marks].sort((a, b) => new Date(a.date) - new Date(b.date));
  const last = sorted[sorted.length - 1];
  const weight = Number(last.weight_kg);
  if (!weight) return null;
  return Math.round((weight + 2.5) * 10) / 10;
}

module.exports = {
  WEEKS_PER_PHASE,
  weekStart,
  currentWeekStart,
  blockInfo,
  phaseGuidance,
  suggestNextWeight,
};
