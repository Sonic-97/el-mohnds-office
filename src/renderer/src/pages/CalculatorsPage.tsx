import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Calculator,
  TrendingUp,
  Home,
  LandPlot,
  Hammer,
  Info,
  Receipt,
  Scale,
  Building2,
  Layers
} from 'lucide-react'
import type { MarketArea, ConstructionCost, ConstructionMaterial, Property } from '@shared/types'
import { fmtEgp, fmtM2 } from '../lib/market'

const inputCls = 'control-input'
const labelCls = 'field-label'

type Tool = 'purchase' | 'finishing' | 'build'
type FinLevel = 'economic' | 'medium' | 'high'

const FIN_LEVEL_LABELS: Record<FinLevel, string> = {
  economic: 'اقتصادي',
  medium: 'متوسط',
  high: 'مرتفع'
}
const FIN_LEVEL_CATEGORY: Record<FinLevel, string> = {
  economic: 'نصف تشطيب',
  medium: 'تشطيب متوسط',
  high: 'تشطيب فاخر'
}

function nf(s: string): number {
  const n = Number(s)
  return s.trim() === '' || !isFinite(n) ? 0 : n
}

export default function Calculators() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tool = (searchParams.get('tool') as Tool) || 'purchase'

  const [areas, setAreas] = useState<MarketArea[]>([])
  const [costs, setCosts] = useState<ConstructionCost[]>([])
  const [materials, setMaterials] = useState<ConstructionMaterial[]>([])
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {
    window.api.market.listAreas().then(setAreas)
    window.api.constCost.list().then(setCosts)
    window.api.materials.list().then(setMaterials)
    window.api.properties.list().then(setProperties)
  }, [])

  const market = useMemo(() => {
    const avg = (arr: number[]): number | null => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
    const land = areas.filter((a) => a.landAvg != null).map((a) => a.landAvg as number)
    const apt = areas.filter((a) => a.aptAvg != null).map((a) => a.aptAvg as number)
    const rent = areas.filter((a) => a.rentAvg != null).map((a) => a.rentAvg as number)
    return {
      landAvg: avg(land),
      landMin: land.length ? Math.min(...land) : null,
      landMax: land.length ? Math.max(...land) : null,
      aptAvg: avg(apt),
      aptMin: apt.length ? Math.min(...apt) : null,
      aptMax: apt.length ? Math.max(...apt) : null,
      rentAvg: avg(rent),
      lastUpdated: areas.length ? areas.map((a) => a.updatedAt || '').sort().reverse()[0] : ''
    }
  }, [areas])

  const byCategory = useMemo(() => {
    const m = new Map<string, ConstructionCost>()
    for (const c of costs) m.set(c.category, c)
    return m
  }, [costs])
  const structCost = byCategory.get('هيكل خرساني فقط')

  // ---------- purchase ----------
  const [price, setPrice] = useState('')
  const [broker, setBroker] = useState('')
  const [legal, setLegal] = useState('')
  const [finish, setFinish] = useState('')
  const [other, setOther] = useState('')
  const purchaseTotal = nf(price) + nf(broker) + nf(legal) + nf(finish) + nf(other)

  // ---------- finishing ----------
  const [fArea, setFArea] = useState('100')
  const [fLevel, setFLevel] = useState<FinLevel>('medium')
  const [fMin, setFMin] = useState('')
  const [fAvg, setFAvg] = useState('')
  const [fMax, setFMax] = useState('')
  const [fTouched, setFTouched] = useState(false)

  function prefillFin() {
    const c = byCategory.get(FIN_LEVEL_CATEGORY[fLevel])
    setFMin(c?.minCost != null ? String(c.minCost) : '')
    setFAvg(c?.typicalCost != null ? String(c.typicalCost) : '')
    setFMax(c?.maxCost != null ? String(c.maxCost) : '')
  }
  useEffect(() => {
    setFTouched(false)
    prefillFin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fLevel])
  useEffect(() => {
    if (!fTouched) prefillFin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costs])

  const fAreaN = nf(fArea)
  const finResult = {
    min: fAreaN * nf(fMin),
    avg: fAreaN * nf(fAvg),
    max: fAreaN * nf(fMax)
  }

  // ---------- buy vs build ----------
  const [bArea, setBArea] = useState('150')
  const [buyPerM, setBuyPerM] = useState('')
  const [landPerM, setLandPerM] = useState('')
  const [structPerM, setStructPerM] = useState('')
  const [bLevel, setBLevel] = useState<FinLevel>('medium')
  const [finPerM, setFinPerM] = useState('')

  useEffect(() => {
    if (!buyPerM && market.aptAvg != null) setBuyPerM(String(Math.round(market.aptAvg)))
    if (!landPerM && market.landAvg != null) setLandPerM(String(Math.round(market.landAvg)))
  }, [market, buyPerM, landPerM])
  useEffect(() => {
    if (!structPerM && structCost?.typicalCost != null) setStructPerM(String(structCost.typicalCost))
  }, [structCost, structPerM])
  useEffect(() => {
    const c = byCategory.get(FIN_LEVEL_CATEGORY[bLevel])
    if (c?.typicalCost != null) setFinPerM(String(c.typicalCost))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bLevel, costs])

  const bAreaN = nf(bArea)
  const buyTotal = bAreaN * nf(buyPerM)
  const landCost = bAreaN * nf(landPerM)
  const structAmount = bAreaN * nf(structPerM)
  const finAmount = bAreaN * nf(finPerM)
  const buildTotal = landCost + structAmount + finAmount

  const steel = materials.find((m) => m.name === 'حديد')
  const cement = materials.find((m) => m.name === 'أسمنت')

  function setTool(t: Tool) {
    setSearchParams(t === 'purchase' ? {} : { tool: t })
  }

  const tabs: { key: Tool; label: string; icon: typeof Calculator }[] = [
    { key: 'purchase', label: 'حاسبة تكلفة الشراء', icon: Receipt },
    { key: 'finishing', label: 'حاسبة التشطيب', icon: Hammer },
    { key: 'build', label: 'شراء أم بناء؟', icon: Scale }
  ]

  return (
    <div className="page-standard p-6 space-y-6">
      <div>
        <h1 className="type-page-title">أدوات العميل</h1>
        <p className="text-sm text-gray-500 mt-1">
          حسابات تقديرية مبنية على بيانات السوق وبيانات مكتبك — قابلة للتعديل اليدوي دائماً.
        </p>
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTool(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tool === key ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tool === 'purchase' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gold-600" /> إجمالي تكلفة الشراء
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>سعر العقار (ج.م)</label>
                <input type="number" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="مثال: 2500000" />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>أو اختر عقاراً من مكتبك (يملأ السعر تلقائياً)</label>
                <select
                  className={inputCls}
                  onChange={(e) => {
                    const p = properties.find((x) => x.id === Number(e.target.value))
                    if (p && p.price != null) setPrice(String(p.price))
                    e.target.value = ''
                  }}
                >
                  <option value="">اختر عقاراً...</option>
                  {properties
                    .filter((p) => p.price != null)
                    .slice(0, 50)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {fmtEgp(p.price)}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>عمولة الوسيط (ج.م)</label>
                <input type="number" className={inputCls} value={broker} onChange={(e) => setBroker(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>تسجيل / رسوم قانونية (ج.م)</label>
                <input type="number" className={inputCls} value={legal} onChange={(e) => setLegal(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>تشطيب (ج.م)</label>
                <input type="number" className={inputCls} value={finish} onChange={(e) => setFinish(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>تكاليف أخرى (ج.م)</label>
                <input type="number" className={inputCls} value={other} onChange={(e) => setOther(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              لا تُحسب رسوم حكومية تلقائياً — أدخل القيم يدوياً حسب عرض السوق الموثق.
            </p>
          </div>

          <div className="bg-navy-950 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 text-gold-400 text-sm font-medium mb-4">
              <Info className="w-4 h-4" /> التقدير المبدئي
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">سعر العقار</span>
                <span>{fmtEgp(nf(price) || null)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">عمولة الوسيط</span>
                <span>{fmtEgp(nf(broker) || null)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">تسجيل / قانوني</span>
                <span>{fmtEgp(nf(legal) || null)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">تشطيب</span>
                <span>{fmtEgp(nf(finish) || null)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">أخرى</span>
                <span>{fmtEgp(nf(other) || null)}</span>
              </div>
              <div className="gold-divider my-3" />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>إجمالي التكلفة التقديرية</span>
                <span className="text-gold-400">{fmtEgp(purchaseTotal || null)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tool === 'finishing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Hammer className="w-5 h-5 text-gold-600" /> حاسبة التشطيب
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>مساحة الشقة (م²)</label>
                <input type="number" className={inputCls} value={fArea} onChange={(e) => setFArea(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>مستوى التشطيب</label>
                <select className={inputCls} value={fLevel} onChange={(e) => setFLevel(e.target.value as FinLevel)}>
                  {(Object.keys(FIN_LEVEL_LABELS) as FinLevel[]).map((k) => (
                    <option key={k} value={k}>
                      {FIN_LEVEL_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-navy-50 rounded-lg px-3 py-2 self-end text-[11px] text-navy-800">
                القيم تملأ تلقائياً من بيانات التكلفة — عدّلها يدوياً إن لزم.
              </div>
              <div>
                <label className={labelCls}>التكلفة الدنيا / م²</label>
                <input type="number" className={inputCls} value={fMin} onChange={(e) => { setFTouched(true); setFMin(e.target.value) }} />
              </div>
              <div>
                <label className={labelCls}>التكلفة المتوسطة / م²</label>
                <input type="number" className={inputCls} value={fAvg} onChange={(e) => { setFTouched(true); setFAvg(e.target.value) }} />
              </div>
              <div>
                <label className={labelCls}>التكلفة القصوى / م²</label>
                <input type="number" className={inputCls} value={fMax} onChange={(e) => { setFTouched(true); setFMax(e.target.value) }} />
              </div>
            </div>
            <div className="text-[11px] text-gray-400 mt-3">
              {byCategory.get(FIN_LEVEL_CATEGORY[fLevel]) ? (
                <>
                  المصدر: {byCategory.get(FIN_LEVEL_CATEGORY[fLevel])?.sourceName} ·{' '}
                  {byCategory.get(FIN_LEVEL_CATEGORY[fLevel])?.sourceDate?.slice(0, 10) || '-'}
                </>
              ) : (
                'لا توجد بيانات تشطيب موثقة لهذا المستوى — أدخل الأسعار يدوياً من مصدر موثق.'
              )}
            </div>
          </div>

          <div className="bg-navy-950 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 text-gold-400 text-sm font-medium mb-4">
              <Info className="w-4 h-4" /> التقدير المبدئي لتكلفة تشطيب {FIN_LEVEL_LABELS[fLevel]}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-xs text-slate-300 mb-1">التقدير الأدنى</div>
                <div className="text-xl font-bold">{fmtEgp(finResult.min || null)}</div>
              </div>
              <div className="bg-gold-500/10 border border-gold-400/40 rounded-lg p-4">
                <div className="text-xs text-gold-300 mb-1">التقدير المتوسط</div>
                <div className="text-xl font-bold text-gold-400">{fmtEgp(finResult.avg || null)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-xs text-slate-300 mb-1">التقدير الأقصى</div>
                <div className="text-xl font-bold">{fmtEgp(finResult.max || null)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tool === 'build' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-gold-600" /> شراء شقة جاهزة مقابل أرض + بناء
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className={labelCls}>مساحة الشقة / الأرض المطلوبة (م²)</label>
                <input type="number" className={inputCls} value={bArea} onChange={(e) => setBArea(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>سعر شراء الشقة / م² (يُملأ من السوق)</label>
                <input type="number" className={inputCls} value={buyPerM} onChange={(e) => setBuyPerM(e.target.value)} />
                {market.aptAvg != null && (
                  <div className="text-[11px] text-gray-400 mt-1">سوق الزقازيق: {fmtM2(market.aptAvg)}</div>
                )}
              </div>
              <div>
                <label className={labelCls}>سعر الأرض / م² (يُملأ من السوق)</label>
                <input type="number" className={inputCls} value={landPerM} onChange={(e) => setLandPerM(e.target.value)} />
                {market.landAvg != null && (
                  <div className="text-[11px] text-gray-400 mt-1">سوق الزقازيق: {fmtM2(market.landAvg)}</div>
                )}
              </div>
              <div>
                <label className={labelCls}>تكلفة الهيكل / م²</label>
                <input type="number" className={inputCls} value={structPerM} onChange={(e) => setStructPerM(e.target.value)} />
                {structCost?.typicalCost != null && (
                  <div className="text-[11px] text-gray-400 mt-1">بيانات البناء: {fmtM2(structCost.typicalCost)}</div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>مستوى التشطيب</label>
                <select className={inputCls} value={bLevel} onChange={(e) => setBLevel(e.target.value as FinLevel)}>
                  {(Object.keys(FIN_LEVEL_LABELS) as FinLevel[]).map((k) => (
                    <option key={k} value={k}>
                      {FIN_LEVEL_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>تكلفة التشطيب / م²</label>
                <input type="number" className={inputCls} value={finPerM} onChange={(e) => setFinPerM(e.target.value)} />
              </div>
            </div>

            {(steel || cement) && (
              <div className="mt-4 bg-navy-50 rounded-lg px-4 py-3 text-xs text-navy-800 flex flex-wrap gap-x-6 gap-y-1">
                <span className="font-bold">أسعار مواد البناء الحالية (مرجع):</span>
                {steel && <span>حديد: {fmtEgp(steel.price)} / {steel.unit}</span>}
                {cement && <span>أسمنت: {fmtEgp(cement.price)} / {cement.unit}</span>}
                {!steel && !cement && <span>لم تُسجل أسعار مواد بعد — أضفها من صفحة مواد البناء</span>}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-right px-4 py-3"></th>
                  <th className="text-right px-4 py-3">شراء شقة جاهزة</th>
                  <th className="text-right px-4 py-3">أرض + بناء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr>
                  <td className="px-4 py-3 text-gray-500">التكلفة الأولية (أرض / شقة)</td>
                  <td className="px-4 py-3 font-medium">{fmtEgp(buyTotal || null)}</td>
                  <td className="px-4 py-3 font-medium">{fmtEgp(landCost || null)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-500">تكلفة البناء (هيكل)</td>
                  <td className="px-4 py-3 text-gray-400">—</td>
                  <td className="px-4 py-3 font-medium">{fmtEgp(structAmount || null)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-500">التشطيب</td>
                  <td className="px-4 py-3 text-gray-400">مشمول</td>
                  <td className="px-4 py-3 font-medium">{fmtEgp(finAmount || null)}</td>
                </tr>
                <tr className="bg-gold-50">
                  <td className="px-4 py-3 font-bold">الإجمالي التقديري</td>
                  <td className="px-4 py-3 font-bold text-navy-900">{fmtEgp(buyTotal || null)}</td>
                  <td className="px-4 py-3 font-bold text-navy-900">{fmtEgp(buildTotal || null)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {buyTotal > 0 && buildTotal > 0 && (
            <div className={`rounded-xl px-5 py-4 text-sm ${buildTotal < buyTotal ? 'bg-green-50 text-green-800' : 'bg-navy-50 text-navy-800'}`}>
              {buildTotal < buyTotal
                ? 'بناء أرض + تشطيب أرخص من شراء شقة جاهزة بنفس المساحة (حسب البيانات الحالية).'
                : 'شراء شقة جاهزة أرخص أو مساوٍ للبناء بنفس المساحة (حسب البيانات الحالية).'}
              <span className="block text-xs mt-1 text-gray-500">
                تقدير مبدئي وليس مقايسة هندسية — يتجاهل مدة البناء والعائد أو المصاريف الزمنية.
              </span>
            </div>
          )}

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              كل الأرقام قابلة للتعديل اليدوي وتُملأ تلقائياً من بيانات سوق الزقازيق وبيانات تكلفة البناء والتشطيب المسجلة.
              هذا تقدير مبدئي وليس مقايسة هندسية.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 bg-navy-50 border border-navy-100 rounded-xl px-4 py-3 text-xs text-navy-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          مصادر البيانات: متوسط سعر المتر للأراضي والشقق والإيجارات من بيانات السوق المسجلة، وتكلفة البناء والتشطيب من
          بندي "هيكل خرساني فقط" وبندي "(نصف تشطيب / تشطيب متوسط / تشطيب فاخر)" في صفحة السوق، وأسعار الحديد والأسمنت من صفحة
          مواد البناء. عند غياب أي بيانات تُترك الحقول فارغة للتعديل اليدوي.
        </p>
      </div>
    </div>
  )
}
