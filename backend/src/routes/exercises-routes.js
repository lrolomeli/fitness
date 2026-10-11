const { Router } = require('express');
const exerciseLibrary = require('../db/repos/exerciseLibrary');
const workoutPlanner = require('../services/workoutPlanner');
const ai = require('../services/ai');
const { allocateBatch } = require('../services/proposalBatch');
const { buildContext } = require('../services/context');

const router = Router();

router.get('/', (req, res) => {
  workoutPlanner.ensureSeeded();
  res.json({
    active: exerciseLibrary.listActive(req.query.block),
    proposed: exerciseLibrary.listProposed(),
    disabled: exerciseLibrary.listDisabled(),
    coverage: workoutPlanner.coverageByBlock(),
    targets: workoutPlanner.BLOCK_TARGETS,
    poolTarget: workoutPlanner.POOL_TARGET,
    labels: workoutPlanner.BLOCK_LABELS,
  });
});

// Alta manual: por defecto entra como propuesta.
router.post('/', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!exerciseLibrary.BLOCKS.includes(body.block)) {
    return res.status(400).json({ error: 'block debe ser empuje, traccion, pierna o core' });
  }

  const created = exerciseLibrary.upsertExercise({
    name,
    block: body.block,
    equipment: body.equipment ? String(body.equipment).trim() : null,
    source: 'manual',
    status: body.status || 'proposed',
  });
  res.status(201).json(created);
});

// Reponer/ampliar el catálogo con IA: genera al menos 10 propuestas y, si el
// déficit es mayor, exactamente las necesarias. Reparto proporcional al déficit.
// La meta (30) es un mínimo para variedad, no un máximo: si ya se alcanzó, se
// generan 10 propuestas repartidas entre los bloques.
router.post('/proposals', async (req, res) => {
  try {
    if (!ai.isConfigured()) {
      return res.status(503).json({ error: 'La IA no está configurada (falta GEMINI_API_KEY)' });
    }
    const deficit = workoutPlanner.poolDeficit();
    const total = Object.values(deficit).reduce((a, b) => a + b, 0);
    const weights = total ? deficit : workoutPlanner.BLOCK_TARGETS;

    const target = Math.max(10, total);
    const batch = allocateBatch(weights, workoutPlanner.BLOCKS, target);
    const wanted = Object.values(batch).reduce((a, b) => a + b, 0);
    if (!wanted) return res.json({ created: [] });

    const ctx = buildContext();
    const existingNames = exerciseLibrary.list().map((e) => e.name);
    const generated = await ai.generateExerciseProposals(ctx.workout, {
      deficit: batch,
      existingNames,
    });

    const created = [];
    for (const ex of generated) {
      if (!exerciseLibrary.BLOCKS.includes(ex.block)) continue;
      if (!ex.name) continue;
      const saved = exerciseLibrary.upsertExercise({
        name: ex.name,
        block: ex.block,
        equipment: ex.equipment || null,
        source: 'ai',
        status: 'proposed',
      });
      if (saved) created.push(saved);
    }

    res.status(201).json({ created });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.patch('/:id/status', (req, res) => {
  const status = req.body?.status;
  if (!exerciseLibrary.STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status debe ser active, proposed o disabled' });
  }
  const updated = exerciseLibrary.setStatus(Number(req.params.id), status);
  if (!updated) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  exerciseLibrary.remove(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
