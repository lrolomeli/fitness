import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Banner from '../components/ui/Banner';
import Spinner from '../components/ui/Spinner';
import BanModal from '../components/BanModal';
import SwapModal from '../components/SwapModal';
import { api } from '../lib/api';
import { BTN, BTN_GHOST, INPUT, LABEL, DAY_NAMES, SLOT_LABELS, SLOT_ORDER } from '../lib/ui';

const emptyForm = (meal) => ({
  title: meal.title || '',
  ingredients: (meal.ingredients || []).join('\n'),
  kcal: meal.kcal ?? 0,
  protein_g: meal.protein_g ?? 0,
  carbs_g: meal.carbs_g ?? 0,
  fat_g: meal.fat_g ?? 0,
});

function MealRow({ meal, onFeedback, onBan, onSwap, onSave, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(() => emptyForm(meal));
  const [error, setError] = useState('');

  useEffect(() => {
    setSaved(false);
  }, [meal.id, meal.title]);

  const vote = async (rating) => {
    if (busy) return;
    setBusy(true);
    await onFeedback(meal, rating);
    setBusy(false);
  };

  const save = async () => {
    if (busy || saved) return;
    setBusy(true);
    try {
      await onSave(meal);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = () => {
    setForm(emptyForm(meal));
    setError('');
    setEditing(true);
  };

  const submitEdit = async () => {
    if (busy) return;
    if (!form.title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onUpdate(meal, {
        ...form,
        ingredients: form.ingredients
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const feedback = meal.feedback;

  if (editing) {
    return (
      <li className="rounded-xl border border-accent/30 bg-white/5 px-3.5 py-3">
        <div className="flex flex-col gap-3">
          <label className={LABEL}>
            Título
            <input
              className={INPUT}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              disabled={busy}
            />
          </label>
          <label className={LABEL}>
            Ingredientes (uno por línea)
            <textarea
              className={`${INPUT} min-h-[90px] resize-y`}
              value={form.ingredients}
              onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
              disabled={busy}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['kcal', 'Kcal'],
              ['protein_g', 'Proteína (g)'],
              ['carbs_g', 'Carbos (g)'],
              ['fat_g', 'Grasa (g)'],
            ].map(([key, label]) => (
              <label key={key} className={LABEL}>
                {label}
                <input
                  type="number"
                  min="0"
                  className={INPUT}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  disabled={busy}
                />
              </label>
            ))}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={busy}
              className={BTN_GHOST}
            >
              Cancelar
            </button>
            <button type="button" onClick={submitEdit} disabled={busy} className={BTN}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] uppercase tracking-wider text-white/45">
            {SLOT_LABELS[meal.slot] || meal.slot}
          </p>
          <p className="break-words text-sm font-medium text-white">{meal.title}</p>
          <p className="mt-0.5 text-xs text-white/50">
            {meal.kcal} kcal · P {meal.protein_g} · C {meal.carbs_g} · G {meal.fat_g}
          </p>
          {meal.ingredients?.length > 0 && (
            <p className="mt-1 text-xs text-white/40">{meal.ingredients.join(', ')}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSwap(meal)}
              disabled={busy}
              className={BTN_GHOST}
            >
              Cambiar
            </button>
            <button type="button" onClick={startEdit} disabled={busy} className={BTN_GHOST}>
              Editar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy || saved}
              className={BTN_GHOST}
            >
              {saved ? 'Guardado ✓' : 'Guardar'}
            </button>
            {feedback === 'down' && (
              <button
                type="button"
                onClick={() => onBan(meal)}
                className="rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-1 text-xs text-danger transition-colors hover:bg-danger/20"
              >
                Elegir qué vetar
              </button>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => vote('up')}
            aria-label="Me gustó"
            className={`grid h-9 w-9 place-items-center rounded-lg border text-base transition-colors ${
              feedback === 'up'
                ? 'border-ok/60 bg-ok/20 text-ok'
                : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            👍
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => vote('down')}
            aria-label="No me gustó"
            className={`grid h-9 w-9 place-items-center rounded-lg border text-base transition-colors ${
              feedback === 'down'
                ? 'border-danger/60 bg-danger/20 text-danger'
                : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            👎
          </button>
        </div>
      </div>
    </li>
  );
}

export default function MealsSection({ state, onChanged }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [banMeal, setBanMeal] = useState(null);
  const [swapMeal, setSwapMeal] = useState(null);

  const loadPlan = async () => {
    const plans = await api.get('/api/plans');
    if (!plans.length) {
      setPlan(null);
      return;
    }
    const detail = await api.get(`/api/plans/${plans[0].id}`);
    setPlan(detail);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadPlan()
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const created = await api.post('/api/plans/generate', {});
      setPlan(created);
      await onChanged?.();
      if (created.missing > 0) {
        setNotice(
          `Semana generada desde tu recetario. Faltan ${created.missing} recetas activas para variar más.`
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onFeedback = async (meal, rating) => {
    try {
      const updated = await api.put(`/api/meals/${meal.id}/feedback`, { rating });
      setPlan((prev) => ({
        ...prev,
        meals: prev.meals.map((m) => (m.id === updated.id ? updated : m)),
      }));
      if (rating === 'down') setBanMeal(updated);
      if (rating === 'up') await onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateMeal = async (meal, patch) => {
    const updated = await api.put(`/api/meals/${meal.id}`, patch);
    setPlan((prev) => ({
      ...prev,
      meals: prev.meals.map((m) => (m.id === updated.id ? updated : m)),
    }));
  };

  const saveMeal = async (meal) => {
    await api.post(`/api/meals/${meal.id}/save`, {});
    await onChanged?.();
  };

  const saveWeek = async () => {
    if (busy || !plan?.meals?.length) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await Promise.all(plan.meals.map((m) => api.post(`/api/meals/${m.id}/save`, {})));
      setNotice('Semana guardada en tu recetario como activas');
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSwapped = async (updated) => {
    setPlan((prev) => ({
      ...prev,
      meals: prev.meals.map((m) => (m.id === updated.id ? updated : m)),
    }));
  };

  if (loading) return <Spinner />;

  const coverage = state?.recipeCoverage || {};
  const totalActive = Object.values(coverage).reduce((a, b) => a + b, 0);
  const poolTarget = state?.poolTarget ?? 30;

  return (
    <div className="flex flex-col gap-3.5">
      {error && <Banner variant="err">{error}</Banner>}
      {notice && <Banner variant="ok">{notice}</Banner>}

      <Card
        title={plan ? `Semana del ${plan.week_start}` : 'Sin plan'}
        action={
          <div className="flex gap-2">
            {plan && (
              <button type="button" onClick={saveWeek} disabled={busy} className={BTN_GHOST}>
                Guardar semana
              </button>
            )}
            <button type="button" onClick={generate} disabled={busy} className={BTN_GHOST}>
              {busy ? 'Generando…' : plan ? 'Regenerar' : 'Generar semana'}
            </button>
          </div>
        }
      >
        {plan ? (
          <p className="text-xs text-white/55">
            Fase {plan.phase} · {plan.target_calories} kcal · P {plan.protein_g} C {plan.carbs_g} G{' '}
            {plan.fat_g}
            {plan.notes ? ` · ${plan.notes}` : ''}
          </p>
        ) : (
          <p className="py-4 text-center text-sm text-white/50">
            Aún no tienes un plan. Genera tu primera semana de comidas.
          </p>
        )}
        <p className="mt-2 text-xs text-white/40">
          Recetario activo: {totalActive} receta{totalActive === 1 ? '' : 's'} (meta {poolTarget}) ·
          gestiona tus recetas en la pestaña Recetario.
        </p>
      </Card>

      {plan &&
        DAY_NAMES.map((dayName, day) => {
          const dayMeals = (plan.meals || [])
            .filter((m) => m.day === day)
            .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
          if (dayMeals.length === 0) return null;
          return (
            <Card key={day} title={dayName}>
              <ul className="flex flex-col gap-2">
                {dayMeals.map((meal) => (
                  <MealRow
                    key={meal.id}
                    meal={meal}
                    onFeedback={onFeedback}
                    onBan={setBanMeal}
                    onSwap={setSwapMeal}
                    onSave={saveMeal}
                    onUpdate={updateMeal}
                  />
                ))}
              </ul>
            </Card>
          );
        })}

      <BanModal meal={banMeal} onClose={() => setBanMeal(null)} onDone={onChanged} />
      <SwapModal meal={swapMeal} onClose={() => setSwapMeal(null)} onSwapped={onSwapped} />
    </div>
  );
}
