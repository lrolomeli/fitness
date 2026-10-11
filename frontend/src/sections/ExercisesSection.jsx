import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Banner from '../components/ui/Banner';
import Spinner from '../components/ui/Spinner';
import Collapsible from '../components/ui/Collapsible';
import ExerciseForm from '../components/ExerciseForm';
import { api } from '../lib/api';
import { BTN, BTN_GHOST, BTN_DANGER, BLOCK_LABELS, BLOCK_ORDER } from '../lib/ui';

function ExerciseRow({ exercise, actions }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="break-words text-sm text-white">{exercise.name}</p>
        <p className="text-xs text-white/45">
          {BLOCK_LABELS[exercise.block] || exercise.block}
          {exercise.equipment ? ` · ${exercise.equipment}` : ''}
          {exercise.source ? ` · ${exercise.source}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">{actions}</div>
    </li>
  );
}

export default function ExercisesSection({ state, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = async () => setData(await api.get('/api/exercises'));

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
      const res = await api.post('/api/exercises/proposals', {});
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

  const setStatus = async (exercise, status) => {
    setError('');
    setNotice('');
    try {
      await api.patch(`/api/exercises/${exercise.id}/status`, { status });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (exercise) => {
    if (!window.confirm(`¿Eliminar «${exercise.name}»? Esta acción no se puede deshacer.`)) return;
    setError('');
    setNotice('');
    try {
      await api.delete(`/api/exercises/${exercise.id}`);
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

  const activeByBlock = BLOCK_ORDER.reduce((acc, block) => {
    acc[block] = active.filter((ex) => ex.block === block);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3.5">
      {error && <Banner variant="err">{error}</Banner>}
      {notice && <Banner variant="ok">{notice}</Banner>}
      {missing > 0 && (
        <Banner variant="warn">
          Te faltan {missing} ejercicio{missing === 1 ? '' : 's'} activo{missing === 1 ? '' : 's'}{' '}
          para llegar a {target}.
        </Banner>
      )}

      <Card
        title={`Catálogo de ejercicios · ${totalActive}/${target}`}
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
          {BLOCK_ORDER.map((block) => (
            <span
              key={block}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[0.7rem] text-white/60"
            >
              {BLOCK_LABELS[block]} {coverage[block] || 0}/{targets[block] || '?'}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/40">
          La rutina se arma solo con estos ejercicios activos, según el split de tu fase.
        </p>
      </Card>

      {BLOCK_ORDER.map((block) => {
        const blockExercises = activeByBlock[block];
        if (!blockExercises.length) return null;
        return (
          <Card key={block} title={BLOCK_LABELS[block]}>
            <ul className="flex flex-col gap-2">
              {blockExercises.map((ex) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => setStatus(ex, 'disabled')}
                        className={BTN_GHOST}
                      >
                        Deshabilitar
                      </button>
                      <button type="button" onClick={() => remove(ex)} className={BTN_DANGER}>
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
            {proposed.map((ex) => (
              <ExerciseRow
                key={ex.id}
                exercise={ex}
                actions={
                  <>
                    <button type="button" onClick={() => setStatus(ex, 'active')} className={BTN_GHOST}>
                      Aprobar
                    </button>
                    <button type="button" onClick={() => remove(ex)} className={BTN_DANGER}>
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
        <Collapsible title="Deshabilitados" subtitle={`${disabled.length} ocultos`}>
          <ul className="flex flex-col gap-2">
            {disabled.map((ex) => (
              <ExerciseRow
                key={ex.id}
                exercise={ex}
                actions={
                  <>
                    <button type="button" onClick={() => setStatus(ex, 'active')} className={BTN_GHOST}>
                      Reactivar
                    </button>
                    <button type="button" onClick={() => remove(ex)} className={BTN_DANGER}>
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
        <ExerciseForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setNotice('Ejercicio agregado como propuesta');
            refresh();
          }}
        />
      )}
    </div>
  );
}
