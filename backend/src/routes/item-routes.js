const { Router } = require('express');
const store = require('../db/store');

const router = Router();

router.get('/', (req, res) => {
  const { module } = req.query;
  res.json(store.list(module));
});

router.get('/:id', (req, res) => {
  const item = store.get(Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/', (req, res) => {
  const { module, title, data } = req.body || {};
  if (!module || !store.MODULES.includes(module)) {
    return res.status(400).json({ error: 'Módulo inválido' });
  }
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  res.status(201).json(store.create({ module, title: String(title).trim(), data }));
});

router.put('/:id', (req, res) => {
  const updated = store.update(Number(req.params.id), req.body || {});
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  store.remove(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
