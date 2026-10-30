export const INPUT =
  'w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:opacity-60';

export const LABEL = 'flex flex-col gap-1.5 text-sm text-white/70';

export const BTN =
  'flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-soft px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:brightness-110 disabled:opacity-50';

export const BTN_GHOST =
  'rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50';

export const BTN_DANGER =
  'shrink-0 rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-1 text-xs text-danger transition-colors hover:bg-danger/20';

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const SLOT_LABELS = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snack: 'Snack',
};

export const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

export const BLOCK_LABELS = {
  empuje: 'Empuje',
  traccion: 'Tracción',
  pierna: 'Pierna',
  core: 'Core',
};

export const BLOCK_ORDER = ['empuje', 'traccion', 'pierna', 'core'];

export function formatDuration(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return '';
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (!mins) return `${secs} s`;
  return secs ? `${mins} min ${secs} s` : `${mins} min`;
}

export function formatPrescription(exercise = {}) {
  const parts = [];
  if (exercise.sets) parts.push(`${exercise.sets} series`);
  if (exercise.reps) parts.push(`${exercise.reps} reps`);
  const duration = formatDuration(exercise.duration_seconds);
  if (duration) parts.push(duration);
  return parts.join(' · ');
}

export const MEDIA_LABELS = { link: 'Enlace', image: 'Imagen', video: 'Video' };
