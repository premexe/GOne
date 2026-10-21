import { Polyline } from 'react-leaflet';
import type { EmergencyStatus } from '../../types';
import { ambulanceProgress, routeFromProgress, type MapCoordinate } from '../../utils/map';

export function EmergencyRoute({ route, fallback, status, hasAmbulance, unavailable }: {
  route: MapCoordinate[];
  fallback: [MapCoordinate, MapCoordinate];
  status: EmergencyStatus;
  hasAmbulance: boolean;
  unavailable: boolean;
}) {
  if (unavailable || route.length < 2) return <Polyline positions={fallback} pathOptions={{ color: '#7c8f8c', weight: 3, opacity: .58, dashArray: '6 9' }} />;
  const outboundWithAmbulance = hasAmbulance && ['AMBULANCE_ASSIGNED', 'EN_ROUTE'].includes(status);
  const progress = ambulanceProgress(status) ?? 0;
  const remaining = outboundWithAmbulance ? routeFromProgress(route, progress) : [];
  const returning = ['PATIENT_PICKED_UP', 'ARRIVED', 'COMPLETED'].includes(status);

  return <>
    <Polyline positions={route} pathOptions={{ color: returning ? '#0d665f' : '#4b8984', weight: 5, opacity: returning ? .78 : .48 }} />
    {remaining.length > 1 && <Polyline positions={remaining} pathOptions={{ color: '#d26a45', weight: 4, opacity: .9, dashArray: '9 7' }} />}
  </>;
}
