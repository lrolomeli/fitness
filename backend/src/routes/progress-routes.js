const { Router } = require('express');
const progress = require('../db/repos/progress');

const router = Router();

router.get('/', (req, res) => {
  res.json(progress.list());
});

router.get('/summary', (req, res) => {
  res.json(progress.summary());
});

router.post('/', (req, res) => {
  const body = req.body || {};
  const log = progress.add({
    date: body.date || new Date().toISOString().slice(0, 10),
    weight_kg: body.weight_kg === '' || body.weight_kg == null ? null : Number(body.weight_kg),
    calories_consumed:
      body.calories_consumed === '' || body.calories_consumed == null
        ? null
        : Number(body.calories_consumed),
    gym_marks: Array.isArray(body.gym_marks) ? body.gym_marks : [],
    notes: body.notes,
  });
  res.status(201).json(log);
});

router.delete('/:id', (req, res) => {
  progress.remove(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
