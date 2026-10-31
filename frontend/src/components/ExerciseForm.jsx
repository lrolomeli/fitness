import { useState } from 'react';
import { api } from '../lib/api';
import { BTN, BTN_GHOST, BTN_DANGER, INPUT, LABEL, BLOCK_LABELS, BLOCK_ORDER } from '../lib/ui';

const MEDIA_LABELS = { link: 'Enlace', image: 'Imagen', video: 'Video' };

const FALLBACK_GROUPS = BLOCK_ORDER.map((key) => ({ key, label: BLOCK_LABELS[key] }));

function emptyForm(block) {
  return {
    block,
    name: '',
    equipment: '',
    sets: '3',
    reps: '8-12',
    duration_seconds: '',
    notes: '',
    media: [],
  };
}

function formFromExercise(exercise, defaultBlock) {
  if (!exercise) return emptyForm(defaultBlock);
  return {
    block: exercise.block || defaultBlock,
    name: exercise.name || '',
    equipment: exercise.equipment || '',
    sets: exercise.sets ?? '',
    reps: exercise.reps ?? '',
    duration_seconds: exercise.duration_seconds ?? '',
    notes: exercise.notes ?? '',
    media: Array.isArray(exercise.media) ? exercise.media : [],
  };
}

export default function ExerciseForm({
  exercise,
  groups = FALLBACK_GROUPS,
  onGroupsChanged,
  onClose,
  onSaved,
}) {
  const availableGroups = groups.length ? groups : FALLBACK_GROUPS;
  const [form, setForm] = useState(() =>
    formFromExercise(exercise, availableGroups[0]?.key || 'empuje')
  );
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const editing = Boolean(exercise?.id);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addMedia = () => update('media', [...form.media, { type: 'link', url: '' }]);
  const updateMedia = (index, key, value) =>
    update(
      'media',
      form.media.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  const removeMedia = (index) => update('media', form.media.filter((_, i) => i !== index));

  const submit = async () => {
    if (busy) return;
    if (!form.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let block = form.block;
      if (block === '__new__') {
        const label = newGroupLabel.trim();
        if (!label) {
          setError('Escribe el nombre del nuevo grupo muscular');
          return;
        }
        const group = await api.post('/api/muscle-groups', { label });
        block = group.key;
        await onGroupsChanged?.();
      }

      const payload = {
        block,
        name: form.name.trim(),
        equipment: form.equipment,
        sets: form.sets,
        reps: form.reps,
        duration_seconds: form.duration_seconds,
        notes: form.notes,
        media: form.media.filter((item) => String(item.url || '').trim()),
      };

      const saved = editing
        ? await api.patch(`/api/exercises/${exercise.id}`, payload)
        : await api.post('/api/exercises', { ...payload, status: 'active' });

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
          {editing ? 'Editar ejercicio' : 'Agregar ejercicio'}
        </h3>
        <p className="mt-1 text-xs text-white/55">
          {editing
            ? 'Actualiza los datos del ejercicio. Los cambios se reflejan en el catálogo.'
            : 'Se guarda en tu catálogo activo para que puedas usarlo en tus rutinas de inmediato.'}
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className={LABEL}>
            Grupo muscular
            <select
              className={INPUT}
              value={form.block}
              onChange={(e) => update('block', e.target.value)}
              disabled={busy}
            >
              {availableGroups.map((group) => (
                <option key={group.key} value={group.key} className="bg-[#1a1020]">
                  {group.label}
                </option>
              ))}
              <option value="__new__" className="bg-[#1a1020]">
                ＋ Nuevo grupo muscular…
              </option>
            </select>
          </label>

          {form.block === '__new__' && (
            <label className={LABEL}>
              Nombre del nuevo grupo
              <input
                className={INPUT}
                value={newGroupLabel}
                onChange={(e) => setNewGroupLabel(e.target.value)}
                placeholder="P. ej. Hombro, Espalda, Glúteo…"
                disabled={busy}
              />
            </label>
          )}

          <label className={LABEL}>
            Nombre
            <input
              className={INPUT}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="P. ej. Press banca con barra"
              disabled={busy}
            />
          </label>

          <label className={LABEL}>
            Equipo (opcional)
            <input
              className={INPUT}
              value={form.equipment}
              onChange={(e) => update('equipment', e.target.value)}
              placeholder="Barra, mancuernas, polea, máquina…"
              disabled={busy}
            />
          </label>

          <div className="grid grid-cols-3 gap-2">
            <label className={LABEL}>
              Series
              <input
                type="number"
                min="0"
                className={INPUT}
                value={form.sets}
                onChange={(e) => update('sets', e.target.value)}
                placeholder="3"
                disabled={busy}
              />
            </label>
            <label className={LABEL}>
              Repeticiones
              <input
                className={INPUT}
                value={form.reps}
                onChange={(e) => update('reps', e.target.value)}
                placeholder="8-12"
                disabled={busy}
              />
            </label>
            <label className={LABEL}>
              Tiempo (seg)
              <input
                type="number"
                min="0"
                className={INPUT}
                value={form.duration_seconds}
                onChange={(e) => update('duration_seconds', e.target.value)}
                placeholder="60"
                disabled={busy}
              />
            </label>
          </div>
          <p className="-mt-1 text-[0.7rem] text-white/40">
            Usa repeticiones o tiempo según el ejercicio (puedes dejar uno vacío).
          </p>

          <label className={LABEL}>
            Detalles / notas
            <textarea
              className={`${INPUT} min-h-[72px] resize-y`}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Técnica, RIR, recordatorios…"
              disabled={busy}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-white/70">Enlaces, imágenes o videos</span>
            {form.media.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <select
                  value={item.type || 'link'}
                  onChange={(e) => updateMedia(index, 'type', e.target.value)}
                  disabled={busy}
                  className={`${INPUT} w-24 shrink-0`}
                >
                  {Object.entries(MEDIA_LABELS).map(([value, label]) => (
                    <option key={value} value={value} className="bg-[#1a1020]">
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  className={INPUT}
                  value={item.url || ''}
                  onChange={(e) => updateMedia(index, 'url', e.target.value)}
                  placeholder="https://…"
                  disabled={busy}
                />
                <button type="button" onClick={() => removeMedia(index)} className={BTN_DANGER}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addMedia} disabled={busy} className={BTN_GHOST}>
              + Agregar enlace
            </button>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={busy} className={BTN_GHOST}>
              Cancelar
            </button>
            <button type="button" onClick={submit} disabled={busy} className={BTN}>
              {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
