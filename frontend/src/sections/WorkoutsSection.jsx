import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Banner from '../components/ui/Banner';
import Spinner from '../components/ui/Spinner';
import SegmentedControl from '../components/ui/SegmentedControl';
import RoutineForm from '../components/RoutineForm';
import WeekForm from '../components/WeekForm';
import TodayWorkout from '../components/TodayWorkout';
import { api } from '../lib/api';
import {
  BTN,
  BTN_GHOST,
  BTN_DANGER,
  DAY_NAMES,
  formatPrescription,
} from '../lib/ui';

const TABS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'rutinas', label: 'Rutinas' },
  { value: 'semanas', label: 'Semanas' },
];

function RoutineCard({ routine, labels, onEdit, onRemove }) {
  return (
    <Card
      title={routine.name}
      action={
        <div className="flex gap-1.5">
          <button type="button" onClick={() => onEdit(routine)} className={BTN_GHOST}>
            Editar
          </button>
          <button type="button" onClick={() => onRemove(routine)} className={BTN_DANGER}>
            Eliminar
          </button>
        </div>
      }
    >
      {routine.description && <p className="mb-2 text-xs text-white/50">{routine.description}</p>}
      {routine.exercises?.length ? (
        <ul className="flex flex-col gap-1.5">
          {routine.exercises.map((exercise) => (
            <li
              key={exercise.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5"
            >
              <span className="min-w-0 truncate text-sm text-white/85">{exercise.name}</span>
              <span className="shrink-0 text-[0.68rem] text-white/45">
                {labels[exercise.block] || exercise.block || ''}
                {formatPrescription(exercise) ? ` · ${formatPrescription(exercise)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-center text-sm text-white/45">Sin ejercicios todavía.</p>
      )}
    </Card>
  );
}

function WeekCard({ week, onActivate, onEdit, onRemove }) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {week.name}
          {week.is_active ? (
            <span className="rounded-full border border-ok/30 bg-ok/15 px-2 py-0.5 text-[0.62rem] normal-case tracking-normal text-ok">
              Activa
            </span>
          ) : null}
        </span>
      }
      action={
        <div className="flex gap-1.5">
          {!week.is_active && (
            <button type="button" onClick={() => onActivate(week)} className={BTN_GHOST}>
              Activar
            </button>
          )}
          <button type="button" onClick={() => onEdit(week)} className={BTN_GHOST}>
            Editar
          </button>
          <button type="button" onClick={() => onRemove(week)} className={BTN_DANGER}>
            Eliminar
          </button>
        </div>
      }
    >
      <ul className="flex flex-col gap-1">
        {week.days?.map((day) => (
          <li
            key={day.day}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm"
          >
            <span className="text-white/60">{DAY_NAMES[day.day]}</span>
            <span className={day.is_rest ? 'text-white/40' : 'text-white/85'}>
              {day.is_rest ? 'Descanso' : day.routine_name || 'Rutina eliminada'}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function WorkoutsSection() {
  const [tab, setTab] = useState('hoy');
  const [catalog, setCatalog] = useState([]);
  const [groups, setGroups] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [routineForm, setRoutineForm] = useState({ open: false, routine: null });
  const [weekForm, setWeekForm] = useState({ open: false, week: null });

  const load = async () => {
    const [catalogData, groupsData, routinesData, weeksData, todayData] = await Promise.all([
      api.get('/api/exercises'),
      api.get('/api/muscle-groups'),
      api.get('/api/routines'),
      api.get('/api/training-weeks'),
      api.get('/api/training-weeks/today'),
    ]);
    setCatalog(catalogData.active || []);
    setGroups(groupsData || []);
    setRoutines(routinesData);
    setWeeks(weeksData);
    setToday(todayData);
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

  const reload = async () => {
    setError('');
    await load();
  };

  const refreshToday = async () => {
    try {
      setToday(await api.get('/api/training-weeks/today'));
    } catch (err) {
      setError(err.message);
    }
  };

  const saveRoutine = async (saved) => {
    setNotice(`Rutina «${saved.name}» guardada`);
    await reload();
  };

  const removeRoutine = async (routine) => {
    if (
      !window.confirm(
        `¿Eliminar la rutina «${routine.name}»? Los días de tus semanas que la usen quedarán como descanso.`
      )
    ) {
      return;
    }
    setError('');
    setNotice('');
    try {
      await api.delete(`/api/routines/${routine.id}`);
      await reload();
      setNotice('Rutina eliminada');
    } catch (err) {
      setError(err.message);
    }
  };

  const saveWeek = async (saved) => {
    setNotice(`Semana «${saved.name}» guardada`);
    await reload();
  };

  const activateWeek = async (week) => {
    setError('');
    setNotice('');
    try {
      await api.post(`/api/training-weeks/${week.id}/activate`, {});
      await reload();
      setNotice(`Semana «${week.name}» activada`);
      setTab('hoy');
    } catch (err) {
      setError(err.message);
    }
  };

  const removeWeek = async (week) => {
    if (!window.confirm(`¿Eliminar la semana «${week.name}»?`)) return;
    setError('');
    setNotice('');
    try {
      await api.delete(`/api/training-weeks/${week.id}`);
      await reload();
      setNotice('Semana eliminada');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <Spinner />;

  const activeWeek = weeks.find((week) => week.is_active) || null;
  const labels = groups.reduce((acc, group) => {
    acc[group.key] = group.label;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3.5">
      {error && <Banner variant="err">{error}</Banner>}
      {notice && <Banner variant="ok">{notice}</Banner>}

      <SegmentedControl options={TABS} value={tab} onChange={setTab} />

      {tab === 'hoy' && (
        <TodayWorkout
          today={today}
          activeWeek={activeWeek}
          loading={loading}
          labels={labels}
          onRefresh={refreshToday}
          onOpenWeeks={() => setTab('semanas')}
        />
      )}

      {tab === 'rutinas' && (
        <>
          <Card
            title={`Rutinas · ${routines.length}`}
            action={
              <button
                type="button"
                onClick={() => setRoutineForm({ open: true, routine: null })}
                className={BTN}
              >
                Nueva rutina
              </button>
            }
          >
            <p className="text-xs text-white/55">
              Una rutina agrupa ejercicios de tu catálogo con sus series, repeticiones o tiempo.
              Después la asignas a los días de una semana.
            </p>
          </Card>

          {routines.length === 0 ? (
            <Card title="Sin rutinas">
              <p className="py-3 text-center text-sm text-white/45">
                Crea tu primera rutina eligiendo ejercicios del catálogo.
              </p>
            </Card>
          ) : (
            routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                labels={labels}
                onEdit={(item) => setRoutineForm({ open: true, routine: item })}
                onRemove={removeRoutine}
              />
            ))
          )}
        </>
      )}

      {tab === 'semanas' && (
        <>
          <Card
            title={`Semanas · ${weeks.length}`}
            action={
              <button
                type="button"
                onClick={() => setWeekForm({ open: true, week: null })}
                className={BTN}
              >
                Nueva semana
              </button>
            }
          >
            <p className="text-xs text-white/55">
              Crea semanas con 7 días y elige qué rutina va en cada día (o descanso). Solo una
              semana puede estar activa; «Hoy» mostrará la rutina del día actual.
            </p>
          </Card>

          {weeks.length === 0 ? (
            <Card title="Sin semanas">
              <p className="py-3 text-center text-sm text-white/45">
                Crea tu primera semana y asigna rutinas a sus días.
              </p>
            </Card>
          ) : (
            weeks.map((week) => (
              <WeekCard
                key={week.id}
                week={week}
                onActivate={activateWeek}
                onEdit={(item) => setWeekForm({ open: true, week: item })}
                onRemove={removeWeek}
              />
            ))
          )}
        </>
      )}

      {routineForm.open && (
        <RoutineForm
          routine={routineForm.routine}
          catalog={catalog}
          groups={groups}
          onClose={() => setRoutineForm({ open: false, routine: null })}
          onSaved={saveRoutine}
        />
      )}

      {weekForm.open && (
        <WeekForm
          week={weekForm.week}
          routines={routines}
          onClose={() => setWeekForm({ open: false, week: null })}
          onSaved={saveWeek}
        />
      )}
    </div>
  );
}
