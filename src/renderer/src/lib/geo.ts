export interface LatLon {
  lat: number
  lon: number
}

export function haversineMeters(a: LatLon, b: LatLon): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function distToSegment(p: LatLon, a: LatLon, b: LatLon): number {
  const abx = b.lat - a.lat
  const aby = b.lon - a.lon
  const apx = p.lat - a.lat
  const apy = p.lon - a.lon
  const len2 = abx * abx + aby * aby
  let t = len2 === 0 ? 0 : (apx * abx + apy * aby) / len2
  t = Math.max(0, Math.min(1, t))
  const proj: LatLon = { lat: a.lat + t * abx, lon: a.lon + t * aby }
  return haversineMeters(p, proj)
}

export function distanceToPolylineMeters(p: LatLon, polyline: LatLon[]): number {
  let min = Infinity
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distToSegment(p, polyline[i], polyline[i + 1])
    if (d < min) min = d
  }
  return min === Infinity ? 0 : min
}

export function formatDistance(meters: number): string {
  const m = Math.round(meters)
  if (m < 1000) return `${m.toLocaleString('ar-EG')} م`
  return `${Number((m / 1000).toFixed(1)).toLocaleString('ar-EG')} كم`
}

export function areaCentroid(points: LatLon[]): LatLon | null {
  if (!points.length) return null
  let lat = 0
  let lon = 0
  for (const p of points) {
    lat += p.lat
    lon += p.lon
  }
  return { lat: lat / points.length, lon: lon / points.length }
}

export function areaBounds(points: LatLon[]): { north: number; south: number; east: number; west: number } | null {
  if (!points.length) return null
  const lats = points.map((p) => p.lat)
  const lons = points.map((p) => p.lon)
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lons),
    west: Math.min(...lons)
  }
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value.slice(0, 10)
  return d.toLocaleDateString('ar-EG')
}
