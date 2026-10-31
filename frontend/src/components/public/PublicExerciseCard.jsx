import { cn } from '../../lib/cn';
import { formatDuration } from '../../lib/ui';
import MediaGallery from './MediaGallery';

const BLOCK_STYLES = {
  empuje: 'border-accent/35 bg-accent/15 text-accent-soft',
  traccion: 'border-hum/35 bg-hum/15 text-hum',
  pierna: 'border-ok/35 bg-ok/15 text-ok',
  core: 'border-warn/35 bg-warn/15 text-warn',
};

const DEFAULT_STYLE = 'border-white/15 bg-white/5 text-white/60';

function prescriptionParts(exercise) {
  const parts = [];
  if (exercise.sets) parts.push(`${exercise.sets} series`);
  if (exercise.reps) parts.push(`${exercise.reps} reps`);
  const duration = formatDuration(exercise.duration_seconds);
  if (duration) parts.push(duration);
  return parts;
}

function BlockPill({ exercise }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.12em]',
        BLOCK_STYLES[exercise.block] || DEFAULT_STYLE
      )}
    >
      {exercise.block_label || exercise.block || 'Ejercicio'}
    </span>
  );
}

function MediaBlock({ exercise }) {
  if (!exercise.media?.length) return null;
  return (
    <div className="mt-2.5">
      <MediaGallery media={exercise.media} title={exercise.name} compact />
    </div>
  );
}

export default function PublicExerciseCard({ exercise, index = 0, compact = false }) {
  const parts = prescriptionParts(exercise);

  if (compact) {
    return (
      <li className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{exercise.name}</p>
            <p className="mt-0.5 text-[0.68rem] text-white/45">
              {[exercise.block_label, ...parts].filter(Boolean).join(' · ')}
            </p>
          </div>
          {exercise.media?.length > 0 && (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] text-white/40">
              {exercise.media.length} multimedia
            </span>
          )}
        </div>
        {exercise.notes && <p className="mt-1 text-[0.68rem] leading-relaxed text-white/40">{exercise.notes}</p>}
        <MediaBlock exercise={exercise} />
      </li>
    );
  }

  return (
    <article
      className="group relative animate-fade-up rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.06] sm:p-5"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] text-xs font-semibold tracking-wider text-white/55">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold leading-tight text-white">{exercise.name}</h3>
            <BlockPill exercise={exercise} />
          </div>
          {parts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parts.map((part) => (
                <span
                  key={part}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[0.68rem] text-white/60"
                >
                  {part}
                </span>
              ))}
            </div>
          )}
          {exercise.notes && (
            <p className="mt-2 text-xs leading-relaxed text-white/40">{exercise.notes}</p>
          )}
        </div>
      </div>

      {exercise.media?.length > 0 && (
        <div className="mt-4">
          <MediaGallery media={exercise.media} title={exercise.name} />
        </div>
      )}
    </article>
  );
}
