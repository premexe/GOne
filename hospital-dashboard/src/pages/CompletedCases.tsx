import { CheckCircle2, Search, Calendar, ShieldCheck, Ambulance, UserCheck, ArrowUpRight, Clock3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../context/AuthContext';
import { emergencyApi } from '../services/api';
import type { Emergency } from '../types';

export function CompletedCases() {
  const { currentHospital } = useAuth();
  const [items, setItems] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'TODAY'>('ALL');

  useEffect(() => {
    if (!currentHospital) return;
    let active = true;

    const fetchItems = () => {
      emergencyApi
        .getCompleted(currentHospital.id)
        .then((data) => {
          if (active) {
            setItems(data);
            setLoading(false);
          }
        })
        .catch((caught: unknown) => {
          if (active) {
            setError(caught instanceof Error ? caught.message : 'Failed to load completed cases.');
            setLoading(false);
          }
        });
    };

    fetchItems();
    const interval = setInterval(fetchItems, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentHospital, reloadKey]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (activeFilter === 'CRITICAL' && item.priority.level !== 'CRITICAL') return false;
      if (activeFilter === 'TODAY') {
        const itemDate = new Date(item.createdAt).toDateString();
        const today = new Date().toDateString();
        if (itemDate !== today) return false;
      }
      if (!query) return true;
      const q = query.toLowerCase();
      const searchTarget = `${item.id} ${item.type} ${item.patient.name} ${item.location.area} ${item.assignedAmbulance?.vehicleNumber ?? ''} ${item.assignedDoctor?.name ?? ''}`.toLowerCase();
      return searchTarget.includes(q);
    });
  }, [items, activeFilter, query]);

  return (
    <div className="page completed-page">
      <header className="page-header page-header--compact">
        <div>
          <span className="eyebrow">Case history · Transport & clinical handoff finalized</span>
          <h1>Completed Cases</h1>
          <p>Archived emergency records and closed hospital responses coordinated by {currentHospital?.name}.</p>
        </div>
        <div className="queue-summary queue-summary--active" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}>
          <CheckCircle2 size={18} color="#10b981" />
          <strong style={{ color: '#10b981' }}>{items.length}</strong>
          <span>Completed case{items.length === 1 ? '' : 's'}</span>
        </div>
      </header>

      {/* Quick Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#111a33', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', borderRadius: '10px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc' }}>{items.length}</div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Total Handed Off</div>
          </div>
        </div>

        <div style={{ background: '#111a33', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', borderRadius: '10px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ambulance size={22} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc' }}>
              {items.filter(i => i.assignedAmbulance).length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Ambulance Transports</div>
          </div>
        </div>

        <div style={{ background: '#111a33', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.15)', borderRadius: '10px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={22} color="#a855f7" />
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc' }}>
              {items.filter(i => i.assignedDoctor).length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Physician Admissions</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="queue-toolbar">
        <label className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by case ID, patient, vehicle, doctor or area…"
            aria-label="Search completed cases"
          />
        </label>
        <div className="filter-tabs status-filter-tabs">
          <button className={activeFilter === 'ALL' ? 'is-active' : ''} onClick={() => setActiveFilter('ALL')}>
            All Completed ({items.length})
          </button>
          <button className={activeFilter === 'CRITICAL' ? 'is-active' : ''} onClick={() => setActiveFilter('CRITICAL')}>
            Critical Triage
          </button>
          <button className={activeFilter === 'TODAY' ? 'is-active' : ''} onClick={() => setActiveFilter('TODAY')}>
            Today
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="loading-state">Loading completed cases…</div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((v) => v + 1)} />
      ) : filtered.length ? (
        <div className="ongoing-grid">
          {filtered.map((item) => (
            <article key={item.id} className="ongoing-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div className="ongoing-card__header">
                <div className="ongoing-card__title">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="case-id" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      #{item.id}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '999px' }}>
                      <CheckCircle2 size={12} /> COMPLETED
                    </span>
                  </div>
                  <h3>{item.patient.name}</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="priority-pill priority-pill--critical" style={{ fontSize: '0.72rem' }}>
                    {item.priority.level}
                  </span>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                    Score {item.priority.score}/100
                  </div>
                </div>
              </div>

              <div className="ongoing-card__meta" style={{ marginTop: '0.75rem' }}>
                <div className="meta-item">
                  <span className="meta-label">Incident Area</span>
                  <span className="meta-value">{item.location.area || 'Palghar District Emergency Zone'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Triggered At</span>
                  <span className="meta-value">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '0.75rem', marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#94a3b8' }}>Assigned Ambulance:</span>
                  <strong style={{ color: '#f8fafc' }}>
                    {item.assignedAmbulance ? `${item.assignedAmbulance.vehicleNumber} (${item.assignedAmbulance.driverName || 'Paramedic'})` : 'Local Fleet Unit'}
                  </strong>
                </div>
                {item.assignedDoctor && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94a3b8' }}>Attending Doctor:</span>
                    <strong style={{ color: '#f8fafc' }}>{item.assignedDoctor.name}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#94a3b8' }}>Final Resolution:</span>
                  <strong style={{ color: '#10b981' }}>Transport Handoff & ER Bed Admitted</strong>
                </div>
              </div>

              <div className="ongoing-card__actions" style={{ marginTop: '1rem' }}>
                <Link to={`/cases/${item.id}`} className="button button--secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem' }}>
                  View Full Case Audit Trail <ArrowUpRight size={14} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={items.length ? 'No matching completed cases' : 'No completed cases yet'}
          message={items.length ? 'Try changing your search or filter options.' : 'Cases that are marked completed will appear in this archive with full resolution timelines.'}
        />
      )}
    </div>
  );
}
