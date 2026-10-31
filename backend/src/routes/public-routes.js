const { Router } = require('express');
const publicWorkout = require('../services/publicWorkout');

const router = Router();

// Vista pública de solo lectura: no requiere sesión y no expone datos de perfil.
router.get('/workout', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(publicWorkout.build());
});

module.exports = router;
