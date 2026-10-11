const { Router } = require('express');
const users = require('../db/repos/users');
const nutrition = require('../services/nutrition');
const progression = require('../services/progression');

const router = Router();

router.get('/', (req, res) => {
  const user = users.get();
  if (!user) return res.json({ profile: null });
  const info = progression.blockInfo(user);
  const targets = nutrition.targetsFor(user, info.phase);
  res.json({ profile: user, block: info, targets });
});

router.put('/', (req, res) => {
  const body = req.body || {};
  const numeric = ['height_cm', 'weight_kg'];
  const payload = { ...body };
  numeric.forEach((field) => {
    if (payload[field] === '' || payload[field] === null || payload[field] === undefined) {
      delete payload[field];
    } else {
      payload[field] = Number(payload[field]);
    }
  });

  if (payload.activity_level && !nutrition.ACTIVITY_FACTORS[payload.activity_level]) {
    return res.status(400).json({ error: 'Nivel de actividad inválido' });
  }

  const user = users.save(payload);
  const info = progression.blockInfo(user);
  const targets = nutrition.targetsFor(user, info.phase);
  res.json({ profile: user, block: info, targets });
});

module.exports = router;
