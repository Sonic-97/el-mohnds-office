import { X } from 'lucide-react'
import type { MapArea, Property, ZagazigAreaProfile, ZagazigPoi } from '@shared/types'
import { POI_EMOJI, POI_LABELS } from '../../lib/poi'
import { formatDistance } from '../../lib/geo'
import { fmtM2 } from '../../lib/market'
import { STATUS_LABELS, STATUS_COLORS } from '../../lib/constants'

export type ZagazigPanelMode = 'nearby' | 'area' | 'compare' | 'none'

interface NearbyItem {
  poi: ZagazigPoi
  distance: number
}

interface SidePanelProps {
  mode: ZagazigPanelMode
  nearby: NearbyItem[]
  area: MapArea | null
  profile: ZagazigAreaProfile | null
  compare: Property[]
  compareContext: Record<number, { name: string; category: string; distance: number }>
  radius: number
  onSetRadius: (r: number) => void
  onClose: () => void
  onOpenProperty: (id: number) => void
  onOpenCompare: () => void
  clientMode: boolean
}

const RADII = [500, 1000, 2000, 5000]

function fmtDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value.slice(0, 10)
  return d.toLocaleDateString('ar-EG')
}

function MarketBox({ label, min, avg, max }: { label: string; min: number | null; avg: number | null; max: number | null }) {
  if (min == null && avg == null && max == null) return null
  return (
    <div className="border border-navy-100 rounded-lg px-3 py-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-sm font-bold text-navy-900">{fmtM2(avg)}</div>
      <div className="text-[11px] text-gray-500">
        من {fmtM2(min)} إلى {fmtM2(max)}
      </div>
    </div>
  )
}

export default function SidePanel({
  mode,
  nearby,
  area,
  profile,
  compare,
  compareContext,
  radius,
  onSetRadius,
  onClose,
  onOpenProperty,
  onOpenCompare,
  clientMode
}: SidePanelProps) {
  if (mode === 'none') return null

  return (
    <div className="absolute top-16 end-3 bottom-3 w-80 z-[600] flex flex-col">
      <div className="bg-white rounded-xl shadow-xl flex flex-col overflow-hidden h-full">
        <div className="flex items-center justify-between px-4 py-3 bg-navy-950 text-white">
          <h3 className="font-bold text-sm">
            {mode === 'nearby' && 'الخدمات القريبة'}
            {mode === 'area' && 'ملف المنطقة'}
            {mode === 'compare' && 'مقارنة على الخريطة'}
          </h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {mode === 'nearby' && (
            <>
              {nearby.length === 0 ? (
                <p className="text-sm text-gray-500">لا توجد خدمات محفوظة داخل النطاق المحدد.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {RADII.map((r) => (
                      <button
                        key={r}
                        onClick={() => onSetRadius(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          radius === r ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {r >= 1000 ? `${r / 1000} كم` : `${r} م`}
                      </button>
                    ))}
                  </div>
                  <ul className="space-y-2">
                    {nearby.map((n, i) => (
                      <li key={n.poi.id + i} className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2">
                        <span className="text-xl">{POI_EMOJI[n.poi.category]}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{n.poi.name}</div>
                          <div className="text-[11px] text-gray-500">{POI_LABELS[n.poi.category]}</div>
                        </div>
                        <div className="text-xs font-bold text-navy-800 whitespace-nowrap">{formatDistance(n.distance)}</div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {mode === 'area' && area && (
            <>
              <div className="text-xl font-bold">{area.name}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: area.color }} />
                حدود المنطقة · آخر تحديث {fmtDate(area.updatedAt)}
              </div>

              {!profile || (!profile.market && !profile.office) ? (
                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-3">
                  لا توجد بيانات أسعار محدثة لهذه المنطقة. أضف بيانات السوق من صفحة "سوق الزقازيق".
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {profile.market && (
                      <MarketBox
                        label={`بيانات السوق (${profile.market.aptDataType === 'listing' ? 'أسعار عرض' : 'مصدر موثق'})`}
                        min={profile.market.aptMin}
                        avg={profile.market.aptAvg}
                        max={profile.market.aptMax}
                      />
                    )}
                    {profile.market && (
                      <MarketBox label="الأرض (بيانات السوق)" min={profile.market.landMin} avg={profile.market.landAvg} max={profile.market.landMax} />
                    )}
                    {profile.office && profile.office.avg != null && (
                      <div className="border border-gold-200 bg-gold-100/40 rounded-lg px-3 py-2">
                        <div className="text-[11px] text-gray-600">بيانات المكتب ({profile.office.count.toLocaleString('ar-EG')} عقار)</div>
                        <div className="text-sm font-bold text-navy-900">{fmtM2(profile.office.avg)}</div>
                        <div className="text-[11px] text-gray-500">
                          وسيط {fmtM2(profile.office.median)} · من {fmtM2(profile.office.min)} إلى {fmtM2(profile.office.max)}
                        </div>
                      </div>
                    )}
                  </div>

                  {profile.market && (profile.market.rentAvg != null || profile.market.rentMin != null) && (
                    <div className="border border-gray-200 rounded-lg px-3 py-2">
                      <div className="text-[11px] text-gray-500">إيجار شهري (سكني)</div>
                      <div className="text-sm font-bold text-navy-900">
                        {profile.market.rentAvg != null
                          ? `${Math.round(profile.market.rentAvg).toLocaleString('ar-EG')} ج/شهر`
                          : '-'}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        من{' '}
                        {profile.market.rentMin != null
                          ? `${Math.round(profile.market.rentMin).toLocaleString('ar-EG')}`
                          : '-'}{' '}
                        إلى{' '}
                        {profile.market.rentMax != null
                          ? `${Math.round(profile.market.rentMax).toLocaleString('ar-EG')}`
                          : '-'}{' '}
                        ج/شهر
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="text-gray-500">عقارات المكتب</div>
                      <div className="font-bold text-navy-900">{profile.office ? profile.office.count.toLocaleString('ar-EG') : '0'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="text-gray-500">أراضٍ</div>
                      <div className="font-bold text-navy-900">{profile.office ? profile.office.landCount.toLocaleString('ar-EG') : '0'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="text-gray-500">شقق</div>
                      <div className="font-bold text-navy-900">{profile.office ? profile.office.aptCount.toLocaleString('ar-EG') : '0'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="text-gray-500">عملاء باحثين في المنطقة</div>
                      <div className="font-bold text-navy-900">{profile.clientCount.toLocaleString('ar-EG')}</div>
                    </div>
                  </div>

                  <div className="bg-navy-50 rounded-lg px-3 py-2 text-xs">
                    <div className="text-gray-500">فرص المطابقة في المنطقة</div>
                    <div className="font-bold text-navy-900">{profile.matchOpportunities.toLocaleString('ar-EG')}</div>
                  </div>
                </>
              )}

              {profile?.market?.notes && (
                <p className="text-[11px] text-gray-500 leading-relaxed">{profile.market.notes}</p>
              )}
              {profile?.market && (
                <div className="text-[10px] text-gray-400">
                  المصدر: {profile.market.sourceName || 'بيانات يدوية'} · آخر تحديث {fmtDate(profile.market.sourceDate || profile.market.updatedAt)}
                </div>
              )}
            </>
          )}

          {mode === 'compare' && (
            <>
              <p className="text-xs text-gray-500">
                اختر حتى 3 عقارات من النوافذ المنبثقة على الخريطة بزر "مقارنة".
              </p>
              {compare.length === 0 ? (
                <div className="text-sm text-gray-400">لا توجد عقارات مختارة بعد.</div>
              ) : (
                <ul className="space-y-2">
                  {compare.map((p, i) => (
                    <li key={p.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold bg-navy-800 text-white w-6 h-6 rounded-full flex items-center justify-center">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                      </div>
                      <div className="text-sm font-bold">{p.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {p.price != null ? `${Math.round(p.price).toLocaleString('ar-EG')} ج.م` : '-'}
                        {p.area != null ? ` · ${p.area.toLocaleString('ar-EG')} م²` : ''}
                      </div>
                      <div className="text-xs text-gray-500">{p.zone || p.city || ''}</div>
                      {compareContext[p.id] && (
                        <div className="text-[11px] text-navy-700 mt-1">
                          أقرب {POI_LABELS[compareContext[p.id].category as keyof typeof POI_LABELS] ?? 'معلم'}: {compareContext[p.id].name} ·{' '}
                          {formatDistance(compareContext[p.id].distance)}
                        </div>
                      )}
                      <button onClick={() => onOpenProperty(p.id)} className="text-[11px] text-navy-700 hover:underline mt-1">
                        عرض التفاصيل
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {compare.length >= 2 && (
                <button
                  onClick={onOpenCompare}
                  className="w-full bg-navy-800 text-white text-sm py-2 rounded-lg hover:bg-navy-900"
                >
                  مقارنة كاملة
                </button>
              )}
              {!clientMode && compare.length > 0 && (
                <p className="text-[11px] text-gray-400">المسافات المعروضة تُحسب من إحداثيات حقيقية عند الحاجة.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
