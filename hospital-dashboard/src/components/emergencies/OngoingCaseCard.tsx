import { Ambulance, ArrowUpRight, CheckCircle2, Clock3, MapPin, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Emergency } from '../../types';
import { readableStatus, timeAgo } from '../../utils/format';
import { Badge } from '../ui/Badge';

const progressByStatus: Record<string, number> = { ACCEPTED: 15, AMBULANCE_ASSIGNED: 32, EN_ROUTE: 52, PATIENT_PICKED_UP: 72, ARRIVED: 90, COMPLETED: 100 };

export function OngoingCaseCard({ emergency }: { emergency: Emergency }) {
  const tone = emergency.priority.level.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
  const eta = emergency.status === 'PATIENT_PICKED_UP' ? emergency.estimatedArrivalMinutes : emergency.status === 'ARRIVED' ? 0 : Math.max(1, Math.round((emergency.estimatedArrivalMinutes ?? 10) * .55));

  return <article className="ongoing-card">
    <div className="ongoing-card__top"><div><span className="emergency-card__id">{emergency.id}</span><Badge tone={tone}>{emergency.priority.level}</Badge></div>{emergency.status === 'COMPLETED' ? (
      <span className="ongoing-status" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.12)' }}>
        <CheckCircle2 size={13} color="#10b981" /> Completed
      </span>
    ) : (
      <span className="ongoing-status"><i />{readableStatus(emergency.status)}</span>
    )}</div>
    <div className="ongoing-card__title"><div><h3>{emergency.patient.name}</h3><p>{emergency.type}</p></div><div className="ongoing-eta"><small>{eta === 0 ? 'At hospital' : 'Prototype ETA'}</small><strong>{eta === 0 ? 'Arrived' : `${eta} min`}</strong></div></div>
    <div className="case-progress" aria-label={`Case progress ${progressByStatus[emergency.status] ?? 10}%`}><span style={{ width: `${progressByStatus[emergency.status] ?? 10}%` }} /></div>
    <div className="ongoing-meta">
      <div><Ambulance size={16} /><span><small>Ambulance</small><strong>{emergency.assignedAmbulance?.vehicleNumber ?? 'Not assigned'}</strong></span></div>
      <div><Stethoscope size={16} /><span><small>Doctor</small><strong>{emergency.assignedDoctor?.name ?? 'Not assigned'}</strong></span></div>
      <div><MapPin size={16} /><span><small>Location</small><strong>{emergency.location.area}</strong></span></div>
      <div><Clock3 size={16} /><span><small>Elapsed</small><strong>{timeAgo(emergency.acceptedAt ?? emergency.createdAt).replace(' ago', '')}</strong></span></div>
    </div>
    <Link className="text-link" to={`/cases/${emergency.id}`}>Open case <ArrowUpRight size={16} /></Link>
  </article>;
}
