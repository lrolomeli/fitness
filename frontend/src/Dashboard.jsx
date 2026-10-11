import { useState } from 'react';
import { useSession } from './context/SessionContext';
import { usePoll } from './hooks/usePoll';
import Tabs from './components/ui/Tabs';
import ProfileSection from './sections/ProfileSection';
import MealsSection from './sections/MealsSection';
import WorkoutsSection from './sections/WorkoutsSection';
import ProgressSection from './sections/ProgressSection';
import PreferencesSection from './sections/PreferencesSection';

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'comidas', label: 'Comidas' },
  { id: 'entreno', label: 'Entreno' },
  { id: 'progreso', label: 'Progreso' },
  { id: 'preferencias', label: 'Gustos' },
];

export default function Dashboard() {
  const { user, logout } = useSession();
  const [active, setActive] = useState('perfil');
  const { data: state, refresh } = usePoll('/api/state');

  const targets = state?.targets;
  const block = state?.block;
  const guidance = state?.guidance;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#1a1020]/80 backdrop-blur">
        <div className="mx-auto flex max-w-[46rem] items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-base font-light text-white">
            <span className="bg-gradient-to-r from-accent-soft to-hum bg-clip-text font-semibold text-transparent">
              Fitness
            </span>
          </h1>
          <button
            type="button"
            onClick={logout}
            title={user?.username ? `Sesión de ${user.username}` : 'Cerrar sesión'}
            className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
          >
            Salir
          </button>
        </div>
        {targets && (
          <div className="mx-auto flex max-w-[46rem] flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-2 text-[0.7rem] text-white/55">
            <span className="rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-white/80">
              Fase {block?.phase} · {guidance?.name} (sem {block?.weekInPhase})
            </span>
            <span>{targets.target_calories} kcal/día</span>
            <span>P {targets.protein_g} g</span>
            <span>C {targets.carbs_g} g</span>
            <span>G {targets.fat_g} g</span>
          </div>
        )}
      </header>

      <main className="mx-auto flex max-w-[46rem] flex-col gap-3.5 px-4 py-4 pb-28">
        <Tabs tabs={TABS} value={active} onChange={setActive} className="overflow-x-auto" />

        {active === 'perfil' && <ProfileSection state={state} onSaved={refresh} />}
        {active === 'comidas' && <MealsSection state={state} onChanged={refresh} />}
        {active === 'entreno' && <WorkoutsSection />}
        {active === 'progreso' && <ProgressSection />}
        {active === 'preferencias' && <PreferencesSection onChanged={refresh} />}
      </main>
    </div>
  );
}
