import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Save, ArrowRight, Upload, FileText, Trash2, AlertTriangle, X } from 'lucide-react'
import LocationEditor from '../components/LocationEditor'
import type {
  PropertyInput,
  PropertyType,
  PropertyDetail,
  PropertyFile,
  DocumentItem,
  CustomField,
  DuplicateCheck
} from '@shared/types'
import { STATUS_LABELS, FACING_OPTIONS, FILE_KINDS, formatArea } from '../lib/constants'

const inputCls =
  'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500'

const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

function parseLatLng(url: string): { latitude: number | null; longitude: number | null } {
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (match) return { latitude: Number(match[1]), longitude: Number(match[2]) }
  const q = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (q) return { latitude: Number(q[1]), longitude: Number(q[2]) }
  return { latitude: null, longitude: null }
}

const EMPTY_FORM: PropertyInput = {
  name: '',
  type: '',
  governorate: '',
  city: '',
  center: '',
  neighborhood: '',
  zone: '',
  street: '',
  propertyNumber: '',
  mapsUrl: '',
  latitude: null,
  longitude: null,
  area: null,
  price: null,
  status: 'available',
  facadeDirection: '',
  streetWidth: null,
  ownerName: '',
  ownerPhone: '',
  notes: ''
}

export default function PropertyForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<PropertyInput>(EMPTY_FORM)
  const [types, setTypes] = useState<PropertyType[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customValues, setCustomValues] = useState<Record<number, string>>({})
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [files, setFiles] = useState<PropertyFile[]>([])
  const [pendingUploads, setPendingUploads] = useState<{ kind: string; path: string; name: string }[]>([])
  const [uploadKind, setUploadKind] = useState('image')
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheck | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.types.list().then(setTypes)
    window.api.customFields.list().then(setCustomFields)
    if (id) {
      const propId = Number(id)
      window.api.properties.get(propId).then((p: PropertyDetail | null) => {
        if (!p) return
        setForm({
          name: p.name,
          type: p.type,
          governorate: p.governorate,
          city: p.city,
          center: p.center,
          neighborhood: p.neighborhood,
          zone: p.zone,
          street: p.street,
          propertyNumber: p.propertyNumber,
          mapsUrl: p.mapsUrl,
          latitude: p.latitude,
          longitude: p.longitude,
          area: p.area,
          price: p.price,
          status: p.status,
          facadeDirection: p.facadeDirection,
          streetWidth: p.streetWidth,
          ownerName: p.ownerName,
          ownerPhone: p.ownerPhone,
          notes: p.notes
        })
        setCustomValues(p.customValues)
        setDocuments(p.documents)
        setFiles(p.files)
      })
    }
  }, [id])

  function set<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleMapsUrl(url: string) {
    const { latitude, longitude } = parseLatLng(url)
    setForm((f) => ({ ...f, mapsUrl: url, latitude, longitude }))
  }

  function handleCoords(latitude: number, longitude: number) {
    set('latitude', latitude)
    set('longitude', longitude)
    setForm((f) => ({ ...f, mapsUrl: `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}` }))
  }

  const pricePerMeter =
    form.price != null && form.area != null && form.area > 0
      ? Math.round((form.price / form.area) * 100) / 100
      : null

  function handleUpload(filesList: FileList | null) {
    if (!filesList) return
    const staged: { kind: string; path: string; name: string }[] = []
    for (const file of Array.from(filesList)) {
      const path = window.api.getPathForFile(file)
      staged.push({ kind: uploadKind, path, name: file.name })
    }
    setPendingUploads((prev) => [...prev, ...staged])
  }

  async function save(force = false) {
    setError('')
    if (!form.name.trim()) {
      setError('اسم العقار مطلوب')
      return
    }
    if (!form.type) {
      setError('اختر نوع العقار')
      return
    }
    const payload: PropertyInput = { ...form, name: form.name.trim() }

    if (!force && !duplicateWarning) {
      const check: DuplicateCheck = await window.api.properties.checkDuplicates(payload)
      if (isEdit) check.matches = check.matches.filter((m: { id: number }) => m.id !== Number(id))
      check.hasDuplicates = check.matches.length > 0
      if (check.hasDuplicates) {
        setDuplicateWarning(check)
        return
      }
    }

    setSaving(true)
    try {
      let propertyId = Number(id)
      await window.api.types.ensure(payload.type)
      if (isEdit) {
        await window.api.properties.update(propertyId, payload)
      } else {
        const created = await window.api.properties.create(payload)
        propertyId = created.id
      }
      for (const up of pendingUploads) {
        await window.api.files.add(propertyId, up.kind, up.path)
      }
      await window.api.customFields.save(propertyId, customValues)
      const matchCount = await window.api.matching.propertyMatchCount(propertyId)
      navigate(`/properties/${propertyId}`, { state: { quickMatchCount: matchCount } })
    } catch (e) {
      setError('حدث خطأ أثناء الحفظ: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleDoc(doc: DocumentItem) {
    await window.api.documents.toggle(doc.id, !doc.done)
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, done: !d.done } : d)))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/properties" className="text-gray-500 hover:text-gray-800">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? 'تعديل عقار' : 'إضافة عقار'}</h1>
            <p className="text-sm text-gray-500 mt-1">أدخل بيانات العقار كاملة</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">المعلومات الأساسية</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>اسم العقار *</label>
              <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>النوع *</label>
              <input
                list="propertyTypesList"
                className={inputCls}
                placeholder="اكتب أو اختر نوع العقار"
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
              />
              <datalist id="propertyTypesList">
                {types.map((t) => (
                  <option key={t.id} value={t.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>الحالة</label>
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) => set('status', e.target.value as PropertyInput['status'])}
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>المساحة (م²)</label>
              <input
                type="number"
                className={inputCls}
                value={form.area ?? ''}
                onChange={(e) => set('area', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className={labelCls}>السعر (ج.م)</label>
              <input
                type="number"
                className={inputCls}
                value={form.price ?? ''}
                onChange={(e) => set('price', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="bg-navy-50 border border-navy-100 rounded-lg px-3 py-2">
              <div className="text-xs text-navy-800 mb-1">سعر المتر (تلقائي)</div>
              <div className="font-bold text-navy-900">
                {pricePerMeter != null ? `${pricePerMeter.toLocaleString('ar-EG')} ج.م` : '-'}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">الموقع</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>المحافظة</label>
              <input className={inputCls} value={form.governorate} onChange={(e) => set('governorate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>المدينة</label>
              <input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>المركز</label>
              <input className={inputCls} value={form.center} onChange={(e) => set('center', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>الحي</label>
              <input className={inputCls} value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>المنطقة</label>
              <input className={inputCls} value={form.zone} onChange={(e) => set('zone', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>الشارع</label>
              <input className={inputCls} value={form.street} onChange={(e) => set('street', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>رقم العقار / القطعة</label>
              <input className={inputCls} value={form.propertyNumber} onChange={(e) => set('propertyNumber', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>اتجاه الواجهة</label>
              <select className={inputCls} value={form.facadeDirection} onChange={(e) => set('facadeDirection', e.target.value)}>
                <option value="">-</option>
                {FACING_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>عرض الشارع (م)</label>
              <input
                type="number"
                className={inputCls}
                value={form.streetWidth ?? ''}
                onChange={(e) => set('streetWidth', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="md:col-span-3">
              <h3 className="text-sm font-bold text-navy-800 mb-2">الموقع على الخريطة</h3>
              <LocationEditor
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={handleCoords}
              />
              <label className={`${labelCls} mt-3`}>رابط Google Maps</label>
              <input
                dir="ltr"
                className={inputCls}
                placeholder="https://maps.google.com/?q=..."
                value={form.mapsUrl}
                onChange={(e) => handleMapsUrl(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">المالك</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>اسم المالك</label>
              <input className={inputCls} value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف</label>
              <input dir="ltr" className={inputCls} value={form.ownerPhone} onChange={(e) => set('ownerPhone', e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelCls}>ملاحظات داخلية</label>
            <textarea
              rows={3}
              className={inputCls}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </section>

        {customFields.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-4">معلومات إضافية</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {customFields.map((f) => (
                <div key={f.id}>
                  <label className={labelCls}>{f.name}</label>
                  <input
                    type={f.fieldType === 'number' ? 'number' : 'text'}
                    className={inputCls}
                    value={customValues[f.id] ?? ''}
                    onChange={(e) => setCustomValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">الصور والملفات</h2>
          <div className="flex gap-3 mb-4">
            <select className={inputCls + ' !w-48'} value={uploadKind} onChange={(e) => setUploadKind(e.target.value)}>
              {Object.entries(FILE_KINDS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm cursor-pointer hover:bg-slate-900">
              <Upload className="w-4 h-4" /> اختيار ملفات
              <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
            </label>
          </div>

          {(files.length > 0 || pendingUploads.length > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {pendingUploads.map((up, i) => (
                <div key={i} className="border border-dashed border-gray-300 rounded-lg p-3 flex items-center gap-2">
                  {up.kind === 'image' ? (
                    <img src={`file:///${up.path.replace(/\\/g, '/')}`} className="w-12 h-12 object-cover rounded" alt="" />
                  ) : (
                    <FileText className="w-8 h-8 text-gray-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs truncate">{up.name}</div>
                    <div className="text-[10px] text-gray-400">بانتظار الحفظ</div>
                  </div>
                  <button
                    onClick={() => setPendingUploads((prev) => prev.filter((_, x) => x !== i))}
                    className="text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {files.map((f) => (
                <div key={f.id} className="border border-gray-200 rounded-lg p-3 flex items-center gap-2">
                  {f.kind === 'image' ? (
                    <img src={`file:///${f.path.replace(/\\/g, '/')}`} className="w-12 h-12 object-cover rounded" alt="" />
                  ) : (
                    <FileText className="w-8 h-8 text-gray-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs truncate">{f.name}</div>
                    <div className="text-[10px] text-gray-400">{FILE_KINDS[f.kind] || f.kind}</div>
                  </div>
                  <button
                    onClick={async () => {
                      await window.api.files.delete(f.id)
                      setFiles((prev) => prev.filter((x) => x.id !== f.id))
                    }}
                    className="text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {isEdit && documents.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-4">المستندات</h2>
            <div className="space-y-2">
              {documents.map((d) => (
                <label key={d.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.done}
                    onChange={() => toggleDoc(d)}
                    className="w-4 h-4 accent-gold-500"
                  />
                  <span className={`text-sm ${d.done ? 'line-through text-gray-400' : ''}`}>{d.docType}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-end gap-3 pb-10">
          <Link to={isEdit ? `/properties/${id}` : '/properties'} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm hover:bg-gray-50">
            إلغاء
          </Link>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="flex items-center gap-2 bg-navy-800 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-navy-900 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>

      {duplicateWarning && duplicateWarning.hasDuplicates && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center gap-3 px-6 py-4 border-b">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="font-bold text-lg">تحذير: عقار مشابه موجود</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                تم العثور على عقارات مشابهة قد تكون موجودة بالفعل:
              </p>
              <div className="space-y-2">
                {duplicateWarning.matches.map((m) => (
                  <div key={m.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm flex items-center justify-between">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-gray-500">
                        {m.zone || m.city} - {m.ownerPhone || 'بدون هاتف'}
                      </div>
                    </div>
                    <Link to={`/properties/${m.id}`} className="text-navy-700 text-xs">
                      عرض
                    </Link>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setDuplicateWarning(null)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  تراجع
                </button>
                <button
                  onClick={() => {
                    setDuplicateWarning(null)
                    save(true)
                  }}
                  className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
                >
                  حفظ على أي حال
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
