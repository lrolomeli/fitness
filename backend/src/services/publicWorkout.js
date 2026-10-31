const trainingWeeks = require('../db/repos/trainingWeeks');
const exerciseLibrary = require('../db/repos/exerciseLibrary');
const muscleGroups = require('../db/repos/muscleGroups');

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function libraryIndex() {
  const byId = new Map();
  const byBlockAndName = new Map();
  const byName = new Map();

  exerciseLibrary.list().forEach((exercise) => {
    byId.set(String(exercise.id), exercise);

    const name = normalize(exercise.name);
    if (!name) return;

    const blockKey = `${normalize(exercise.block)}|${name}`;
    if (!byBlockAndName.has(blockKey)) byBlockAndName.set(blockKey, exercise);
    if (!byName.has(name)) byName.set(name, exercise);
  });

  return { byId, byBlockAndName, byName };
}

function resolveLibraryExercise(exercise, index) {
  if (exercise.exercise_id != null) {
    const found = index.byId.get(String(exercise.exercise_id));
    if (found) return found;
  }

  const name = normalize(exercise.name);
  if (!name) return null;

  return (
    index.byBlockAndName.get(`${normalize(exercise.block)}|${name}`) ||
    index.byName.get(name) ||
    null
  );
}

function publicExercise(exercise, index, labels) {
  const library = resolveLibraryExercise(exercise, index);
  return {
    id: exercise.id,
    name: exercise.name,
    block: exercise.block,
    block_label: labels[exercise.block] || exercise.block || 'Ejercicio',
    sets: exercise.sets,
    reps: exercise.reps,
    duration_seconds: exercise.duration_seconds,
    notes: exercise.notes,
    media: library?.media || [],
  };
}

function totalsFor(exercises) {
  return {
    exercises: exercises.length,
    sets: exercises.reduce((acc, exercise) => acc + (Number(exercise.sets) || 0), 0),
    media: exercises.reduce((acc, exercise) => acc + (exercise.media?.length || 0), 0),
  };
}

function build() {
  const groups = muscleGroups.list();
  const labels = groups.reduce((acc, group) => {
    acc[group.key] = group.label;
    return acc;
  }, {});
  const todayDay = trainingWeeks.currentDayIndex();
  const active = trainingWeeks.getActive({ withRoutines: true });

  if (!active) {
    return {
      week: null,
      today: { day: todayDay, entry: null },
      labels,
      generated_at: new Date().toISOString(),
    };
  }

  const index = libraryIndex();
  const daysByNumber = new Map((active.days || []).map((day) => [Number(day.day), day]));

  const days = trainingWeeks.DAYS.map((dayNumber) => {
    const day = daysByNumber.get(dayNumber);
    const routine = day?.routine || null;
    const exercises = (routine?.exercises || []).map((exercise) =>
      publicExercise(exercise, index, labels)
    );

    return {
      day: dayNumber,
      is_rest: !routine || Boolean(day?.is_rest),
      routine: routine
        ? {
            id: routine.id,
            name: routine.name,
            description: routine.description || '',
          }
        : null,
      exercises,
      totals: totalsFor(exercises),
    };
  });

  const todayEntry = days.find((day) => day.day === todayDay) || null;

  return {
    week: {
      id: active.id,
      name: active.name,
      days,
      totals: totalsFor(days.flatMap((day) => day.exercises)),
    },
    today: { day: todayDay, entry: todayEntry },
    labels,
    generated_at: new Date().toISOString(),
  };
}

module.exports = { build };
