const { Router } = require('express');
const trainingWeeks = require('../db/repos/trainingWeeks');
const exerciseRecords = require('../db/repos/exerciseRecords');

const router = Router();

router.get('/', (req, res) => {
  res.json(trainingWeeks.list());
});

router.get('/active', (req, res) => {
  res.json(trainingWeeks.getActive() || null);
});

router.get('/today', (req, res) => {
  const result = trainingWeeks.today();
  const exercises = result.entry?.routine?.exercises || [];
  const bests = exerciseRecords.bestMap(
    exercises.map((exercise) => exercise.exercise_id).filter(Boolean)
  );
  res.json({ ...result, bests });
});

router.get('/:id', (req, res) => {
  const week = trainingWeeks.get(Number(req.params.id), { withRoutines: true });
  if (!week) return res.status(404).json({ error: 'Semana no encontrada' });
  res.json(week);
});

router.post('/', (req, res) => {
  try {
    const week = trainingWeeks.create(req.body || {});
    res.status(201).json(week);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const week = trainingWeeks.update(Number(req.params.id), req.body || {});
    if (!week) return res.status(404).json({ error: 'Semana no encontrada' });
    res.json(week);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/:id/activate', (req, res) => {
  const week = trainingWeeks.activate(Number(req.params.id));
  if (!week) return res.status(404).json({ error: 'Semana no encontrada' });
  res.json(week);
});

router.delete('/:id', (req, res) => {
  trainingWeeks.remove(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
