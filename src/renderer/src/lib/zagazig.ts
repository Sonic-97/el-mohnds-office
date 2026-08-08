import type {
  Client,
  MarketArea,
  OfficeAreaStat,
  Property,
  PropertyMatchSummary,
  ZagazigAreaProfile
} from '@shared/types'

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function zoneEquals(zone: string, name: string): boolean {
  const z = norm(zone)
  const n = norm(name)
  if (!z || !n) return false
  if (z === n) return true
  return z.includes(n) || n.includes(z)
}

function medianOf(sorted: number[]): number | null {
  if (!sorted.length) return null
  const n = sorted.length
  const mid = Math.floor(n / 2)
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function officeStat(properties: Property[]): OfficeAreaStat {
  const ppm: number[] = []
  let landCount = 0
  let aptCount = 0
  for (const p of properties) {
    if (p.type === 'أرض') landCount++
    if (p.type === 'شقة') aptCount++
    const v = p.pricePerMeter ?? (p.price != null && p.area != null && p.area > 0 ? p.price / p.area : null)
    if (v != null && isFinite(v)) ppm.push(Math.round(v * 100) / 100)
  }
  ppm.sort((a, b) => a - b)
  return {
    zone: properties[0]?.zone ?? '',
    count: properties.length,
    landCount,
    aptCount,
    min: ppm[0] ?? null,
    avg: ppm.length ? Math.round((ppm.reduce((a, b) => a + b, 0) / ppm.length) * 100) / 100 : null,
    median: medianOf(ppm),
    max: ppm[ppm.length - 1] ?? null,
    rentMin: null,
    rentAvg: null,
    rentMax: null
  }
}

function findMarket(marketAreas: MarketArea[], zone: string): MarketArea | null {
  if (!zone) return null
  const direct = marketAreas.find((a) => norm(a.area) === norm(zone))
  if (direct) return direct
  return marketAreas.find((a) => zoneEquals(zone, a.area)) ?? null
}

export function buildZoneProfiles(
  properties: Property[],
  clients: Client[],
  marketAreas: MarketArea[],
  propertyMatchSummaries: PropertyMatchSummary[]
): Record<string, ZagazigAreaProfile> {
  const byZone = new Map<string, Property[]>()
  for (const p of properties) {
    const zone = p.zone?.trim() || 'غير محدد'
    const list = byZone.get(zone) ?? []
    list.push(p)
    byZone.set(zone, list)
  }

  const oppsByZone = new Map<string, number>()
  for (const s of propertyMatchSummaries) {
    const zone = s.property.zone?.trim() || 'غير محدد'
    oppsByZone.set(zone, (oppsByZone.get(zone) ?? 0) + s.clientCount)
  }

  const clientsByArea = new Map<string, number>()
  for (const c of clients) {
    if (!c.area?.trim()) continue
    clientsByArea.set(c.area.trim(), (clientsByArea.get(c.area.trim()) ?? 0) + 1)
  }

  const profiles: Record<string, ZagazigAreaProfile> = {}
  const zoneNames = new Set([...byZone.keys(), ...marketAreas.map((a) => a.area)])

  for (const zone of zoneNames) {
    const list = byZone.get(zone) ?? []
    const zoneProps = list.length > 0 ? list : null
    const market = findMarket(marketAreas, zone)
    let clientCount = 0
    for (const [area, n] of clientsByArea) {
      if (zoneEquals(zone, area)) clientCount += n
    }
    profiles[zone] = {
      name: zone,
      market,
      office: zoneProps ? officeStat(zoneProps) : null,
      clientCount,
      matchOpportunities: oppsByZone.get(zone) ?? 0
    }
  }
  return profiles
}
