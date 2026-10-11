import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Banner from '../components/ui/Banner';
import StatTile from '../components/ui/StatTile';
import SegmentedControl from '../components/ui/SegmentedControl';
import Spinner from '../components/ui/Spinner';
import { api } from '../lib/api';
import { INPUT, LABEL, BTN } from '../lib/ui';

const SEX_OPTIONS = [
  { value: 'm', label: 'Hombre' },
  { value: 'f', label: 'Mujer' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentario' },
  { value: 'light', label: 'Ligero' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'high', label: 'Alto' },
];

const EMPTY = {
  name: '',
  sex: 'm',
  birth_date: '',
  height_cm: '',
  weight_kg: '',
  activity_level: 'moderate',
  experience_level: 'beginner',
};

export default function ProfileSection({ state, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (state?.profile) {
      setForm({
        name: state.profile.name || '',
        sex: state.profile.sex || 'm',
        birth_date: state.profile.birth_date || '',
        height_cm: state.profile.height_cm ?? '',
        weight_kg: state.profile.weight_kg ?? '',
        activity_level: state.profile.activity_level || 'moderate',
        experience_level: state.profile.experience_level || 'beginner',
      });
    }
  }, [state?.profile]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk(false);
    try {
      await api.put('/api/profile', form);
      setOk(true);
      await onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const targets = state?.targets;
  const block = state?.block;
  const guidance = state?.guidance;

  if (state === null) return <Spinner />;

  return (
    <div className="flex flex-col gap-3.5">
      {targets && (
        <Card title="Estado actual">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Mantenimiento" value={`${targets.maintenance} kcal`} />
            <StatTile label="Objetivo" value={`${targets.target_calories} kcal`} accent="text-accent-soft" />
            <StatTile label="Proteína" value={`${targets.protein_g} g`} />
            <StatTile label="Fase" value={`${block?.phase} · ${guidance?.name}`} />
          </div>
          {guidance && (
            <p className="mt-3 text-xs text-white/50">
              {guidance.nutrition} {guidance.training}
            </p>
          )}
        </Card>
      )}

      <Card title="Mi perfil">
        <form className="flex flex-col gap-4" onSubmit={submit}>
          {error && <Banner variant="err">{error}</Banner>}
          {ok && <Banner variant="ok">Perfil guardado</Banner>}

          <label className={LABEL}>
            <span>Nombre</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name')(e.target.value)}
              placeholder="Tu nombre"
              className={INPUT}
            />
          </label>

          <div className={LABEL}>
            <span>Sexo</span>
            <SegmentedControl options={SEX_OPTIONS} value={form.sex} onChange={update('sex')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className={LABEL}>
              <span>Fecha de nacimiento</span>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => update('birth_date')(e.target.value)}
                className={INPUT}
              />
            </label>
            <label className={LABEL}>
              <span>Peso actual (kg)</span>
              <input
                type="number"
                step="0.1"
                value={form.weight_kg}
                onChange={(e) => update('weight_kg')(e.target.value)}
                placeholder="80"
                className={INPUT}
              />
            </label>
          </div>

          <label className={LABEL}>
            <span>Estatura (cm)</span>
            <input
              type="number"
              value={form.height_cm}
              onChange={(e) => update('height_cm')(e.target.value)}
              placeholder="178"
              className={INPUT}
            />
          </label>

          <div className={LABEL}>
            <span>Nivel de actividad</span>
            <SegmentedControl
              options={ACTIVITY_OPTIONS}
              value={form.activity_level}
              onChange={update('activity_level')}
              wrap
            />
          </div>

          <div className={LABEL}>
            <span>Experiencia entrenando</span>
            <SegmentedControl
              options={EXPERIENCE_OPTIONS}
              value={form.experience_level}
              onChange={update('experience_level')}
              wrap
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white/50">
            Objetivo: <span className="text-white/80">Ganancia muscular progresiva</span>
          </div>

          <button type="submit" disabled={busy} className={BTN}>
            {busy && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            Guardar perfil
          </button>
        </form>
      </Card>
    </div>
  );
}
