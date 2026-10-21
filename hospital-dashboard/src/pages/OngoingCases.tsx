import { Link } from 'react-router-dom';
import { RadioTower, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { OngoingCaseCard } from '../components/emergencies/OngoingCaseCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../context/AuthContext';
import { emergencyApi } from '../services/api';
import type { Emergency, EmergencyStatus } from '../types';

const statusFilters: Array<'ALL' | EmergencyStatus> = ['ALL', 'ACCEPTED', 'AMBULANCE_ASSIGNED', 'EN_ROUTE', 'PATIENT_PICKED_UP', 'ARRIVED', 'COMPLETED'];

export function OngoingCases() {
  const { currentHospital } = useAuth();
  const [items, setItems] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!currentHospital) return;
    let active = true;

    const fetchItems = () => {
      Promise.all([
        emergencyApi.getOngoing(currentHospital.id),
        emergencyApi.getCompleted(currentHospital.id),
      ])
        .then(([ongoingData, completedData]) => {
          if (active) {
            const map = new Map<string, Emergency>();
            for (const item of [...ongoingData, ...completedData]) {
              map.set(item.id, item);
            }
            setItems(Array.from(map.values()).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
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
    const statusMatch = filter === 'ALL' || item.status === filter;
    const q = query.toLowerCase();
    return statusMatch && (!q || `${item.id} ${item.type} ${item.patient.name} ${item.location.area} ${item.assignedAmbulance?.vehicleNumber ?? ''} ${item.assignedDoctor?.name ?? ''}`.toLowerCase().includes(q));
  }), [items, filter, query]);

  return <div className="page ongoing-page">
    <header className="page-header page-header--compact"><div><span className="eyebrow">Active operations · in progress</span><h1>Ongoing Cases</h1><p>Accepted responses currently coordinated by {currentHospital?.name}.</p></div><div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><Link to="/completed-cases" className="button button--secondary" style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>View Completed Cases →</Link><div className="queue-summary queue-summary--active"><RadioTower size={18} /><strong>{items.length}</strong><span>Active response{items.length === 1 ? '' : 's'}</span></div></div></header>
    <div className="queue-toolbar"><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search case, resource or area…" aria-label="Search ongoing cases" /></label><div className="filter-tabs status-filter-tabs">{statusFilters.map((item) => <button key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item === 'ALL' ? 'All' : item.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}</button>)}</div></div>
    {loading ? <div className="loading-state">Loading active responses…</div> : error ? <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : filtered.length ? <div className="ongoing-grid">{filtered.map((item) => <OngoingCaseCard key={item.id} emergency={item} />)}</div> : <EmptyState title={items.length ? 'No matching active cases' : 'No active response cases'} message={items.length ? 'Try another status or search term.' : 'Accepted emergencies will appear here.'} />}
  </div>;
}
