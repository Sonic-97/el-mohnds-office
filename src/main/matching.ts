import type {
  Client,
  ClientMatch,
  ClientMatchSummary,
  MatchOpportunityStats,
  MatchReason,
  Property,
  PropertyMatch,
  PropertyMatchSummary
} from '@shared/types'
import { getDb } from './db'

export interface MatchResult {
  score: number
  reasons: MatchReason[]
}

const WEIGHTS = { type: 25, location: 30, price: 25, area: 20 }

export const DEFAULT_BUDGET_TOLERANCE = 0.1
const MIN_SUITABLE_SCORE = 50

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function eq(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = norm(a)
  return na !== '' && na === norm(b)
}

export function getBudgetTolerancePercent(): number {
  const row = getDb().prepare(`SELECT value FROM settings WHERE key = 'matchingBudgetTolerance'`).get() as
    | { value: string }
    | undefined
  const pct = row ? parseFloat(row.value) : NaN
  return isFinite(pct) && pct > 0 ? pct / 100 : DEFAULT_BUDGET_TOLERANCE
}

interface CriterionResult {
  evaluated: boolean
  weight: number
  score: number
  reasons: MatchReason[]
  priceHardOver?: boolean
}

function typeCriterion(client: Client, property: Property): CriterionResult {
  if (!client.type) return { evaluated: false, weight: WEIGHTS.type, score: 0, reasons: [] }
  if (eq(client.type, property.type)) {
    return {
      evaluated: true,
      weight: WEIGHTS.type,
      score: WEIGHTS.type,
      reasons: [{ label: 'نوع العقار مطابق', kind: 'match' }]
    }
  }
  return { evaluated: true, weight: WEIGHTS.type, score: 0, reasons: [{ label: 'نوع العقار مختلف', kind: 'conflict' }] }
}

function locationCriterion(client: Client, property: Property): CriterionResult {
  const fields: { key: string; client: string; prop: string; weight: number }[] = [
    { key: 'area', client: client.area, prop: property.zone, weight: 10 },
    { key: 'neighborhood', client: client.neighborhood, prop: property.neighborhood, weight: 5 },
    { key: 'center', client: client.center, prop: property.center, weight: 3 },
    { key: 'city', client: client.city, prop: property.city, weight: 8 },
    { key: 'governorate', client: client.governorate, prop: property.governorate, weight: 4 }
  ]

  let specified = 0
  let matched = 0
  for (const f of fields) {
    if (!f.client) continue
    specified += f.weight
    if (f.prop && eq(f.client, f.prop)) matched += f.weight
  }
  if (specified === 0) return { evaluated: false, weight: WEIGHTS.location, score: 0, reasons: [] }

  let fraction = matched / specified
  const reasons: MatchReason[] = []

  const areaMatch = client.area && eq(client.area, property.zone)
  const cityMatch = client.city && property.city && eq(client.city, property.city)

  if (client.area) {
    if (areaMatch) {
      fraction = Math.max(fraction, 0.9)
    } else if (cityMatch) {
      fraction = Math.max(fraction, 0.5)
    } else {
      fraction = Math.min(fraction, 0.1)
    }
  }

  if (areaMatch) {
    reasons.push({ label: 'المنطقة مطابقة', kind: 'match' })
  } else if (client.area && cityMatch) {
    reasons.push({ label: 'منطقة مختلفة ولكن داخل نفس المدينة', kind: 'warn' })
  } else if (client.area) {
    reasons.push({ label: 'المنطقة مختلفة', kind: 'warn' })
  } else if (client.city && cityMatch) {
    reasons.push({ label: 'المدينة مطابقة', kind: 'match' })
  } else if (client.city) {
    reasons.push({ label: 'المدينة مختلفة', kind: 'warn' })
  } else if (client.neighborhood && eq(client.neighborhood, property.neighborhood)) {
    reasons.push({ label: 'الحي مطابق', kind: 'match' })
  } else if (client.center && eq(client.center, property.center)) {
    reasons.push({ label: 'المركز مطابق', kind: 'match' })
  } else if (client.governorate && eq(client.governorate, property.governorate)) {
    reasons.push({ label: 'المحافظة مطابقة', kind: 'match' })
  }

  return { evaluated: true, weight: WEIGHTS.location, score: fraction * WEIGHTS.location, reasons }
}

function priceCriterion(client: Client, property: Property, tolerance: number): CriterionResult {
  const budgetTo = client.budgetTo ?? client.budget
  const budgetFrom = client.budgetFrom
  if (budgetTo == null && budgetFrom == null) return { evaluated: false, weight: WEIGHTS.price, score: 0, reasons: [] }
  if (property.price == null) return { evaluated: false, weight: WEIGHTS.price, score: 0, reasons: [] }

  const price = property.price
  let fraction = 1
  const reasons: MatchReason[] = []

  if (budgetTo != null) {
    if (price <= budgetTo) {
      reasons.push({ label: 'داخل الميزانية', kind: 'match' })
    } else if (price <= budgetTo * (1 + tolerance * 0.5)) {
      fraction = 0.85
      reasons.push({
        label: `السعر أعلى من الميزانية بـ ${Math.round(((price - budgetTo) / budgetTo) * 100)}%`,
        kind: 'warn'
      })
    } else if (price <= budgetTo * (1 + tolerance)) {
      fraction = 0.5
      reasons.push({
        label: `السعر أعلى من الميزانية بـ ${Math.round(((price - budgetTo) / budgetTo) * 100)}%`,
        kind: 'warn'
      })
    } else {
      fraction = 0.1
      reasons.push({ label: 'السعر أعلى من الميزانية بكثير', kind: 'conflict' })
    }
  }

  if (budgetFrom != null && price < budgetFrom) {
    fraction = Math.min(fraction, 0.7)
    reasons.push({ label: 'السعر أقل من الحد الأدنى للميزانية', kind: 'warn' })
  }

  const priceHardOver =
    budgetTo != null && price > budgetTo * (1 + tolerance)
  return { evaluated: true, weight: WEIGHTS.price, score: fraction * WEIGHTS.price, reasons, priceHardOver }
}

function areaCriterion(client: Client, property: Property): CriterionResult {
  const from = client.areaFrom
  const to = client.areaTo ?? client.preferredAreaSize
  if (from == null && to == null) return { evaluated: false, weight: WEIGHTS.area, score: 0, reasons: [] }
  if (property.area == null) return { evaluated: false, weight: WEIGHTS.area, score: 0, reasons: [] }

  const a = property.area
  let fraction = 1
  const reasons: MatchReason[] = []

  const inRange = (from == null || a >= from) && (to == null || a <= to)
  if (inRange) {
    reasons.push({ label: 'المساحة مناسبة', kind: 'match' })
  } else if (from != null && a < from) {
    fraction = a >= from * 0.9 ? 0.7 : 0.3
    reasons.push({ label: `المساحة أصغر من المطلوب (المطلوب من ${from.toLocaleString('ar-EG')} م²)`, kind: 'warn' })
  } else if (to != null && a > to) {
    fraction = a <= to * 1.1 ? 0.7 : 0.3
    reasons.push({ label: `المساحة أكبر من المطلوب (المطلوب حتى ${to.toLocaleString('ar-EG')} م²)`, kind: 'warn' })
  }

  return { evaluated: true, weight: WEIGHTS.area, score: fraction * WEIGHTS.area, reasons }
}

export function matchClientToProperty(client: Client, property: Property, tolerance: number): MatchResult | null {
  if (property.status === 'sold') return null
  if (client.desiredStatus && property.status !== client.desiredStatus) return null
  if (client.type && !eq(client.type, property.type)) return null

  const criteria: CriterionResult[] = [
    typeCriterion(client, property),
    locationCriterion(client, property),
    priceCriterion(client, property, tolerance),
    areaCriterion(client, property)
  ]

  let earned = 0
  let total = 0
  let priceHardOver = false
  const reasons: MatchReason[] = []
  for (const c of criteria) {
    if (!c.evaluated) continue
    total += c.weight
    earned += c.score
    reasons.push(...c.reasons)
    if (c.priceHardOver) priceHardOver = true
  }

  if (total === 0) return null
  const score = Math.round((earned / total) * 100)
  // Property far above the client budget should never rank as a strong match.
  const capped = priceHardOver ? Math.min(score, 55) : score
  return { score: capped, reasons }
}

export function matchPropertiesForClient(client: Client): PropertyMatch[] {
  const properties = getDb().prepare('SELECT * FROM properties').all() as Property[]
  const tolerance = getBudgetTolerancePercent()
  const results: PropertyMatch[] = []
  for (const p of properties) {
    const m = matchClientToProperty(client, p, tolerance)
    if (m && m.score >= MIN_SUITABLE_SCORE) results.push({ property: p, score: m.score, reasons: m.reasons })
  }
  return results.sort((a, b) => b.score - a.score)
}

export function matchClientsForProperty(property: Property): ClientMatch[] {
  const clients = getDb().prepare('SELECT * FROM clients').all() as Client[]
  const tolerance = getBudgetTolerancePercent()
  const results: ClientMatch[] = []
  for (const c of clients) {
    const m = matchClientToProperty(c, property, tolerance)
    if (m && m.score >= MIN_SUITABLE_SCORE) results.push({ client: c, score: m.score, reasons: m.reasons })
  }
  return results.sort((a, b) => b.score - a.score)
}

export function computeMatchOpportunities(): {
  stats: MatchOpportunityStats
  clientSummaries: ClientMatchSummary[]
  propertySummaries: PropertyMatchSummary[]
} {
  const properties = getDb().prepare('SELECT * FROM properties').all() as Property[]
  const clients = getDb().prepare('SELECT * FROM clients').all() as Client[]
  const tolerance = getBudgetTolerancePercent()

  const clientSummaries: ClientMatchSummary[] = []
  const propertySummaries: PropertyMatchSummary[] = []

  for (const c of clients) {
    let count = 0
    let top: number | null = null
    for (const p of properties) {
      const m = matchClientToProperty(c, p, tolerance)
      if (m && m.score >= MIN_SUITABLE_SCORE) {
        count++
        if (top == null || m.score > top) top = m.score
      }
    }
    if (count > 0) clientSummaries.push({ client: c, propertyCount: count, topScore: top })
  }

  for (const p of properties) {
    let count = 0
    let top: number | null = null
    for (const c of clients) {
      const m = matchClientToProperty(c, p, tolerance)
      if (m && m.score >= MIN_SUITABLE_SCORE) {
        count++
        if (top == null || m.score > top) top = m.score
      }
    }
    if (count > 0) propertySummaries.push({ property: p, clientCount: count, topScore: top })
  }

  return {
    stats: {
      propertiesWithClients: propertySummaries.length,
      clientsWithProperties: clientSummaries.length
    },
    clientSummaries: clientSummaries.sort((a, b) => b.propertyCount - a.propertyCount),
    propertySummaries: propertySummaries.sort((a, b) => b.clientCount - a.clientCount)
  }
}
