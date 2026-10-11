import { useState } from 'react';
import { useSession } from './context/SessionContext';
import Tabs from './components/ui/Tabs';
import ItemsSection from './sections/ItemsSection';

// Módulo de ejemplo. Agrega aquí los tabs de tu proyecto.
const MODULES = [{ id: 'items', label: 'Items' }];

export default function Dashboard() {
  const { user, logout } = useSession();
  const [active, setActive] = useState(MODULES[0].id);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#1a1020]/80 backdrop-blur">
        <div className="mx-auto flex max-w-[40rem] items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-base font-light text-white">
            <span className="bg-gradient-to-r from-accent-soft to-hum bg-clip-text font-semibold text-transparent">
              App
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
      </header>

      <main className="mx-auto flex max-w-[40rem] flex-col gap-3.5 px-4 py-4 pb-28">
        <Tabs tabs={MODULES} value={active} onChange={setActive} className="overflow-x-auto" />
        <ItemsSection module={active} />
      </main>
    </div>
  );
}
