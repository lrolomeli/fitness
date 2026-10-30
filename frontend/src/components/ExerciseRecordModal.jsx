import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BTN, BTN_GHOST, BTN_DANGER, INPUT, LABEL } from '../lib/ui';

const today = () => new Date().toISOString().slice(0, 10);

function formatRecord(record) {
  if (!record) return 'Sin récord todavía';
  const parts = [];
  if (record.weight_kg != null) parts.push(`${record.weight_kg} kg`);
  if (record.reps != null) parts.push(`× ${record.reps} reps`);
  return parts.join(' ') || 'Sin peso';
}

export default function ExerciseRecordModal({ exercise, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ date: today(), weight_kg: '', reps: '', sets: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    const res = await api.get(`/api/exercises/${exercise.id}/records`);
    setData(res);
  };

  useEffect(() => {
    let alive = true;
    if (!exercise?.id) return undefined;
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
  }, [exercise?.id]);

  if (!exercise?.id) return null;

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.post(`/api/exercises/${exercise.id}/records`, form);
      setNotice(
        result.isNewRecord
          ? `¡Nuevo récord! ${formatRecord(result.best)}`
          : `Registro guardado. Récord actual: ${formatRecord(result.best)}`
      );
      setForm({ date: today(), weight_kg: '', reps: '', sets: '', notes: '' });
      await load();
      await onSaved?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (recordId) => {
    try {
      await api.delete(`/api/exercises/${exercise.id}/records/${recordId}`);
      await load();
      await onSaved?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const records = data?.records || [];
  const best = data?.best || null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#1a1020] p-5 sm:rounded-3xl">
        <h3 className="text-base font-semibold text-white">Registrar peso · {exercise.name}</h3>
        <p className="mt-1 text-xs text-white/55">
          Récord actual: <span className="text-white/80">{formatRecord(best)}</span>
          {best?.estimated_1rm ? ` · 1RM est. ${best.estimated_1rm} kg` : ''}
        </p>

        <form className="mt-4 flex flex-col gap-3" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-2">
            <label className={LABEL}>
              Fecha
              <input
                type="date"
                className={INPUT}
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                disabled={busy}
              />
            </label>
            <label className={LABEL}>
              Peso (kg)
              <input
                type="number"
                step="0.5"
                className={INPUT}
                value={form.weight_kg}
                onChange={(e) => update('weight_kg', e.target.value)}
                placeholder="80"
                disabled={busy}
              />
            </label>
            <label className={LABEL}>
              Repeticiones
              <input
                type="number"
                min="0"
                className={INPUT}
                value={form.reps}
                onChange={(e) => update('reps', e.target.value)}
                placeholder="8"
                disabled={busy}
              />
            </label>
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
          </div>
          <label className={LABEL}>
            Notas
            <input
              className={INPUT}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Opcional"
              disabled={busy}
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}
          {notice && <p className="text-sm text-ok">{notice}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={busy} className={BTN_GHOST}>
              Cerrar
            </button>
            <button type="submit" disabled={busy} className={BTN}>
              {busy ? 'Guardando…' : 'Guardar registro'}
            </button>
          </div>
        </form>

        <div className="mt-5 border-t border-white/10 pt-4">
          <h4 className="text-[0.72rem] uppercase tracking-[0.14em] text-white/55">
            Historial ({records.length})
          </h4>
          {loading ? (
            <p className="py-3 text-sm text-white/45">Cargando…</p>
          ) : records.length === 0 ? (
            <p className="py-3 text-sm text-white/45">Sin registros todavía.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {records.slice(0, 10).map((record) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs"
                >
                  <span className="text-white/70">
                    {record.date} · {formatRecord(record)}
                    {record.notes ? ` · ${record.notes}` : ''}
                  </span>
                  <button type="button" onClick={() => remove(record.id)} className={BTN_DANGER}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
