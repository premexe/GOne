import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardStats } from '../../types';

function ResourceRow({ value, label, percent }: { value: string; label: string; percent: number }) {
  return (
    <div className="resource-row">
      <div><strong>{value}</strong><span>{label}</span></div>
      <div className="progress"><span style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

export function ResourceStatusPanel({ stats }: { stats: DashboardStats }) {
  return (
    <aside className="resource-panel">
      <span className="eyebrow">Resource status</span>
      <div className="resource-panel__lead"><strong>{stats.availableAmbulances.toString().padStart(2, '0')}</strong><span>Ambulances available</span></div>
      <ResourceRow value={`${stats.availableBeds} / ${stats.totalBeds}`} label="Emergency beds" percent={stats.totalBeds ? (stats.availableBeds / stats.totalBeds) * 100 : 0} />
      <ResourceRow value={`${stats.availableDoctors} / ${stats.totalDoctors}`} label="Doctors available" percent={stats.totalDoctors ? (stats.availableDoctors / stats.totalDoctors) * 100 : 0} />
      <ResourceRow value={`${stats.availableIcuBeds} / ${stats.totalIcuBeds}`} label="ICU beds" percent={stats.totalIcuBeds ? stats.availableIcuBeds / stats.totalIcuBeds * 100 : 0} />
      <ResourceRow value={`${stats.availableGeneralBeds ?? 0} / ${stats.totalGeneralBeds ?? 0}`} label="General beds" percent={stats.totalGeneralBeds ? (stats.availableGeneralBeds ?? 0) / stats.totalGeneralBeds * 100 : 0} />
      <p>{stats.availableEmergencyDoctors ?? 0} emergency doctors available</p>
      <Link className="text-link" to="/resources">View resources <ArrowUpRight size={16} /></Link>
    </aside>
  );
}
