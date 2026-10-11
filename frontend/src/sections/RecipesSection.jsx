import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Banner from '../components/ui/Banner';
import Spinner from '../components/ui/Spinner';
import Collapsible from '../components/ui/Collapsible';
import RecipeForm from '../components/RecipeForm';
import BanModal from '../components/BanModal';
import { api } from '../lib/api';
import { BTN, BTN_GHOST, BTN_DANGER, SLOT_LABELS, SLOT_ORDER } from '../lib/ui';

function RecipeRow({ recipe, actions }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="break-words text-sm text-white">{recipe.title}</p>
        <p className="text-xs text-white/45">
          {SLOT_LABELS[recipe.slot] || recipe.slot} · {recipe.kcal} kcal · P {recipe.protein_g} C{' '}
          {recipe.carbs_g} G {recipe.fat_g}
        </p>
        {recipe.ingredients?.length > 0 && (
          <p className="mt-1 text-xs text-white/35">{recipe.ingredients.join(', ')}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">{actions}</div>
    </li>
  );
}

export default function RecipesSection({ state, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [banRecipe, setBanRecipe] = useState(null);

  const load = async () => setData(await api.get('/api/recipes'));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load()
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

  const refresh = async () => {
    await load();
    await onChanged?.();
  };

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await api.post('/api/recipes/proposals', {});
      await refresh();
      setNotice(
        res.created?.length
          ? `Se generaron ${res.created.length} propuestas`
          : res.message || 'No se generaron propuestas'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (recipe, status) => {
    setError('');
    setNotice('');
    try {
      await api.patch(`/api/recipes/${recipe.id}/status`, { status });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (recipe) => {
    if (!window.confirm(`¿Eliminar «${recipe.title}»? Esta acción no se puede deshacer.`)) return;
    setError('');
    setNotice('');
    try {
      await api.delete(`/api/recipes/${recipe.id}`);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <Spinner />;

  const coverage = data?.coverage || {};
  const targets = data?.targets || {};
  const target = data?.poolTarget ?? 30;
  const totalActive = Object.values(coverage).reduce((a, b) => a + b, 0);
  const missing = Math.max(0, target - totalActive);
  const active = data?.active || [];
  const proposed = data?.proposed || [];
  const disabled = data?.disabled || [];

  const activeBySlot = SLOT_ORDER.reduce((acc, slot) => {
    acc[slot] = active.filter((r) => r.slot === slot);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3.5">
      {error && <Banner variant="err">{error}</Banner>}
      {notice && <Banner variant="ok">{notice}</Banner>}
      {missing > 0 && (
        <Banner variant="warn">
          Te faltan {missing} receta{missing === 1 ? '' : 's'} activa{missing === 1 ? '' : 's'} para
          llegar a {target}.
        </Banner>
      )}

      <Card
        title={`Recetario curado · ${totalActive}/${target}`}
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(true)} disabled={busy} className={BTN_GHOST}>
              Agregar
            </button>
            <button type="button" onClick={generate} disabled={busy || missing === 0} className={BTN}>
              {busy ? 'Generando…' : 'Propuestas IA'}
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {SLOT_ORDER.map((slot) => (
            <span
              key={slot}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[0.7rem] text-white/60"
            >
              {SLOT_LABELS[slot]} {coverage[slot] || 0}/{targets[slot] || '?'}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/40">
          La dieta semanal se arma solo con estas recetas activas.
        </p>
      </Card>

      {SLOT_ORDER.map((slot) => {
        const slotRecipes = activeBySlot[slot];
        if (!slotRecipes.length) return null;
        return (
          <Card key={slot} title={SLOT_LABELS[slot]}>
            <ul className="flex flex-col gap-2">
              {slotRecipes.map((r) => (
                <RecipeRow
                  key={r.id}
                  recipe={r}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => setStatus(r, 'disabled')}
                        className={BTN_GHOST}
                      >
                        Deshabilitar
                      </button>
                      <button type="button" onClick={() => remove(r)} className={BTN_DANGER}>
                        Eliminar
                      </button>
                    </>
                  }
                />
              ))}
            </ul>
          </Card>
        );
      })}

      <Collapsible
        title="Propuestas"
        subtitle={`${proposed.length} por aprobar`}
        defaultOpen={proposed.length > 0}
      >
        {proposed.length === 0 ? (
          <p className="py-3 text-center text-sm text-white/45">Sin propuestas pendientes.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {proposed.map((r) => (
              <RecipeRow
                key={r.id}
                recipe={r}
                actions={
                  <>
                    <button type="button" onClick={() => setStatus(r, 'active')} className={BTN_GHOST}>
                      Aprobar
                    </button>
                    <button type="button" onClick={() => setBanRecipe(r)} className={BTN_DANGER}>
                      No me gusta
                    </button>
                    <button type="button" onClick={() => remove(r)} className={BTN_DANGER}>
                      Eliminar
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </Collapsible>

      {disabled.length > 0 && (
        <Collapsible title="Deshabilitadas" subtitle={`${disabled.length} ocultas`}>
          <ul className="flex flex-col gap-2">
            {disabled.map((r) => (
              <RecipeRow
                key={r.id}
                recipe={r}
                actions={
                  <>
                    <button type="button" onClick={() => setStatus(r, 'active')} className={BTN_GHOST}>
                      Reactivar
                    </button>
                    <button type="button" onClick={() => remove(r)} className={BTN_DANGER}>
                      Eliminar
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        </Collapsible>
      )}

      {showForm && (
        <RecipeForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setNotice('Receta agregada como propuesta');
            refresh();
          }}
        />
      )}

      <BanModal
        meal={banRecipe}
        endpoint={banRecipe ? `/api/recipes/${banRecipe.id}/ban` : undefined}
        onClose={() => setBanRecipe(null)}
        onDone={() => {
          setNotice('Vetado: no se volverá a proponer');
          refresh();
        }}
      />
    </div>
  );
}
