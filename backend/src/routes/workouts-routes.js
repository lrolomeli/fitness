const { Router } = require('express');
const workouts = require('../db/repos/workouts');
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
    const generated = await ai.generateWorkoutPlan(ctx.workout);

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

    res.status(201).json({ week: weekStart, days: workouts.listByWeek(weekStart) });
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
