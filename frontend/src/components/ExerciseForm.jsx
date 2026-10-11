import { useState } from 'react';
import { api } from '../lib/api';
import { BTN, BTN_GHOST, INPUT, LABEL, BLOCK_LABELS, BLOCK_ORDER } from '../lib/ui';

const emptyForm = { block: 'empuje', name: '', equipment: '' };

export default function ExerciseForm({ onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (!form.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await api.post('/api/exercises', {
        block: form.block,
        name: form.name,
        equipment: form.equipment,
        status: 'proposed',
      });
      await onSaved?.(created);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#1a1020] p-5 sm:rounded-3xl">
        <h3 className="text-base font-semibold text-white">Agregar ejercicio</h3>
        <p className="mt-1 text-xs text-white/55">
          Entra como propuesta. Apruébalo luego en el catálogo para usarlo en tu rutina.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className={LABEL}>
            Bloque muscular
            <select
              className={INPUT}
              value={form.block}
              onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))}
              disabled={busy}
            >
              {BLOCK_ORDER.map((block) => (
                <option key={block} value={block} className="bg-[#1a1020]">
                  {BLOCK_LABELS[block]}
                </option>
              ))}
            </select>
          </label>

          <label className={LABEL}>
            Nombre
            <input
              className={INPUT}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="P. ej. Press banca con barra"
              disabled={busy}
            />
          </label>

          <label className={LABEL}>
            Equipo (opcional)
            <input
              className={INPUT}
              value={form.equipment}
              onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
              placeholder="Barra, mancuernas, polea, máquina…"
              disabled={busy}
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={busy} className={BTN_GHOST}>
              Cancelar
            </button>
            <button type="button" onClick={submit} disabled={busy} className={BTN}>
              {busy ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
