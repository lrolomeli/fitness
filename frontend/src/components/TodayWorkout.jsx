import { useState } from 'react';
import Card from './ui/Card';
import Banner from './ui/Banner';
import ExerciseRecordModal from './ExerciseRecordModal';
import {
  DAY_NAMES,
  BLOCK_LABELS,
  formatPrescription,
  BTN_GHOST,
} from '../lib/ui';

function formatBest(best) {
  if (!best) return '';
  const parts = [];
  if (best.weight_kg != null) parts.push(`${best.weight_kg} kg`);
  if (best.reps != null) parts.push(`× ${best.reps}`);
  return parts.join(' ');
}

function WeekStrip({ week, todayDay }) {
  if (!week?.days?.length) return null;
  return (
    <div className="grid grid-cols-7 gap-1">
      {week.days.map((day) => {
        const active = Number(day.day) === todayDay;
        return (
          <div
            key={day.day}
            className={`rounded-lg border px-1 py-1.5 text-center ${
              active
                ? 'border-accent/60 bg-accent/20 text-white'
                : 'border-white/10 bg-white/5 text-white/55'
            }`}
          >
            <div className="text-[0.6rem] uppercase tracking-wide">
              {DAY_NAMES[day.day]?.slice(0, 3)}
            </div>
            <div className="mt-0.5 truncate text-[0.62rem]" title={day.routine_name || 'Descanso'}>
              {day.is_rest ? 'Descanso' : day.routine_name || 'Rutina'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TodayWorkout({
  today,
  activeWeek,
  loading,
  labels = BLOCK_LABELS,
  onRefresh,
  onOpenWeeks,
}) {
  const [recordTarget, setRecordTarget] = useState(null);
  const [notice, setNotice] = useState('');

  if (loading) {
    return (
      <Card title="Hoy">
        <p className="py-4 text-center text-sm text-white/45">Cargando semana activa…</p>
      </Card>
    );
  }

  if (!today?.week) {
    return (
      <Card
        title="Hoy"
        action={
          onOpenWeeks && (
            <button type="button" onClick={onOpenWeeks} className={BTN_GHOST}>
              Ir a semanas
            </button>
          )
        }
      >
        <p className="py-3 text-center text-sm text-white/55">
          No tienes una semana activa. Crea una semana, asigna rutinas a sus días y actívala.
        </p>
      </Card>
    );
  }

  const entry = today.entry;
  const routine = entry?.routine;
  const exercises = routine?.exercises || [];

  return (
    <div className="flex flex-col gap-3.5">
      {notice && <Banner variant="ok">{notice}</Banner>}

      <Card
        title={`Semana activa · ${today.week.name}`}
        action={
          onOpenWeeks && (
            <button type="button" onClick={onOpenWeeks} className={BTN_GHOST}>
              Cambiar
            </button>
          )
        }
      >
        <WeekStrip week={activeWeek} todayDay={today.day} />
      </Card>

      {!entry || entry.is_rest ? (
        <Card title={`Hoy · ${DAY_NAMES[today.day]} · Descanso`}>
          <p className="py-4 text-center text-sm text-white/55">
            Hoy toca descansar y recuperar. La semana activa es «{today.week.name}».
          </p>
        </Card>
      ) : (
        <Card title={`Hoy · ${DAY_NAMES[today.day]} · ${routine.name}`}>
          {routine.description && (
            <p className="mb-2 text-xs text-white/50">{routine.description}</p>
          )}
          {exercises.length === 0 ? (
            <p className="py-3 text-center text-sm text-white/45">
              Esta rutina todavía no tiene ejercicios. Edítala en la pestaña Rutinas.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {exercises.map((exercise) => {
                const best = today.bests?.[exercise.exercise_id];
                return (
                  <li
                    key={exercise.id}
                    className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm text-white">{exercise.name}</p>
                        <p className="text-xs text-white/45">
                          {labels[exercise.block] || exercise.block || 'Ejercicio'}
                          {formatPrescription(exercise) ? ` · ${formatPrescription(exercise)}` : ''}
                        </p>
                        {exercise.notes && (
                          <p className="text-xs text-white/40">{exercise.notes}</p>
                        )}
                        {best && (
                          <p className="mt-0.5 text-xs text-ok">
                            Récord: {formatBest(best)}
                            {best.estimated_1rm ? ` · 1RM est. ${best.estimated_1rm} kg` : ''}
                          </p>
                        )}
                      </div>
                      {exercise.exercise_id && (
                        <button
                          type="button"
                          onClick={() => setRecordTarget({ id: exercise.exercise_id, name: exercise.name })}
                          className={BTN_GHOST}
                        >
                          Registrar peso
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {recordTarget && (
        <ExerciseRecordModal
          exercise={recordTarget}
          onClose={() => setRecordTarget(null)}
          onSaved={(result) => {
            if (result?.isNewRecord) {
              setNotice(`¡Nuevo récord en ${recordTarget.name}!`);
            }
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
