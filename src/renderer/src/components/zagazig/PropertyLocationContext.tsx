import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, MapPinned } from 'lucide-react'
import type { Property, ZagazigPoiData } from '@shared/types'
import { POI_EMOJI, POI_LABELS } from '../../lib/poi'
import { haversineMeters, formatDistance, distanceToPolylineMeters } from '../../lib/geo'
import { fmtM2 } from '../../lib/market'

export default function PropertyLocationContext({ property }: { property: Property }) {
  const [poiData, setPoiData] = useState<ZagazigPoiData | null>(null)

  useEffect(() => {
    window.api.zmap.getPoiData().then(setPoiData)
  }, [])

  const lat = property.latitude
  const lon = property.longitude

  const ctx = useMemo(() => {
    if (lat == null || lon == null || !poiData) return null
    const origin = { lat, lon }
    const dist = (p: { lat: number; lon: number }) => haversineMeters(origin, { lat: p.lat, lon: p.lon })

    const nearestRoad = poiData.roads.length
      ? [...poiData.roads]
          .filter((r) => r.kind === 'main' || poiData.roads.filter((x) => x.kind === 'main').length === 0)
          .map((r) => ({ road: r, d: distanceToPolylineMeters(origin, r.points) }))
          .sort((a, b) => a.d - b.d)[0]
      : null

    const nearestByCat = new Map<string, { name: string; d: number; emoji: string }>()
    for (const p of poiData.pois) {
      const d = dist(p)
      const cur = nearestByCat.get(p.category)
      if (!cur || d < cur.d) nearestByCat.set(p.category, { name: p.name, d, emoji: POI_EMOJI[p.category] })
    }

    const nearestLandmark =
      [...nearestByCat.entries()]
        .filter(([c]) => c !== 'transport')
        .map(([c, v]) => ({ category: c, ...v }))
        .sort((a, b) => a.d - b.d)[0] ?? null

    const nearestTransport =
      [...nearestByCat.entries()]
        .filter(([c]) => c === 'transport')
        .map(([c, v]) => ({ category: c, ...v }))[0] ?? null

    const nearby = poiData.pois
      .map((p) => ({ ...p, d: dist(p) }))
      .filter((p) => p.d <= 3000)
      .sort((a, b) => a.d - b.d)
      .slice(0, 6)

    return { nearestRoad, nearestLandmark, nearestTransport, nearby, origin }
  }, [lat, lon, poiData])

  if (lat == null || lon == null) return null

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2">
          <MapPinned className="w-5 h-5 text-gold-600" /> موقع العقار داخل الزقازيق
        </h2>
        <button
          onClick={() => {
            window.location.hash = `#/zagazig?focus=${property.id}`
          }}
          className="flex items-center gap-1.5 bg-navy-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-navy-900"
        >
          <ExternalLink className="w-4 h-4" /> فتح خريطة الزقازيق
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
        <div className="bg-navy-50 rounded-lg px-3 py-2">
          <div className="text-[11px] text-gray-500">الحي / المنطقة</div>
          <div className="font-bold text-navy-900">{property.neighborhood || property.zone || 'غير محدد'}</div>
        </div>
        <div className="bg-navy-50 rounded-lg px-3 py-2">
          <div className="text-[11px] text-gray-500">أقرب طريق رئيسي</div>
          <div className="font-bold text-navy-900 truncate">
            {ctx?.nearestRoad ? ctx.nearestRoad.road.name || 'طريق رئيسي' : '-'}
          </div>
          {ctx?.nearestRoad && <div className="text-[11px] text-gray-500">{formatDistance(ctx.nearestRoad.d)}</div>}
        </div>
        <div className="bg-navy-50 rounded-lg px-3 py-2">
          <div className="text-[11px] text-gray-500">أقرب معلم</div>
          <div className="font-bold text-navy-900 truncate">{ctx?.nearestLandmark ? ctx.nearestLandmark.name : '-'}</div>
          {ctx?.nearestLandmark && (
            <div className="text-[11px] text-gray-500">
              {POI_LABELS[ctx.nearestLandmark.category as keyof typeof POI_LABELS]} · {formatDistance(ctx.nearestLandmark.d)}
            </div>
          )}
        </div>
        <div className="bg-navy-50 rounded-lg px-3 py-2">
          <div className="text-[11px] text-gray-500">أقرب مواصلات</div>
          <div className="font-bold text-navy-900 truncate">{ctx?.nearestTransport ? ctx.nearestTransport.name : '-'}</div>
          {ctx?.nearestTransport && (
            <div className="text-[11px] text-gray-500">{formatDistance(ctx.nearestTransport.d)}</div>
          )}
        </div>
      </div>

      {ctx && ctx.nearby.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs font-bold text-gray-600 mb-2">خدمات قريبة</div>
          <div className="flex flex-wrap gap-2">
            {ctx.nearby.map((n, i) => (
              <span
                key={n.id + i}
                className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs"
              >
                <span className="text-base">{POI_EMOJI[n.category]}</span>
                <span className="text-gray-700 max-w-40 truncate">{n.name}</span>
                <span className="text-gray-400 font-medium">{formatDistance(n.d)}</span>
              </span>
            ))}
          </div>
          {ctx.nearby.length === 0 && <div className="text-xs text-gray-400">لا توجد خدمات قريبة محفوظة.</div>}
        </div>
      )}

      <div className="mt-3 text-[11px] text-gray-400">
        {property.pricePerMeter != null && (
          <span>
            سعر عرض هذا العقار: <span className="text-navy-800 font-semibold">{fmtM2(property.pricePerMeter)}</span> — للمقارنة مع بيانات السوق في "ملف المنطقة" على الخريطة.
          </span>
        )}
      </div>
    </div>
  )
}
