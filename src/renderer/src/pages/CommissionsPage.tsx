import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Coins, Wallet, CheckCheck, Clock, Link2 } from 'lucide-react'
import type { Commission, CommissionInput, CommissionSummary, Property } from '@shared/types'
import Modal from '../components/Modal'

const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

function fmtEgp(v: number | null): string {
  if (v == null) return '-'
  return `${Math.round(v).toLocaleString('ar-EG')} ج.م`
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EMPTY: CommissionInput = {
  propertyId: 0,
  finalPrice: 0,
  cType: 'percent',
  rate: 0,
  amount: 0,
  received: 0,
  date: todayStr(),
  notes: ''
}

export default function Commissions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [list, setList] = useState<Commission[]>([])
  const [summary, setSummary] = useState<CommissionSummary | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [form, setForm] = useState<CommissionInput>(EMPTY)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Commission | null>(null)

  const propertyOptions = useMemo(() => properties.filter((p) => p.status === 'sold' || p.status === 'rented'), [properties])

  function load() {
    window.api.commissions.list().then(setList)
    window.api.commissions.summary().then(setSummary)
    window.api.properties.list().then(setProperties)
  }

  useEffect(load, [])

  useEffect(() => {
    const pid = Number(searchParams.get('property'))
    if (pid && !modalOpen && propertyOptions.some((p) => p.id === pid)) {
      const p = propertyOptions.find((x) => x.id === pid)
      setForm({
        propertyId: pid,
        finalPrice: p?.price ?? 0,
        cType: 'percent',
        rate: 0,
        amount: 0,
        received: 0,
        date: todayStr(),
        notes: ''
      })
      setEditingId(null)
      setModalOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, propertyOptions.length])

  function openNew() {
    setForm(EMPTY)
    setEditingId(null)
    setModalOpen(true)
  }

  function openEdit(c: Commission) {
    setForm({
      propertyId: c.propertyId,
      finalPrice: c.finalPrice,
      cType: c.cType,
      rate: c.rate,
      amount: c.amount,
      received: c.received,
      date: c.date,
      notes: c.notes
    })
    setEditingId(c.id)
    setModalOpen(true)
  }

  function updateForm(patch: Partial<CommissionInput>) {
    setForm((f) => {
      const next = { ...f, ...patch }
      next.amount = next.cType === 'percent' ? Math.round((next.finalPrice * next.rate) / 100) : next.rate
      return next
    })
  }

  async function save() {
    if (!form.propertyId || !form.finalPrice) return
    if (editingId) await window.api.commissions.update(editingId, form)
    else await window.api.commissions.create(form)
    setModalOpen(false)
    load()
  }

  async function toggleReceived(c: Commission) {
    await window.api.commissions.update(c.id, {
      propertyId: c.propertyId,
      finalPrice: c.finalPrice,
      cType: c.cType,
      rate: c.rate,
      amount: c.amount,
      received: c.received ? 0 : 1,
      date: c.date,
      notes: c.notes
    })
    load()
  }

  const monthOutstanding = (summary?.monthOutstanding ?? 0) > 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">العمولات</h1>
          <p className="text-sm text-gray-500 mt-1">تسجيل عمولات العقارات المباعة والمؤجرة — نظام بسيط غير محاسبي.</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
        >
          <Plus className="w-4 h-4" /> تسجيل عمولة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-t-2 border-navy-800">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Clock className="w-4 h-4 text-navy-600" /> متوقع هذا الشهر
          </div>
          <div className="text-2xl font-bold">{fmtEgp(summary?.monthExpected ?? 0)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-t-2 border-emerald-600">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCheck className="w-4 h-4 text-emerald-600" /> مستلم هذا الشهر
          </div>
          <div className="text-2xl font-bold">{fmtEgp(summary?.monthReceived ?? 0)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-t-2 border-amber-500">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Wallet className="w-4 h-4 text-amber-600" /> مستحق هذا الشهر
          </div>
          <div className={`text-2xl font-bold ${monthOutstanding ? 'text-amber-600' : ''}`}>
            {fmtEgp(summary?.monthOutstanding ?? 0)}
          </div>
        </div>
      </div>

      {summary && summary.count > 0 && (
        <p className="text-xs text-gray-400 -mt-3">
          إجمالي كل العمولات: متوقع {fmtEgp(summary.totalExpected)} · مستلم {fmtEgp(summary.totalReceived)} · مستحق{' '}
          {fmtEgp(summary.totalOutstanding)} ({summary.count.toLocaleString('ar-EG')} عملية)
        </p>
      )}

      {list.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">لا توجد عمولات مسجلة.</p>
          <p className="text-sm text-gray-400 mt-1">
            عندما يُباع أو يُؤجر عقار اضغط "تسجيل عمولة" من هنا أو من صفحة العقار مباشرة.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-right px-4 py-3">العقار</th>
                <th className="text-right px-4 py-3">التاريخ</th>
                <th className="text-right px-4 py-3">سعر الصفقة</th>
                <th className="text-right px-4 py-3">العمولة</th>
                <th className="text-right px-4 py-3">الحالة</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/properties/${c.propertyId}`} className="font-medium hover:text-navy-700">
                      {c.propertyName}
                    </Link>
                    {c.notes && <div className="text-[11px] text-gray-400">{c.notes}</div>}
                  </td>
                  <td className="px-4 py-3">{c.date?.slice(0, 10) || '-'}</td>
                  <td className="px-4 py-3">{fmtEgp(c.finalPrice)}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold">{fmtEgp(c.amount)}</div>
                    <div className="text-[11px] text-gray-400">
                      {c.cType === 'percent' ? `${c.rate.toLocaleString('ar-EG')}%` : 'مبلغ ثابت'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleReceived(c)}
                      className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        c.received ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}
                      title={c.received ? 'تم الاستلام' : 'اضغط لتسجيل الاستلام'}
                    >
                      {c.received ? <CheckCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {c.received ? 'تم الاستلام' : 'مستحق'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-navy-700 p-1" title="تعديل">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(c)} className="text-gray-400 hover:text-red-500 p-1" title="حذف">
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

      {modalOpen && (
        <Modal title={editingId ? 'تعديل عمولة' : 'تسجيل عمولة'} onClose={() => setModalOpen(false)} size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>العقار (مباع / مؤجر) *</label>
              <select
                className={inputCls}
                value={form.propertyId || ''}
                onChange={(e) => {
                  const p = properties.find((x) => x.id === Number(e.target.value))
                  updateForm({ propertyId: Number(e.target.value), finalPrice: p?.price ?? form.finalPrice })
                }}
              >
                <option value="">اختر عقاراً...</option>
                {propertyOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.status === 'sold' ? 'مباع' : 'مؤجر'}
                  </option>
                ))}
              </select>
              {propertyOptions.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  لا توجد عقارات مباعة أو مؤجرة بعد — غيّر حالة عقار إلى "مباع" أو "مؤجر" من صفحته أولاً.
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>سعر الصفقة النهائي (ج.م) *</label>
              <input
                type="number"
                className={inputCls}
                value={form.finalPrice || ''}
                onChange={(e) => updateForm({ finalPrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelCls}>نوع العمولة</label>
              <select className={inputCls} value={form.cType} onChange={(e) => updateForm({ cType: e.target.value as CommissionInput['cType'] })}>
                <option value="percent">نسبة مئوية</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{form.cType === 'percent' ? 'النسبة المئوية (%)' : 'المبلغ الثابت (ج.م)'}</label>
              <input type="number" className={inputCls} value={form.rate || ''} onChange={(e) => updateForm({ rate: Number(e.target.value) })} />
            </div>
            <div className="bg-navy-50 rounded-lg px-3 py-2 self-end">
              <div className="text-xs text-navy-800 mb-0.5">قيمة العمولة المحسوبة</div>
              <div className="font-bold text-navy-900">{fmtEgp(form.amount)}</div>
            </div>
            <div>
              <label className={labelCls}>التاريخ</label>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => updateForm({ date: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="received"
                className="w-4 h-4 accent-gold-500"
                checked={Boolean(form.received)}
                onChange={(e) => updateForm({ received: e.target.checked ? 1 : 0 })}
              />
              <label htmlFor="received" className="text-sm text-gray-700">
                تم استلام العمولة
              </label>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>ملاحظات</label>
              <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} />
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
            <h3 className="font-bold text-lg mb-2">حذف عمولة</h3>
            <p className="text-sm text-gray-600 mb-6">هل أنت متأكد من حذف عمولة "{confirmDelete.propertyName}"؟</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                إلغاء
              </button>
              <button
                onClick={async () => {
                  await window.api.commissions.delete(confirmDelete.id)
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
