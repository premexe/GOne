import { Marker, Popup } from 'react-leaflet';
import type { HospitalLocation } from '../../types';
import { coordinate } from '../../utils/map';
import { hospitalIcon } from './mapIcons';

export function HospitalMarker({ hospital }: { hospital: HospitalLocation }) {
  return <Marker position={coordinate(hospital)} icon={hospitalIcon}><Popup className="lifelink-popup"><strong>{hospital.name}</strong><span>{hospital.department}</span><span>LifeLink Connected Facility</span></Popup></Marker>;
}
