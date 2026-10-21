import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { getRoute } from '../../services/routing';
import type { Emergency, Hospital, RouteResult } from '../../types';
import { ambulanceProgress, approximateAmbulancePosition, coordinate, pointAlongRoute, type MapCoordinate } from '../../utils/map';
import { AmbulanceMarker } from './AmbulanceMarker';
import { EmergencyRoute } from './EmergencyRoute';
import { HospitalMarker } from './HospitalMarker';
import { PatientMarker } from './PatientMarker';

export interface MapRouteState {
  result: RouteResult | null;
  loading: boolean;
  unavailable: boolean;
}

function MapViewport({ points }: { points: MapCoordinate[] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (points.length > 1) map.fitBounds(points, { padding: [42, 42], maxZoom: 14 });
  }, [map, points]);
  return null;
}

export function EmergencyMap({ emergency, hospital, onRouteState }: { emergency: Emergency; hospital: Hospital; onRouteState?: (state: MapRouteState) => void }) {
  const patient = useMemo<MapCoordinate>(() => coordinate(emergency.location), [emergency.location.latitude, emergency.location.longitude]);
  const facility = useMemo<MapCoordinate>(() => coordinate(hospital), [hospital.latitude, hospital.longitude]);
  const returning = ['PATIENT_PICKED_UP', 'ARRIVED', 'COMPLETED'].includes(emergency.status);
  const start = returning ? patient : facility;
  const end = returning ? facility : patient;
  const [routeState, setRouteState] = useState<MapRouteState>({ result: null, loading: true, unavailable: false });

  useEffect(() => {
    let active = true;
    const loadingState: MapRouteState = { result: null, loading: true, unavailable: false };
    setRouteState(loadingState);
    onRouteState?.(loadingState);
    getRoute(start, end).then((result) => {
      if (!active) return;
      const readyState = { result, loading: false, unavailable: false };
      setRouteState(readyState); onRouteState?.(readyState);
    }).catch(() => {
      if (!active) return;
      const fallbackState = { result: null, loading: false, unavailable: true };
      setRouteState(fallbackState); onRouteState?.(fallbackState);
    });
    return () => { active = false; };
  }, [start[0], start[1], end[0], end[1], onRouteState]);

  const route = routeState.result?.coordinates ?? [];
  const progress = ambulanceProgress(emergency.status);
  const ambulancePosition = emergency.assignedAmbulance && progress !== null
    ? route.length > 1 ? pointAlongRoute(route, progress) : approximateAmbulancePosition(emergency.status, start, end)
    : null;
  const viewportPoints = useMemo(() => route.length > 1 ? route : [patient, facility, ...(ambulancePosition ? [ambulancePosition] : [])], [route, patient, facility, ambulancePosition]);
  const routeMessage = routeState.loading ? 'Finding road route…' : routeState.unavailable ? 'Road route temporarily unavailable' : 'OSRM road route · prototype ETA';

  return <div className="emergency-map" aria-label={`Road map showing ${emergency.patient.name}'s emergency location and ${hospital.name}`}>
    <MapContainer center={patient} zoom={13} scrollWheelZoom className="emergency-map__canvas">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <EmergencyRoute route={route} fallback={[start, end]} status={emergency.status} hasAmbulance={Boolean(emergency.assignedAmbulance)} unavailable={routeState.unavailable} />
      <PatientMarker emergency={emergency} />
      <HospitalMarker hospital={hospital} />
      {emergency.assignedAmbulance && ambulancePosition && <AmbulanceMarker ambulance={emergency.assignedAmbulance} position={ambulancePosition} status={emergency.status} />}
      <MapViewport points={viewportPoints} />
    </MapContainer>
    <span className={`map-simulation-label ${routeState.unavailable ? 'is-unavailable' : ''}`}>{routeMessage}</span>
  </div>;
}
