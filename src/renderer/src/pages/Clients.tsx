import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Phone, Users, ListFilter, Link2, CheckCheck, CalendarClock } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Client, ClientInput, PropertyType, FollowUpStatus } from '@shared/types'
import Modal from '../components/Modal'
import {
  SERIOUSNESS_LABELS,
  SERIOUSNESS_COLORS,
  ROLE_LABELS,
  STATUS_LABELS,
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_STATUS_COLORS,
  formatPrice
} from '../lib/constants'

const inputCls =
  'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

const EMPTY_FORM: ClientInput = {
  name: '',
  phone: '',
  role: 'buyer',
  budget: null,
  preferredArea: '',
  preferredType: '',
  preferredAreaSize: null,
  seriousness: 'possible',
  notes: '',
  type: '',
  area: '',
  requestType: '',
  governorate: '',
  city: '',
  center: '',
  neighborhood: '',
  budgetFrom: null,
  budgetTo: null,
  areaFrom: null,
  areaTo: null,
  desiredStatus: '',
  followUpDate: '',
  followUpNote: '',
  followUpStatus: 'new'
}

export default function Clients() {
  const [searchParams] = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [types, setTypes] = useState<PropertyType[]>([])
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [seriousnessFilter, setSeriousnessFilter] = useState('')
  const [editing, setEditing] = useState<Client | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<ClientInput>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null)
  const [matchCounts, setMatchCounts] = useState<Record<number, number>>({})
  const [quickMatch, setQuickMatch] = useState<{ clientId: number; count: number } | null>(null)
  const [followupClient, setFollowupClient] = useState<Client | null>(null)
  const [followupForm, setFollowupForm] = useState({ date: '', note: '', status: 'new' as FollowUpStatus })

  function load() {
    window.api.clients.list().then(setClients)
    window.api.types.list().then(setTypes)
    window.api.matching.opportunities().then((o) => {
      const counts: Record<number, number> = {}
      for (const s of o.clientSummaries) counts[s.client.id] = s.propertyCount
      setMatchCounts(counts)
    })
  }

  useEffect(load, [])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setForm(EMPTY_FORM)
      setCreating(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  function openNew() {
    setForm(EMPTY_FORM)
    setCreating(true)
  }

  function openEdit(c: Client) {
    setForm({
      name: c.name,
      phone: c.phone,
      role: c.role,
      budget: c.budget,
      preferredArea: c.preferredArea,
      preferredType: c.preferredType,
      preferredAreaSize: c.preferredAreaSize,
      seriousness: c.seriousness,
      notes: c.notes,
      type: c.type,
      area: c.area,
      requestType: c.requestType,
      governorate: c.governorate,
      city: c.city,
      center: c.center,
      neighborhood: c.neighborhood,
      budgetFrom: c.budgetFrom,
      budgetTo: c.budgetTo,
      areaFrom: c.areaFrom,
      areaTo: c.areaTo,
      desiredStatus: c.desiredStatus,
      followUpDate: c.followUpDate,
      followUpNote: c.followUpNote,
      followUpStatus: c.followUpStatus
    })
    setEditing(c)
  }

  async function save() {
    if (!form.name.trim()) return
    const payload: ClientInput = {
      ...form,
      name: form.name.trim(),
      preferredArea: form.area,
      preferredType: form.type,
      budget: form.budgetTo ?? form.budget,
      preferredAreaSize: form.areaTo ?? form.areaFrom ?? form.preferredAreaSize
    }
    let saved: Client
    if (editing) {
      saved = await window.api.clients.update(editing.id, payload)
    } else {
      saved = await window.api.clients.create(payload)
    }
    setEditing(null)
    setCreating(false)
    window.api.matching.clientMatchCount(saved.id).then((count) => {
      setQuickMatch({ clientId: saved.id, count })
    })
    load()
  }

  const followupOnly = searchParams.get('followup') === '1'
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const isDue = (c: Client): boolean => {
    if (!c.followUpDate || c.followUpStatus === 'closed') return false
    const d = new Date(c.followUpDate + 'T00:00:00')
    d.setHours(0, 0, 0, 0)
    return !isNaN(d.getTime()) && d.getTime() <= todayStart.getTime()
  }
  const dueClients = clients.filter(isDue)

  const filtered = clients.filter((c) => {
    if (followupOnly && !isDue(c)) return false
    if (query && !(c.name.includes(query) || c.phone.includes(query) || c.area.includes(query))) return false
    if (roleFilter && c.role !== roleFilter) return false
    if (seriousnessFilter && c.seriousness !== seriousnessFilter) return false
    return true
  })

  function openFollowUp(c: Client) {
    setFollowupForm({
      date: c.followUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      note: c.followUpNote,
      status: c.followUpStatus
    })
    setFollowupClient(c)
  }

  async function saveFollowUp() {
    if (!followupClient) return
    const c = followupClient
    const payload: ClientInput = {
      name: c.name,
      phone: c.phone,
      role: c.role,
      budget: c.budget,
      preferredArea: c.preferredArea,
      preferredType: c.preferredType,
      preferredAreaSize: c.preferredAreaSize,
      seriousness: c.seriousness,
      notes: c.notes,
      type: c.type,
      area: c.area,
      requestType: c.requestType,
      governorate: c.governorate,
      city: c.city,
      center: c.center,
      neighborhood: c.neighborhood,
      budgetFrom: c.budgetFrom,
      budgetTo: c.budgetTo,
      areaFrom: c.areaFrom,
      areaTo: c.areaTo,
      desiredStatus: c.desiredStatus,
      followUpDate: followupForm.date,
      followUpNote: followupForm.note,
      followUpStatus: followupForm.status
    }
    await window.api.clients.update(c.id, payload)
    setFollowupClient(null)
    load()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">العملاء</h1>
          <p className="text-sm text-gray-500 mt-1">{clients.length} عميل</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
        >
          <Plus className="w-4 h-4" /> إضافة عميل
        </button>
      </div>

      {quickMatch && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <span className="text-sm">
            وجدنا {quickMatch.count.toLocaleString('ar-EG')} عقارات قد تناسب هذا العميل
          </span>
          <Link
            to={`/clients/${quickMatch.clientId}`}
            className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700"
          >
            عرض النتائج
          </Link>
        </div>
      )}

      {followupOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <span className="text-sm">
            المتابعات المستحقة (المتأخرة أو اليوم): {dueClients.length.toLocaleString('ar-EG')} عميل
          </span>
          <Link
            to="/clients"
            className="text-sm bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-700"
          >
            عرض كل العملاء
          </Link>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="اسم العميل، الهاتف، المنطقة..."
          className={inputCls}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputCls}>
          <option value="">كل الأدوار</option>
          <option value="buyer">مشتري</option>
          <option value="seller">بائع</option>
        </select>
        <select
          value={seriousnessFilter}
          onChange={(e) => setSeriousnessFilter(e.target.value)}
          className={inputCls}
        >
          <option value="">كل درجات الجدية</option>
          {Object.entries(SERIOUSNESS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-right px-4 py-3">الاسم</th>
              <th className="text-right px-4 py-3">الهاتف</th>
              <th className="text-right px-4 py-3">الدور</th>
              <th className="text-right px-4 py-3">الميزانية</th>
              <th className="text-right px-4 py-3">المنطقة المطلوبة</th>
              <th className="text-right px-4 py-3">نوع العقار</th>
              <th className="text-right px-4 py-3">الجدية</th>
              <th className="text-right px-4 py-3">المتابعة</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/clients/${c.id}`} className="font-medium hover:text-navy-700">
                    {c.name}
                  </Link>
                  {(matchCounts[c.id] ?? 0) > 0 && (
                    <span className="ms-2 text-[11px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      {matchCounts[c.id].toLocaleString('ar-EG')} مناسبة
                    </span>
                  )}
                </td>
                <td className="px-4 py-3" dir="ltr">
                  {c.phone || '-'}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{ROLE_LABELS[c.role]}</span>
                </td>
                <td className="px-4 py-3">{formatPrice(c.budget)}</td>
                <td className="px-4 py-3">{c.area || c.preferredArea || '-'}</td>
                <td className="px-4 py-3">{c.type || c.preferredType || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${SERIOUSNESS_COLORS[c.seriousness]}`}>
                    {SERIOUSNESS_LABELS[c.seriousness]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.followUpDate ? (
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`text-xs px-2 py-0.5 rounded ${FOLLOWUP_STATUS_COLORS[c.followUpStatus]}`}>
                        {FOLLOWUP_STATUS_LABELS[c.followUpStatus]}
                      </span>
                      <span className={`text-[11px] ${isDue(c) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {c.followUpDate.slice(0, 10)}
                        {isDue(c) && ' · مستحقة'}
                      </span>
                    </div>
                  ) : (
                    <button onClick={() => openFollowUp(c)} className="text-xs text-navy-700 hover:underline">
                      جدولة متابعة
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      to={`/clients/${c.id}`}
                      className="text-navy-700 hover:bg-navy-50 p-1.5 rounded"
                      title="العقارات المناسبة"
                    >
                      <ListFilter className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => openFollowUp(c)}
                      className="text-navy-700 hover:bg-navy-50 p-1.5 rounded"
                      title="متابعة العميل"
                    >
                      <CalendarClock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => window.open(`tel:${c.phone}`, '_blank')}
                      className="text-navy-700 hover:bg-navy-50 p-1.5 rounded"
                      title="اتصال"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      className="text-gray-500 hover:bg-gray-100 p-1.5 rounded"
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(c)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="text-gray-400 mb-2">
                    <Users className="w-12 h-12 mx-auto" />
                  </div>
                  <p className="text-gray-600 font-medium">
                    {clients.length === 0 ? 'لم تتم إضافة عملاء بعد.' : 'لا يوجد عملاء مطابقون للبحث.'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {clients.length === 0 ? 'اضغط "إضافة عميل" لإدخال أول عميل.' : 'جرّب تعديل البحث.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <Modal title={editing ? 'تعديل عميل' : 'إضافة عميل'} onClose={() => { setCreating(false); setEditing(null) }} size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>الاسم *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف</label>
              <input dir="ltr" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>الدور</label>
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ClientInput['role'] })}>
                <option value="buyer">مشتري</option>
                <option value="seller">بائع</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>درجة الجدية</label>
              <select
                className={inputCls}
                value={form.seriousness}
                onChange={(e) => setForm({ ...form, seriousness: e.target.value as ClientInput['seriousness'] })}
              >
                {Object.entries(SERIOUSNESS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 mb-3 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-gold-600" />
            <h3 className="font-bold">متطلبات العميل</h3>
            <span className="text-xs text-gray-400">اختياري — املأ ما يعرفه العميل فقط</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>نوع الطلب</label>
              <select
                className={inputCls}
                value={form.requestType}
                onChange={(e) => setForm({ ...form, requestType: e.target.value as ClientInput['requestType'] })}
              >
                <option value="">غير محدد</option>
                <option value="buy">شراء</option>
                <option value="rent">إيجار</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>نوع العقار المطلوب</label>
              <input
                list="clientTypeList"
                className={inputCls}
                placeholder="أي نوع"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
              <datalist id="clientTypeList">
                {types.map((t) => (
                  <option key={t.id} value={t.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>المحافظة</label>
              <input className={inputCls} value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>المدينة</label>
              <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>المركز</label>
              <input className={inputCls} value={form.center} onChange={(e) => setForm({ ...form, center: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>الحي</label>
              <input className={inputCls} value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>المنطقة</label>
              <input className={inputCls} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>الحالة المطلوبة</label>
              <select
                className={inputCls}
                value={form.desiredStatus}
                onChange={(e) => setForm({ ...form, desiredStatus: e.target.value as ClientInput['desiredStatus'] })}
              >
                <option value="">أي حالة</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>الميزانية من (ج.م)</label>
              <input
                type="number"
                className={inputCls}
                value={form.budgetFrom ?? ''}
                onChange={(e) => setForm({ ...form, budgetFrom: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <label className={labelCls}>الميزانية إلى (ج.م)</label>
              <input
                type="number"
                className={inputCls}
                value={form.budgetTo ?? ''}
                onChange={(e) => setForm({ ...form, budgetTo: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <label className={labelCls}>المساحة من (م²)</label>
              <input
                type="number"
                className={inputCls}
                value={form.areaFrom ?? ''}
                onChange={(e) => setForm({ ...form, areaFrom: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <label className={labelCls}>المساحة إلى (م²)</label>
              <input
                type="number"
                className={inputCls}
                value={form.areaTo ?? ''}
                onChange={(e) => setForm({ ...form, areaTo: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>ملاحظات / متطلبات إضافية</label>
              <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="mt-6 mb-3 flex items-center gap-2 border-t border-gray-100 pt-5">
            <CalendarClock className="w-5 h-5 text-gold-600" />
            <h3 className="font-bold">المتابعة</h3>
            <span className="text-xs text-gray-400">اختياري — حدد موعداً وحالة للمتابعة</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>حالة المتابعة</label>
              <select
                className={inputCls}
                value={form.followUpStatus}
                onChange={(e) => setForm({ ...form, followUpStatus: e.target.value as ClientInput['followUpStatus'] })}
              >
                {Object.entries(FOLLOWUP_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>تاريخ المتابعة التالية</label>
              <input
                type="date"
                className={inputCls}
                value={form.followUpDate}
                onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>ملاحظة المتابعة</label>
              <input
                className={inputCls}
                value={form.followUpNote}
                onChange={(e) => setForm({ ...form, followUpNote: e.target.value })}
                placeholder="مثال: تم التواصل وتحديد معاينة يوم السبت"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => { setCreating(false); setEditing(null) }} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              إلغاء
            </button>
            <button onClick={save} className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900">
              حفظ
            </button>
          </div>
        </Modal>
      )}

      {followupClient && (
        <Modal title={`متابعة: ${followupClient.name}`} onClose={() => setFollowupClient(null)}>
          <div className="mb-4">
            <div className={labelCls}>حالة المتابعة</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(FOLLOWUP_STATUS_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFollowupForm((f) => ({ ...f, status: k as FollowUpStatus }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    followupForm.status === k
                      ? FOLLOWUP_STATUS_COLORS[k]
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className={labelCls}>تاريخ المتابعة التالية</label>
            <input
              type="date"
              className={inputCls}
              value={followupForm.date}
              onChange={(e) => setFollowupForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="mb-4">
            <label className={labelCls}>ملاحظة المتابعة</label>
            <textarea
              rows={2}
              className={inputCls}
              value={followupForm.note}
              onChange={(e) => setFollowupForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="مثال: تم التواصل وتحديد معاينة يوم السبت"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setFollowupClient(null)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              إلغاء
            </button>
            <button
              onClick={saveFollowUp}
              className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
            >
              <CheckCheck className="w-4 h-4" /> حفظ المتابعة
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold text-lg mb-2">حذف عميل</h3>
            <p className="text-sm text-gray-600 mb-6">هل أنت متأكد من حذف "{confirmDelete.name}"؟</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                إلغاء
              </button>
              <button
                onClick={async () => {
                  await window.api.clients.delete(confirmDelete.id)
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
