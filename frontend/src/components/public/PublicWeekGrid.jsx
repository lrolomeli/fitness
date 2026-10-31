import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import { DAY_NAMES } from '../../lib/ui';
import { mediaPreview, normalizeUrl } from '../../lib/media';
import PublicExerciseCard from './PublicExerciseCard';

function dayMedia(exercises = []) {
  return exercises
    .flatMap((exercise) => exercise.media || [])
    .map((item) => {
      if (item.type === 'image') return normalizeUrl(item.url);
      if (item.type === 'video') return mediaPreview(item);
      return '';
    })
    .filter(Boolean)
    .slice(0, 3);
}

function DayMediaStack({ exercises }) {
  const previews = dayMedia(exercises);
  if (!previews.length) return null;

  return (
    <div className="mt-3 flex -space-x-2">
      {previews.map((src, index) => (
        <img
          key={`${src}-${index}`}
          src={src}
          alt=""
          loading="lazy"
          className="h-7 w-7 rounded-full border-2 border-[#1a1020] object-cover"
        />
      ))}
    </div>
  );
}

export default function PublicWeekGrid({ week, todayDay }) {
  const [selectedDay, setSelectedDay] = useState(todayDay ?? 0);

  useEffect(() => {
    setSelectedDay(todayDay ?? 0);
  }, [todayDay, week?.id]);

  if (!week?.days?.length) return null;

  const selected = week.days.find((day) => day.day === selectedDay) || week.days[0];
  const isToday = selected.day === todayDay;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.28em] text-accent-soft/80">
            La semana
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Tu plan completo
          </h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/50">
          {week.name} · {week.totals?.exercises || 0} ejercicios
        </span>
      </div>

      <div className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-7 lg:overflow-visible">
        {week.days.map((day) => {
          const active = day.day === selected.day;
          const today = day.day === todayDay;
          return (
            <button
              key={day.day}
              type="button"
              onClick={() => setSelectedDay(day.day)}
              aria-pressed={active}
              className={cn(
                'group min-w-[8.5rem] shrink-0 snap-start rounded-2xl border p-3 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent/60 lg:min-w-0',
                active
                  ? 'border-accent/60 bg-accent/15 shadow-lg shadow-accent/10'
                  : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-white/45">
                  {DAY_NAMES[day.day]?.slice(0, 3)}
                </span>
                {today && (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.52rem] font-bold uppercase tracking-wider text-white">
                    Hoy
                  </span>
                )}
              </div>
              <p
                className={cn(
                  'mt-2 truncate text-sm font-medium',
                  day.is_rest ? 'text-white/40' : 'text-white'
                )}
                title={day.is_rest ? 'Descanso' : day.routine?.name || 'Rutina'}
              >
                {day.is_rest ? 'Descanso' : day.routine?.name || 'Rutina'}
              </p>
              <p className="mt-1 text-[0.66rem] text-white/40">
                {day.is_rest
                  ? 'Recuperación'
                  : `${day.totals?.exercises || 0} ejercicio${day.totals?.exercises === 1 ? '' : 's'}`}
              </p>
              <DayMediaStack exercises={day.exercises} />
            </button>
          );
        })}
      </div>

      <p className="mt-1 text-[0.66rem] text-white/30 lg:hidden">Desliza para ver toda la semana →</p>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.2em] text-white/40">
              {isToday ? 'Hoy' : DAY_NAMES[selected.day]}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-white">
              {selected.is_rest ? 'Día de descanso' : selected.routine?.name || 'Rutina'}
            </h3>
            {selected.routine?.description && (
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/45">
                {selected.routine.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!selected.is_rest && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] text-white/50">
                {selected.totals?.exercises || 0} ejercicio
                {selected.totals?.exercises === 1 ? '' : 's'}
                {selected.totals?.sets ? ` · ${selected.totals.sets} series` : ''}
              </span>
            )}
            {isToday && (
              <a
                href="#sesion"
                className="rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-[0.65rem] text-accent-soft transition-colors hover:bg-accent/20"
              >
                Ver sesión completa ↑
              </a>
            )}
          </div>
        </div>

        {selected.is_rest ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
            <p className="text-sm text-white/45">
              Hoy toca descansar y recuperar. La constancia también se construye fuera del gimnasio.
            </p>
          </div>
        ) : selected.exercises?.length ? (
          <ol className="mt-4 flex flex-col gap-2">
            {selected.exercises.map((exercise) => (
              <PublicExerciseCard key={exercise.id} exercise={exercise} compact />
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/40">
            Esta rutina todavía no tiene ejercicios.
          </p>
        )}
      </div>
    </section>
  );
}
