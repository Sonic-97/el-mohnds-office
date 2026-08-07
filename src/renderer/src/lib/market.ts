export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const mid = Math.floor(n / 2)
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function isStale(updatedAt: string | null, days = 60): boolean {
  if (!updatedAt) return false
  const d = new Date(updatedAt)
  if (isNaN(d.getTime())) return false
  const diff = Date.now() - d.getTime()
  return diff > days * 24 * 60 * 60 * 1000
}

export function fmtM2(value: number | null): string {
  if (value == null) return '-'
  return `${Math.round(value).toLocaleString('ar-EG')} ج/م²`
}

export function fmtEgp(value: number | null): string {
  if (value == null) return '-'
  return `${Math.round(value).toLocaleString('ar-EG')} ج.م`
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface BuildPlan {
  landArea: number
  buildRatio: number
  floors: number
  footprint: number
  totalArea: number
}

export function calcBuildPlan(landArea: number, buildRatio: number, floors: number): BuildPlan {
  const footprint = round2((landArea * buildRatio) / 100)
  const totalArea = round2(footprint * floors)
  return { landArea, buildRatio, floors, footprint, totalArea }
}

export function calcConstructionCost(
  plan: BuildPlan,
  structure: { min: number | null; typical: number | null; max: number | null },
  finishing: { min: number | null; typical: number | null; max: number | null }
) {
  const range = (cost: { min: number | null; typical: number | null; max: number | null }) => ({
    min: cost.min != null ? Math.round(cost.min * plan.totalArea) : null,
    typical: cost.typical != null ? Math.round(cost.typical * plan.totalArea) : null,
    max: cost.max != null ? Math.round(cost.max * plan.totalArea) : null
  })
  const s = range(structure)
  const f = range(finishing)
  return {
    structure: s,
    finishing: f,
    total: {
      min: s.min != null && f.min != null ? s.min + f.min : null,
      typical: s.typical != null && f.typical != null ? s.typical + f.typical : null,
      max: s.max != null && f.max != null ? s.max + f.max : null
    }
  }
}

export interface BuyResult {
  min: number | null
  avg: number | null
  max: number | null
}

export function calcBuyApartment(
  area: number,
  rates: { min: number | null; avg: number | null; max: number | null }
): BuyResult {
  return {
    min: rates.min != null ? Math.round(rates.min * area) : null,
    avg: rates.avg != null ? Math.round(rates.avg * area) : null,
    max: rates.max != null ? Math.round(rates.max * area) : null
  }
}

export function calcTotalCost(
  plan: BuildPlan,
  structure: { min: number | null; typical: number | null; max: number | null },
  finishing: { min: number | null; typical: number | null; max: number | null }
): { min: number | null; typical: number | null; max: number | null } {
  const c = calcConstructionCost(plan, structure, finishing)
  return c.total
}
