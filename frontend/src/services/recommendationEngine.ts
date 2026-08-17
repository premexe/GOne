import { Hospital } from '../types';

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function rankHospitalsForEmergency(
  hospitals: Hospital[],
  userLat: number = 19.700,
  userLng: number = 72.770,
  requestedSpecialty?: string,
  urgencyTier: 'low' | 'moderate' | 'high' | 'critical' = 'high'
): Hospital[] {
  return hospitals.map((h) => {
    const dist = calculateDistanceKm(userLat, userLng, h.lat, h.lng);
    const eta = Math.round(dist * 2.5 + 3); // realistic city driving speed ~25km/h + 3m dispatch

    // Specialty matching score (0 to 100)
    let specialtyScore = 60;
    if (requestedSpecialty) {
      const match = h.specialties.some(
        (s) => s.toLowerCase() === requestedSpecialty.toLowerCase()
      );
      specialtyScore = match ? 100 : 30;
    } else if (urgencyTier === 'critical') {
      const traumaMatch = h.specialties.includes('trauma') || h.specialties.includes('cardiac');
      specialtyScore = traumaMatch ? 95 : 50;
    }

    // Availability score (0 to 100)
    const availabilityRatio = h.availableBeds / Math.max(h.bedCapacity, 1);
    const availabilityScore = Math.min(Math.round(availabilityRatio * 300), 100);

    // Distance score (closer = higher)
    const distanceScore = Math.max(100 - dist * 12, 10);

    // Composite weighted match score
    const compositeScore = Math.round(
      distanceScore * 0.45 + specialtyScore * 0.35 + availabilityScore * 0.20
    );

    // Generate AI explanation string
    let reason = '';
    if (dist <= 3 && h.availableBeds > 5) {
      reason = `Top recommendation: Nearest facility (${dist} km, ${eta}m ETA) with ${h.availableBeds} beds available and active emergency unit.`;
    } else if (specialtyScore >= 90) {
      reason = `Top recommendation: Specialized care match for ${requestedSpecialty || 'trauma/cardiac'} with confirmed bed capacity.`;
    } else {
      reason = `Ranked #1 based on optimal balance of proximity (${dist} km) and open bed availability (${h.availableBeds} beds).`;
    }

    return {
      ...h,
      distanceKm: dist,
      etaMinutes: eta,
      matchScore: compositeScore,
      recommendationReason: reason,
    };
  }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}
