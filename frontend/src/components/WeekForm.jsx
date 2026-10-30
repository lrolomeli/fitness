import { useState } from 'react';
import { api } from '../lib/api';
import { BTN, BTN_GHOST, INPUT, LABEL, DAY_NAMES } from '../lib/ui';

function daysFromWeek(week) {
  return DAY_NAMES.map((_, day) => {
    const found = (week?.days || []).find((item) => Number(item.day) === day);
    return {
      day,
      routine_id: found?.routine_id ? String(found.routine_id) : '',
      is_rest: !found?.routine_id,
    };
  });
}

export default function WeekForm({ week, routines, onClose, onSaved }) {
  const editing = Boolean(week?.id);
  const [name, setName] = useState(week?.name || '');
  const [days, setDays] = useState(() => daysFromWeek(week));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setDayRoutine = (day, routineId) => {
    setDays((prev) =>
      prev.map((item) =>
        item.day === day
          ? { ...item, routine_id: routineId, is_rest: !routineId }
          : item
      )
    );
  };

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) {
      setError('El nombre de la semana es obligatorio');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        days: days.map((item) => ({
          day: item.day,
          routine_id: item.routine_id ? Number(item.routine_id) : null,
          is_rest: !item.routine_id,
        })),
      };
      const saved = editing
        ? await api.put(`/api/training-weeks/${week.id}`, payload)
        : await api.post('/api/training-weeks', payload);
      await onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#1a1020] p-5 sm:rounded-3xl">
        <h3 className="text-base font-semibold text-white">
          {editing ? 'Editar semana' : 'Nueva semana'}
        </h3>
        <p className="mt-1 text-xs text-white/55">
          Asigna una rutina a cada día. Deja «Descanso» en los días que no entrenas.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className={LABEL}>
            Nombre de la semana
            <input
              className={INPUT}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="P. ej. Semana relax, Semana fuerza"
              disabled={busy}
            />
          </label>

          <div className="flex flex-col gap-2">
            {days.map((item) => (
              <div key={item.day} className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
                <span className="text-sm text-white/70">{DAY_NAMES[item.day]}</span>
                <select
                  value={item.routine_id}
                  onChange={(e) => setDayRoutine(item.day, e.target.value)}
                  className={INPUT}
                  disabled={busy}
                >
                  <option value="" className="bg-[#1a1020]">
                    Descanso
                  </option>
                  {routines.map((routine) => (
                    <option key={routine.id} value={routine.id} className="bg-[#1a1020]">
                      {routine.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {routines.length === 0 && (
            <p className="text-xs text-warn">
              No tienes rutinas. Crea una primero en la pestaña Rutinas.
            </p>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={busy} className={BTN_GHOST}>
              Cancelar
            </button>
            <button type="button" onClick={submit} disabled={busy} className={BTN}>
              {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear semana'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
