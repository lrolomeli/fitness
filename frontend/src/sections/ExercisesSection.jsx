import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Banner from '../components/ui/Banner';
import Spinner from '../components/ui/Spinner';
import Collapsible from '../components/ui/Collapsible';
import ExerciseForm from '../components/ExerciseForm';
import ExerciseRecordModal from '../components/ExerciseRecordModal';
import MuscleGroupsModal from '../components/MuscleGroupsModal';
import { api } from '../lib/api';
import {
  BTN,
  BTN_GHOST,
  BTN_DANGER,
  INPUT,
  BLOCK_LABELS,
  BLOCK_ORDER,
  MEDIA_LABELS,
  formatPrescription,
} from '../lib/ui';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function ExerciseRow({ exercise, actions, labels }) {
  const prescription = formatPrescription(exercise);
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="break-words text-sm text-white">{exercise.name}</p>
        <p className="text-xs text-white/45">
          {labels[exercise.block] || exercise.block}
          {exercise.equipment ? ` · ${exercise.equipment}` : ''}
          {exercise.source ? ` · ${exercise.source}` : ''}
        </p>
        {prescription && <p className="text-xs text-white/55">{prescription}</p>}
        {exercise.notes && <p className="text-xs text-white/40">{exercise.notes}</p>}
        {exercise.media?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {exercise.media.map((item, index) => (
              <a
                key={`${item.url}-${index}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-[0.65rem] text-white/80 hover:bg-accent/25"
              >
                {MEDIA_LABELS[item.type] || 'Enlace'}
              </a>
            ))}
          </div>
        )}
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
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [recordTarget, setRecordTarget] = useState(null);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

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

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (exercise) => {
    setEditing(exercise);
    setFormOpen(true);
  };

  const renderActions = (exercise, mode) => (
    <>
      {mode === 'active' && (
        <button type="button" onClick={() => setRecordTarget(exercise)} className={BTN_GHOST}>
          Peso / récord
        </button>
      )}
      <button type="button" onClick={() => openEdit(exercise)} className={BTN_GHOST}>
        Editar
      </button>
      {mode === 'active' && (
        <button type="button" onClick={() => setStatus(exercise, 'disabled')} className={BTN_GHOST}>
          Deshabilitar
        </button>
      )}
      {mode === 'proposed' && (
        <button type="button" onClick={() => setStatus(exercise, 'active')} className={BTN_GHOST}>
          Aprobar
        </button>
      )}
      {mode === 'disabled' && (
        <button type="button" onClick={() => setStatus(exercise, 'active')} className={BTN_GHOST}>
          Reactivar
        </button>
      )}
      <button type="button" onClick={() => remove(exercise)} className={BTN_DANGER}>
        Eliminar
      </button>
    </>
  );

  if (loading) return <Spinner />;

  const coverage = data?.coverage || {};
  const targets = data?.targets || {};
  const target = data?.poolTarget ?? 30;
  const totalActive = Object.values(coverage).reduce((a, b) => a + b, 0);
  const missing = Math.max(0, target - totalActive);
  const active = data?.active || [];
  const proposed = data?.proposed || [];
  const disabled = data?.disabled || [];
  const groups = data?.groups?.length
    ? data.groups
    : BLOCK_ORDER.map((key) => ({
        key,
        label: BLOCK_LABELS[key],
        target: targets[key] || 0,
      }));
  const groupKeys = groups.map((group) => group.key);
  const labels = groups.reduce((acc, group) => {
    acc[group.key] = group.label;
    return acc;
  }, {});
  const counts = [...active, ...proposed, ...disabled].reduce((acc, exercise) => {
    acc[exercise.block] = (acc[exercise.block] || 0) + 1;
    return acc;
  }, {});

  const searchTerm = normalizeText(search);
  const matchesSearch = (exercise) => {
    if (!searchTerm) return true;
    return [exercise.name, exercise.equipment, exercise.notes, labels[exercise.block]].some(
      (value) => normalizeText(value).includes(searchTerm)
    );
  };
  const searchMatched = active.filter(matchesSearch);
  const filteredActive =
    groupFilter === 'all'
      ? searchMatched
      : searchMatched.filter((exercise) => exercise.block === groupFilter);
  const hasFilters = Boolean(searchTerm) || groupFilter !== 'all';
  const countForGroup = (block) => searchMatched.filter((exercise) => exercise.block === block).length;
  const clearFilters = () => {
    setSearch('');
    setGroupFilter('all');
  };
  const chipClass = (isActive) =>
    `rounded-full border px-2.5 py-1 text-[0.7rem] transition-colors ${
      isActive
        ? 'border-accent/60 bg-accent/30 text-white'
        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
    }`;

  const activeByBlock = groupKeys.reduce((acc, block) => {
    acc[block] = filteredActive.filter((ex) => ex.block === block);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3.5">
      {error && <Banner variant="err">{error}</Banner>}
      {notice && <Banner variant="ok">{notice}</Banner>}
      {missing > 0 && (
        <Banner variant="warn">
          Te faltan {missing} ejercicio{missing === 1 ? '' : 's'} activo{missing === 1 ? '' : 's'}{' '}
          para la meta mínima de {target} (sirve solo para variar más).
        </Banner>
      )}

      <Card
        title={
          hasFilters
            ? `Catálogo activo · ${filteredActive.length} de ${active.length}`
            : `Catálogo activo · ${totalActive} ejercicio${totalActive === 1 ? '' : 's'}`
        }
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGroupsOpen(true)}
              disabled={busy}
              className={BTN_GHOST}
            >
              Grupos
            </button>
            <button type="button" onClick={openCreate} disabled={busy} className={BTN_GHOST}>
              Agregar
            </button>
            <button type="button" onClick={generate} disabled={busy} className={BTN}>
              {busy ? 'Generando…' : 'Propuestas IA'}
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {groups.map((group) => {
            const have = coverage[group.key] || 0;
            const goal = targets[group.key] || group.target || 0;
            return (
              <span
                key={group.key}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[0.7rem] text-white/60"
              >
                {group.label} {have}
                <span className="text-white/35"> · meta {goal || '?'}</span>
                {goal > 0 && have >= goal ? ' ✓' : ''}
              </span>
            );
          })}
        </div>

        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
          <div className="flex items-center gap-2">
            <input
              type="search"
              className={`${INPUT} py-2`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, grupo, equipo o notas…"
              aria-label="Buscar ejercicios"
            />
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={`${BTN_GHOST} shrink-0`}>
                Limpiar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGroupFilter('all')}
              aria-pressed={groupFilter === 'all'}
              className={chipClass(groupFilter === 'all')}
            >
              Todos <span className="text-white/45">{searchMatched.length}</span>
            </button>
            {groups.map((group) => {
              const groupCount = countForGroup(group.key);
              const selected = groupFilter === group.key;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setGroupFilter(group.key)}
                  disabled={!selected && groupCount === 0}
                  aria-pressed={selected}
                  className={`${chipClass(selected)} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {group.label} <span className="text-white/45">{groupCount}</span>
                </button>
              );
            })}
          </div>
          {hasFilters && (
            <p className="text-[0.7rem] text-white/40">
              Mostrando {filteredActive.length} de {active.length} ejercicio
              {active.length === 1 ? '' : 's'} activo{active.length === 1 ? '' : 's'}.
            </p>
          )}
        </div>

        <p className="mt-2 text-xs text-white/40">
          Aquí guardas nombre, grupo muscular, series, repeticiones o tiempo y enlaces. Luego creas
          rutinas eligiendo de este catálogo.
        </p>
      </Card>

      {groupKeys.map((block) => {
        const blockExercises = activeByBlock[block];
        if (!blockExercises.length) return null;
        return (
          <Card key={block} title={labels[block] || block}>
            <ul className="flex flex-col gap-2">
              {blockExercises.map((ex) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  labels={labels}
                  actions={renderActions(ex, 'active')}
                />
              ))}
            </ul>
          </Card>
        );
      })}

      {filteredActive.length === 0 && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-white/45">
              {active.length === 0
                ? 'Aún no tienes ejercicios activos en el catálogo.'
                : 'Ningún ejercicio coincide con los filtros.'}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={BTN_GHOST}>
                Limpiar filtros
              </button>
            )}
          </div>
        </Card>
      )}

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
                labels={labels}
                actions={renderActions(ex, 'proposed')}
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
                labels={labels}
                actions={renderActions(ex, 'disabled')}
              />
            ))}
          </ul>
        </Collapsible>
      )}

      {formOpen && (
        <ExerciseForm
          exercise={editing}
          groups={groups}
          onGroupsChanged={load}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setNotice(editing ? 'Ejercicio actualizado' : 'Ejercicio agregado al catálogo');
            refresh();
          }}
        />
      )}

      {groupsOpen && (
        <MuscleGroupsModal
          groups={groups}
          counts={counts}
          onClose={() => setGroupsOpen(false)}
          onChanged={refresh}
        />
      )}

      {recordTarget && (
        <ExerciseRecordModal
          exercise={recordTarget}
          onClose={() => setRecordTarget(null)}
          onSaved={() => refresh()}
        />
      )}
    </div>
  );
}
