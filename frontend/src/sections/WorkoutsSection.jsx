import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Banner from '../components/ui/Banner';
import Spinner from '../components/ui/Spinner';
import { api } from '../lib/api';
import { INPUT, BTN, BTN_GHOST, BTN_DANGER, DAY_NAMES } from '../lib/ui';

const EMPTY_EX = { name: '', muscle: '', sets: 3, reps: '8-12', suggested_weight_kg: 0, rir: '', notes: '' };

function WorkoutDay({ workout }) {
  const [exercises, setExercises] = useState(workout.exercises || []);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setExercises(workout.exercises || []);
    setSaved(false);
  }, [workout]);

  if (workout.type === 'rest') {
    return (
      <Card title={`${DAY_NAMES[workout.day]} · Descanso`}>
        <p className="py-2 text-center text-sm text-white/50">
          {workout.title || 'Recuperación'}
        </p>
      </Card>
    );
  }

  const update = (index, key, value) =>
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, [key]: value } : ex)));

  const addEx = () => setExercises((prev) => [...prev, { ...EMPTY_EX }]);
  const removeEx = (index) => setExercises((prev) => prev.filter((_, i) => i !== index));

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      const payload = exercises.map((ex) => ({
        name: ex.name,
        muscle: ex.muscle,
        sets: ex.sets === '' ? null : Number(ex.sets),
        reps: ex.reps,
        suggested_weight_kg: ex.suggested_weight_kg === '' ? null : Number(ex.suggested_weight_kg),
        rir: ex.rir,
        notes: ex.notes,
      }));
      await api.put(`/api/workouts/${workout.id}`, { exercises: payload });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title={`${DAY_NAMES[workout.day]} · ${workout.title || 'Entreno'}`}
      action={
        <button type="button" onClick={save} disabled={busy} className={BTN_GHOST}>
          {busy ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar'}
        </button>
      }
    >
      {workout.focus && <p className="mb-2 text-xs text-white/50">{workout.focus}</p>}
      <div className="flex flex-col gap-2">
        {exercises.map((ex, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ex.name}
                onChange={(e) => update(i, 'name', e.target.value)}
                placeholder="Ejercicio"
                className={INPUT}
              />
              <button type="button" onClick={() => removeEx(i)} className={BTN_DANGER}>
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <label className="flex flex-col text-[0.6rem] uppercase tracking-wider text-white/45">
                Series
                <input
                  type="number"
                  value={ex.sets ?? ''}
                  onChange={(e) => update(i, 'sets', e.target.value)}
                  className={INPUT}
                />
              </label>
              <label className="flex flex-col text-[0.6rem] uppercase tracking-wider text-white/45">
                Reps
                <input
                  type="text"
                  value={ex.reps ?? ''}
                  onChange={(e) => update(i, 'reps', e.target.value)}
                  className={INPUT}
                />
              </label>
              <label className="flex flex-col text-[0.6rem] uppercase tracking-wider text-white/45">
                Peso (kg)
                <input
                  type="number"
                  step="0.5"
                  value={ex.suggested_weight_kg ?? ''}
                  onChange={(e) => update(i, 'suggested_weight_kg', e.target.value)}
                  className={INPUT}
                />
              </label>
              <label className="flex flex-col text-[0.6rem] uppercase tracking-wider text-white/45">
                RIR
                <input
                  type="text"
                  value={ex.rir ?? ''}
                  onChange={(e) => update(i, 'rir', e.target.value)}
                  className={INPUT}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addEx} className={`${BTN_GHOST} mt-3 w-full`}>
        + Agregar ejercicio
      </button>
    </Card>
  );
}

export default function WorkoutsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setData(await api.get('/api/workouts'));
  };

  useEffect(() => {
    let alive = true;
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
  }, []);

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const created = await api.post('/api/workouts/generate', {});
      setData(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  const days = data?.days || [];

  return (
    <div className="flex flex-col gap-3.5">
      {error && <Banner variant="err">{error}</Banner>}

      <Card
        title={data?.week ? `Rutina · semana del ${data.week}` : 'Sin rutina'}
        action={
          <button type="button" onClick={generate} disabled={busy} className={BTN_GHOST}>
            {busy ? 'Generando…' : days.length ? 'Regenerar' : 'Generar rutina'}
          </button>
        }
      >
        {days.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/50">
            Aún no tienes rutina. Genera tu semana de entrenamiento.
          </p>
        ) : (
          <p className="text-xs text-white/55">
            {days.filter((d) => d.type === 'training').length} días de entrenamiento ·{' '}
            {days.filter((d) => d.type === 'rest').length} de descanso
          </p>
        )}
      </Card>

      {days.map((workout) => (
        <WorkoutDay key={workout.id} workout={workout} />
      ))}
    </div>
  );
}
