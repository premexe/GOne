import { ArrowUpRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Emergency } from '../../types';
import { timeAgo } from '../../utils/format';
import { Badge } from '../ui/Badge';

export function EmergencyPreviewCard({ emergency }: { emergency: Emergency }) {
  const tone = emergency.priority.level.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';

  return (
    <article className={`emergency-card emergency-card--${tone}`}>
      <div className="emergency-card__header">
        <Badge tone={tone}>{emergency.requestStatus === "PENDING" && (tone === "critical" || tone === "high") && <span className={`attention-dot attention-dot--${tone}`} aria-hidden="true"/>}{emergency.priority.level}</Badge>
        <div className="emergency-card__states"><span className="workflow-badge">{emergency.requestStatus}</span><span>Received {timeAgo(emergency.createdAt)}</span></div>
      </div>
      <div className="emergency-card__body">
        <div>
          <span className="emergency-card__id">{emergency.id}</span>
          <h3>{emergency.type}</h3>
          <p className="patient-name">{emergency.patient.name}{emergency.patient.age ? `, ${emergency.patient.age}` : ''}</p>
          <p className="location-line"><MapPin size={14} /> {emergency.location.area} · {emergency.distanceKm} km</p>
        </div>
        <div className="priority-score">
          <span>AI Priority</span>
          <strong>{emergency.priority.score}</strong>
          <small>/100</small>
        </div>
      </div>
      <Link className="text-link" to={`/cases/${emergency.id}`}>View case <ArrowUpRight size={16} /></Link>
    </article>
  );
}
