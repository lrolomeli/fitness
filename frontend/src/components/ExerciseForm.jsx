import { useState } from 'react';
import { api } from '../lib/api';
import { isValidUrl, mediaHost, mediaPreview, normalizeUrl } from '../lib/media';
import {
  BTN,
  BTN_GHOST,
  BTN_DANGER,
  INPUT,
  LABEL,
  BLOCK_LABELS,
  BLOCK_ORDER,
  MEDIA_LABELS,
} from '../lib/ui';

const MEDIA_PLACEHOLDERS = {
  link: 'https://ejemplo.com/articulo',
  image: 'https://ejemplo.com/imagen.jpg',
  video: 'https://www.youtube.com/watch?v=…',
};

const FALLBACK_GROUPS = BLOCK_ORDER.map((key) => ({ key, label: BLOCK_LABELS[key] }));

function mediaBadge(type) {
  if (type === 'image') return 'IMG';
  if (type === 'video') return 'VID';
  return 'URL';
}

function MediaThumb({ src, type }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-12 w-16 shrink-0 rounded-lg border border-white/10 object-cover"
      />
    );
  }
  return (
    <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[0.6rem] uppercase tracking-wider text-white/35">
      {mediaBadge(type)}
    </span>
  );
}

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

  const addMedia = (type = 'link') => update('media', [...form.media, { type, url: '' }]);
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

    const cleanMedia = [];
    for (const item of form.media) {
      const url = normalizeUrl(item.url);
      if (!url) continue;
      if (!isValidUrl(url)) {
        setError(`El enlace «${url}» no es válido. Usa una URL http(s).`);
        return;
      }
      if (cleanMedia.some((entry) => entry.url === url)) continue;
      cleanMedia.push({ type: MEDIA_LABELS[item.type] ? item.type : 'link', url });
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
        media: cleanMedia,
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
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#1a1020] p-5 sm:rounded-3xl">
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

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-white/70">
                Enlaces y multimedia
                {form.media.length > 0 && (
                  <span className="ml-1.5 text-xs text-white/40">({form.media.length})</span>
                )}
              </span>
              <span className="text-[0.68rem] text-white/35">Opcional</span>
            </div>
            <p className="mt-1 text-[0.7rem] text-white/40">
              Agrega un video de YouTube, una imagen o cualquier enlace de referencia.
            </p>

            {form.media.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-xs text-white/35">
                Aún no agregaste videos, imágenes ni enlaces.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {form.media.map((item, index) => {
                  const type = MEDIA_LABELS[item.type] ? item.type : 'link';
                  const value = item.url || '';
                  const valid = !value.trim() || isValidUrl(value);
                  const preview = mediaPreview({ ...item, type });
                  return (
                    <li key={index} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(MEDIA_LABELS).map(([option, label]) => {
                            const selected = type === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => updateMedia(index, 'type', option)}
                                disabled={busy}
                                aria-pressed={selected}
                                className={`rounded-full border px-2.5 py-1 text-[0.68rem] transition-colors ${
                                  selected
                                    ? 'border-accent/60 bg-accent/25 text-white'
                                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedia(index)}
                          disabled={busy}
                          className={BTN_DANGER}
                          aria-label="Eliminar enlace"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="mt-2 flex items-start gap-2">
                        <MediaThumb key={`${preview}-${type}`} src={preview} type={type} />
                        <div className="min-w-0 flex-1">
                          <input
                            className={`${INPUT} py-2 ${valid ? '' : 'ring-1 ring-danger/70'}`}
                            value={value}
                            onChange={(e) => updateMedia(index, 'url', e.target.value)}
                            placeholder={MEDIA_PLACEHOLDERS[type]}
                            disabled={busy}
                            aria-label={`URL de ${MEDIA_LABELS[type].toLowerCase()}`}
                          />
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.68rem] text-white/40">
                            {!value.trim() ? (
                              <span>Pega la URL del {MEDIA_LABELS[type].toLowerCase()}.</span>
                            ) : valid ? (
                              <>
                                <span className="truncate">{mediaHost(value)}</span>
                                <a
                                  href={normalizeUrl(value)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-accent-soft hover:underline"
                                >
                                  Abrir ↗
                                </a>
                              </>
                            ) : (
                              <span className="text-danger">URL no válida</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addMedia('video')}
                disabled={busy}
                className={BTN_GHOST}
              >
                + Video
              </button>
              <button
                type="button"
                onClick={() => addMedia('image')}
                disabled={busy}
                className={BTN_GHOST}
              >
                + Imagen
              </button>
              <button
                type="button"
                onClick={() => addMedia('link')}
                disabled={busy}
                className={BTN_GHOST}
              >
                + Enlace
              </button>
            </div>
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
