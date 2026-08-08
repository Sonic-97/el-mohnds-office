import { getDb } from './db'
import type {
  MapArea,
  MapAreaInput,
  ZagazigPoi,
  ZagazigPoiCategory,
  ZagazigPoiData,
  ZagazigRoad,
  ZagazigRoadKind
} from '@shared/types'

export const ZAGAZIG_CENTER = { lat: 30.5877, lon: 31.502 }
export const ZAGAZIG_BBOX = '30.53,31.45,30.65,31.55'

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
]

const CACHE_MAX_AGE_DAYS = 30

const POI_CATEGORY_LABEL: Record<ZagazigPoiCategory, string> = {
  hospital: 'مستشفى',
  clinic: 'عيادة',
  pharmacy: 'صيدلية',
  university: 'جامعة',
  school: 'مدرسة',
  bank: 'بنك / صراف',
  government: 'خدمة حكومية',
  park: 'حديقة',
  shopping: 'تسوق / مول',
  market: 'سوق',
  food: 'مطعم / كافيه',
  transport: 'مواصلات'
}

const AMENITY_CATEGORY: Record<string, ZagazigPoiCategory> = {
  hospital: 'hospital',
  clinic: 'clinic',
  pharmacy: 'pharmacy',
  university: 'university',
  college: 'university',
  school: 'school',
  bank: 'bank',
  atm: 'bank',
  townhall: 'government',
  police: 'government',
  fire_station: 'government',
  marketplace: 'market',
  bus_station: 'transport',
  restaurant: 'food',
  cafe: 'food',
  fast_food: 'food'
}

const AMENITY_FILTER = 'hospital|clinic|pharmacy|university|college|school|bank|atm|townhall|police|fire_station|marketplace|bus_station'
const FOOD_FILTER = 'restaurant|cafe|fast_food'

const POI_QUERY = `[out:json][timeout:60][bbox:${ZAGAZIG_BBOX}];(` +
  `node["amenity"~"^(${AMENITY_FILTER})$"];` +
  `way["amenity"~"^(${AMENITY_FILTER})$"];` +
  `node["leisure"~"^(park|garden)$"];` +
  `way["leisure"~"^(park|garden)$"];` +
  `node["railway"~"^(station|halt|tram_stop)$"];` +
  `way["railway"~"^(station|halt)$"];` +
  `node["highway"="bus_stop"];` +
  `node["shop"~"^(mall|supermarket)$"];` +
  `way["shop"~"^(mall|supermarket)$"];` +
  `node["amenity"~"^(${FOOD_FILTER})$"];` +
  `way["amenity"~"^(${FOOD_FILTER})$"];` +
  `node["office"="government"];` +
  `); out center tags;`

const ROAD_QUERY = `[out:json][timeout:60][bbox:${ZAGAZIG_BBOX}];` +
  `way["highway"~"^(trunk|primary|secondary|tertiary)$"];` +
  `out geom;`

async function overpass(query: string, timeoutMs = 60000): Promise<any[]> {
  let lastErr: unknown = null
  for (const url of ENDPOINTS) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AlMohandsEngineerOffice/1.0 (real-estate desktop app)'
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: ac.signal
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { elements?: unknown[] }
      return Array.isArray(data?.elements) ? data.elements : []
    } catch (e) {
      lastErr = e
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastErr ?? new Error('فشل الاتصال بخادم OpenStreetMap')
}

function categorize(tags: Record<string, string>): ZagazigPoiCategory | null {
  const amenity = tags['amenity']
  if (amenity && AMENITY_CATEGORY[amenity]) return AMENITY_CATEGORY[amenity]
  if (tags['office'] === 'government') return 'government'
  if (tags['leisure'] === 'park' || tags['leisure'] === 'garden') return 'park'
  if (tags['railway'] === 'station' || tags['railway'] === 'halt' || tags['railway'] === 'tram_stop') return 'transport'
  if (tags['highway'] === 'bus_stop') return 'transport'
  if (tags['shop'] === 'mall' || tags['shop'] === 'supermarket') return 'shopping'
  return null
}

function poiName(tags: Record<string, string>, category: ZagazigPoiCategory): string {
  return tags['name:ar'] || tags['name'] || POI_CATEGORY_LABEL[category]
}

async function fetchPois(): Promise<ZagazigPoi[]> {
  const elements = await overpass(POI_QUERY)
  const seen = new Set<string>()
  const pois: ZagazigPoi[] = []
  for (const el of elements) {
    const category = categorize(el.tags ?? {})
    if (!category) continue
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (typeof lat !== 'number' || typeof lon !== 'number') continue
    const key = `${category}:${lat.toFixed(4)},${lon.toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    pois.push({ id: `${el.type}-${el.id}`, category, name: poiName(el.tags ?? {}, category), lat, lon })
  }
  return pois
}

async function fetchRoads(): Promise<ZagazigRoad[]> {
  const elements = await overpass(ROAD_QUERY)
  const roads: ZagazigRoad[] = []
  for (const el of elements) {
    const hw = el.tags?.highway
    if (!hw || !Array.isArray(el.geometry) || el.geometry.length < 2) continue
    const kind: ZagazigRoadKind = hw === 'tertiary' ? 'important' : 'main'
    roads.push({
      id: `${el.type}-${el.id}`,
      kind,
      name: el.tags?.['name:ar'] || el.tags?.name || undefined,
      points: el.geometry.map((g: any) => ({ lat: g.lat, lon: g.lon }))
    })
  }
  return roads
}

function readCache(): { pois: ZagazigPoi[]; roads: ZagazigRoad[]; fetchedAt: string } | null {
  const row = getDb().prepare('SELECT payload, fetchedAt FROM zmap_cache WHERE key = ?').get('poi') as
    | { payload: string; fetchedAt: string }
    | undefined
  if (!row) return null
  try {
    const parsed = JSON.parse(row.payload)
    return { pois: parsed.pois ?? [], roads: parsed.roads ?? [], fetchedAt: row.fetchedAt }
  } catch {
    return null
  }
}

function writeCache(pois: ZagazigPoi[], roads: ZagazigRoad[]): void {
  getDb()
    .prepare(
      `INSERT INTO zmap_cache (key, payload, fetchedAt) VALUES ('poi', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, fetchedAt = datetime('now')`
    )
    .run(JSON.stringify({ pois, roads }))
}

export async function getZagazigPoiData(force = false): Promise<ZagazigPoiData> {
  const cached = readCache()
  if (cached) {
    const ageMs = Date.now() - new Date(cached.fetchedAt).getTime()
    const ageDays = ageMs / (24 * 60 * 60 * 1000)
    if (!force && ageDays < CACHE_MAX_AGE_DAYS) {
      return { pois: cached.pois, roads: cached.roads, fetchedAt: cached.fetchedAt }
    }
  }
  try {
    const [pois, roads] = await Promise.all([fetchPois(), fetchRoads()])
    writeCache(pois, roads)
    return { pois, roads, fetchedAt: new Date().toISOString() }
  } catch (e) {
    if (cached) return { pois: cached.pois, roads: cached.roads, fetchedAt: cached.fetchedAt, error: String(e) }
    return { pois: [], roads: [], fetchedAt: null, error: String(e) }
  }
}

export function listMapAreas(): MapArea[] {
  const rows = getDb().prepare('SELECT * FROM map_areas ORDER BY name').all() as (Omit<MapArea, 'points'> & {
    points: string
  })[]
  return rows.map((r) => ({ ...r, points: safeParsePoints(r.points) }))
}

function safeParsePoints(raw: string): { lat: number; lon: number }[] {
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr.filter((p) => p && typeof p.lat === 'number' && typeof p.lon === 'number')
  } catch {
    /* ignore */
  }
  return []
}

export function saveMapArea(input: MapAreaInput): MapArea {
  const db = getDb()
  const name = input.name.trim()
  if (!name) throw new Error('اسم المنطقة مطلوب')
  const points = Array.isArray(input.points) ? input.points.filter((p) => p && isFinite(p.lat) && isFinite(p.lon)) : []
  if (points.length < 3) throw new Error('أضف 3 نقاط على الأقل لتحديد حدود المنطقة')
  const color = input.color || '#2a4872'
  const payload = JSON.stringify(points)
  if (input.id) {
    db.prepare('UPDATE map_areas SET name = ?, color = ?, points = ?, notes = ?, updatedAt = datetime(\'now\') WHERE id = ?').run(
      name,
      color,
      payload,
      input.notes || '',
      input.id
    )
    return db.prepare('SELECT * FROM map_areas WHERE id = ?').get(input.id) as unknown as MapArea
  }
  const res = db
    .prepare('INSERT INTO map_areas (name, color, points, notes) VALUES (?, ?, ?, ?)')
    .run(name, color, payload, input.notes || '')
  return db.prepare('SELECT * FROM map_areas WHERE id = ?').get(res.lastInsertRowid) as unknown as MapArea
}

export function deleteMapArea(id: number): boolean {
  getDb().prepare('DELETE FROM map_areas WHERE id = ?').run(id)
  return true
}
