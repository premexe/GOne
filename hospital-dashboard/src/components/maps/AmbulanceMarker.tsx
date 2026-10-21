import { Marker, Popup } from 'react-leaflet';
import type { Ambulance, EmergencyStatus } from '../../types';
import type { MapCoordinate } from '../../utils/map';
import { ambulanceIcon } from './mapIcons';

export function AmbulanceMarker({ ambulance, position, status }: { ambulance: Ambulance; position: MapCoordinate; status: EmergencyStatus }) {
  return <Marker position={position} icon={ambulanceIcon}><Popup className="lifelink-popup"><strong>{ambulance.vehicleNumber}</strong>{ambulance.registrationNumber && <span>{ambulance.registrationNumber}</span>}<span>Driver: {ambulance.driverName}</span><span>Status: {status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}</span><small>Simulated prototype position</small></Popup></Marker>;
}
