import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="min-h-screen bg-[#09090f] text-white max-w-lg mx-auto relative ambient-glow">
      <main className="pb-24 relative z-10">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
