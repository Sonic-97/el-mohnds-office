import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  MapPin,
  Phone,
  Pencil,
  Trash2,
  Share2,
  FileText,
  Eye,
  EyeOff,
  ExternalLink,
  Ruler,
  DoorOpen,
  User as UserIcon,
  StickyNote,
  Users,
  MessageCircle,
  Coins
} from 'lucide-react'
import type { PropertyDetail, PropertyFile, ClientMatch } from '@shared/types'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  formatPrice,
  formatArea,
  formatDate,
  FILE_KINDS,
  SERIOUSNESS_LABELS,
  SERIOUSNESS_COLORS
} from '../lib/constants'
import { ScoreBadge, MatchReasons } from '../components/MatchScore'
import PropertyLocationContext from '../components/zagazig/PropertyLocationContext'

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [prop, setProp] = useState<PropertyDetail | null>(null)
  const [clientMode, setClientMode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([])
  const [quickMatchCount, setQuickMatchCount] = useState<number | null>(null)

  const quickFromState = (location.state as { quickMatchCount?: number } | null)?.quickMatchCount

  useEffect(() => {
    if (id) {
      window.api.properties.get(Number(id)).then(setProp)
      window.api.matching.propertyMatches(Number(id)).then(setClientMatches)
    }
  }, [id])

  useEffect(() => {
    if (quickFromState != null) setQuickMatchCount(quickFromState)
  }, [quickFromState])

  if (!prop) {
    return <div className="p-10 text-center text-gray-500">جارٍ التحميل...</div>
  }

  const p = prop

  function shareWhatsApp() {
    const lines = [
      p.name,
      `السعر: ${formatPrice(p.price)}`,
      `المساحة: ${formatArea(p.area)}`,
      `الموقع: ${[p.zone, p.city, p.governorate].filter(Boolean).join(' - ')}`,
      p.street ? `الشارع: ${p.street}` : '',
      p.notes ? p.notes : ''
    ].filter(Boolean)
    const url = `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
    window.open(url, '_blank')
  }

  function contactClient(client: ClientMatch['client']) {
    const msg = `أستاذ ${client.name}، يوجد لدينا عقار جديد قد يكون مناسبًا للمواصفات التي تبحث عنها:\n${p.name}\nالسعر: ${formatPrice(p.price)}\nالمساحة: ${formatArea(p.area)}\nالموقع: ${[p.zone, p.city].filter(Boolean).join(' - ')}`
    window.open(`https://wa.me/${client.phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  async function remove() {
    if (!id) return
    await window.api.properties.delete(Number(id))
    navigate('/properties')
  }

  const images = p.files.filter((f) => f.kind === 'image')
  const otherFiles = p.files.filter((f) => f.kind !== 'image')

  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <div className="py-2 border-b border-gray-50">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    )
  }

  return (
    <div className="page-wide p-6 lg:p-8">
      <div className="property-detail-header flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link to="/properties" className="text-gray-500 hover:text-gray-800">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="type-page-title">{p.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setClientMode((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
              clientMode ? 'bg-violet-100 text-violet-700' : 'bg-slate-800 text-white hover:bg-slate-900'
            }`}
          >
            {clientMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {clientMode ? 'وضع المكتب' : 'وضع العميل'}
          </button>
          {(p.status === 'sold' || p.status === 'rented') && (
            <Link
              to={`/commissions?property=${p.id}`}
              className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
            >
              <Coins className="w-4 h-4" /> تسجيل عمولة
            </Link>
          )}
          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
          >
            <Share2 className="w-4 h-4" /> مشاركة واتساب
          </button>
          <Link
            to={`/properties/${p.id}/edit`}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <Pencil className="w-4 h-4" /> تعديل
          </Link>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {clientMode && (
        <div className="bg-violet-50 border border-violet-200 text-violet-700 text-sm rounded-lg px-4 py-3 mb-6">
          وضع العرض للعميل — تم إخفاء معلومات المالك والملاحظات الداخلية وبيانات المطابقة.
        </div>
      )}

      {quickMatchCount != null && !clientMode && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <span className="text-sm">
            يوجد {quickMatchCount.toLocaleString('ar-EG')} عملاء قد يناسبهم هذا العقار
          </span>
          <a href="#potential-clients" className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700">
            عرض العملاء
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {p.latitude != null && p.longitude != null && (
            <div className="order-4"><PropertyLocationContext property={p} /></div>
          )}

          {images.length > 0 ? (
            <div className="property-gallery order-1">
              <div className="grid grid-cols-2 gap-2">
                {images.slice(0, 5).map((img, index) => (
                  <img key={img.id} src={`file:///${img.path.replace(/\\/g, '/')}`} className={index === 0 ? 'property-gallery-hero col-span-2' : 'property-gallery-thumb'} alt="" />
                ))}
              </div>
            </div>
          ) : (
            <div className="property-gallery-placeholder order-1">
              <Building2 className="w-12 h-12" strokeWidth={1.25} />
              <p className="mt-3 text-sm font-medium text-navy-700">{p.type || 'عقار'}</p>
              <p className="mt-1 text-xs text-muted-500">المهندس للتطوير العقاري · لا توجد صور بعد</p>
            </div>
          )}

          <div className="surface-card order-2 p-6">
            <h2 className="font-bold mb-4">بيانات العقار</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6">
              <InfoRow label="النوع" value={p.type} />
              <InfoRow label="الحالة" value={STATUS_LABELS[p.status]} />
              <InfoRow label="رقم العقار" value={p.propertyNumber || '-'} />
              <InfoRow label="المحافظة" value={p.governorate || '-'} />
              <InfoRow label="المدينة" value={p.city || '-'} />
              <InfoRow label="المركز" value={p.center || '-'} />
              <InfoRow label="الحي" value={p.neighborhood || '-'} />
              <InfoRow label="المنطقة" value={p.zone || '-'} />
              <InfoRow label="الشارع" value={p.street || '-'} />
              <InfoRow label="اتجاه الواجهة" value={p.facadeDirection || '-'} />
              <InfoRow label="عرض الشارع" value={p.streetWidth != null ? `${p.streetWidth} م` : '-'} />
            </div>
          </div>

          {!clientMode && p.documents.length > 0 && (
            <div className="surface-card order-5 p-6">
              <h2 className="font-bold mb-4">المستندات</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {p.documents.map((d) => (
                  <div
                    key={d.id}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      d.done ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                  >
                    {d.done ? '✓ ' : ''}
                    {d.docType}
                  </div>
                ))}
              </div>
            </div>
          )}

          {otherFiles.length > 0 && (
            <div className="surface-card order-6 p-6">
              <h2 className="font-bold mb-4">الملفات</h2>
              <div className="space-y-2">
                {otherFiles.map((f: PropertyFile) => (
                  <div key={f.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm truncate">{f.name}</div>
                        <div className="text-xs text-gray-400">{FILE_KINDS[f.kind] || f.kind}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => window.api.files.open(f.path)}
                      className="text-navy-700 text-sm flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" /> فتح
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="property-price-panel p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">السعر</div>
              <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[p.status]}`}>
                {STATUS_LABELS[p.status]}
              </span>
            </div>
            <div className="type-price property-detail-price">{formatPrice(p.price)}</div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
              <Ruler className="w-4 h-4 text-gray-400" /> {formatArea(p.area)}
              {p.pricePerMeter != null && (
                <span className="text-xs text-gray-500">({formatPrice(p.pricePerMeter)} / م²)</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
              <DoorOpen className="w-4 h-4 text-gray-400" /> {p.facadeDirection || '-'}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
              <MapPin className="w-4 h-4 text-gray-400" /> {[p.zone, p.city, p.governorate].filter(Boolean).join(' - ') || '-'}
            </div>
            {p.mapsUrl && (
              <button
                onClick={() => window.open(p.mapsUrl, '_blank')}
                className="flex items-center gap-2 border border-navy-100 text-navy-800 w-full justify-center mt-4 px-4 py-2 rounded-lg text-sm hover:bg-navy-50"
              >
                <ExternalLink className="w-4 h-4" /> فتح في خرائط جوجل
              </button>
            )}
          </div>

          {!clientMode && (
            <div className="internal-office-panel p-6">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-navy-700" /> بيانات المالك
              </h2>
              <InfoRow label="الاسم" value={p.ownerName || '-'} />
              {p.ownerPhone && (
                <div className="py-2">
                  <div className="text-xs text-gray-500">الهاتف</div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.ownerPhone}</span>
                    <button
                      onClick={() => window.open(`tel:${p.ownerPhone}`, '_blank')}
                      className="flex items-center gap-1 text-navy-700 text-sm"
                    >
                      <Phone className="w-4 h-4" /> اتصال
                    </button>
                  </div>
                </div>
              )}
              {p.ownerPhone && (
                <button
                  onClick={() => window.open(`https://wa.me/${p.ownerPhone}`, '_blank')}
                  className="flex items-center gap-2 bg-green-600 text-white w-full justify-center mt-3 px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                >
                  <Share2 className="w-4 h-4" /> مراسلة واتساب
                </button>
              )}
            </div>
          )}

          {!clientMode && p.notes && (
            <div className="internal-office-panel p-6">
              <h2 className="font-bold mb-3 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-500" /> ملاحظات داخلية
              </h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}

          <div className="surface-card p-5">
            <div className="text-xs text-gray-500">أُضيف في {formatDate(p.createdAt)}</div>
            <div className="text-xs text-gray-500 mt-1">آخر تحديث {formatDate(p.updatedAt)}</div>
          </div>
        </div>
      </div>

      {!clientMode && (
        <div id="potential-clients" className="internal-office-section p-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gold-600" />
            <h2 className="font-bold text-lg">عملاء محتملون</h2>
          </div>
          {clientMatches.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">لا يوجد عملاء محتملون لهذا العقار حاليًا.</p>
              <p className="text-xs text-gray-400 mt-1">تظهر التطابقات تلقائيًا حسب متطلبات العملاء.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientMatches.map((m) => (
                <div key={m.client.id} className="border border-gray-100 rounded-xl p-4 hover:border-gold-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{m.client.name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${SERIOUSNESS_COLORS[m.client.seriousness]}`}>
                        {SERIOUSNESS_LABELS[m.client.seriousness]}
                      </span>
                    </div>
                    <ScoreBadge score={m.score} />
                  </div>
                  <div className="text-sm text-gray-600" dir="ltr">
                    {m.client.phone || '-'}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link
                      to={`/clients/${m.client.id}`}
                      className="flex-1 bg-navy-800 text-white text-center text-xs py-2 rounded-lg hover:bg-navy-900"
                    >
                      عرض العميل
                    </Link>
                    <button
                      onClick={() => contactClient(m.client)}
                      className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white text-xs py-2 rounded-lg hover:bg-green-700"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> تواصل
                    </button>
                  </div>
                  <MatchReasons reasons={m.reasons} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold text-lg mb-2">حذف العقار</h3>
            <p className="text-sm text-gray-600 mb-6">هل أنت متأكد من حذف "{p.name}"؟ لا يمكن التراجع.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                إلغاء
              </button>
              <button onClick={remove} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
