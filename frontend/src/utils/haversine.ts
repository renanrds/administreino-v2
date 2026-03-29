import type { Coordinates } from '../types';

// Raio da Terra em metros
const EARTH_RADIUS_M = 6371e3;

/**
 * Calcula a distância entre dois pontos no globo em metros usando a Fórmula de Haversine.
 */
export function calculateDistanceMeters(start: Coordinates, end: Coordinates): number {
  const dLat = (end.latitude - start.latitude) * (Math.PI / 180);
  const dLon = (end.longitude - start.longitude) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(start.latitude * (Math.PI / 180)) *
      Math.cos(end.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}