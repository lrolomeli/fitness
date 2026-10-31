const { Router } = require('express');
const muscleGroups = require('../db/repos/muscleGroups');

const router = Router();

router.get('/', (req, res) => {
  res.json(muscleGroups.list());
});

router.post('/', (req, res) => {
  try {
    const group = muscleGroups.create(req.body || {});
    res.status(201).json(group);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.patch('/:id', (req, res) => {
  try {
    const group = muscleGroups.update(Number(req.params.id), req.body || {});
    if (!group) return res.status(404).json({ error: 'Grupo muscular no encontrado' });
    res.json(group);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const reassign = req.query.reassign || req.body?.reassign;
    const result = muscleGroups.remove(Number(req.params.id), { reassign });
    if (!result) return res.status(404).json({ error: 'Grupo muscular no encontrado' });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message,
      code: err.code,
      count: err.count,
    });
  }
});

module.exports = router;
