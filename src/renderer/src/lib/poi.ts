import type { ZagazigPoiCategory } from '@shared/types'
import L from 'leaflet'

export const POI_LABELS: Record<ZagazigPoiCategory, string> = {
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

export const POI_EMOJI: Record<ZagazigPoiCategory, string> = {
  hospital: '🏥',
  clinic: '🩺',
  pharmacy: '💊',
  university: '🎓',
  school: '🏫',
  bank: '🏦',
  government: '🏛️',
  park: '🌳',
  shopping: '🛍️',
  market: '🧺',
  food: '🍽️',
  transport: '🚉'
}

export const POI_COLORS: Record<ZagazigPoiCategory, string> = {
  hospital: '#dc2626',
  clinic: '#e11d48',
  pharmacy: '#16a34a',
  university: '#7c3aed',
  school: '#f59e0b',
  bank: '#2563eb',
  government: '#475569',
  park: '#059669',
  shopping: '#db2777',
  market: '#b45309',
  food: '#ea580c',
  transport: '#0891b2'
}

export const SERVICE_FILTERS: { key: string; label: string; cats: ZagazigPoiCategory[] }[] = [
  { key: 'all', label: 'كل الخدمات', cats: [] },
  { key: 'medical', label: 'مستشفيات', cats: ['hospital', 'clinic', 'pharmacy'] },
  { key: 'education', label: 'تعليم', cats: ['university', 'school'] },
  { key: 'bank', label: 'بنوك', cats: ['bank'] },
  { key: 'shopping', label: 'تسوق', cats: ['shopping', 'market'] },
  { key: 'government', label: 'خدمات حكومية', cats: ['government'] },
  { key: 'park', label: 'حدائق', cats: ['park'] }
]

function emojiIcon(emoji: string): L.DivIcon {
  return L.divIcon({
    className: 'zagazig-poi',
    html: `<div class="zpoi-dot" style="background:${POI_COLORS[emoji as keyof typeof POI_COLORS] || '#64748b'}"></div>${emoji}`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
  })
}

const iconCache = new Map<string, L.DivIcon>()

export function poiIcon(category: ZagazigPoiCategory): L.DivIcon {
  let icon = iconCache.get(category)
  if (!icon) {
    icon = emojiIcon(POI_EMOJI[category])
    iconCache.set(category, icon)
  }
  return icon
}

export function transportIcon(kind: 'station' | 'stop'): L.DivIcon {
  const key = `transport-${kind}`
  let icon = iconCache.get(key)
  if (!icon) {
    const inner = kind === 'station' ? '🚉' : '🚏'
    icon = L.divIcon({
      className: 'zagazig-poi',
      html: `<div class="zpoi-dot" style="background:#0891b2"></div>${inner}`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -15]
    })
    iconCache.set(key, icon)
  }
  return icon
}

export interface ZagazigPinOptions {
  selected?: boolean
  letter?: string
  score?: number
  priceLabel?: string
}

function pinSvg(fill: string, ring: string): string {
  return `
<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
  <path d="M17 1.5 C8.5 1.5 1.5 8.5 1.5 17 C1.5 30 17 42.5 17 42.5 C17 42.5 32.5 30 32.5 17 C32.5 8.5 25.5 1.5 17 1.5 Z"
        fill="${fill}" stroke="${ring}" stroke-width="2.5"/>
  <circle cx="17" cy="16.5" r="6.5" fill="${ring}"/>
</svg>`
}

const pinIconCache = new Map<string, L.DivIcon>()

export function zagazigPin(options: ZagazigPinOptions = {}): L.DivIcon {
  const { selected = false, letter, score, priceLabel } = options
  const fill = selected ? '#d4af37' : '#162841'
  const ring = selected ? '#162841' : '#d4af37'
  const badge = letter
    ? `<div class="zpin-badge">${letter}</div>`
    : score != null
      ? `<div class="zpin-score">${score}%</div>`
      : ''
  const price =
    priceLabel != null
      ? `<div class="zpin-price">${priceLabel}</div>`
      : ''
  const key = [fill, ring, badge, price].join('|')
  let icon = pinIconCache.get(key)
  if (!icon) {
    icon = L.divIcon({
      className: 'zagazig-pin',
      html: `<div class="zpin-wrap">${pinSvg(fill, ring)}${badge}${price}</div>`,
      iconSize: [34, 44],
      iconAnchor: [17, 43],
      popupAnchor: [0, -44]
    })
    pinIconCache.set(key, icon)
  }
  return icon
}
