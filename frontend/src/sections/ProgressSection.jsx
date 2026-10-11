import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Banner from '../components/ui/Banner';
import Spinner from '../components/ui/Spinner';
import LineChart from '../components/chart/LineChart';
import { api } from '../lib/api';
import { INPUT, LABEL, BTN, BTN_GHOST, BTN_DANGER } from '../lib/ui';

const today = () => new Date().toISOString().slice(0, 10);
const shortDate = (iso) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

export default function ProgressSection() {
  const [logs, setLogs] = useState(null);
  const [summary, setSummary] = useState({ weights: [], calories: [], marks: [] });
  const [form, setForm] = useState({ date: today(), weight_kg: '', calories_consumed: '', notes: '' });
  const [marks, setMarks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [list, sum] = await Promise.all([
      api.get('/api/progress'),
      api.get('/api/progress/summary'),
    ]);
    setLogs(list);
    setSummary(sum);
  };

  useEffect(() => {
    let alive = true;
    load().catch((err) => {
      if (alive) setError(err.message);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addMark = () => setMarks((prev) => [...prev, { exercise: '', weight_kg: '', reps: '' }]);
  const updateMark = (index, key, value) =>
    setMarks((prev) => prev.map((m, i) => (i === index ? { ...m, [key]: value } : m)));
  const removeMark = (index) => setMarks((prev) => prev.filter((_, i) => i !== index));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/api/progress', {
        date: form.date,
        weight_kg: form.weight_kg,
        calories_consumed: form.calories_consumed,
        notes: form.notes,
        gym_marks: marks
          .filter((m) => m.exercise.trim())
          .map((m) => ({
            exercise: m.exercise.trim(),
            weight_kg: m.weight_kg === '' ? null : Number(m.weight_kg),
            reps: m.reps === '' ? null : Number(m.reps),
          })),
      });
      setForm({ date: today(), weight_kg: '', calories_consumed: '', notes: '' });
      setMarks([]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/api/progress/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (logs === null) return <Spinner />;

  const dates = Array.from(
    new Set([...summary.weights.map((w) => w.date), ...summary.calories.map((c) => c.date)])
  ).sort();
  const weightMap = Object.fromEntries(summary.weights.map((w) => [w.date, w.value]));
  const calMap = Object.fromEntries(summary.calories.map((c) => [c.date, c.value]));
  const series = [
    { label: 'Peso (kg)', data: dates.map((d) => weightMap[d] ?? null), color: '#ff6b9d' },
    { label: 'Calorías', data: dates.map((d) => calMap[d] ?? null), color: '#f5576c', axis: 'right', fill: false },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {error && <Banner variant="err">{error}</Banner>}

      {dates.length > 1 && (
        <Card title="Evolución">
          <LineChart labels={dates.map(shortDate)} series={series} />
        </Card>
      )}

      <Card title="Registrar">
        <form className="flex flex-col gap-3.5" onSubmit={submit}>
          <label className={LABEL}>
            <span>Fecha</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => update('date')(e.target.value)}
              className={INPUT}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className={LABEL}>
              <span>Peso corporal (kg)</span>
              <input
                type="number"
                step="0.1"
                value={form.weight_kg}
                onChange={(e) => update('weight_kg')(e.target.value)}
                placeholder="80.5"
                className={INPUT}
              />
            </label>
            <label className={LABEL}>
              <span>Calorías consumidas</span>
              <input
                type="number"
                value={form.calories_consumed}
                onChange={(e) => update('calories_consumed')(e.target.value)}
                placeholder="2900"
                className={INPUT}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-white/70">Marcas en el gimnasio</span>
            {marks.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-1.5">
                <input
                  type="text"
                  value={m.exercise}
                  onChange={(e) => updateMark(i, 'exercise', e.target.value)}
                  placeholder="Ejercicio"
                  className={INPUT}
                />
                <input
                  type="number"
                  step="0.5"
                  value={m.weight_kg}
                  onChange={(e) => updateMark(i, 'weight_kg', e.target.value)}
                  placeholder="kg"
                  className={`${INPUT} w-20`}
                />
                <input
                  type="number"
                  value={m.reps}
                  onChange={(e) => updateMark(i, 'reps', e.target.value)}
                  placeholder="reps"
                  className={`${INPUT} w-20`}
                />
                <button type="button" onClick={() => removeMark(i)} className={BTN_DANGER}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addMark} className={BTN_GHOST}>
              + Agregar marca
            </button>
          </div>

          <label className={LABEL}>
            <span>Notas</span>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => update('notes')(e.target.value)}
              placeholder="Opcional"
              className={INPUT}
            />
          </label>

          <button type="submit" disabled={busy} className={BTN}>
            {busy && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            Guardar registro
          </button>
        </form>
      </Card>

      <Card title={`Historial (${logs.length})`}>
        {logs.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/45">Sin registros todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white">
                    {log.date}
                    {log.weight_kg != null && ` · ${log.weight_kg} kg`}
                    {log.calories_consumed != null && ` · ${log.calories_consumed} kcal`}
                  </p>
                  {log.gym_marks?.length > 0 && (
                    <p className="mt-0.5 text-xs text-white/50">
                      {log.gym_marks
                        .map((m) => `${m.exercise} ${m.weight_kg ?? '?'}kg×${m.reps ?? '?'}`)
                        .join(' · ')}
                    </p>
                  )}
                  {log.notes && <p className="text-xs text-white/40">{log.notes}</p>}
                </div>
                <button type="button" onClick={() => remove(log.id)} className={BTN_DANGER}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
