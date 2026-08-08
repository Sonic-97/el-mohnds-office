import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Phone, Pencil, Users, Search, Map as MapIcon } from 'lucide-react'
import type { Client, PropertyMatch } from '@shared/types'
import {
  SERIOUSNESS_LABELS,
  SERIOUSNESS_COLORS,
  ROLE_LABELS,
  formatPrice,
  formatArea
} from '../lib/constants'
import { ScoreBadge, MatchReasons } from '../components/MatchScore'

function reqSummary(c: Client): string {
  const parts: string[] = []
  if (c.requestType === 'buy') parts.push('شراء')
  if (c.requestType === 'rent') parts.push('إيجار')
  if (c.type) parts.push(c.type)
  if (c.area) parts.push(c.area)
  if (c.budgetTo != null) parts.push(`حتى ${formatPrice(c.budgetTo)}`)
  if (c.areaFrom != null && c.areaTo != null) parts.push(`من ${c.areaFrom.toLocaleString('ar-EG')} إلى ${c.areaTo.toLocaleString('ar-EG')} م²`)
  else if (c.areaFrom != null) parts.push(`من ${c.areaFrom.toLocaleString('ar-EG')} م²`)
  else if (c.areaTo != null) parts.push(`حتى ${c.areaTo.toLocaleString('ar-EG')} م²`)
  return parts.length ? parts.join(' · ') : 'بدون متطلبات محددة'
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [matches, setMatches] = useState<PropertyMatch[]>([])
  const [clientId, setClientId] = useState<number | null>(null)

  useEffect(() => {
    const nid = Number(id)
    if (!nid) return
    setClientId(nid)
  }, [id])

  useEffect(() => {
    if (!clientId) return
    window.api.clients.get(clientId).then(setClient)
    window.api.matching.clientMatches(clientId).then(setMatches)
  }, [clientId])

  if (!client) {
    return <div className="p-10 text-center text-gray-500">جارٍ التحميل...</div>
  }

  const c = client

  function whatsapp() {
    const msg = `أستاذ ${c.name}، يوجد لدينا عقار جديد قد يكون مناسبًا للمواصفات التي تبحث عنها...`
    window.open(`https://wa.me/${c.phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="page-standard p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/clients" className="text-gray-500 hover:text-gray-800">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="type-page-title">{client.name}</h1>
            <p className="text-sm text-gray-500 mt-1">يبحث عن: {reqSummary(client)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`tel:${client.phone}`, '_blank')}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <Phone className="w-4 h-4" /> اتصال
          </button>
          {client.phone && (
            <button
              onClick={whatsapp}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
            >
              مراسلة واتساب
            </button>
          )}
          <button
            onClick={() => navigate('/clients')}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <Pencil className="w-4 h-4" /> تعديل
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-gray-500">الهاتف</div>
          <div className="font-medium" dir="ltr">
            {client.phone || '-'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">الدور</div>
          <div className="font-medium">{ROLE_LABELS[client.role]}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">الجدية</div>
          <span className={`text-xs px-2 py-1 rounded ${SERIOUSNESS_COLORS[client.seriousness]}`}>
            {SERIOUSNESS_LABELS[client.seriousness]}
          </span>
        </div>
        <div>
          <div className="text-xs text-gray-500">الميزانية</div>
          <div className="font-medium">{formatPrice(client.budget)}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gold-600" />
            <h2 className="font-bold text-lg">العقارات المناسبة</h2>
          </div>
          {matches.length > 0 && (
            <button
              onClick={() => {
                window.location.hash = `#/zagazig?client=${client.id}`
              }}
              className="flex items-center gap-2 bg-navy-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-navy-900"
            >
              <MapIcon className="w-4 h-4" /> عرض العقارات المناسبة على الخريطة
            </button>
          )}
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-10">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">لا توجد عقارات مناسبة حاليًا لهذا العميل.</p>
            <p className="text-xs text-gray-400 mt-1">أضف عقارات أو حدّث متطلبات العميل.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((m) => (
              <div key={m.property.id} className="border border-gray-100 rounded-xl p-4 hover:border-gold-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <ScoreBadge score={m.score} />
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{m.property.type}</span>
                </div>
                <div className="font-bold">{m.property.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {[m.property.zone, m.property.city].filter(Boolean).join(' - ') || 'موقع غير محدد'}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm">
                    <span className="font-bold text-green-700">{formatPrice(m.property.price)}</span>
                    <span className="text-gray-500 ms-2">{formatArea(m.property.area)}</span>
                  </div>
                  <Link
                    to={`/properties/${m.property.id}`}
                    className="bg-navy-800 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-navy-900"
                  >
                    عرض العقار
                  </Link>
                </div>
                <MatchReasons reasons={m.reasons} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
