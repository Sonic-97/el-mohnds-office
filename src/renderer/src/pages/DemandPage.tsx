import { useEffect, useState } from 'react'
import { ChartColumn, Users, MapPin, Home, Info } from 'lucide-react'
import type { DemandAnalytics, DemandItem } from '@shared/types'
import { EmptyState } from '../components/ui'

function BarList({ items, title, icon, empty }: { items: DemandItem[]; title: string; icon: React.ReactNode; empty: string }) {
  const max = items.length ? Math.max(...items.map((i) => i.count)) : 0
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="font-bold">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 8).map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{item.label}</span>
                <span className="text-gray-500">{item.count.toLocaleString('ar-EG')} عميل</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-500 rounded-full"
                  style={{ width: `${max ? Math.round((item.count / max) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Demand() {
  const [data, setData] = useState<DemandAnalytics | null>(null)

  useEffect(() => {
    window.api.stats.demand().then(setData)
  }, [])

  if (!data) {
    return <div className="p-10 text-center text-gray-500">جارٍ التحليل...</div>
  }

  if (!data.enoughData) {
    return (
      <div className="page-standard p-6">
        <h1 className="type-page-title mb-1">طلب العملاء</h1>
        <p className="text-sm text-gray-500 mb-6">تحليل المتطلبات الفعلية المخزنة في قاعدة بياناتك.</p>
        <EmptyState
          icon={<ChartColumn className="w-6 h-6" strokeWidth={1.75} />}
          title="لا توجد بيانات عملاء كافية للتحليل"
          description="أضف عملاء مع متطلباتهم (نوع العقار، المنطقة، الميزانية، المساحة) وستظهر هنا تحليلات حقيقية فقط."
        />
      </div>
    )
  }

  return (
    <div className="page-standard p-6 space-y-6">
      <div>
        <h1 className="type-page-title">طلب العملاء</h1>
        <p className="text-sm text-gray-500 mt-1">
          تحليل حقيقي لمتطلبات العملاء المخزنة في SQLite — لا بيانات مفتعلة.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-metric p-5">
          <div className="text-xs text-gray-500 mb-1">إجمالي العملاء</div>
          <div className="text-2xl font-bold">{data.totalClients.toLocaleString('ar-EG')}</div>
        </div>
        <div className="card-metric p-5">
          <div className="text-xs text-gray-500 mb-1">عملاء بمتطلبات</div>
          <div className="text-2xl font-bold">{data.withRequirements.toLocaleString('ar-EG')}</div>
        </div>
        <div className="card-metric p-5">
          <div className="text-xs text-gray-500 mb-1">متوسط المساحة المطلوبة</div>
          <div className="text-2xl font-bold">
            {data.avgArea != null ? `${data.avgArea.toLocaleString('ar-EG')} م²` : '—'}
          </div>
        </div>
        <div className="card-metric p-5">
          <div className="text-xs text-gray-500 mb-1">أكثر نوع مطلوب</div>
          <div className="text-xl font-bold truncate">{data.topTypes[0]?.label || '—'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BarList
          items={data.topTypes}
          title="الأنواع الأكثر طلباً"
          icon={<Home className="w-5 h-5 text-gold-600" />}
          empty="لا يوجد طلب محدد للنوع بعد."
        />
        <BarList
          items={data.topAreas}
          title="المناطق الأكثر طلباً"
          icon={<MapPin className="w-5 h-5 text-gold-600" />}
          empty="لا توجد مناطق محددة مطلوبة بعد."
        />
        <BarList
          items={data.budgetRanges}
          title="الميزانيات الأكثر طلباً"
          icon={<Users className="w-5 h-5 text-gold-600" />}
          empty="لا توجد ميزانيات محددة بعد."
        />
        <BarList
          items={data.buyersByType}
          title="المشترون حسب نوع العقار"
          icon={<ChartColumn className="w-5 h-5 text-gold-600" />}
          empty="لا يوجد مشترون بمتطلبات نوع محدد بعد."
        />
      </div>

      <div className="flex items-start gap-2 bg-navy-50 border border-navy-100 rounded-xl px-4 py-3 text-xs text-navy-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          تُحسب هذه النتائج من حقول متطلبات العملاء فقط (النوع، المنطقة، الميزانية، المساحة) كما أُدخلت في قاعدة بيانات
          الملف المحلية. لا تُولَّد تلقائياً ولا تُختلق.
        </p>
      </div>
    </div>
  )
}
