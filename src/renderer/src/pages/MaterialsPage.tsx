import { useEffect, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Package,
  TrendingUp,
  TrendingDown,
  Link2,
  Info
} from 'lucide-react'
import type { ConstructionMaterial, ConstructionMaterialInput, MaterialRefreshResult } from '@shared/types'
import Modal from '../components/Modal'

const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

const EMPTY: ConstructionMaterialInput = {
  name: '',
  unit: 'طن',
  price: null,
  previousPrice: null,
  source: '',
  sourceUrl: '',
  notes: ''
}

function changeInfo(m: ConstructionMaterial): { diff: number; pct: number } | null {
  if (m.price == null || m.previousPrice == null) return null
  const diff = m.price - m.previousPrice
  const pct = m.previousPrice ? Math.round((diff / m.previousPrice) * 100) : 0
  return { diff, pct }
}

export default function Materials() {
  const [materials, setMaterials] = useState<ConstructionMaterial[]>([])
  const [form, setForm] = useState<ConstructionMaterialInput>(EMPTY)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ConstructionMaterial | null>(null)

  function load() {
    window.api.materials.list().then(setMaterials)
    window.api.settings.getAll().then((s) => setSourceUrl(s.materialsSourceUrl ?? ''))
  }

  useEffect(load, [])

  function openNew() {
    setForm(EMPTY)
    setEditingId(null)
    setModalOpen(true)
  }

  function openEdit(m: ConstructionMaterial) {
    setForm({
      name: m.name,
      unit: m.unit,
      price: m.price,
      previousPrice: m.previousPrice,
      source: m.source,
      sourceUrl: m.sourceUrl,
      notes: m.notes
    })
    setEditingId(m.id)
    setModalOpen(true)
  }

  async function save() {
    if (!form.name.trim()) return
    await window.api.materials.save(form)
    setModalOpen(false)
    load()
  }

  async function doRefresh() {
    setBusy(true)
    setMsg(null)
    try {
      const r: MaterialRefreshResult = await window.api.materials.refresh()
      setMsg({ ok: r.ok, text: r.message })
      load()
    } finally {
      setBusy(false)
    }
  }

  async function saveSourceUrl() {
    await window.api.settings.set('materialsSourceUrl', sourceUrl.trim())
    setMsg({ ok: true, text: 'تم حفظ رابط المصدر — سيتحدث التطبيق تلقائياً مرة واحدة يومياً عند فتحه' })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">أسعار مواد البناء</h1>
          <p className="text-sm text-gray-500 mt-1">
            أسعار يومية موثقة المصدر — لا نختلق أسعاراً. ابدأ بحديد وأسمنت بسعر موثق ومصدر.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
        >
          <Plus className="w-4 h-4" /> إضافة مادة
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <RefreshCw className="w-4 h-4 text-gold-600" />
          <span className="font-medium">التحديث التلقائي اليومي</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          ضع رابط مصدر يرجع JSON بالشكل:
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] mx-1" dir="ltr">
            [{"{ \"name\": \"حديد\", \"price\": 47000, \"unit\": \"طن\" }"}]
          </code>
          وسيتحدث التطبيق مرة يومياً عند الفتح. إن تُرك فارغاً تبقى الأسعار يدوية 100%.
        </p>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            dir="ltr"
            className={`${inputCls} md:flex-1`}
            placeholder="https://example.com/materials.json"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
          <button
            onClick={saveSourceUrl}
            className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900 whitespace-nowrap"
          >
            حفظ الرابط
          </button>
          <button
            onClick={doRefresh}
            disabled={busy}
            className="flex items-center justify-center gap-2 border border-navy-800 text-navy-800 px-4 py-2 rounded-lg text-sm hover:bg-navy-50 disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> تحديث الآن
          </button>
        </div>
        {msg && (
          <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {msg.text}
          </div>
        )}
      </div>

      {materials.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">لم تُضف أي مواد بعد.</p>
          <p className="text-sm text-gray-400 mt-1">
            اضغط "إضافة مادة" وسجّل سعر حديد وأسمنت اليوم مع اسم المصدر وتاريخه.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {materials.map((m) => {
            const ch = changeInfo(m)
            return (
              <div key={m.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gold-600" />
                    <span className="font-bold">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(m)} className="text-gray-400 hover:text-navy-700 p-1" title="تعديل">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(m)} className="text-gray-400 hover:text-red-500 p-1" title="حذف">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-2xl font-bold text-navy-900">
                  {m.price != null ? `${m.price.toLocaleString('ar-EG')} ج.م` : '—'}
                  <span className="text-sm font-normal text-gray-500"> / {m.unit}</span>
                </div>
                {ch ? (
                  <div className={`text-xs mt-1 flex items-center gap-1 ${ch.diff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {ch.diff >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {ch.diff >= 0 ? '+' : ''}
                    {ch.diff.toLocaleString('ar-EG')} ({ch.pct >= 0 ? '+' : ''}
                    {ch.pct}%) عن آخر تحديث
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 mt-1">لا يوجد سعر سابق للمقارنة</div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span>آخر تحديث:</span>
                    <span>{m.updatedAt?.slice(0, 10) || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>المصدر:</span>
                    {m.sourceUrl ? (
                      <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="text-navy-700 hover:underline flex items-center gap-0.5 truncate max-w-[60%]">
                        {m.source || 'المصدر'} <Link2 className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="truncate max-w-[60%]">{m.source || 'يدوي'}</span>
                    )}
                  </div>
                  {m.notes && <div className="text-gray-400 mt-1">{m.notes}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-start gap-2 bg-navy-50 border border-navy-100 rounded-xl px-4 py-3 text-xs text-navy-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          الأسعار هنا أسعار عرض يومية تُدخل يدوياً من مصدر موثق أو تُجلب تلقائياً من رابط المصدر. لا تُولَّد تلقائياً ولا
          تُختلق. تُستخدم في حاسبات أدوات العميل كمرجع فقط.
        </p>
      </div>

      {modalOpen && (
        <Modal
          title={editingId ? 'تعديل مادة' : 'إضافة مادة'}
          onClose={() => setModalOpen(false)}
          size="lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>اسم المادة *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="حديد / أسمنت / ..." />
            </div>
            <div>
              <label className={labelCls}>الوحدة</label>
              <input className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="طن / شيكارة / متر مكعب" />
            </div>
            <div>
              <label className={labelCls}>السعر (ج.م)</label>
              <input
                type="number"
                className={inputCls}
                value={form.price ?? ''}
                onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <label className={labelCls}>اسم المصدر</label>
              <input className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="مثال: أسعار السوق المحلي 2026" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>رابط المصدر (اختياري)</label>
              <input dir="ltr" className={inputCls} value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>ملاحظات</label>
              <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModalOpen(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              إلغاء
            </button>
            <button onClick={save} className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900">
              حفظ
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold text-lg mb-2">حذف مادة</h3>
            <p className="text-sm text-gray-600 mb-6">هل أنت متأكد من حذف "{confirmDelete.name}"؟</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                إلغاء
              </button>
              <button
                onClick={async () => {
                  await window.api.materials.delete(confirmDelete.id)
                  setConfirmDelete(null)
                  load()
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
