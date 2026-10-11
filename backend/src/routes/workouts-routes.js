const { Router } = require('express');
const workouts = require('../db/repos/workouts');
const workoutPlanner = require('../services/workoutPlanner');
const ai = require('../services/ai');
const { buildContext } = require('../services/context');
const progression = require('../services/progression');

const router = Router();

router.get('/', (req, res) => {
  const week = req.query.week || workouts.latestWeekStart() || progression.currentWeekStart();
  res.json({ week, days: workouts.listByWeek(week) });
});

router.get('/:id', (req, res) => {
  const workout = workouts.get(Number(req.params.id));
  if (!workout) return res.status(404).json({ error: 'Entrenamiento no encontrado' });
  res.json(workout);
});

router.post('/generate', async (req, res) => {
  const weekStart = req.body?.week_start || progression.currentWeekStart();
  try {
    const ctx = buildContext();
    const generated = workoutPlanner.buildWeek(ctx.workout);

    workouts.removeByWeek(weekStart);

    (generated.days || []).forEach((day) => {
      workouts.create(
        {
          week_start: weekStart,
          day: day.day,
          phase: ctx.info.phase,
          type: day.type,
          title: day.title,
          focus: day.focus,
          rir: day.rir,
        },
        day.exercises || []
      );
    });

    const deficit = workoutPlanner.poolDeficit();
    const missing = Object.values(deficit).reduce((a, b) => a + b, 0);
    res.status(201).json({ week: weekStart, days: workouts.listByWeek(weekStart), missing });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Cambiar un solo ejercicio: recetario local; con instrucción (o sin alternativa
// local) pide uno nuevo a la IA sin guardarlo.
router.post('/:id/exercises/:exId/swap', async (req, res) => {
  const workout = workouts.get(Number(req.params.id));
  if (!workout) return res.status(404).json({ error: 'Entrenamiento no encontrado' });
  const exercise = workouts.getExercise(Number(req.params.exId));
  if (!exercise || exercise.workout_id !== workout.id) {
    return res.status(404).json({ error: 'Ejercicio no encontrado' });
  }
  if (workout.type === 'rest') {
    return res.status(400).json({ error: 'Día de descanso' });
  }

  try {
    const instruction = String(req.body?.instruction || '').trim();
    const block = workoutPlanner.normalizeBlock(exercise.muscle);
    const ctx = buildContext();
    const excludeNames = workout.exercises.map((e) => e.name);

    const applyName = (name, notation) => ({
      name,
      muscle: block || exercise.muscle,
      sets: exercise.sets,
      reps: exercise.reps,
      suggested_weight_kg: 0,
      rir: exercise.rir,
      notes: notation,
    });

    const localPick = () => {
      if (!block) return null;
      const options = workoutPlanner.localAlternatives(block, { excludeNames });
      if (!options.length) return null;
      const pick = options[Math.floor(Math.random() * options.length)];
      return applyName(pick.name, pick.equipment ? `Equipo: ${pick.equipment}` : '');
    };

    const aiPick = async () => {
      const generated = await ai.generateExerciseSwap(
        ctx.workout,
        { name: exercise.name, muscle: block || exercise.muscle },
        { instruction, excludeNames }
      );
      if (!generated) return null;
      return applyName(
        generated.name,
        instruction ? `Ajuste: ${instruction}` : generated.equipment ? `Equipo: ${generated.equipment}` : ''
      );
    };

    let alt = null;
    if (instruction) {
      alt = await aiPick();
      if (!alt) {
        return res.status(503).json({ error: 'La IA no está disponible para el cambio solicitado' });
      }
    } else {
      alt = localPick();
      if (!alt) alt = await aiPick();
    }

    if (!alt) return res.status(422).json({ error: 'No hay otro ejercicio disponible para cambiar' });

    const updated = workouts.updateExercise(exercise.id, alt);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const current = workouts.get(id);
  if (!current) return res.status(404).json({ error: 'Entrenamiento no encontrado' });

  const { title, focus, rir, type, exercises } = req.body || {};
  const updated = workouts.replaceExercises(id, Array.isArray(exercises) ? exercises : current.exercises);

  // Actualiza campos base si vienen.
  if (title !== undefined || focus !== undefined || rir !== undefined || type !== undefined) {
    const { db } = require('../db/repos/helpers');
    const { DB_NAME } = require('../db/schema');
    db.run(
      DB_NAME,
      'UPDATE workouts SET title = ?, focus = ?, rir = ?, type = ? WHERE id = ?',
      [
        title ?? updated.title,
        focus ?? updated.focus,
        rir ?? updated.rir,
        type ?? updated.type,
        id,
      ]
    );
  }

  res.json(workouts.get(id));
});

router.delete('/', (req, res) => {
  const week = req.query.week || progression.currentWeekStart();
  workouts.removeByWeek(week);
  res.json({ success: true });
});

module.exports = router;
