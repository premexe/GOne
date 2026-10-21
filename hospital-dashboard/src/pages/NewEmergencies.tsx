import { Inbox, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmergencyPreviewCard } from '../components/dashboard/EmergencyPreviewCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../context/AuthContext';
import { emergencyApi } from '../services/api';
import type { Emergency, PriorityLevel } from '../types';

const filters: Array<'ALL' | PriorityLevel> = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export function NewEmergencies() {
  const { currentHospital } = useAuth();
  const [items, setItems] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<(typeof filters)[number]>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!currentHospital) return;
    let active = true;

    const fetchItems = () => {
      emergencyApi
        .getNew(currentHospital.id)
        .then((data) => {
          if (active) {
            setItems(data);
            setLoading(false);
          }
        })
        .catch((caught: unknown) => {
          if (active) {
            setError(caught instanceof Error ? caught.message : 'Please check the LifeLink backend connection.');
            setLoading(false);
          }
        });
    };

    fetchItems();
    const interval = setInterval(fetchItems, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentHospital, reloadKey]);

  const filtered = useMemo(() => items.filter((item) => {
    const priorityMatch = filter === 'ALL' || item.priority.level === filter;
    const q = query.toLowerCase();
    return priorityMatch && (!q || `${item.id} ${item.type} ${item.patient.name} ${item.location.area}`.toLowerCase().includes(q));
  }), [items, filter, query]);

  return <div className="page new-emergencies-page">
    <header className="page-header page-header--compact"><div><span className="eyebrow">Incoming requests · requires decision</span><h1>New Emergencies</h1><p>Cases allocated to {currentHospital?.name} by the LifeLink network in real time.</p></div><div className="queue-summary"><Inbox size={18} /><strong>{items.length}</strong><span>Pending request{items.length === 1 ? '' : 's'}</span></div></header>
    <div className="queue-toolbar"><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emergency, patient or area…" aria-label="Search new emergencies" /></label><div className="filter-tabs">{filters.map((item) => <button key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item === 'ALL' ? 'All' : item[0] + item.slice(1).toLowerCase()}</button>)}</div></div>
    {loading ? <div className="loading-state">Loading allocated requests…</div> : error ? <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : filtered.length ? <div className="emergencies-page-grid">{filtered.map((item) => <EmergencyPreviewCard key={item.id} emergency={item} />)}</div> : <EmptyState title={items.length ? 'No matching emergency requests' : 'No new emergency requests'} message={items.length ? 'Try another priority or search term.' : 'LifeLink will display newly allocated cases here in real time.'} />}
  </div>;
}
