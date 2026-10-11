const { Router } = require('express');
const preferences = require('../db/repos/preferences');

const router = Router();

router.get('/', (req, res) => {
  const { type } = req.query;
  if (type && !preferences.TYPES.includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }
  res.json(preferences.list(type));
});

router.post('/', (req, res) => {
  try {
    const created = preferences.add(req.body || {});
    res.status(201).json(created);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  preferences.remove(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
