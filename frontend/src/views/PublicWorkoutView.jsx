import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DAY_NAMES } from '../lib/ui';
import PublicHero from '../components/public/PublicHero';
import PublicExerciseCard from '../components/public/PublicExerciseCard';
import PublicWeekGrid from '../components/public/PublicWeekGrid';

function setMeta(name, content) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function PublicHeader({ onRefresh, refreshing }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#120b16]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-hum p-[1.5px] shadow-lg shadow-accent/20">
            <div className="grid h-full w-full place-items-center rounded-[0.55rem] bg-[#17102b]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-5 w-5 text-white"
              >
                <path d="m12 2 9 5-9 5-9-5 9-5Z" />
                <path d="m3 12 9 5 9-5" />
                <path d="m3 17 9 5 9-5" />
              </svg>
            </div>
          </div>
          <div className="leading-tight">
            <p className="bg-gradient-to-r from-accent-soft to-hum bg-clip-text text-sm font-semibold text-transparent">
              Fitness
            </p>
            <p className="text-[0.58rem] uppercase tracking-[0.22em] text-white/35">
              Entrenamiento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-white/45">
            Solo lectura
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Actualizar entrenamiento"
            title="Actualizar"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-base text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <span className={refreshing ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function SectionHeading({ kicker, title, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.28em] text-accent-soft/80">
          {kicker}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <div className="h-80 rounded-[2rem] border border-white/10 bg-white/[0.04]" />
      <div className="mt-10 h-7 w-52 rounded-full bg-white/[0.06]" />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-40 rounded-2xl border border-white/10 bg-white/[0.03]" />
        ))}
      </div>
      <div className="mt-12 h-7 w-44 rounded-full bg-white/[0.06]" />
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-7">
        {[0, 1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="h-28 rounded-2xl border border-white/10 bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}

export default function PublicWorkoutView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await api.get('/api/public/workout');
      setData(result);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Entrenamiento de hoy · Fitness';
    setMeta('robots', 'noindex, nofollow');
    setMeta('description', 'Entrenamiento de hoy y plan semanal: rutinas, ejercicios y multimedia.');
    load();
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const entry = data?.today?.entry || null;
  const routine = entry?.routine || null;
  const exercises = entry?.exercises || [];
  const isRest = Boolean(entry?.is_rest);
  const generated = data?.generated_at
    ? new Date(data.generated_at).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="min-h-screen">
      <PublicHeader onRefresh={() => load({ silent: true })} refreshing={refreshing} />

      {loading ? (
        <Skeleton />
      ) : (
        <main className="mx-auto max-w-6xl px-4 pb-14 pt-5 sm:px-6 sm:pt-8">
          {error && data && (
            <div className="mb-4 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-center text-sm text-danger">
              {error}
              <button
                type="button"
                onClick={() => load()}
                className="ml-2 underline decoration-danger/40 underline-offset-2 hover:text-white"
              >
                Reintentar
              </button>
            </div>
          )}

          {!data ? (
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-16 text-center">
              <p className="text-sm text-white/50">No se pudo cargar el entrenamiento.</p>
              {error && <p className="mt-1 text-xs text-danger">{error}</p>}
              <button
                type="button"
                onClick={() => load()}
                className="mt-4 rounded-full border border-accent/40 bg-accent/15 px-4 py-2 text-sm text-white transition-colors hover:bg-accent/25"
              >
                Reintentar
              </button>
            </section>
          ) : (
            <>
              <PublicHero week={data.week} today={data.today} />

              {!data.week ? (
                <section className="mt-10 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center">
                  <p className="text-sm text-white/45">
                    Cuando haya una semana activa, aquí verás el entrenamiento completo con sus
                    ejercicios y multimedia.
                  </p>
                </section>
              ) : (
                <>
                  <section id="sesion" className="mt-10">
                    <SectionHeading
                      kicker="Sesión de hoy"
                      title={
                        isRest
                          ? 'Recuperación'
                          : routine
                            ? routine.name
                            : `Entrenamiento · ${DAY_NAMES[data.today?.day] || 'Hoy'}`
                      }
                      action={
                        !isRest && exercises.length > 0 ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/50">
                            {exercises.length} ejercicio{exercises.length === 1 ? '' : 's'}
                            {entry?.totals?.sets ? ` · ${entry.totals.sets} series` : ''}
                          </span>
                        ) : null
                      }
                    />

                    {isRest ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-10 text-center">
                        <p className="text-sm text-white/50">
                          Hoy toca descansar y recuperar. Vuelve mañana con la energía al máximo.
                        </p>
                      </div>
                    ) : exercises.length > 0 ? (
                      <div className="mt-4 grid items-start gap-3 lg:grid-cols-2">
                        {exercises.map((exercise, index) => (
                          <PublicExerciseCard key={exercise.id} exercise={exercise} index={index} />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-10 text-center">
                        <p className="text-sm text-white/45">
                          La rutina de hoy todavía no tiene ejercicios.
                        </p>
                      </div>
                    )}
                  </section>

                  <PublicWeekGrid week={data.week} todayDay={data.today?.day} />
                </>
              )}
            </>
          )}
        </main>
      )}

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-center text-[0.66rem] leading-relaxed text-white/30 sm:px-6">
        <p>
          Vista pública de solo lectura
          {generated ? ` · actualizada a las ${generated}` : ''}
        </p>
      </footer>
    </div>
  );
}
