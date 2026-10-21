import type { RouteResult } from '../types';
import type { MapCoordinate } from '../utils/map';

const OSRM_BASE_URL = import.meta.env?.VITE_OSRM_BASE_URL ?? 'https://router.project-osrm.org';
const cache = new Map<string, RouteResult>();

interface OsrmResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { type: 'LineString'; coordinates: Array<[number, number]> };
  }>;
}

export async function getRoute(start: MapCoordinate, end: MapCoordinate): Promise<RouteResult> {
  const key = [...start, ...end].map((value) => value.toFixed(5)).join(':');
  const cached = cache.get(key);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);
  const coordinates = `${start[1]},${start[0]};${end[1]},${end[0]}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Routing service returned ${response.status}`);
    const data = await response.json() as OsrmResponse;
    const route = data.routes?.[0];
    if (data.code !== 'Ok' || !route || route.geometry.type !== 'LineString' || route.geometry.coordinates.length < 2) {
      throw new Error('No road route was found');
    }
    const result: RouteResult = {
      coordinates: route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
      distanceKm: Number((route.distance / 1000).toFixed(1)),
      durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      provider: 'OSRM',
    };
    cache.set(key, result);
    return result;
  } finally {
    window.clearTimeout(timeout);
  }
}
