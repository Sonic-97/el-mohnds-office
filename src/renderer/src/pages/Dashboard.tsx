import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Building2, CalendarClock, ChartColumn, CheckCircle2, Coins, Home, KeyRound, LandPlot, Link2, Package, Plus, Target, Users } from 'lucide-react'
import type { Client, CommissionSummary, ConstructionMaterial, DashboardStats, DemandAnalytics, FollowUpStats, MarketArea, MatchOpportunityStats, Property } from '@shared/types'
import PropertyCard from '../components/PropertyCard'
import { EmptyState } from '../components/ui'
import { fmtM2 } from '../lib/market'
import { useAuth } from '../components/AuthContext'

function DashboardHeader({ username }: { username: string }) {
  return (
    <section className="dashboard-hero">
      <div>
        <div className="dashboard-greeting-mark">👋</div>
        <h1>مرحباً بك، {username || 'المستخدم'}</h1>
        <p>إدارة ذكية لمكتبك العقاري</p>
      </div>
      <div className="dashboard-hero-caption">OFFICE INTELLIGENCE</div>
    </section>
  )
}

export default function Dashboard() {
  const auth = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<Property[]>([])
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [marketAreas, setMarketAreas] = useState<MarketArea[]>([])
  const [materials, setMaterials] = useState<ConstructionMaterial[]>([])
  const [followups, setFollowups] = useState<FollowUpStats | null>(null)
  const [commissions, setCommissions] = useState<CommissionSummary | null>(null)
  const [demand, setDemand] = useState<DemandAnalytics | null>(null)
  const [matches, setMatches] = useState<MatchOpportunityStats | null>(null)

  useEffect(() => {
    window.api.stats.dashboard().then(setStats)
    window.api.properties.list().then((items: Property[]) => setRecent(items.slice(0, 4)))
    window.api.clients.list().then((items: Client[]) => setRecentClients(items.slice(0, 5)))
    window.api.market.listAreas().then(setMarketAreas)
    window.api.materials.list().then(setMaterials)
    window.api.stats.followups().then(setFollowups)
    window.api.commissions.summary().then(setCommissions)
    window.api.stats.demand().then(setDemand)
    window.api.matching.opportunities().then((result) => setMatches(result.stats))
  }, [])

  const market = useMemo(() => {
    const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
    return {
      apartment: average(marketAreas.flatMap((area) => area.aptAvg == null ? [] : [area.aptAvg])),
      land: average(marketAreas.flatMap((area) => area.landAvg == null ? [] : [area.landAvg])),
      rent: average(marketAreas.flatMap((area) => area.rentAvg == null ? [] : [area.rentAvg])),
      steel: materials.find((item) => item.name === 'حديد'),
      cement: materials.find((item) => item.name === 'أسمنت')
    }
  }, [marketAreas, materials])

  const metrics = stats ? [
    { label: 'إجمالي العقارات', value: stats.totalProperties, icon: Building2, to: '/properties', primary: true },
    { label: 'العملاء', value: stats.totalClients, icon: Users, to: '/clients' },
    { label: 'الأراضي', value: stats.totalLands, icon: LandPlot, to: '/properties?type=أرض' },
    { label: 'الشقق', value: stats.totalApartments, icon: Home, to: '/properties?type=شقة' },
    { label: 'متاح', value: stats.available, icon: CheckCircle2, to: '/properties?status=available' },
    { label: 'مباع', value: stats.sold, icon: BadgeCheck, to: '/properties?status=sold' }
  ] : []

  const marketItems = [
    market.steel?.price != null ? { label: 'حديد', value: `${market.steel.price.toLocaleString('ar-EG')} ج.م`, meta: `لكل ${market.steel.unit} · ${market.steel.updatedAt.slice(0, 10)}`, icon: Package, to: '/materials' } : null,
    market.cement?.price != null ? { label: 'أسمنت', value: `${market.cement.price.toLocaleString('ar-EG')} ج.م`, meta: `لكل ${market.cement.unit} · ${market.cement.updatedAt.slice(0, 10)}`, icon: Package, to: '/materials' } : null,
    market.apartment != null ? { label: 'متر الشقق', value: fmtM2(market.apartment), meta: 'متوسط بيانات السوق المسجلة', icon: Home, to: '/market' } : null,
    market.land != null ? { label: 'متر الأراضي', value: fmtM2(market.land), meta: 'متوسط بيانات السوق المسجلة', icon: LandPlot, to: '/market' } : null,
    market.rent != null ? { label: 'الإيجارات', value: fmtM2(market.rent), meta: 'متوسط بيانات السوق المسجلة', icon: KeyRound, to: '/market' } : null
  ].filter((item): item is NonNullable<typeof item> => item != null)

  const activity = [
    { label: 'فرص المطابقة', value: (matches?.propertiesWithClients ?? 0) + (matches?.clientsWithProperties ?? 0), meta: `${matches?.propertiesWithClients ?? 0} عقار · ${matches?.clientsWithProperties ?? 0} عميل`, icon: Link2, to: '/matches' },
    { label: 'متابعات اليوم', value: (followups?.dueToday ?? 0) + (followups?.overdue ?? 0), meta: `${followups?.dueToday ?? 0} اليوم · ${followups?.overdue ?? 0} متأخرة`, icon: CalendarClock, to: '/clients?followup=1' },
    { label: 'عمولات الشهر', value: commissions?.monthExpected ?? 0, meta: `${(commissions?.monthOutstanding ?? 0).toLocaleString('ar-EG')} ج.م مستحقة`, suffix: 'ج.م', icon: Coins, to: '/commissions' },
    { label: 'طلب العملاء', value: demand?.withRequirements ?? 0, meta: `${recentClients.length} من أحدث العملاء معروضون`, icon: ChartColumn, to: '/demand' },
    { label: 'عقارات محجوزة', value: stats?.reserved ?? 0, meta: 'تحتاج متابعة حالة الحجز', icon: Target, to: '/properties?status=reserved' }
  ]

  return (
    <div className="page-presentation dashboard-page p-6 lg:p-8">
      <DashboardHeader username={auth.username} />
      <section className="dashboard-section dashboard-overview-section">
        <div className="dashboard-metrics">
          {metrics.map(({ label, value, icon: Icon, to, primary }) => (
            <Link key={label} to={to} className={`dashboard-metric ${primary ? 'dashboard-metric-primary' : ''}`}>
              <div className="dashboard-metric-icon"><Icon className="h-5 w-5" strokeWidth={1.65} /></div>
              <div className={primary ? 'type-metric' : 'text-2xl font-semibold numeric'}>{value.toLocaleString('ar-EG')}</div>
              <div className="mt-1 text-sm text-muted-500">{label}</div>
              <ArrowLeft className="dashboard-card-arrow h-4 w-4" strokeWidth={1.75} />
            </Link>
          ))}
        </div>
      </section>
      <section className="dashboard-section market-command-strip">
        <div className="dashboard-section-heading text-white">
          <div><h2 className="type-section-title">السوق اليوم</h2><p className="mt-1 text-xs text-slate-400">بيانات مسجلة من المصادر والمكتب — لا قيم تقديرية مخفية</p></div>
          <Link to="/market" className="btn btn-tertiary text-gold-200 hover:bg-white/5">التفاصيل <ArrowLeft className="h-4 w-4" /></Link>
        </div>
        {marketItems.length ? <div className="market-command-grid">
          {marketItems.map(({ label, value, meta, icon: Icon, to }) => <Link key={label} to={to} className="market-command-item">
            <div className="flex items-center gap-2 text-xs text-slate-400"><Icon className="h-4 w-4 text-gold-300" strokeWidth={1.65} /> {label}</div>
            <div className="mt-2 text-lg font-semibold text-white numeric">{value}</div><div className="mt-1 text-[11px] text-slate-500">{meta}</div>
          </Link>)}
        </div> : <div className="py-8 text-center text-sm text-slate-400">لا توجد بيانات سوق أو مواد مسجلة حالياً.</div>}
      </section>
      <section className="dashboard-section">
        <div className="dashboard-section-heading"><div><h2 className="type-section-title">مركز العمل اليوم</h2><p className="type-meta mt-1">أولويات تحتاج متابعتك الآن</p></div></div>
        <div className="dashboard-activity-grid">
          {activity.map(({ label, value, meta, suffix, icon: Icon, to }) => <Link key={label} to={to} className="dashboard-activity-card">
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-ink-900">{label}</span><Icon className="h-4 w-4 text-muted-500" strokeWidth={1.75} /></div>
            <div className="mt-4 text-2xl font-semibold numeric">{value.toLocaleString('ar-EG')} {suffix && <span className="text-xs font-normal text-muted-500">{suffix}</span>}</div><div className="type-meta mt-1">{meta}</div>
          </Link>)}
        </div>
      </section>
      <section className="dashboard-section">
        <div className="dashboard-section-heading"><div><h2 className="type-section-title">أحدث العقارات</h2><p className="type-meta mt-1">آخر ما تم تحديثه في سجل المكتب</p></div><Link to="/properties" className="btn btn-secondary btn-sm">عرض الكل <ArrowLeft className="h-4 w-4" /></Link></div>
        {recent.length ? <div className="dashboard-property-grid">{recent.map((property) => <PropertyCard key={property.id} property={property} compact />)}</div> : <EmptyState icon={<Building2 className="h-6 w-6" strokeWidth={1.75} />} title="لا توجد عقارات بعد" description="أضف أول عقار ليظهر في لوحة المكتب والخرائط والمطابقات." primaryAction={<Link to="/properties/new" className="btn btn-premium"><Plus className="h-4 w-4" /> إضافة أول عقار</Link>} />}
      </section>
    </div>
  )
}
