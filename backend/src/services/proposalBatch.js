// Reparte `target` propuestas entre las claves de `order` de forma proporcional
// al déficit de cada una (método de mayor resto), garantizando que la suma sea
// exactamente `target`. Con target >= déficit total devuelve el déficit íntegro.
function allocateBatch(deficit, order, target) {
  const total = order.reduce((a, key) => a + (deficit[key] || 0), 0);
  if (!total || target <= 0) return {};

  const batch = {};
  const remainders = [];
  let assigned = 0;

  for (const key of order) {
    const exact = (target * (deficit[key] || 0)) / total;
    const base = Math.floor(exact);
    batch[key] = base;
    assigned += base;
    remainders.push({ key, frac: exact - base });
  }

  remainders.sort((a, b) => b.frac - a.frac);
  for (let i = 0, leftover = target - assigned; leftover > 0; i += 1, leftover -= 1) {
    batch[remainders[i].key] += 1;
  }

  return batch;
}

module.exports = { allocateBatch };
