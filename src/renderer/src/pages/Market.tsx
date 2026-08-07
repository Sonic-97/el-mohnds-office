import { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  LandPlot,
  Home,
  Hammer,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Link2,
  Calculator,
  ArrowLeftRight,
  RefreshCw,
  Building2,
  Info
} from 'lucide-react'
import type {
  MarketArea,
  MarketAreaInput,
  MarketDataType,
  ConstructionCost,
  ConstructionCostInput,
  OfficeZoneStat
} from '@shared/types'
import Modal from '../components/Modal'
import { fmtEgp, fmtM2, isStale, calcBuildPlan, calcConstructionCost, calcBuyApartment } from '../lib/market'

const DTYPE_LABELS: Record<MarketDataType, string> = {
  listing: 'سعر عرض (إعلانات)',
  official: 'رقم رسمي',
  'market-report': 'تقرير سوق',
  manual: 'إدخال يدوي',
  calculated: 'محسوب'
}

const FINISH_FACTORS = [
  { value: 'raw', label: 'بدون تشطيب', factor: 0.85 },
  { value: 'half', label: 'نصف تشطيب', factor: 1.0 },
  { value: 'full', label: 'تشطيب كامل', factor: 1.1 },
  { value: 'super', label: 'سوبر لوكس', factor: 1.2 },
  { value: 'new', label: 'جديد', factor: 1.15 },
  { value: 'resale', label: 'إعادة بيع', factor: 0.95 }
]

const inputCls =
  'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

function nf(v: string): number | null {
  const n = Number(v)
  return v.trim() === '' || !isFinite(n) ? null : n
}

function AreaModal({
  initial,
  onClose,
  onSaved
}: {
  initial: MarketArea | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<MarketAreaInput>(
    initial
      ? {
          area: initial.area,
          landMin: initial.landMin,
          landAvg: initial.landAvg,
          landMax: initial.landMax,
          landCount: initial.landCount,
          landDataType: initial.landDataType,
          aptMin: initial.aptMin,
          aptAvg: initial.aptAvg,
          aptMax: initial.aptMax,
          aptCount: initial.aptCount,
          aptDataType: initial.aptDataType,
          sourceName: initial.sourceName,
          sourceUrl: initial.sourceUrl,
          sourceDate: initial.sourceDate,
          notes: initial.notes
        }
      : {
          area: '',
          landMin: null,
          landAvg: null,
          landMax: null,
          landCount: 0,
          landDataType: 'manual',
          aptMin: null,
          aptAvg: null,
          aptMax: null,
          aptCount: 0,
          aptDataType: 'manual',
          sourceName: '',
          sourceUrl: '',
          sourceDate: '',
          notes: ''
        }
  )
  const [error, setError] = useState('')

  async function save() {
    setError('')
    if (!form.area.trim()) {
      setError('اسم المنطقة مطلوب')
      return
    }
    try {
      await window.api.market.saveArea({
        ...form,
        landCount: form.landCount || 0,
        aptCount: form.aptCount || 0
      })
      onSaved()
    } catch (e) {
      setError(String(e))
    }
  }

  const field = (num: string) => `block text-xs font-medium text-gray-600 mb-1`

  return (
    <Modal title={initial ? `تعديل: ${initial.area}` : 'إضافة منطقة'} onClose={onClose} size="lg">
      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>اسم المنطقة *</label>
            <input className={inputCls} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>تاريخ المصدر (YYYY-MM-DD)</label>
            <input dir="ltr" className={inputCls} value={form.sourceDate} onChange={(e) => setForm({ ...form, sourceDate: e.target.value })} />
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-3">
          <div className="font-semibold text-sm text-navy-800 mb-2 flex items-center gap-2">
            <LandPlot className="w-4 h-4 text-gold-600" /> سعر المتر - الأرض (ج.م)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className={field('')}>الأقل</label>
              <input className={inputCls} value={form.landMin ?? ''} onChange={(e) => setForm({ ...form, landMin: nf(e.target.value) })} />
            </div>
            <div>
              <label className={field('')}>المتوسط</label>
              <input className={inputCls} value={form.landAvg ?? ''} onChange={(e) => setForm({ ...form, landAvg: nf(e.target.value) })} />
            </div>
            <div>
              <label className={field('')}>الأعلى</label>
              <input className={inputCls} value={form.landMax ?? ''} onChange={(e) => setForm({ ...form, landMax: nf(e.target.value) })} />
            </div>
            <div>
              <label className={field('')}>عدد العينات</label>
              <input className={inputCls} value={form.landCount} onChange={(e) => setForm({ ...form, landCount: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label className={field('')}>نوع البيانات</label>
              <select className={inputCls} value={form.landDataType} onChange={(e) => setForm({ ...form, landDataType: e.target.value as MarketDataType })}>
                {Object.entries(DTYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-3">
          <div className="font-semibold text-sm text-navy-800 mb-2 flex items-center gap-2">
            <Home className="w-4 h-4 text-gold-600" /> سعر المتر - الشقق (ج.م)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className={field('')}>الأقل</label>
              <input className={inputCls} value={form.aptMin ?? ''} onChange={(e) => setForm({ ...form, aptMin: nf(e.target.value) })} />
            </div>
            <div>
              <label className={field('')}>المتوسط</label>
              <input className={inputCls} value={form.aptAvg ?? ''} onChange={(e) => setForm({ ...form, aptAvg: nf(e.target.value) })} />
            </div>
            <div>
              <label className={field('')}>الأعلى</label>
              <input className={inputCls} value={form.aptMax ?? ''} onChange={(e) => setForm({ ...form, aptMax: nf(e.target.value) })} />
            </div>
            <div>
              <label className={field('')}>عدد العينات</label>
              <input className={inputCls} value={form.aptCount} onChange={(e) => setForm({ ...form, aptCount: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label className={field('')}>نوع البيانات</label>
              <select className={inputCls} value={form.aptDataType} onChange={(e) => setForm({ ...form, aptDataType: e.target.value as MarketDataType })}>
                {Object.entries(DTYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>اسم المصدر</label>
            <input className={inputCls} value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>رابط المصدر</label>
            <input dir="ltr" className={inputCls} value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>ملاحظات</label>
            <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm">إلغاء</button>
          <button onClick={save} className="bg-navy-800 text-white px-5 py-2 rounded-lg text-sm">حفظ</button>
        </div>
      </div>
    </Modal>
  )
}

function ConstModal({
  initial,
  onClose,
  onSaved
}: {
  initial: ConstructionCost | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ConstructionCostInput>(
    initial
      ? {
          category: initial.category,
          minCost: initial.minCost,
          typicalCost: initial.typicalCost,
          maxCost: initial.maxCost,
          sourceName: initial.sourceName,
          sourceUrl: initial.sourceUrl,
          sourceDate: initial.sourceDate
        }
      : { category: '', minCost: null, typicalCost: null, maxCost: null, sourceName: '', sourceUrl: '', sourceDate: '' }
  )
  const [error, setError] = useState('')

  async function save() {
    setError('')
    if (!form.category.trim()) {
      setError('اسم البند مطلوب')
      return
    }
    try {
      await window.api.constCost.save(form)
      onSaved()
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <Modal title={initial ? `تعديل: ${initial.category}` : 'إضافة بند تكلفة بناء'} onClose={onClose}>
      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
      <div className="space-y-3">
        <div>
          <label className={labelCls}>اسم البند *</label>
          <input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>الأقل (ج/م²)</label>
            <input className={inputCls} value={form.minCost ?? ''} onChange={(e) => setForm({ ...form, minCost: nf(e.target.value) })} />
          </div>
          <div>
            <label className={labelCls}>الاعتيادي (ج/م²)</label>
            <input className={inputCls} value={form.typicalCost ?? ''} onChange={(e) => setForm({ ...form, typicalCost: nf(e.target.value) })} />
          </div>
          <div>
            <label className={labelCls}>الأعلى (ج/م²)</label>
            <input className={inputCls} value={form.maxCost ?? ''} onChange={(e) => setForm({ ...form, maxCost: nf(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className={labelCls}>المصدر</label>
          <input className={inputCls} value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>الرابط</label>
            <input dir="ltr" className={inputCls} value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>تاريخ المصدر</label>
            <input dir="ltr" className={inputCls} value={form.sourceDate} onChange={(e) => setForm({ ...form, sourceDate: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm">إلغاء</button>
          <button onClick={save} className="bg-navy-800 text-white px-5 py-2 rounded-lg text-sm">حفظ</button>
        </div>
      </div>
    </Modal>
  )
}

function RangeBox({ title, min, avg, max, count, dataType, icon }: {
  title: string
  min: number | null
  avg: number | null
  max: number | null
  count: number
  dataType: MarketDataType
  icon: React.ReactNode
}) {
  const hasData = min != null || avg != null || max != null
  return (
    <div className="flex-1 min-w-[160px]">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
        {icon}
        {title}
      </div>
      {hasData ? (
        <>
          <div className="text-xl font-bold text-navy-900">{fmtM2(avg)}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            من {fmtM2(min)} إلى {fmtM2(max)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {count > 0 ? `${count.toLocaleString('ar-EG')} عينة` : 'بدون عينات'} · {DTYPE_LABELS[dataType]}
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-400">لا توجد بيانات</div>
      )}
    </div>
  )
}

function AreaCard({
  area,
  office,
  onEdit,
  onDelete
}: {
  area: MarketArea
  office: OfficeZoneStat | undefined
  onEdit: () => void
  onDelete: () => void
}) {
  const stale = isStale(area.updatedAt)
  const officeMatch = office && office.count > 0 ? office : undefined
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-navy-950">
        <div className="flex items-center gap-2 text-white font-bold">
          <MapPin className="w-4 h-4 text-gold-400" />
          {area.area}
        </div>
        <div className="flex items-center gap-2">
          {stale && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">قد تحتاج هذه البيانات إلى تحديث</span>
          )}
          <button onClick={onEdit} className="text-slate-300 hover:text-gold-400" title="تعديل">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="text-slate-300 hover:text-red-400" title="حذف">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-4">
          <RangeBox title="الأرض" min={area.landMin} avg={area.landAvg} max={area.landMax} count={area.landCount} dataType={area.landDataType} icon={<LandPlot className="w-3.5 h-3.5 text-gold-600" />} />
          <RangeBox title="الشقق" min={area.aptMin} avg={area.aptAvg} max={area.aptMax} count={area.aptCount} dataType={area.aptDataType} icon={<Home className="w-3.5 h-3.5 text-gold-600" />} />
        </div>
        {officeMatch && (
          <div className="mt-3 bg-navy-50 rounded-lg px-3 py-2">
            <div className="text-[11px] font-bold text-navy-800 mb-1">بيانات مكتبك ({officeMatch.count.toLocaleString('ar-EG')} عقار)</div>
            <div className="flex flex-wrap gap-x-4 text-xs text-gray-600">
              <span>متوسط: <b>{fmtM2(officeMatch.avg)}</b></span>
              <span>وسيط: <b>{fmtM2(officeMatch.median)}</b></span>
              <span>من {fmtM2(officeMatch.min)} إلى {fmtM2(officeMatch.max)}</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-3 text-[11px] text-gray-400">
          <span>آخر تحديث: {area.updatedAt?.slice(0, 10) || '-'}</span>
          {area.sourceName && <span>{area.sourceName}</span>}
        </div>
        {area.sourceUrl && (
          <a href={area.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-navy-700 hover:underline">
            <Link2 className="w-3 h-3" /> المصدر
          </a>
        )}
        {area.notes && <div className="mt-2 text-[11px] text-gray-500 leading-relaxed">{area.notes}</div>}
      </div>
    </div>
  )
}

export default function Market() {
  const [areas, setAreas] = useState<MarketArea[]>([])
  const [costs, setCosts] = useState<ConstructionCost[]>([])
  const [office, setOffice] = useState<OfficeZoneStat[]>([])
  const [areaModal, setAreaModal] = useState<{ open: boolean; initial: MarketArea | null }>({ open: false, initial: null })
  const [constModal, setConstModal] = useState<{ open: boolean; initial: ConstructionCost | null }>({ open: false, initial: null })

  function load() {
    window.api.market.listAreas().then(setAreas)
    window.api.constCost.list().then(setCosts)
    window.api.market.officeStats().then(setOffice)
  }

  useEffect(load, [])

  const officeByZone = useMemo(() => {
    const m = new Map<string, OfficeZoneStat>()
    for (const s of office) m.set(s.zone, s)
    return m
  }, [office])

  const lastUpdated = useMemo(
    () => (areas.length ? areas.map((a) => a.updatedAt || '').sort().reverse()[0] : ''),
    [areas]
  )

  const summary = useMemo(() => {
    const withLand = areas.filter((a) => a.landAvg != null)
    const withApt = areas.filter((a) => a.aptAvg != null)
    const avg = (arr: number[]) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null)
    return {
      landAvg: avg(withLand.map((a) => a.landAvg as number)),
      landMin: withLand.length ? Math.min(...withLand.map((a) => a.landMin ?? a.landAvg ?? 0)) : null,
      landMax: withLand.length ? Math.max(...withLand.map((a) => a.landMax ?? a.landAvg ?? 0)) : null,
      aptAvg: avg(withApt.map((a) => a.aptAvg as number)),
      aptMin: withApt.length ? Math.min(...withApt.map((a) => a.aptMin ?? a.aptAvg ?? 0)) : null,
      aptMax: withApt.length ? Math.max(...withApt.map((a) => a.aptMax ?? a.aptAvg ?? 0)) : null
    }
  }, [areas])

  const byCategory = useMemo(() => {
    const m = new Map<string, ConstructionCost>()
    for (const c of costs) m.set(c.category, c)
    return m
  }, [costs])

  const struct = byCategory.get('هيكل خرساني فقط')
  const finMid = byCategory.get('تشطيب متوسط')
  const finLux = byCategory.get('تشطيب فاخر')

  // ---------- calculators ----------
  const [cLand, setCLand] = useState('200')
  const [cRatio, setCRatio] = useState('60')
  const [cFloors, setCFloors] = useState('5')
  const [cFin, setCFin] = useState('finMid')

  const buildPlan = calcBuildPlan(Number(cLand) || 0, Number(cRatio) || 0, Number(cFloors) || 0)
  const buildFin = byCategory.get(cFin === 'finMid' ? 'تشطيب متوسط' : cFin === 'finGood' ? 'تشطيب جيد' : cFin === 'finLux' ? 'تشطيب فاخر' : 'نصف تشطيب')
  const buildCost = calcConstructionCost(
    buildPlan,
    { min: struct?.minCost ?? null, typical: struct?.typicalCost ?? null, max: struct?.maxCost ?? null },
    { min: buildFin?.minCost ?? null, typical: buildFin?.typicalCost ?? null, max: buildFin?.maxCost ?? null }
  )

  const [bArea, setBArea] = useState('150')
  const [bRegion, setBRegion] = useState('')
  const [bFinish, setBFinish] = useState('half')
  const aptRates = useMemo(() => {
    const selected = areas.find((a) => a.area === bRegion)
    if (selected && (selected.aptAvg != null || selected.aptMin != null)) {
      return { min: selected.aptMin, avg: selected.aptAvg, max: selected.aptMax }
    }
    const withApt = areas.filter((a) => a.aptAvg != null)
    if (!withApt.length) return { min: null, avg: null, max: null }
    return {
      min: Math.min(...withApt.map((a) => a.aptMin ?? a.aptAvg ?? 0)),
      avg: withApt.reduce((x, a) => x + (a.aptAvg as number), 0) / withApt.length,
      max: Math.max(...withApt.map((a) => a.aptMax ?? a.aptAvg ?? 0))
    }
  }, [areas, bRegion])
  const factor = FINISH_FACTORS.find((f) => f.value === bFinish)?.factor ?? 1
  const buyResult = calcBuyApartment(Number(bArea) || 0, {
    min: aptRates.min != null ? aptRates.min * factor : null,
    avg: aptRates.avg != null ? aptRates.avg * factor : null,
    max: aptRates.max != null ? aptRates.max * factor : null
  })

  const [bvLandCost, setBvLandCost] = useState('')
  const buildVsBuy = useMemo(() => {
    const size = Number(bArea) || 0
    const plan = calcBuildPlan(Number(cLand) || 0, Number(cRatio) || 0, Number(cFloors) || 0)
    const fin = buildFin
    const cost = calcConstructionCost(
      plan,
      { min: struct?.minCost ?? null, typical: struct?.typicalCost ?? null, max: struct?.maxCost ?? null },
      { min: fin?.minCost ?? null, typical: fin?.typicalCost ?? null, max: fin?.maxCost ?? null }
    )
    const landCost = nf(bvLandCost)
    return {
      buy: calcBuyApartment(size, {
        min: aptRates.min != null ? aptRates.min * factor : null,
        avg: aptRates.avg != null ? aptRates.avg * factor : null,
        max: aptRates.max != null ? aptRates.max * factor : null
      }),
      landBuild: {
        min: landCost != null && cost.total.min != null ? landCost + cost.total.min : null,
        avg: landCost != null && cost.total.typical != null ? landCost + cost.total.typical : null,
        max: landCost != null && cost.total.max != null ? landCost + cost.total.max : null
      },
      ownLandBuild: cost.total
    }
  }, [bArea, bvLandCost, cLand, cRatio, cFloors, aptRates, factor, buildFin, struct])

  const noMarket = areas.length === 0

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مؤشرات السوق العقاري - الزقازيق</h1>
          <p className="text-sm text-gray-500 mt-1">
            بيانات سوق خارجية موثقة + بيانات مكتبك، مع تقديرات واضحة المصدر. لا نختلق أسعاراً.
          </p>
        </div>
        <button
          onClick={() => setAreaModal({ open: true, initial: null })}
          className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
        >
          <Plus className="w-4 h-4" /> إضافة منطقة
        </button>
      </div>

      {noMarket ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <Info className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">لا توجد بيانات موثوقة كافية حالياً</p>
          <p className="text-sm text-gray-400 mt-1">أضف بيانات السوق من معرفتك المحلية عبر "إضافة منطقة"</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold-600" /> سوق الزقازيق اليوم
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RangeBox title="الأراضي" min={summary.landMin} avg={summary.landAvg} max={summary.landMax} count={areas.reduce((x, a) => x + a.landCount, 0)} dataType="calculated" icon={<LandPlot className="w-3.5 h-3.5 text-gold-600" />} />
              <RangeBox title="الشقق" min={summary.aptMin} avg={summary.aptAvg} max={summary.aptMax} count={areas.reduce((x, a) => x + a.aptCount, 0)} dataType="calculated" icon={<Home className="w-3.5 h-3.5 text-gold-600" />} />
              <div className="flex-1 min-w-[160px]">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Hammer className="w-3.5 h-3.5 text-gold-600" /> تكلفة البناء (تقدير تقريبي)
                </div>
                {struct ? (
                  <>
                    <div className="text-xl font-bold text-navy-900">هيكل: {fmtM2(struct.minCost)} - {fmtM2(struct.maxCost)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      تشطيب متوسط: {fmtM2(finMid?.minCost ?? null)} - {fmtM2(finMid?.maxCost ?? null)}
                    </div>
                    <div className="text-xs text-gray-500">
                      تشطيب فاخر: {fmtM2(finLux?.minCost ?? null)} - {fmtM2(finLux?.maxCost ?? null)}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400">لا توجد بيانات</div>
                )}
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              آخر تحديث: {lastUpdated ? lastUpdated.slice(0, 10) : '-'} · متوسط أسعار العرض (إعلانات) ما لم يُذكر خلافه
            </div>
          </div>

          <div>
            <h2 className="font-bold mb-3">المناطق</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {areas.map((a) => (
                <AreaCard
                  key={a.id}
                  area={a}
                  office={officeByZone.get(a.area)}
                  onEdit={() => setAreaModal({ open: true, initial: a })}
                  onDelete={async () => {
                    if (confirm(`حذف منطقة "${a.area}"؟`)) {
                      await window.api.market.deleteArea(a.id)
                      load()
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <Hammer className="w-5 h-5 text-gold-600" /> تكلفة البناء التقريبية (ج/م²)
          </h2>
          <button
            onClick={() => setConstModal({ open: true, initial: null })}
            className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
          >
            <Plus className="w-4 h-4" /> إضافة بند
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          تقديرات تقريبية لمصر 2026 وقد تختلف في الشرقية — يمكنك تصحيحها من معرفتك المحلية.
        </p>
        {costs.length === 0 ? (
          <p className="text-sm text-gray-400">لا توجد بيانات</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-gray-500 border-b">
                  <th className="py-2 font-medium">البند</th>
                  <th className="py-2 font-medium">الأقل</th>
                  <th className="py-2 font-medium">الاعتيادي</th>
                  <th className="py-2 font-medium">الأعلى</th>
                  <th className="py-2 font-medium">المصدر</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-2 font-medium">{c.category}</td>
                    <td className="py-2">{fmtM2(c.minCost)}</td>
                    <td className="py-2 font-bold text-navy-800">{fmtM2(c.typicalCost)}</td>
                    <td className="py-2">{fmtM2(c.maxCost)}</td>
                    <td className="py-2 text-xs text-gray-400">{c.sourceName}</td>
                    <td className="py-2">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setConstModal({ open: true, initial: c })} className="text-gray-500 hover:text-navy-800">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`حذف بند "${c.category}"؟`)) {
                              await window.api.constCost.delete(c.id)
                              load()
                            }
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-gold-600" /> حاسبة تكلفة البناء
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className={labelCls}>مساحة الأرض (م²)</label>
              <input className={inputCls} value={cLand} onChange={(e) => setCLand(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>نسبة البناء (%)</label>
              <input className={inputCls} value={cRatio} onChange={(e) => setCRatio(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>عدد الأدوار</label>
              <input className={inputCls} value={cFloors} onChange={(e) => setCFloors(e.target.value)} />
            </div>
          </div>
          <div className="mb-4">
            <label className={labelCls}>مستوى التشطيب</label>
            <select className={inputCls} value={cFin} onChange={(e) => setCFin(e.target.value)}>
              <option value="half">نصف تشطيب</option>
              <option value="finMid">تشطيب متوسط</option>
              <option value="finGood">تشطيب جيد</option>
              <option value="finLux">تشطيب فاخر</option>
            </select>
          </div>
          <div className="bg-navy-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">مسطح الدور</span><b>{Math.round(buildPlan.footprint).toLocaleString('ar-EG')} م²</b></div>
            <div className="flex justify-between"><span className="text-gray-600">إجمالي المساحة المبنية</span><b>{Math.round(buildPlan.totalArea).toLocaleString('ar-EG')} م²</b></div>
            <div className="border-t border-navy-200 pt-2 flex justify-between"><span className="text-gray-600">تكلفة الهيكل (تقدير)</span><b>{fmtEgp(buildCost.structure.typical)}</b></div>
            <div className="flex justify-between"><span className="text-gray-600">تكلفة التشطيب (تقدير)</span><b>{fmtEgp(buildCost.finishing.typical)}</b></div>
            <div className="flex justify-between text-navy-900"><span className="font-bold">الإجمالي التقريبي</span><b className="text-base">{fmtEgp(buildCost.total.typical)}</b></div>
            <div className="text-[11px] text-gray-400">النطاق: {fmtEgp(buildCost.total.min)} - {fmtEgp(buildCost.total.max)} (دون سعر الأرض)</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-gold-600" /> تكلفة شراء شقة
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className={labelCls}>المنطقة</label>
              <select className={inputCls} value={bRegion} onChange={(e) => setBRegion(e.target.value)}>
                <option value="">كل المناطق</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.area}>{a.area}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>المساحة (م²)</label>
              <input className={inputCls} value={bArea} onChange={(e) => setBArea(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>حالة التشطيب</label>
              <select className={inputCls} value={bFinish} onChange={(e) => setBFinish(e.target.value)}>
                {FINISH_FACTORS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-navy-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="text-xs text-gray-500 mb-1">شقة {Number(bArea) || 0} م² — تقدير من متوسط أسعار العرض</div>
            <div className="flex justify-between"><span className="text-gray-600">الحد الأدنى</span><b>{fmtEgp(buyResult.min)}</b></div>
            <div className="flex justify-between text-navy-900"><span className="font-bold">المتوسط</span><b className="text-base">{fmtEgp(buyResult.avg)}</b></div>
            <div className="flex justify-between"><span className="text-gray-600">الحد الأعلى</span><b>{fmtEgp(buyResult.max)}</b></div>
            <div className="text-[11px] text-gray-400">معدل حسب التشطيب ×{factor.toFixed(2)} — أسعار عرض وليست صفقات فعلية</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-gold-600" /> أبني ولا أشتري؟
        </h2>
        <p className="text-xs text-gray-500 mb-4">قارن الخيارات بالأرقام — دون إصدار حكم بأفضلية أحدها.</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className={labelCls}>سعر الأرض (إن كنت ستشتريها، ج.م)</label>
            <input className={inputCls} value={bvLandCost} onChange={(e) => setBvLandCost(e.target.value)} placeholder="مثال: 2000000" />
          </div>
          <div>
            <label className={labelCls}>مساحة الأرض (م²)</label>
            <input className={inputCls} value={cLand} onChange={(e) => setCLand(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>نسبة البناء / عدد الأدوار</label>
            <div className="flex gap-2">
              <input className={inputCls} value={cRatio} onChange={(e) => setCRatio(e.target.value)} title="نسبة البناء" />
              <input className={inputCls} value={cFloors} onChange={(e) => setCFloors(e.target.value)} title="عدد الأدوار" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-navy-100 rounded-xl p-4">
            <div className="text-sm font-bold text-navy-800 mb-2">أ. شراء شقة جاهزة ({Number(bArea) || 0} م²)</div>
            <div className="text-2xl font-bold text-navy-900">{fmtEgp(buildVsBuy.buy.avg)}</div>
            <div className="text-xs text-gray-500 mt-1">من {fmtEgp(buildVsBuy.buy.min)} إلى {fmtEgp(buildVsBuy.buy.max)}</div>
          </div>
          <div className="border border-navy-100 rounded-xl p-4">
            <div className="text-sm font-bold text-navy-800 mb-2">ب. شراء أرض + بناء</div>
            <div className="text-2xl font-bold text-navy-900">{fmtEgp(buildVsBuy.landBuild.avg)}</div>
            <div className="text-xs text-gray-500 mt-1">من {fmtEgp(buildVsBuy.landBuild.min)} إلى {fmtEgp(buildVsBuy.landBuild.max)}</div>
            <div className="text-[11px] text-gray-400 mt-1">إجمالي مسطح {Math.round(buildPlan.totalArea).toLocaleString('ar-EG')} م² على أرض {Math.round(buildPlan.footprint).toLocaleString('ar-EG')} م²/دور</div>
          </div>
          <div className="border border-gold-300 bg-gold-100/40 rounded-xl p-4">
            <div className="text-sm font-bold text-navy-800 mb-2">ج. بناء على أرض أملكها</div>
            <div className="text-2xl font-bold text-navy-900">{fmtEgp(buildVsBuy.ownLandBuild.typical)}</div>
            <div className="text-xs text-gray-500 mt-1">من {fmtEgp(buildVsBuy.ownLandBuild.min)} إلى {fmtEgp(buildVsBuy.ownLandBuild.max)}</div>
            <div className="text-[11px] text-gray-400 mt-1">دون سعر الأرض</div>
          </div>
        </div>
        <div className="mt-4 text-[11px] text-gray-400 flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" /> كل الأرقام تقديرات من البيانات المحفوظة — استخدمها كمرجع وليس كسعر نهائي.
        </div>
      </div>

      {areaModal.open && (
        <AreaModal
          initial={areaModal.initial}
          onClose={() => setAreaModal({ open: false, initial: null })}
          onSaved={() => {
            setAreaModal({ open: false, initial: null })
            load()
          }}
        />
      )}
      {constModal.open && (
        <ConstModal
          initial={constModal.initial}
          onClose={() => setConstModal({ open: false, initial: null })}
          onSaved={() => {
            setConstModal({ open: false, initial: null })
            load()
          }}
        />
      )}
    </div>
  )
}
