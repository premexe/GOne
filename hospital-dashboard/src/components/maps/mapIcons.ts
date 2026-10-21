import L from 'leaflet';

function markerIcon(kind: 'patient' | 'hospital' | 'ambulance', label: string, pulse = false) {
  return L.divIcon({
    className: 'lifelink-map-marker-wrapper',
    html: `<div class="lifelink-map-marker lifelink-map-marker--${kind}${pulse ? ' is-pulsing' : ''}" aria-hidden="true"><span>${label}</span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 38],
    popupAnchor: [0, -35],
  });
}

export const patientIcon = (critical: boolean) => markerIcon('patient', 'SOS', critical);
export const hospitalIcon = markerIcon('hospital', 'ER');
export const ambulanceIcon = markerIcon('ambulance', 'AMB');
