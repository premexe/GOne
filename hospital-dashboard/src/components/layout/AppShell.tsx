import { Menu, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { currentHospital } = useAuth();

  return (
    <div className="app-shell">
      <div className={`mobile-drawer ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)}>
        <div onClick={(event) => event.stopPropagation()}><Sidebar /></div>
      </div>
      <div className="desktop-sidebar"><Sidebar /></div>
      <main className="app-main">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <strong>{currentHospital?.shortName ?? 'LifeLink AI+'}</strong>
          <ShieldCheck size={19} />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
