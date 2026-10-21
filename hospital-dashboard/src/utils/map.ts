import type { EmergencyLocation, EmergencyStatus } from '../types';

export type MapCoordinate = [number, number];

export const coordinate = (location: EmergencyLocation): MapCoordinate => [location.latitude, location.longitude];

const interpolate = (from: MapCoordinate, to: MapCoordinate, progress: number): MapCoordinate => [
  from[0] + (to[0] - from[0]) * progress,
  from[1] + (to[1] - from[1]) * progress,
];

export function ambulanceProgress(status: EmergencyStatus) {
  if (status === 'AMBULANCE_ASSIGNED') return 0.04;
  if (status === 'EN_ROUTE') return 0.52;
  if (status === 'PATIENT_PICKED_UP') return 0;
  if (status === 'ARRIVED' || status === 'COMPLETED') return 1;
  return null;
}

// Prototype-only state snapshots along a returned road geometry; this is not live GPS.
export function pointAlongRoute(route: MapCoordinate[], progress: number): MapCoordinate {
  if (!route.length) return [0, 0];
  const index = Math.min(route.length - 1, Math.max(0, Math.round((route.length - 1) * progress)));
  return route[index];
}

export function routeFromProgress(route: MapCoordinate[], progress: number): MapCoordinate[] {
  if (!route.length) return [];
  const index = Math.min(route.length - 1, Math.max(0, Math.round((route.length - 1) * progress)));
  return route.slice(index);
}

export function approximateAmbulancePosition(status: EmergencyStatus, routeStart: MapCoordinate, routeEnd: MapCoordinate): MapCoordinate | null {
  const progress = ambulanceProgress(status);
  if (progress === null) return null;
  return interpolate(routeStart, routeEnd, progress);
}

export function prototypeAmbulanceEta(status: EmergencyStatus, routeMinutes: number | null) {
  if (status === 'PATIENT_PICKED_UP' || status === 'ARRIVED' || status === 'COMPLETED') return 0;
  const progress = ambulanceProgress(status);
  if (progress === null || routeMinutes === null) return null;
  return Math.max(1, Math.round(routeMinutes * (1 - progress)));
}
