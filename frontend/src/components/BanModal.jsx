import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BTN, BTN_GHOST } from '../lib/ui';

export default function BanModal({ meal, onClose, onDone }) {
  const [selected, setSelected] = useState([]);
  const [whole, setWhole] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelected([]);
    setWhole(false);
    setError('');
  }, [meal]);

  if (!meal) return null;

  const toggle = (ingredient) => {
    setSelected((prev) =>
      prev.includes(ingredient) ? prev.filter((i) => i !== ingredient) : [...prev, ingredient]
    );
  };

  const confirm = async () => {
    if (busy) return;
    if (!whole && selected.length === 0) {
      setError('Selecciona al menos un ingrediente o veta el plato completo.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post(`/api/meals/${meal.id}/ban`, { whole, items: selected });
      await onDone?.();
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
        <h3 className="text-base font-semibold text-white">¿Qué no te gustó?</h3>
        <p className="mt-1 text-xs text-white/55">
          Se guardará como vetado para que la IA no lo vuelva a proponer.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {(meal.ingredients || []).map((ing) => (
            <label
              key={ing}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
            >
              <input
                type="checkbox"
                checked={selected.includes(ing)}
                onChange={() => toggle(ing)}
                disabled={whole || busy}
                className="h-4 w-4 accent-[#ff6b9d]"
              />
              {ing}
            </label>
          ))}
        </div>

        <label className="mt-3 flex items-center gap-2.5 text-sm text-white/70">
          <input
            type="checkbox"
            checked={whole}
            onChange={(e) => setWhole(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 accent-[#ff6b9d]"
          />
          Vetar el plato completo («{meal.title}»)
        </label>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={BTN_GHOST}>
            Cancelar
          </button>
          <button type="button" onClick={confirm} disabled={busy} className={BTN}>
            Guardar veto
          </button>
        </div>
      </div>
    </div>
  );
}
