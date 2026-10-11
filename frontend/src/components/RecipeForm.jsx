import { useState } from 'react';
import { api } from '../lib/api';
import { BTN, BTN_GHOST, INPUT, LABEL, SLOT_LABELS, SLOT_ORDER } from '../lib/ui';

const emptyForm = { slot: 'lunch', title: '', ingredients: '' };

export default function RecipeForm({ onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (!form.title.trim() || !form.ingredients.trim()) {
      setError('Título e ingredientes son obligatorios');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await api.post('/api/recipes', {
        slot: form.slot,
        title: form.title,
        ingredients: form.ingredients,
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
        <h3 className="text-base font-semibold text-white">Agregar receta</h3>
        <p className="mt-1 text-xs text-white/55">
          Entra como propuesta. Apruébala luego en el recetario para usarla en tu dieta.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className={LABEL}>
            Momento del día
            <select
              className={INPUT}
              value={form.slot}
              onChange={(e) => setForm((f) => ({ ...f, slot: e.target.value }))}
              disabled={busy}
            >
              {SLOT_ORDER.map((slot) => (
                <option key={slot} value={slot} className="bg-[#1a1020]">
                  {SLOT_LABELS[slot]}
                </option>
              ))}
            </select>
          </label>

          <label className={LABEL}>
            Título
            <input
              className={INPUT}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="P. ej. Bowl de pollo con arroz"
              disabled={busy}
            />
          </label>

          <label className={LABEL}>
            Ingredientes (uno por línea)
            <textarea
              className={`${INPUT} min-h-[100px] resize-y`}
              value={form.ingredients}
              onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
              placeholder={'170g pechuga de pollo\n150g arroz\n120g brócoli'}
              disabled={busy}
            />
          </label>

          <p className="text-xs text-white/40">Los macros se estiman automáticamente.</p>

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
