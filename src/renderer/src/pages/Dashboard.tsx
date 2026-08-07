import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  LandPlot,
  Home,
  Users,
  CheckCircle2,
  BadgeCheck,
  TrendingUp,
  MapPin,
  Plus,
  Building,
  ImagePlus,
  Link2
} from 'lucide-react'
import type { DashboardStats, AreaStat, Property, MarketArea, ConstructionCost, MatchOpportunityStats } from '@shared/types'
import { formatPrice, formatArea } from '../lib/constants'
import { fmtM2 } from '../lib/market'
import { fileUrl, loadBranding, onBrandingChanged, notifyBrandingChanged, saveBrandingFile } from '../lib/branding'

function Banner({ children }: { children: React.ReactNode }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const b = await loadBranding()
      if (!cancelled) {
        setSrc(fileUrl(b.banner) ?? '/banner.png')
        setFailed(false)
      }
    }
    load()
    const off = onBrandingChanged(load)
    return () => {
      cancelled = true
      off()
    }
  }, [])

  async function uploadPageBg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      if (!window.api.branding) {
        alert('أعد تشغيل التطبيق ليتم تفعيل رفع الخلفية')
        return
      }
      await saveBrandingFile('background', file)
      notifyBrandingChanged()
    } catch (err) {
      alert('فشل رفع الخلفية: ' + String(err))
    }
  }

  if (failed || !src) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-navy-950">
        <div className="absolute inset-0 opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, #d4af37 1px, transparent 1px), radial-gradient(circle at 80% 70%, #d4af37 1px, transparent 1px)',
              backgroundSize: '60px 60px'
            }}
          />
        </div>
        <div className="relative">{children}</div>
        <label className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/10 border border-gold-400/40 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
          <ImagePlus className="w-3.5 h-3.5 text-gold-400" /> خلفية الصفحة
          <input type="file" accept="image/*" className="hidden" onChange={uploadPageBg} />
        </label>
      </div>
    )
  }
  return (
    <div className="relative overflow-hidden rounded-none">
      <img src={src} alt="المهندس" className="absolute inset-0 w-full h-full object-cover" onError={() => setFailed(true)} />
      <div className="absolute inset-0 bg-gradient-to-l from-navy-950/90 via-navy-950/70 to-navy-900/40" />
      <div className="relative">{children}</div>
      <label className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/10 border border-gold-400/40 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/20 transition-colors">
        <ImagePlus className="w-3.5 h-3.5 text-gold-400" /> خلفية الصفحة
        <input type="file" accept="image/*" className="hidden" onChange={uploadPageBg} />
      </label>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [areas, setAreas] = useState<AreaStat[]>([])
  const [recent, setRecent] = useState<Property[]>([])
  const [marketAreas, setMarketAreas] = useState<MarketArea[]>([])
  const [constCosts, setConstCosts] = useState<ConstructionCost[]>([])
  const [matchStats, setMatchStats] = useState<MatchOpportunityStats | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    window.api.stats.dashboard().then(setStats)
    window.api.stats.areaAverages().then(setAreas)
    window.api.properties.list().then((list: Property[]) => setRecent(list.slice(0, 5)))
    window.api.market.listAreas().then(setMarketAreas)
    window.api.constCost.list().then(setConstCosts)
    window.api.matching.opportunities().then((o) => {
      setMatchStats(o.stats)
      setDataLoaded(true)
    })
  }, [])

  const marketSummary = (() => {
    const land = marketAreas.filter((a) => a.landAvg != null)
    const apt = marketAreas.filter((a) => a.aptAvg != null)
    const avg = (arr: number[]) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null)
    const struct = constCosts.find((c) => c.category === 'هيكل خرساني فقط')
    const finMid = constCosts.find((c) => c.category === 'تشطيب متوسط')
    const finLux = constCosts.find((c) => c.category === 'تشطيب فاخر')
    return {
      landAvg: avg(land.map((a) => a.landAvg as number)),
      landMin: land.length ? Math.min(...land.map((a) => a.landMin ?? a.landAvg ?? 0)) : null,
      landMax: land.length ? Math.max(...land.map((a) => a.landMax ?? a.landAvg ?? 0)) : null,
      aptAvg: avg(apt.map((a) => a.aptAvg as number)),
      aptMin: apt.length ? Math.min(...apt.map((a) => a.aptMin ?? a.aptAvg ?? 0)) : null,
      aptMax: apt.length ? Math.max(...apt.map((a) => a.aptMax ?? a.aptAvg ?? 0)) : null,
      struct,
      finMid,
      finLux,
      lastUpdated: marketAreas.length ? marketAreas.map((a) => a.updatedAt || '').sort().reverse()[0] : ''
    }
  })()

  const cards = stats
    ? [
        { label: 'إجمالي العقارات', value: stats.totalProperties, icon: Building2, color: 'bg-navy-800' },
        { label: 'الأراضي', value: stats.totalLands, icon: LandPlot, color: 'bg-gold-600' },
        { label: 'الشقق', value: stats.totalApartments, icon: Home, color: 'bg-navy-600' },
        { label: 'عدد العملاء', value: stats.totalClients, icon: Users, color: 'bg-navy-500' },
        { label: 'متاح', value: stats.available, icon: CheckCircle2, color: 'bg-emerald-700' },
        { label: 'مباع', value: stats.sold, icon: BadgeCheck, color: 'bg-navy-700' }
      ]
    : []

  return (
    <div className="pb-8">
      <Banner>
        <div className="px-8 py-12">
          <div className="max-w-2xl">
            <p className="text-gold-400 font-medium text-sm tracking-widest mb-2">REAL ESTATE OFFICE</p>
            <h1 className="text-3xl font-bold text-white mb-3">المهندس لإدارة العقارات</h1>
            <p className="text-slate-200 mb-6">
              نظام إدارة مكتبك العقاري — احفظ العقارات والعملاء والصور والمستندات، وكلها في مكان واحد على جهازك.
            </p>
            <Link
              to="/properties/new"
              className="inline-flex items-center gap-2 bg-gold-500 text-navy-950 font-semibold px-6 py-2.5 rounded-lg hover:bg-gold-400 transition-colors"
            >
              <Plus className="w-5 h-5" /> إضافة أول عقار
            </Link>
          </div>
        </div>
        <div className="gold-divider" />
      </Banner>

      <div className="px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">نظرة عامة</h2>
            <p className="text-sm text-gray-500 mt-1">ملخص بيانات مكتبك</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl shadow-sm p-5 border-t-2 border-gold-400">
              <div className={`inline-flex p-2 rounded-lg ${card.color} text-white mb-3`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold">{(card.value ?? 0).toLocaleString('ar-EG')}</div>
              <div className="text-sm text-gray-500">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-5 h-5 text-gold-600" />
              <h2 className="font-bold text-lg">فرص المطابقة</h2>
            </div>
            {dataLoaded && stats && (stats.totalClients === 0 || stats.totalProperties === 0) ? (
              <p className="text-sm text-gray-500">ستظهر فرص المطابقة بعد إضافة العملاء والعقارات.</p>
            ) : matchStats ? (
              <div className="flex gap-8">
                <div>
                  <div className="text-2xl font-bold text-navy-900">
                    {(matchStats.propertiesWithClients ?? 0).toLocaleString('ar-EG')}
                  </div>
                  <div className="text-sm text-gray-500">عقارات لديها عملاء محتملون</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-navy-900">
                    {(matchStats.clientsWithProperties ?? 0).toLocaleString('ar-EG')}
                  </div>
                  <div className="text-sm text-gray-500">عملاء لديهم عقارات مناسبة</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">جارٍ الحساب...</p>
            )}
          </div>
          <Link to="/matches" className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900">
            عرض المطابقات
          </Link>
        </div>

        {marketSummary.landAvg != null || marketSummary.aptAvg != null ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gold-600" /> سوق الزقازيق اليوم
              </h2>
              <Link to="/market" className="text-sm text-navy-700 hover:underline">
                عرض تفاصيل السوق
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">الأراضي</div>
                <div className="text-xl font-bold text-navy-900">{fmtM2(marketSummary.landAvg)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  من {fmtM2(marketSummary.landMin)} إلى {fmtM2(marketSummary.landMax)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">الشقق</div>
                <div className="text-xl font-bold text-navy-900">{fmtM2(marketSummary.aptAvg)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  من {fmtM2(marketSummary.aptMin)} إلى {fmtM2(marketSummary.aptMax)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">تكلفة البناء (تقدير تقريبي)</div>
                {marketSummary.struct ? (
                  <>
                    <div className="text-base font-bold text-navy-900">
                      هيكل: {fmtM2(marketSummary.struct.minCost)} - {fmtM2(marketSummary.struct.maxCost)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      تشطيب متوسط: {fmtM2(marketSummary.finMid?.minCost ?? null)} - {fmtM2(marketSummary.finMid?.maxCost ?? null)}
                    </div>
                    <div className="text-xs text-gray-500">
                      تشطيب فاخر: {fmtM2(marketSummary.finLux?.minCost ?? null)} - {fmtM2(marketSummary.finLux?.maxCost ?? null)}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400">لا توجد بيانات</div>
                )}
              </div>
            </div>
            <div className="mt-4 text-[11px] text-gray-400">
              متوسط أسعار العرض (إعلانات) · آخر تحديث: {marketSummary.lastUpdated ? marketSummary.lastUpdated.slice(0, 10) : '-'}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between">
            <div>
              <h2 className="font-bold">سوق الزقازيق اليوم</h2>
              <p className="text-sm text-gray-500 mt-1">لا توجد بيانات موثوقة كافية حالياً</p>
            </div>
            <Link to="/market" className="text-sm bg-navy-800 text-white px-4 py-2 rounded-lg hover:bg-navy-900">
              إدارة بيانات السوق
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-gold-600" />
              <h2 className="font-bold text-lg">متوسط سعر المتر حسب المنطقة</h2>
            </div>
            {areas.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">لم تُضف عقارات بعد.</p>
                <p className="text-xs text-gray-400 mt-1">سيظهر متوسط سعر المتر تلقائياً لكل منطقة بمجرد إضافة عقارات.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {areas.slice(0, 8).map((area) => (
                  <div key={area.zone} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{area.zone}</span>
                      <span className="text-xs text-gray-400">({area.count.toLocaleString('ar-EG')} عقار)</span>
                    </div>
                    <div className="text-sm font-bold">{formatPrice(area.avgPricePerMeter)} / م²</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">أحدث العقارات</h2>
              <Link to="/properties" className="text-sm text-navy-700 hover:underline">
                عرض الكل
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="text-center py-8">
                <Building className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">لا توجد عقارات مضافة بعد.</p>
                <p className="text-xs text-gray-400 mt-1">
                  اضغط "إضافة عقار" لبدء إدخال أول عقار في مكتبك.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((p) => (
                  <Link
                    key={p.id}
                    to={`/properties/${p.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gold-300 hover:bg-navy-50 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.zone || p.city}</div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">{formatPrice(p.price)}</div>
                      <div className="text-xs text-gray-500">{formatArea(p.area)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
