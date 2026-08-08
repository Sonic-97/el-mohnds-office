import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Building2, ArrowLeft } from 'lucide-react'
import type { ClientMatchSummary, PropertyMatchSummary } from '@shared/types'
import { ScoreBadge } from '../components/MatchScore'

type Tab = 'clients' | 'properties'

export default function Matches() {
  const [tab, setTab] = useState<Tab>('clients')
  const [clientSummaries, setClientSummaries] = useState<ClientMatchSummary[]>([])
  const [propertySummaries, setPropertySummaries] = useState<PropertyMatchSummary[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.api.matching.opportunities().then((o) => {
      setClientSummaries(o.clientSummaries)
      setPropertySummaries(o.propertySummaries)
      setLoaded(true)
    })
  }, [])

  const clientsEmpty = loaded && clientSummaries.length === 0
  const propsEmpty = loaded && propertySummaries.length === 0

  return (
    <div className="page-standard p-6">
      <div className="mb-6">
        <h1 className="type-page-title">المطابقات</h1>
        <p className="text-sm text-gray-500 mt-1">أفضل التطابقات بين العملاء والعقارات</p>
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('clients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'clients' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Users className="w-4 h-4" /> للعملاء
        </button>
        <button
          onClick={() => setTab('properties')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'properties' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Building2 className="w-4 h-4" /> للعقارات
        </button>
      </div>

      {tab === 'clients' &&
        (clientsEmpty ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">لا توجد عملاء لديهم عقارات مناسبة بعد.</p>
            <p className="text-sm text-gray-400 mt-1">أضف العملاء والعقارات وستظهر التطابقات هنا.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clientSummaries.map((s) => (
              <Link
                key={s.client.id}
                to={`/clients/${s.client.id}`}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between hover:border hover:border-gold-300 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-navy-50 text-navy-800 rounded-full flex items-center justify-center font-bold">
                    {s.client.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-bold">{s.client.name}</div>
                    <div className="text-sm text-gray-500">
                      {s.propertyCount.toLocaleString('ar-EG')} عقارات مناسبة
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.topScore != null && <ScoreBadge score={s.topScore} />}
                  <ArrowLeft className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        ))}

      {tab === 'properties' &&
        (propsEmpty ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">لا توجد عقارات لديها عملاء محتملون بعد.</p>
            <p className="text-sm text-gray-400 mt-1">أضف العملاء والعقارات وستظهر التطابقات هنا.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {propertySummaries.map((s) => (
              <Link
                key={s.property.id}
                to={`/properties/${s.property.id}`}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between hover:border hover:border-gold-300 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gold-50 text-gold-700 rounded-full flex items-center justify-center font-bold">
                    {s.property.type.slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-bold">{s.property.name}</div>
                    <div className="text-sm text-gray-500">
                      {s.property.type} · {s.property.zone || s.property.city || 'موقع غير محدد'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {s.clientCount.toLocaleString('ar-EG')} عملاء محتملين
                  </span>
                  {s.topScore != null && <ScoreBadge score={s.topScore} />}
                  <ArrowLeft className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        ))}
    </div>
  )
}
