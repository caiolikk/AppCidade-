/**
 * Raio da Home "perto de mim" (plano ocorrencias-criacao-e-mapa, 2026-11-14).
 * 5 km cobre o bairro do usuário e os vizinhos em Santos sem encher a lista. Ajuste aqui.
 * Vale só para a Home: o mapa continua mostrando todas as ocorrências.
 */
export const NEARBY_RADIUS_KM = 5;

export type LatLng = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distância em km pela fórmula de haversine (suficiente para distâncias urbanas). */
export function distanceKm(a: LatLng, b: LatLng) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidCoordinate(point: { latitude: unknown; longitude: unknown }) {
  const lat = Number(point.latitude);
  const lng = Number(point.longitude);
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}

/** "350 m" / "1,2 km" / "12 km". */
export function formatDistance(km: number) {
  if (km < 1) {
    return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  }
  if (km < 10) {
    return `${km.toFixed(1).replace(".", ",")} km`;
  }
  return `${Math.round(km)} km`;
}

/** Diferença angular mínima (0–180°) entre dois rumos. */
export function angleDelta(a: number, b: number) {
  const diff = Math.abs(((a - b) % 360) + 360) % 360;
  return diff > 180 ? 360 - diff : diff;
}
