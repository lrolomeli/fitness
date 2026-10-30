const { Router } = require('express');
const exerciseLibrary = require('../db/repos/exerciseLibrary');
const exerciseRecords = require('../db/repos/exerciseRecords');
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

function exercisePayload(body = {}) {
  return {
    name: body.name,
    block: body.block,
    equipment: body.equipment,
    sets: body.sets,
    reps: body.reps,
    duration_seconds: body.duration_seconds,
    notes: body.notes,
    media: body.media,
    status: body.status,
  };
}

// Alta manual: por defecto entra como propuesta.
router.post('/', (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!exerciseLibrary.BLOCKS.includes(body.block)) {
    return res.status(400).json({ error: 'block debe ser empuje, traccion, pierna o core' });
  }

  const created = exerciseLibrary.upsertExercise({
    ...exercisePayload(body),
    name,
    source: 'manual',
    status: body.status || 'proposed',
  });
  res.status(201).json(created);
});

// Reponer/ampliar el catálogo con IA: genera al menos 10 propuestas y, si el
// déficit es mayor, exactamente las necesarias. Reparto proporcional al déficit.
// La meta (30) es un mínimo para variar más, no un máximo: si ya se alcanzó, se
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

router.get('/:id/records', (req, res) => {
  const id = Number(req.params.id);
  const exercise = exerciseLibrary.get(id);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  res.json({
    exercise,
    records: exerciseRecords.listByExercise(id),
    best: exerciseRecords.bestFor(id),
  });
});

router.post('/:id/records', (req, res) => {
  const id = Number(req.params.id);
  const exercise = exerciseLibrary.get(id);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });

  try {
    const result = exerciseRecords.add({
      exercise_id: id,
      exercise_name: exercise.name,
      date: req.body?.date,
      weight_kg: req.body?.weight_kg,
      reps: req.body?.reps,
      sets: req.body?.sets,
      notes: req.body?.notes,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id/records/:recordId', (req, res) => {
  const record = exerciseRecords.get(Number(req.params.recordId));
  if (!record || Number(record.exercise_id) !== Number(req.params.id)) {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }
  exerciseRecords.remove(record.id);
  res.json({ success: true });
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

router.patch('/:id', (req, res) => {
  const body = req.body || {};
  if (body.block !== undefined && !exerciseLibrary.BLOCKS.includes(body.block)) {
    return res.status(400).json({ error: 'block debe ser empuje, traccion, pierna o core' });
  }
  try {
    const updated = exerciseLibrary.update(Number(req.params.id), exercisePayload(body));
    if (!updated) return res.status(404).json({ error: 'Ejercicio no encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  exerciseLibrary.remove(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
