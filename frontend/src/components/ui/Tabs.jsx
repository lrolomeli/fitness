import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';

function Chevron({ direction = 'right', className = '' }) {
  const path =
    direction === 'left'
      ? 'M15 18l-6-6 6-6'
      : direction === 'down'
        ? 'M6 9l6 6 6-6'
        : 'M9 6l6 6-6 6';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

function Check({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function Tabs({ tabs, value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === value),
  );
  const current = tabs[index] ?? tabs[0];

  useEffect(() => {
    if (!open) return;

    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!tabs?.length) return null;

  const move = (step) => {
    const next = (index + step + tabs.length) % tabs.length;
    onChange(tabs[next].id);
  };

  const select = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <div
        className={cn('hidden gap-1 rounded-xl bg-white/8 p-1 sm:flex', className)}
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={value === tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-sm transition-colors',
              value === tab.id ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-xl bg-white/8 p-1 sm:hidden">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Tab anterior"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:text-white active:bg-white/10"
        >
          <Chevron direction="left" className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 px-2 text-sm text-white transition-colors active:bg-white/15"
        >
          <span className="truncate">{current?.label}</span>
          <span className="shrink-0 text-[0.68rem] text-white/45">
            {index + 1}/{tabs.length}
          </span>
          <Chevron direction="down" className="h-4 w-4 shrink-0 text-white/55" />
        </button>

        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Tab siguiente"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:text-white active:bg-white/10"
        >
          <Chevron direction="right" className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cambiar sección"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] w-full animate-fade-up overflow-y-auto rounded-t-3xl border border-white/10 bg-[#1a1020] p-5 pb-8"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <h2 className="mb-3 text-[0.72rem] uppercase tracking-[0.14em] text-white/55">
              Secciones
            </h2>
            <div className="flex flex-col gap-1.5">
              {tabs.map((tab) => {
                const active = value === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => select(tab.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                      active
                        ? 'border-accent/70 bg-accent/25 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <span>{tab.label}</span>
                    {active && <Check className="h-4 w-4 shrink-0 text-accent-soft" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
