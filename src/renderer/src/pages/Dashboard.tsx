import { useEffect, useMemo, useState } from 'react'
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
  Link2,
  Lock,
  KeyRound,
  ChevronDown,
  Store,
  Castle,
  Briefcase,
  ChartPie,
  TriangleAlert,
  UserPlus,
  Calculator,
  Receipt,
  Hammer,
  Scale,
  Coins,
  ChartColumn,
  CalendarClock,
  Package,
  ArrowLeftRight
} from 'lucide-react'
import type {
  LucideIcon
} from 'lucide-react'
import type {
  DashboardStats,
  AreaStat,
  Property,
  MarketArea,
  ConstructionCost,
  MatchOpportunityStats,
  Client,
  AttentionItem,
  FollowUpStats,
  CommissionSummary,
  DemandAnalytics,
  ConstructionMaterial
} from '@shared/types'
import { formatPrice, formatArea, SERIOUSNESS_LABELS, SERIOUSNESS_COLORS } from '../lib/constants'
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
  const [allProperties, setAllProperties] = useState<Property[]>([])
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [attention, setAttention] = useState<AttentionItem[]>([])
  const [marketAreas, setMarketAreas] = useState<MarketArea[]>([])
  const [constCosts, setConstCosts] = useState<ConstructionCost[]>([])
  const [materials, setMaterials] = useState<ConstructionMaterial[]>([])
  const [followups, setFollowups] = useState<FollowUpStats | null>(null)
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null)
  const [demand, setDemand] = useState<DemandAnalytics | null>(null)
  const [matchStats, setMatchStats] = useState<MatchOpportunityStats | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)

  useEffect(() => {
    window.api.stats.dashboard().then(setStats)
    window.api.stats.areaAverages().then(setAreas)
    window.api.properties.list().then((list: Property[]) => {
      setAllProperties(list)
      setRecent(list.slice(0, 5))
    })
    window.api.clients.list().then((list: Client[]) => setRecentClients(list.slice(0, 5)))
    window.api.stats.attention().then(setAttention)
    window.api.market.listAreas().then(setMarketAreas)
    window.api.constCost.list().then(setConstCosts)
    window.api.materials.list().then(setMaterials)
    window.api.stats.followups().then(setFollowups)
    window.api.commissions.summary().then(setCommissionSummary)
    window.api.stats.demand().then(setDemand)
    window.api.matching.opportunities().then((o) => {
      setMatchStats(o.stats)
      setDataLoaded(true)
    })
  }, [])

  const byType = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of allProperties) {
      const key = p.type.trim() || 'غير محدد'
      m.set(key, (m.get(key) ?? 0) + 1)
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [allProperties])
  const maxTypeCount = byType.length ? Math.max(...byType.map(([, c]) => c)) : 0

  const marketSummary = (() => {
    const land = marketAreas.filter((a) => a.landAvg != null)
    const apt = marketAreas.filter((a) => a.aptAvg != null)
    const rent = marketAreas.filter((a) => a.rentAvg != null)
    const avg = (arr: number[]) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null)
    const struct = constCosts.find((c) => c.category === 'هيكل خرساني فقط')
    const finMid = constCosts.find((c) => c.category === 'تشطيب متوسط')
    const finLux = constCosts.find((c) => c.category === 'تشطيب فاخر')
    const steel = materials.find((m) => m.name === 'حديد')
    const cement = materials.find((m) => m.name === 'أسمنت')
    return {
      landAvg: avg(land.map((a) => a.landAvg as number)),
      landMin: land.length ? Math.min(...land.map((a) => a.landMin ?? a.landAvg ?? 0)) : null,
      landMax: land.length ? Math.max(...land.map((a) => a.landMax ?? a.landAvg ?? 0)) : null,
      aptAvg: avg(apt.map((a) => a.aptAvg as number)),
      aptMin: apt.length ? Math.min(...apt.map((a) => a.aptMin ?? a.aptAvg ?? 0)) : null,
      aptMax: apt.length ? Math.max(...apt.map((a) => a.aptMax ?? a.aptAvg ?? 0)) : null,
      rentAvg: avg(rent.map((a) => a.rentAvg as number)),
      rentMin: rent.length ? Math.min(...rent.map((a) => a.rentMin ?? a.rentAvg ?? 0)) : null,
      rentMax: rent.length ? Math.max(...rent.map((a) => a.rentMax ?? a.rentAvg ?? 0)) : null,
      steel,
      cement,
      struct,
      finMid,
      finLux,
      lastUpdated: marketAreas.length ? marketAreas.map((a) => a.updatedAt || '').sort().reverse()[0] : ''
    }
  })()

  const cards = stats
    ? [
        { label: 'إجمالي العقارات', value: stats.totalProperties, icon: Building2, color: 'bg-navy-800', to: '/properties' },
        { label: 'الأراضي', value: stats.totalLands, icon: LandPlot, color: 'bg-gold-600', to: '/properties?type=أرض' },
        { label: 'الشقق', value: stats.totalApartments, icon: Home, color: 'bg-navy-600', to: '/properties?type=شقة' },
        { label: 'عدد العملاء', value: stats.totalClients, icon: Users, color: 'bg-navy-500', to: '/clients' },
        { label: 'متاح', value: stats.available, icon: CheckCircle2, color: 'bg-emerald-700', to: '/properties?status=available' },
        { label: 'محجوز', value: stats.reserved, icon: Lock, color: 'bg-amber-600', to: '/properties?status=reserved' },
        { label: 'مباع', value: stats.sold, icon: BadgeCheck, color: 'bg-navy-700', to: '/properties?status=sold' },
        { label: 'مؤجر', value: stats.rented, icon: KeyRound, color: 'bg-slate-600', to: '/properties?status=rented' }
      ]
    : []

  const quickAddTypes: { label: string; icon: LucideIcon }[] = [
    { label: 'أرض', icon: LandPlot },
    { label: 'شقة', icon: Home },
    { label: 'محل', icon: Store },
    { label: 'فيلا', icon: Castle },
    { label: 'مكتب', icon: Briefcase }
  ]

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
          <div className="relative">
            <button
              onClick={() => setQuickOpen((o) => !o)}
              className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
            >
              <Plus className="w-4 h-4" /> إضافة سريعة
              <ChevronDown className={`w-4 h-4 transition-transform ${quickOpen ? 'rotate-180' : ''}`} />
            </button>
            {quickOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setQuickOpen(false)} />
                <div className="absolute left-0 top-full mt-2 z-20 bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-56">
                  <div className="text-xs text-gray-400 px-3 py-1.5">عقار جديد</div>
                  {quickAddTypes.map(({ label, icon: Icon }) => (
                    <Link
                      key={label}
                      to={`/properties/new?type=${encodeURIComponent(label)}`}
                      onClick={() => setQuickOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-700 hover:bg-navy-50"
                    >
                      <Icon className="w-4 h-4 text-navy-700" /> {label}
                    </Link>
                  ))}
                  <Link
                    to="/properties/new"
                    onClick={() => setQuickOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-50"
                  >
                    <Building className="w-4 h-4" /> عقار آخر
                  </Link>
                  <div className="border-t border-gray-100 my-1" />
                  <Link
                    to="/clients?new=1"
                    onClick={() => setQuickOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-navy-800 hover:bg-navy-50"
                  >
                    <UserPlus className="w-4 h-4" /> عميل جديد
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              to={card.to}
              className="bg-white rounded-xl shadow-sm p-5 border-t-2 border-gold-400 hover:shadow-md hover:-translate-y-0.5 hover:border-gold-500 transition-all"
            >
              <div className={`inline-flex p-2 rounded-lg ${card.color} text-white mb-3`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold">{(card.value ?? 0).toLocaleString('ar-EG')}</div>
              <div className="text-sm text-gray-500">{card.label}</div>
            </Link>
          ))}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-gold-600" />
            <h2 className="font-bold text-lg">أدوات العميل</h2>
            <span className="text-xs text-gray-400">حاسبات تقديرية مبنية على بيانات السوق والمكتب</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/calc?tool=purchase"
              className="bg-white rounded-xl shadow-sm p-5 border-r-4 border-navy-800 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-2 text-navy-800 font-bold mb-2">
                <Receipt className="w-5 h-5" /> تكلفة الشراء
              </div>
              <p className="text-xs text-gray-500">سعر العقار + وساطة + تسجيل + تشطيب = تقدير مبدئي.</p>
            </Link>
            <Link
              to="/calc?tool=finishing"
              className="bg-white rounded-xl shadow-sm p-5 border-r-4 border-gold-500 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-2 text-navy-800 font-bold mb-2">
                <Hammer className="w-5 h-5 text-gold-600" /> تكلفة التشطيب
              </div>
              <p className="text-xs text-gray-500">مساحة + مستوى تشطيب (اقتصادي/متوسط/مرتفع) من بيانات موثقة.</p>
            </Link>
            <Link
              to="/calc?tool=build"
              className="bg-white rounded-xl shadow-sm p-5 border-r-4 border-navy-600 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-2 text-navy-800 font-bold mb-2">
                <Scale className="w-5 h-5" /> شراء أم بناء؟
              </div>
              <p className="text-xs text-gray-500">مقارنة شقة جاهزة مقابل أرض + بناء — تقدير وليس مقايسة.</p>
            </Link>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gold-600" />
            <h2 className="font-bold text-lg">مؤشرات السوق اليوم</h2>
            <span className="text-xs text-gray-400">
              بيانات موثقة مسجلة يدوياً أو من المصادر — للعرض فقط، والنقر يفتح التفاصيل
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/materials" className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <Package className="w-4 h-4 text-gold-600" /> مواد البناء
              </div>
              {marketSummary.steel || marketSummary.cement ? (
                <div className="space-y-1">
                  {marketSummary.steel && (
                    <div className="text-sm font-bold">{marketSummary.steel.price?.toLocaleString('ar-EG')} <span className="text-[11px] font-normal text-gray-500">ج.م / {marketSummary.steel.unit}</span></div>
                  )}
                  {marketSummary.cement && (
                    <div className="text-sm font-bold">{marketSummary.cement.price?.toLocaleString('ar-EG')} <span className="text-[11px] font-normal text-gray-500">ج.م / {marketSummary.cement.unit}</span></div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-400">لم تُسجل أسعار حديد/أسمنت</div>
              )}
              <div className="text-[11px] text-gray-400 mt-2">حديد وأسمنت · آخر تحديث: {marketSummary.steel?.updatedAt?.slice(0, 10) || marketSummary.cement?.updatedAt?.slice(0, 10) || '-'}</div>
            </Link>
            <Link to="/market" className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <Home className="w-4 h-4 text-gold-600" /> متر الشقق
              </div>
              <div className="text-xl font-bold">{fmtM2(marketSummary.aptAvg)}</div>
              <div className="text-[11px] text-gray-400 mt-1">من {fmtM2(marketSummary.aptMin)} إلى {fmtM2(marketSummary.aptMax)}</div>
            </Link>
            <Link to="/market" className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <LandPlot className="w-4 h-4 text-gold-600" /> متر الأراضي
              </div>
              <div className="text-xl font-bold">{fmtM2(marketSummary.landAvg)}</div>
              <div className="text-[11px] text-gray-400 mt-1">من {fmtM2(marketSummary.landMin)} إلى {fmtM2(marketSummary.landMax)}</div>
            </Link>
            <Link to="/market" className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <KeyRound className="w-4 h-4 text-gold-600" /> إيجارات المتر
              </div>
              <div className="text-xl font-bold">{fmtM2(marketSummary.rentAvg)}</div>
              <div className="text-[11px] text-gray-400 mt-1">من {fmtM2(marketSummary.rentMin)} إلى {fmtM2(marketSummary.rentMax)}</div>
            </Link>
          </div>
          {marketSummary.aptAvg == null && marketSummary.landAvg == null && !marketSummary.steel && !marketSummary.cement && (
            <Link to="/market" className="text-sm bg-navy-800 text-white px-4 py-2 rounded-lg hover:bg-navy-900 inline-block mt-4">
              إدارة بيانات السوق
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-navy-800" />
          <h2 className="font-bold text-lg">إدارة المكتب</h2>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/clients?followup=1"
            className="bg-white rounded-xl shadow-sm p-5 border-r-4 border-amber-500 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <CalendarClock className="w-4 h-4 text-amber-600" /> متابعات اليوم
            </div>
            <div className="flex items-end gap-4">
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  {((followups?.dueToday ?? 0) + (followups?.overdue ?? 0)).toLocaleString('ar-EG')}
                </div>
                <div className="text-xs text-gray-500">مستحقة (اليوم + متأخرة)</div>
              </div>
              <div className="text-[11px] text-gray-400 mb-1">
                {followups?.dueToday ?? 0} اليوم · {followups?.overdue ?? 0} متأخرة · {followups?.upcoming ?? 0} قادمة
              </div>
            </div>
          </Link>
          <Link
            to="/commissions"
            className="bg-white rounded-xl shadow-sm p-5 border-r-4 border-emerald-600 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Coins className="w-4 h-4 text-emerald-600" /> عمولات هذا الشهر
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{commissionSummary ? commissionSummary.monthExpected.toLocaleString('ar-EG') : '—'}</div>
                <div className="text-xs text-gray-500">مستحقة</div>
              </div>
              <div className="text-left text-[11px] text-gray-400">
                <div>مستلم: {(commissionSummary?.monthReceived ?? 0).toLocaleString('ar-EG')} ج.م</div>
                <div>مستحق: {(commissionSummary?.monthOutstanding ?? 0).toLocaleString('ar-EG')} ج.م</div>
              </div>
            </div>
          </Link>
          <Link
            to="/demand"
            className="bg-white rounded-xl shadow-sm p-5 border-r-4 border-navy-600 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <ChartColumn className="w-4 h-4 text-navy-600" /> طلب العملاء
            </div>
            <div className="text-2xl font-bold">
              {demand?.enoughData ? demand.totalClients.toLocaleString('ar-EG') : '—'}
            </div>
            <div className="text-xs text-gray-500">
              {demand?.enoughData
                ? `أكثر نوع مطلوب: ${demand.topTypes[0]?.label || '—'}`
                : 'لا توجد بيانات عملاء كافية للتحليل'}
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-4 mt-8">
          <ArrowLeftRight className="w-5 h-5 text-gold-600" />
          <h2 className="font-bold text-lg">سوق الزقازيق اليوم</h2>
          <Link to="/market" className="text-sm text-navy-700 hover:underline mr-auto">
            عرض تفاصيل السوق
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
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

        {attention.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-amber-400">
            <div className="flex items-center gap-2 mb-4">
              <TriangleAlert className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-lg">يحتاج انتباهك</h2>
              <span className="text-xs text-gray-400">بيانات ناقصة يمكن استكمالها</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {attention.slice(0, 8).map((item, i) => (
                <Link
                  key={`${item.kind}-${item.entityType}-${item.entityId}-${i}`}
                  to={item.entityType === 'property' ? `/properties/${item.entityId}` : `/clients/${item.entityId}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                >
                  <div className="text-amber-500">
                    {item.entityType === 'property' ? <Building className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.subtitle}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />
                </Link>
              ))}
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">حسب النوع</h2>
              <Link to="/properties" className="text-sm text-navy-700 hover:underline">
                عرض الكل
              </Link>
            </div>
            {byType.length === 0 ? (
              <div className="text-center py-8">
                <ChartPie className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">لا توجد عقارات مضافة بعد.</p>
                <p className="text-xs text-gray-400 mt-1">ستظهر الأنواع تلقائياً بمجرد إضافة عقارات.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {byType.map(([type, count]) => (
                  <Link
                    key={type}
                    to={`/properties?type=${encodeURIComponent(type)}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium group-hover:text-navy-700">{type}</span>
                      <span className="text-gray-500">{count.toLocaleString('ar-EG')} عقار</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold-500 rounded-full group-hover:bg-gold-600 transition-colors"
                        style={{ width: `${maxTypeCount ? Math.round((count / maxTypeCount) * 100) : 0}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">أحدث العملاء</h2>
              <Link to="/clients" className="text-sm text-navy-700 hover:underline">
                عرض الكل
              </Link>
            </div>
            {recentClients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">لا يوجد عملاء بعد.</p>
                <p className="text-xs text-gray-400 mt-1">
                  اضغط "عميل جديد" في قائمة الإضافة السريعة لبدء إدخال العملاء.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentClients.map((c) => (
                  <Link
                    key={c.id}
                    to={`/clients/${c.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gold-300 hover:bg-navy-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-800 flex items-center justify-center font-bold text-sm">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.area || c.preferredArea || 'بدون منطقة'}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${SERIOUSNESS_COLORS[c.seriousness]}`}>
                      {SERIOUSNESS_LABELS[c.seriousness]}
                    </span>
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
