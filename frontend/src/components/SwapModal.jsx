import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BTN, BTN_GHOST, INPUT, LABEL, SLOT_LABELS } from '../lib/ui';

const QUICK = ['Más ligero', 'Sin lácteos', 'Otro carbohidrato', 'Sin pescado'];

export default function SwapModal({ meal, onClose, onSwapped }) {
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setInstruction('');
    setError('');
    setBusy(false);
  }, [meal]);

  if (!meal) return null;

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api.post(`/api/meals/${meal.id}/swap`, {
        instruction: instruction.trim(),
      });
      await onSwapped?.(updated);
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
        <h3 className="text-base font-semibold text-white">Cambiar {SLOT_LABELS[meal.slot] || meal.slot}</h3>
        <p className="mt-1 text-xs text-white/55">
          Reemplaza «{meal.title}». Sin petición, se toma otra receta de tu recetario; con petición, la
          IA crea una nueva.
        </p>

        <label className={`${LABEL} mt-4`}>
          Petición para la IA (opcional)
          <textarea
            className={`${INPUT} min-h-[80px] resize-y`}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="P. ej. algo más ligero y sin lácteos"
            disabled={busy}
          />
        </label>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy}
              onClick={() => setInstruction(q)}
              className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-white/70 transition-colors hover:bg-white/10"
            >
              {q}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={BTN_GHOST}>
            Cancelar
          </button>
          <button type="button" onClick={confirm} disabled={busy} className={BTN}>
            {busy ? 'Cambiando…' : instruction.trim() ? 'Cambiar con IA' : 'Cambiar'}
          </button>
        </div>
      </div>
    </div>
  );
}
