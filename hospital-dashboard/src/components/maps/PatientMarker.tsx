import { Marker, Popup } from 'react-leaflet';
import type { Emergency } from '../../types';
import { coordinate } from '../../utils/map';
import { patientIcon } from './mapIcons';

export function PatientMarker({ emergency }: { emergency: Emergency }) {
  return <Marker position={coordinate(emergency.location)} icon={patientIcon(emergency.priority.level === 'CRITICAL')}>
    <Popup className="lifelink-popup"><strong>{emergency.patient.name}</strong><span>{emergency.type}</span><span>{emergency.id}</span><span>{emergency.priority.level[0] + emergency.priority.level.slice(1).toLowerCase()} Priority</span><span>{emergency.location.address}</span></Popup>
  </Marker>;
}
