import { DAY_NAMES } from '../../lib/ui';
import { isValidUrl, mediaPreview, normalizeUrl } from '../../lib/media';

function todayDate() {
  const text = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function heroImageFor(week, entry) {
  const ownMedia = (entry?.exercises || []).flatMap((exercise) => exercise.media || []);
  const weekMedia = (week?.days || []).flatMap((day) =>
    (day.exercises || []).flatMap((exercise) => exercise.media || [])
  );
  const media = [...ownMedia, ...weekMedia];

  const image = media.find((item) => item.type === 'image' && isValidUrl(item.url));
  if (image) return normalizeUrl(image.url);

  const video = media.find((item) => item.type === 'video' && mediaPreview(item));
  return video ? mediaPreview(video) : '';
}

function Stat({ value, label }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur-sm">
      <span className="text-base font-semibold text-white">{value}</span>
      <span className="text-[0.68rem] uppercase tracking-[0.12em] text-white/45">{label}</span>
    </span>
  );
}

export default function PublicHero({ week, today }) {
  const entry = today?.entry || null;
  const routine = entry?.routine || null;
  const isRest = Boolean(entry?.is_rest);
  const image = heroImageFor(week, entry);
  const totals = entry?.totals || { exercises: 0, sets: 0, media: 0 };

  let title = 'Entrenamiento';
  let description = '';

  if (!week) {
    title = 'Sin semana activa';
    description = 'Todavía no hay una semana de entrenamiento configurada. Vuelve pronto.';
  } else if (isRest) {
    title = 'Día de descanso';
    description = 'Hoy toca recuperar. Descansa, hidrátate y vuelve con más fuerza mañana.';
  } else if (routine) {
    title = routine.name;
    description = routine.description || 'Tu sesión de hoy está lista. Enfócate en la técnica y disfruta el proceso.';
  }

  return (
    <section
      id="hoy"
      className="relative isolate animate-fade-up overflow-hidden rounded-[2rem] border border-white/10 bg-[#140c19] shadow-2xl"
    >
      {image ? (
        <>
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover opacity-45"
          />
          <span className="absolute inset-0 -z-10 bg-gradient-to-br from-[#120a17] via-[#120a17]/85 to-[#120a17]/30" />
          <span className="absolute inset-0 -z-10 bg-gradient-to-t from-[#120a17] via-transparent to-transparent" />
        </>
      ) : (
        <>
          <span className="absolute -left-24 -top-28 -z-10 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
          <span className="absolute -bottom-32 right-0 -z-10 h-80 w-80 rounded-full bg-hum/20 blur-3xl" />
          <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(255,107,157,0.14),transparent_45%)]" />
        </>
      )}

      <div className="p-6 sm:p-10 lg:p-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent/50 bg-accent/20 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white">
            Hoy
          </span>
          <span className="text-xs text-white/55">
            {DAY_NAMES[today?.day] || 'Hoy'} · {todayDate()}
          </span>
          {week?.name && (
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[0.65rem] text-white/55 backdrop-blur-sm">
              Semana · {week.name}
            </span>
          )}
        </div>

        <p className="mt-7 text-[0.65rem] font-medium uppercase tracking-[0.28em] text-accent-soft/80">
          Entrenamiento de hoy
        </p>
        <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
            {description}
          </p>
        )}

        {!isRest && routine && (
          <div className="mt-7 flex flex-wrap gap-2">
            <Stat value={totals.exercises} label={totals.exercises === 1 ? 'ejercicio' : 'ejercicios'} />
            {totals.sets > 0 && <Stat value={totals.sets} label="series" />}
            {totals.media > 0 && <Stat value={totals.media} label="multimedia" />}
          </div>
        )}

        {isRest && (
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs text-white/55 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            Recuperación programada
          </div>
        )}
      </div>
    </section>
  );
}
