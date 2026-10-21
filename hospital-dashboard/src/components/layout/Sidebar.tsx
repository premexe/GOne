import { Ambulance, CheckCircle2, Inbox, LayoutDashboard, LogOut, RadioTower, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { demoApi, emergencyApi } from '../../services/api';
import { DATA_CHANGED_EVENT } from '../../services/mockStore';

import { isMockMode } from '../../config/runtime';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

const navItems = [
  { to: '/dashboard', label: 'Overview', index: '01', icon: LayoutDashboard },
  { to: '/new-emergencies', label: 'New Emergencies', index: '02', icon: Inbox },
  { to: '/ongoing-cases', label: 'Ongoing Cases', index: '03', icon: RadioTower },
  { to: '/completed-cases', label: 'Completed Cases', index: '04', icon: CheckCircle2 },
  { to: '/resources', label: 'Resources', index: '05', icon: Ambulance },
];

export function Sidebar() {
  const { currentHospital, logout } = useAuth();
  const navigate = useNavigate();
  const [resetOpen,setResetOpen] = useState(false);
  const [counts, setCounts] = useState({ newCases: 0, ongoing: 0, completed: 0 });

  useEffect(() => {
    if (!currentHospital) return;
    const load = () => Promise.all([emergencyApi.getNew(currentHospital.id), emergencyApi.getOngoing(currentHospital.id), emergencyApi.getCompleted(currentHospital.id)]).then(([newCases, ongoing, comp]) => setCounts({ newCases: newCases.length, ongoing: ongoing.length, completed: comp.length }));
    void load().catch(() => setCounts({newCases:0,ongoing:0,completed:0}));
    const refresh = () => { void load().catch(() => setCounts({newCases:0,ongoing:0,completed:0})); };
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, [currentHospital]);

  if (!currentHospital) return null;

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  async function resetDemo() {
    await demoApi.reset();
    window.location.assign('/login');
  }

  return <aside className="sidebar">
    <div>
      <NavLink to="/dashboard" className="brand"><span className="brand__mark">L+</span><span><strong>LifeLink AI+</strong><small>Hospital Network</small></span></NavLink>
      <nav className="sidebar__nav" aria-label="Primary navigation">
        {navItems.map(({ to, label, index, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}><span className="nav-item__index">{index}</span><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'New Emergencies' && <span className="nav-item__count">{counts.newCases > 0 && <i className="attention-dot attention-dot--high" aria-hidden="true"/>}{counts.newCases}</span>}{label === 'Ongoing Cases' && counts.ongoing > 0 && <span className="nav-item__count nav-item__count--teal">{counts.ongoing}</span>}{label === 'Completed Cases' && counts.completed > 0 && <span className="nav-item__count" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}>{counts.completed}</span>}</NavLink>)}
      </nav>
    </div>
    <div className="sidebar__footer">
      <div className="hospital-card"><span className="eyebrow eyebrow--light">Current hospital · {currentHospital.id}</span><strong>{currentHospital.name}</strong><span>{currentHospital.area}, {currentHospital.city}</span><span className="system-status"><i /> LifeLink Connected</span></div>
      {isMockMode && <button type="button" className="sidebar__utility" onClick={()=>setResetOpen(true)}><RotateCcw size={14} /> Reset demo data</button>}
      {resetOpen && <ConfirmationDialog title="Reset demo data?" message="This resets cases and resource changes for all four demo hospitals, and removes locally registered hospital accounts." onConfirm={resetDemo} onClose={()=>setResetOpen(false)}/>}
      <button type="button" className="sidebar__logout" onClick={signOut}><LogOut size={16} /> Logout</button>
    </div>
  </aside>;
}
