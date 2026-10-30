const { Router } = require('express');
const routines = require('../db/repos/routines');

const router = Router();

router.get('/', (req, res) => {
  res.json(routines.list());
});

router.get('/:id', (req, res) => {
  const routine = routines.get(Number(req.params.id));
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });
  res.json(routine);
});

router.post('/', (req, res) => {
  try {
    const routine = routines.create(req.body || {}, req.body?.exercises || []);
    res.status(201).json(routine);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const routine = routines.update(
      Number(req.params.id),
      req.body || {},
      Array.isArray(req.body?.exercises) ? req.body.exercises : undefined
    );
    if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });
    res.json(routine);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  routines.remove(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
