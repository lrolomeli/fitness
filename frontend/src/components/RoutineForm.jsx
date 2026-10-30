import { useState } from 'react';
import { api } from '../lib/api';
import {
  BTN,
  BTN_GHOST,
  BTN_DANGER,
  INPUT,
  LABEL,
  BLOCK_LABELS,
  BLOCK_ORDER,
  formatPrescription,
} from '../lib/ui';

let keyCounter = 0;
const nextKey = () => `ex-${Date.now()}-${keyCounter++}`;

function fromRoutine(routine) {
  return (routine?.exercises || []).map((exercise) => ({
    _key: nextKey(),
    exercise_id: exercise.exercise_id ?? null,
    name: exercise.name || '',
    block: exercise.block || 'empuje',
    sets: exercise.sets ?? '',
    reps: exercise.reps ?? '',
    duration_seconds: exercise.duration_seconds ?? '',
    notes: exercise.notes ?? '',
  }));
}

export default function RoutineForm({ routine, catalog, onClose, onSaved }) {
  const editing = Boolean(routine?.id);
  const [form, setForm] = useState({
    name: routine?.name || '',
    description: routine?.description || '',
  });
  const [exercises, setExercises] = useState(() => fromRoutine(routine));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const updateExercise = (index, key, value) =>
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, [key]: value } : ex)));

  const removeExercise = (index) =>
    setExercises((prev) => prev.filter((_, i) => i !== index));

  const moveExercise = (index, direction) => {
    setExercises((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const addFromCatalog = (catalogId) => {
    const pick = catalog.find((c) => String(c.id) === String(catalogId));
    if (!pick) return;
    setExercises((prev) => [
      ...prev,
      {
        _key: nextKey(),
        exercise_id: pick.id,
        name: pick.name,
        block: pick.block,
        sets: pick.sets ?? 3,
        reps: pick.reps ?? (pick.duration_seconds ? '' : '8-12'),
        duration_seconds: pick.duration_seconds ?? '',
        notes: pick.notes ?? '',
      },
    ]);
  };

  const submit = async () => {
    if (busy) return;
    if (!form.name.trim()) {
      setError('El nombre de la rutina es obligatorio');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        exercises: exercises
          .filter((ex) => ex.name.trim())
          .map((ex) => ({
            exercise_id: ex.exercise_id,
            name: ex.name,
            block: ex.block,
            sets: ex.sets,
            reps: ex.reps,
            duration_seconds: ex.duration_seconds,
            notes: ex.notes,
          })),
      };
      const saved = editing
        ? await api.put(`/api/routines/${routine.id}`, payload)
        : await api.post('/api/routines', payload);
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
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#1a1020] p-5 sm:rounded-3xl">
        <h3 className="text-base font-semibold text-white">
          {editing ? 'Editar rutina' : 'Nueva rutina'}
        </h3>
        <p className="mt-1 text-xs text-white/55">
          Elige ejercicios de tu catálogo y define series, repeticiones o tiempo para esta rutina.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className={LABEL}>
            Nombre de la rutina
            <input
              className={INPUT}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="P. ej. Torso A, Pierna pesada, Full body"
              disabled={busy}
            />
          </label>

          <label className={LABEL}>
            Descripción (opcional)
            <input
              className={INPUT}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Enfoque, notas generales…"
              disabled={busy}
            />
          </label>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.72rem] uppercase tracking-[0.14em] text-white/55">
                Ejercicios ({exercises.length})
              </span>
            </div>

            {exercises.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/45">
                Aún no has agregado ejercicios a esta rutina.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {exercises.map((ex, index) => (
                  <li
                    key={ex._key}
                    className="rounded-xl border border-white/10 bg-white/5 p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{ex.name}</p>
                        <p className="text-[0.68rem] text-white/45">
                          {BLOCK_LABELS[ex.block] || ex.block}
                          {formatPrescription(ex) ? ` · ${formatPrescription(ex)}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => moveExercise(index, -1)}
                        disabled={busy || index === 0}
                        className={BTN_GHOST}
                        title="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveExercise(index, 1)}
                        disabled={busy || index === exercises.length - 1}
                        className={BTN_GHOST}
                        title="Bajar"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExercise(index)}
                        disabled={busy}
                        className={BTN_DANGER}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <label className="flex flex-col text-[0.6rem] uppercase tracking-wider text-white/45">
                        Series
                        <input
                          type="number"
                          min="0"
                          value={ex.sets}
                          onChange={(e) => updateExercise(index, 'sets', e.target.value)}
                          className={INPUT}
                          disabled={busy}
                        />
                      </label>
                      <label className="flex flex-col text-[0.6rem] uppercase tracking-wider text-white/45">
                        Reps
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                          className={INPUT}
                          disabled={busy}
                        />
                      </label>
                      <label className="flex flex-col text-[0.6rem] uppercase tracking-wider text-white/45">
                        Tiempo (seg)
                        <input
                          type="number"
                          min="0"
                          value={ex.duration_seconds}
                          onChange={(e) => updateExercise(index, 'duration_seconds', e.target.value)}
                          className={INPUT}
                          disabled={busy}
                        />
                      </label>
                    </div>
                    <label className="mt-1.5 flex flex-col text-[0.6rem] uppercase tracking-wider text-white/45">
                      Notas
                      <input
                        type="text"
                        value={ex.notes}
                        onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                        className={INPUT}
                        placeholder="Opcional"
                        disabled={busy}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <select
              value=""
              onChange={(e) => {
                addFromCatalog(e.target.value);
                e.target.value = '';
              }}
              className={`${INPUT} mt-3`}
              disabled={busy}
            >
              <option value="">＋ Agregar ejercicio del catálogo…</option>
              {BLOCK_ORDER.map((block) => {
                const items = catalog.filter((c) => c.block === block);
                if (!items.length) return null;
                return (
                  <optgroup key={block} label={BLOCK_LABELS[block]} className="bg-[#1a1020]">
                    {items.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#1a1020]">
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {catalog.length === 0 && (
              <p className="mt-2 text-xs text-warn">
                No tienes ejercicios activos. Agrega o aprueba ejercicios en la pestaña Ejercicios.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={busy} className={BTN_GHOST}>
              Cancelar
            </button>
            <button type="button" onClick={submit} disabled={busy} className={BTN}>
              {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear rutina'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
