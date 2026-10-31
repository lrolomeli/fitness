import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BTN, BTN_GHOST, BTN_DANGER, INPUT, LABEL } from '../lib/ui';

export default function MuscleGroupsModal({ groups, counts = {}, onClose, onChanged }) {
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(groups.map((group) => [group.id, group.label]))
  );
  const [newLabel, setNewLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [reassign, setReassign] = useState('');

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      groups.forEach((group) => {
        if (!(group.id in next)) next[group.id] = group.label;
      });
      return next;
    });
  }, [groups]);

  const countFor = (group) => Number(counts[group.key] || 0);

  const create = async () => {
    if (busy) return;
    const label = newLabel.trim();
    if (!label) {
      setError('Escribe un nombre para el nuevo grupo');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/api/muscle-groups', { label });
      setNewLabel('');
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveLabel = async (group) => {
    if (busy) return;
    const label = String(drafts[group.id] || '').trim();
    if (!label) {
      setError('El nombre del grupo no puede quedar vacío');
      return;
    }
    if (label === group.label) return;
    setBusy(true);
    setError('');
    try {
      await api.patch(`/api/muscle-groups/${group.id}`, { label });
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeGroup = async (group, reassignKey = '') => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const suffix = reassignKey ? `?reassign=${encodeURIComponent(reassignKey)}` : '';
      await api.delete(`/api/muscle-groups/${group.id}${suffix}`);
      setDeleting(null);
      setReassign('');
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const requestDelete = (group) => {
    setError('');
    if (countFor(group) > 0) {
      setDeleting(group);
      setReassign('');
      return;
    }
    if (window.confirm(`¿Eliminar el grupo «${group.label}»?`)) {
      removeGroup(group);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#1a1020] p-5 sm:rounded-3xl">
        <h3 className="text-base font-semibold text-white">Grupos musculares</h3>
        <p className="mt-1 text-xs text-white/55">
          Agrega, renombra o elimina grupos. Si un grupo tiene ejercicios, elige a cuál moverlos
          antes de borrarlo.
        </p>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        {deleting && (
          <div className="mt-4 rounded-xl border border-warn/30 bg-warn/10 p-3">
            <p className="text-sm text-white">
              «{deleting.label}» tiene {countFor(deleting)} ejercicio
              {countFor(deleting) === 1 ? '' : 's'}.
            </p>
            <label className={`${LABEL} mt-2`}>
              Mover esos ejercicios a
              <select
                className={INPUT}
                value={reassign}
                onChange={(e) => setReassign(e.target.value)}
                disabled={busy}
              >
                <option value="" className="bg-[#1a1020]">
                  Elige un grupo…
                </option>
                {groups
                  .filter((group) => group.id !== deleting.id)
                  .map((group) => (
                    <option key={group.id} value={group.key} className="bg-[#1a1020]">
                      {group.label}
                    </option>
                  ))}
              </select>
            </label>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleting(null);
                  setReassign('');
                }}
                disabled={busy}
                className={BTN_GHOST}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => removeGroup(deleting, reassign)}
                disabled={busy || !reassign}
                className={BTN_DANGER}
              >
                Mover y eliminar
              </button>
            </div>
          </div>
        )}

        <ul className="mt-4 flex flex-col gap-2">
          {groups.map((group) => (
            <li
              key={group.id}
              className="rounded-xl border border-white/10 bg-white/5 p-2.5"
            >
              <div className="flex items-center gap-2">
                <input
                  className={INPUT}
                  value={drafts[group.id] ?? group.label}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [group.id]: e.target.value }))
                  }
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => saveLabel(group)}
                  disabled={busy || String(drafts[group.id] ?? '').trim() === group.label}
                  className={BTN_GHOST}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(group)}
                  disabled={busy || groups.length <= 1}
                  className={BTN_DANGER}
                >
                  Eliminar
                </button>
              </div>
              <p className="mt-1 text-[0.68rem] text-white/40">
                {countFor(group)} ejercicio{countFor(group) === 1 ? '' : 's'} · meta{' '}
                {group.target || '?'}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <label className={LABEL}>
            Nuevo grupo muscular
            <div className="flex gap-2">
              <input
                className={INPUT}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') create();
                }}
                placeholder="P. ej. Hombro, Espalda, Glúteo…"
                disabled={busy}
              />
              <button type="button" onClick={create} disabled={busy} className={BTN}>
                Agregar
              </button>
            </div>
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} disabled={busy} className={BTN_GHOST}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
