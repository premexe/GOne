import { Activity, Ambulance, Clock3, Inbox, RadioTower, Siren } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmergencyActivityChart } from '../components/dashboard/EmergencyActivityChart';
import { EmergencyPreviewCard } from '../components/dashboard/EmergencyPreviewCard';
import { MetricCard } from '../components/dashboard/MetricCard';
import { ResourceStatusPanel } from '../components/dashboard/ResourceStatusPanel';
import { OngoingCaseCard } from '../components/emergencies/OngoingCaseCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, emergencyApi } from '../services/api';
import { resourceService } from '../services/resourceService';
import { DATA_CHANGED_EVENT } from '../services/mockStore';
import { Link } from 'react-router-dom';
import type { ActivityPoint, DashboardStats, Emergency } from '../types';

export function Dashboard() {
  const { currentHospital } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [newCases, setNewCases] = useState<Emergency[]>([]);
  const [ongoingCases, setOngoingCases] = useState<Emergency[]>([]);
  const [completedCases, setCompletedCases] = useState<Emergency[]>([]);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { const refresh = () => setReloadKey(n => n+1); window.addEventListener(DATA_CHANGED_EVENT,refresh); return () => window.removeEventListener(DATA_CHANGED_EVENT,refresh); }, []);
  useEffect(() => {
    if (!currentHospital) return;
    let active = true;
    setError(''); setStats(null);
    Promise.all([dashboardApi.getStats(currentHospital.id), emergencyApi.getNew(currentHospital.id), emergencyApi.getOngoing(currentHospital.id), dashboardApi.getActivity(currentHospital.id), resourceService.getResources(currentHospital.id)]).then(([statsData, newData, ongoingData, activityData, resources]) => {
      if (!active) return;
      setStats({...statsData, availableGeneralBeds: resources.beds.general.available, totalGeneralBeds: resources.beds.general.total, availableEmergencyDoctors: resources.doctors.filter(d=>d.status === "AVAILABLE" && /emergency/i.test(`${d.department} ${d.specialization}`)).length, availableAmbulances: resources.ambulances.filter(a=>a.status==='AVAILABLE').length, totalAmbulances: resources.ambulances.length, availableDoctors: resources.doctors.filter(d=>d.status==='AVAILABLE').length, totalDoctors: resources.doctors.length, availableBeds: resources.beds.emergency.available, totalBeds: resources.beds.emergency.total, availableIcuBeds: resources.beds.icu.available, totalIcuBeds: resources.beds.icu.total}); setNewCases(newData); setOngoingCases(ongoingData); setActivity(activityData);
    }).catch((caught: unknown) => { if(active) setError(caught instanceof Error ? caught.message : 'Please check the LifeLink backend connection.'); });

    const pollInterval = setInterval(() => {
      Promise.all([
        emergencyApi.getNew(currentHospital.id),
        emergencyApi.getOngoing(currentHospital.id),
        emergencyApi.getCompleted(currentHospital.id),
      ]).then(([newData, ongoingData, compData]) => {
        if (!active) return;
        setNewCases(newData);
        setOngoingCases(ongoingData);
        setCompletedCases(compData);
      }).catch(() => {});
    }, 3000);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [currentHospital, reloadKey]);

  if (error) return <div className="page"><ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} /></div>;
  if (!stats || !currentHospital) return <div className="page loading-state">Loading hospital operations…</div>;

  return <div className="page dashboard-page">
    <header className="page-header"><div><span className="eyebrow">{currentHospital.id} · Hospital overview</span><h1>Emergency operations<br />at a glance.</h1><p>{currentHospital.name} · {currentHospital.networkRegion} Network</p></div><div className="connection-pill"><span /> LifeLink Connected</div></header>
    <section className="emergency-first">
      <div className="emergency-list-section dashboard-queues">
        <div className="section-heading"><div><span className="eyebrow">Priority dispatch board</span><h2>New Emergencies {newCases.length > 0 && <span className="attention-dot attention-dot--high" aria-hidden="true"/>} · {newCases.length}</h2></div><span>{newCases.filter(e=>e.priority.level === "CRITICAL").length} critical pending · {newCases.length} decisions needed</span></div>
        <div className="dashboard-queue-block"><div className="dashboard-queue-label"><Inbox size={15} /><span><strong>New request</strong>Requires decision</span></div>{newCases.length ? newCases.slice(0,3).map(emergency => <EmergencyPreviewCard key={emergency.id} emergency={emergency} />) : <EmptyState title="No new requests" message="The incoming queue is currently clear." />}</div>
        <Link className="text-link" to="/new-emergencies">View all new emergencies →</Link>
        <Link className="text-link" to="/completed-cases" style={{ color: "#10b981" }}>View completed cases archive ({completedCases.length}) →</Link>
        <div className="dashboard-queue-block dashboard-queue-block--ongoing"><div className="dashboard-queue-label"><Activity size={15} /><span><strong>Ongoing response</strong>Active operation</span></div>{ongoingCases[0] ? <OngoingCaseCard emergency={ongoingCases[0]} /> : <EmptyState title="No ongoing cases" message="Accepted cases will appear here." />}</div>
      </div>

    </section>
    <section className="metric-grid metric-grid--five" aria-label="Hospital metrics">
      <MetricCard label="New emergencies" value={newCases.length.toString().padStart(2, '0')} detail="Awaiting hospital decision" icon={Inbox} />
      <MetricCard label="Ongoing cases" value={ongoingCases.length.toString().padStart(2, '0')} detail="Active hospital responses" icon={RadioTower} tone="ivory" />
      <MetricCard label="Critical active" value={(newCases.filter(e => e.priority.level === 'CRITICAL').length + ongoingCases.filter(e => e.priority.level === 'CRITICAL').length).toString().padStart(2, '0')} detail="Immediate attention required" icon={Siren} tone="critical" />
      <MetricCard label="Available ambulances" value={`${stats.availableAmbulances} / ${stats.totalAmbulances}`} detail="Hospital fleet ready" icon={Ambulance} />
      <MetricCard label="Response time" value={`${stats.averageResponseTimeMinutes} min`} detail="Current prototype average" icon={Clock3} />
    </section>
    <ResourceStatusPanel stats={stats} />
    <EmergencyActivityChart data={activity} />
  </div>;
}
