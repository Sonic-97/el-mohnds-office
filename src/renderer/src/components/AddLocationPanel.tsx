import { useState } from 'react'
import { X, MapPin, Save } from 'lucide-react'
import type { PropertyType, PropertyInput, PropertyStatus } from '@shared/types'
import { STATUS_LABELS } from '../lib/constants'

interface AddLocationPanelProps {
  latitude: number
  longitude: number
  types: PropertyType[]
  onSaved: () => void
  onCancel: () => void
}

const inputCls =
  'w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500'
const labelCls = 'block text-xs font-medium text-gray-600 mb-0.5'

export default function AddLocationPanel({
  latitude,
  longitude,
  types,
  onSaved,
  onCancel
}: AddLocationPanelProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [area, setArea] = useState('')
  const [price, setPrice] = useState('')
  const [status, setStatus] = useState<PropertyStatus>('available')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    if (!name.trim()) {
      setError('اسم العقار مطلوب')
      return
    }
    if (!type.trim()) {
      setError('نوع العقار مطلوب')
      return
    }
    setSaving(true)
    try {
      await window.api.types.ensure(type.trim())
      const input: PropertyInput = {
        name: name.trim(),
        type: type.trim(),
        governorate: '',
        city: '',
        center: '',
        neighborhood: '',
        zone: '',
        street: '',
        propertyNumber: '',
        mapsUrl: `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`,
        latitude,
        longitude,
        area: area ? Number(area) : null,
        price: price ? Number(price) : null,
        status,
        facadeDirection: '',
        streetWidth: null,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        notes: notes.trim()
      }
      await window.api.properties.create(input)
      onSaved()
    } catch (e) {
      setError('حدث خطأ أثناء الحفظ: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="absolute bottom-4 right-4 z-[600] w-[340px] max-h-[85%] overflow-y-auto bg-white rounded-xl shadow-2xl border border-navy-100">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-navy-950 rounded-t-xl">
        <div className="flex items-center gap-2 text-white">
          <MapPin className="w-4 h-4 text-gold-400" />
          <span className="text-sm font-bold">عقار جديد</span>
        </div>
        <button onClick={onCancel} className="text-slate-300 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="text-xs text-navy-800 bg-navy-50 rounded-lg px-3 py-2">
          الموقع المحدد: {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </div>
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}
        <div>
          <label className={labelCls}>اسم العقار *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>النوع *</label>
          <input
            list="quickTypes"
            className={inputCls}
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="اكتب أو اختر"
          />
          <datalist id="quickTypes">
            {types.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>المساحة (م²)</label>
            <input type="number" className={inputCls} value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>السعر (ج.م)</label>
            <input type="number" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>الحالة</label>
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as PropertyStatus)}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>اسم المالك</label>
            <input className={inputCls} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>هاتف المالك</label>
            <input dir="ltr" className={inputCls} value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>ملاحظات</label>
          <textarea rows={2} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-gold-500 text-navy-950 font-semibold rounded-lg py-2 text-sm hover:bg-gold-400 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Save className="w-4 h-4" /> {saving ? 'جارٍ الحفظ...' : 'حفظ العقار'}
          </button>
        </div>
      </div>
    </div>
  )
}
