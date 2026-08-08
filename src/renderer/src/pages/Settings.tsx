import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Building2, ListPlus, Image, Upload, Percent, Archive, RotateCcw, FolderOpen, ShieldCheck, KeyRound } from 'lucide-react'
import type { PropertyType, CustomField, SettingsMap, BackupInfo, SelectedBackup } from '@shared/types'
import Modal from '../components/Modal'
import { fileUrl, notifyBrandingChanged, saveBrandingFile } from '../lib/branding'
import { AUTO_LOCK_SETTINGS_EVENT } from '../components/AuthContext'

const inputCls = 'control-input'
const labelCls = 'field-label'

export default function Settings() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [types, setTypes] = useState<PropertyType[]>([])
  const [fields, setFields] = useState<CustomField[]>([])
  const [newType, setNewType] = useState('')
  const [newField, setNewField] = useState({ name: '', fieldType: 'text' as 'text' | 'number' })
  const [modal, setModal] = useState<null | 'type' | 'field'>(null)
  const [message, setMessage] = useState('')
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null)
  const [selectedBackup, setSelectedBackup] = useState<SelectedBackup | null>(null)
  const [backupBusy, setBackupBusy] = useState<'create' | 'restore' | null>(null)
  const [backupMessage, setBackupMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [passwordModal, setPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [branding, setBranding] = useState<{
    logo: string | null
    banner: string | null
    background: string | null
  }>({ logo: null, banner: null, background: null })

  function load() {
    window.api.settings.getAll().then(setSettings)
    window.api.types.list().then(setTypes)
    window.api.customFields.list().then(setFields)
    window.api.branding.get().then(setBranding)
    window.api.backup.getStatus().then(setBackupInfo)
  }

  useEffect(load, [])

  async function saveBranding(kind: 'logo' | 'banner' | 'background', file: File | null) {
    if (!file) return
    try {
      if (!window.api.branding) {
        alert('أعد تشغيل التطبيق ليتم تفعيل رفع الصور')
        return
      }
      await saveBrandingFile(kind, file)
      await window.api.branding.get().then(setBranding)
      notifyBrandingChanged()
    } catch (err) {
      alert('فشل رفع الصورة: ' + String(err))
    }
  }

  async function removeBranding(kind: 'logo' | 'banner' | 'background') {
    await window.api.branding.remove(kind)
    await window.api.branding.get().then(setBranding)
    notifyBrandingChanged()
  }

  async function saveSettings() {
    for (const [key, value] of Object.entries(settings)) {
      await window.api.settings.set(key, value)
    }
    setMessage('تم حفظ الإعدادات')
    window.dispatchEvent(new Event(AUTO_LOCK_SETTINGS_EVENT))
    setTimeout(() => setMessage(''), 2000)
  }

  async function addType() {
    if (!newType.trim()) return
    try {
      await window.api.types.create(newType.trim())
      setNewType('')
      setModal(null)
      window.api.types.list().then(setTypes)
    } catch (e) {
      alert(String(e))
    }
  }

  async function addField() {
    if (!newField.name.trim()) return
    try {
      await window.api.customFields.create(newField.name.trim(), newField.fieldType)
      setNewField({ name: '', fieldType: 'text' })
      setModal(null)
      window.api.customFields.list().then(setFields)
    } catch (e) {
      alert(String(e))
    }
  }

  function backupError(error: unknown): string {
    const value = String(error)
    if (value.includes('UNSUPPORTED_BACKUP_VERSION')) return 'إصدار النسخة الاحتياطية غير مدعوم'
    if (value.includes('INVALID_BACKUP') || value.includes('MANIFEST') || value.includes('DATABASE') || value.includes('ARCHIVE') || value.includes('ASSOCIATED_FILE')) {
      return 'ملف النسخة الاحتياطية غير صالح أو غير مكتمل'
    }
    return 'تعذر إتمام العملية. لم يتم تغيير بيانات المكتب.'
  }

  async function createBackup() {
    setBackupBusy('create')
    setBackupMessage(null)
    try {
      const result = await window.api.backup.create()
      if (result) {
        setBackupInfo(result)
        setBackupMessage({ kind: 'success', text: 'تم إنشاء النسخة الاحتياطية بنجاح' })
      }
    } catch (error) {
      setBackupMessage({ kind: 'error', text: backupError(error) })
    } finally {
      setBackupBusy(null)
    }
  }

  async function chooseRestore() {
    setBackupMessage(null)
    try {
      const selected = await window.api.backup.selectRestore()
      if (selected) setSelectedBackup(selected)
    } catch (error) {
      setBackupMessage({ kind: 'error', text: backupError(error) })
    }
  }

  async function restoreBackup() {
    if (!selectedBackup) return
    setBackupBusy('restore')
    try {
      await window.api.backup.restore(selectedBackup.filePath)
      setBackupMessage({ kind: 'success', text: 'تمت استعادة البيانات بنجاح. سيتم إعادة تشغيل البرنامج.' })
      setSelectedBackup(null)
    } catch (error) {
      setBackupMessage({ kind: 'error', text: backupError(error) })
      setSelectedBackup(null)
      setBackupBusy(null)
    }
  }

  async function changePassword() {
    setPasswordError('')
    if (passwordForm.next.length < 6) {
      setPasswordError('يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('كلمتا المرور الجديدة غير متطابقتين')
      return
    }
    try {
      await window.api.auth.changePassword(passwordForm.current, passwordForm.next)
      setPasswordForm({ current: '', next: '', confirm: '' })
      setPasswordModal(false)
      setMessage('تم تغيير كلمة المرور بنجاح')
      setTimeout(() => setMessage(''), 2500)
    } catch {
      setPasswordError('كلمة المرور الحالية غير صحيحة')
    }
  }

  return (
    <div className="page-standard p-6">
      <h1 className="type-page-title mb-6">الإعدادات</h1>

      {message && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 mb-4 text-sm">
          {message}
        </div>
      )}

      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-navy-700" /> معلومات المكتب
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>اسم المكتب</label>
            <input
              className={inputCls}
              value={settings.officeName ?? ''}
              onChange={(e) => setSettings({ ...settings, officeName: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>رقم الهاتف</label>
            <input
              dir="ltr"
              className={inputCls}
              value={settings.officePhone ?? ''}
              onChange={(e) => setSettings({ ...settings, officePhone: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>العنوان</label>
            <input
              className={inputCls}
              value={settings.officeAddress ?? ''}
              onChange={(e) => setSettings({ ...settings, officeAddress: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={saveSettings}
            className="flex items-center gap-2 bg-navy-800 text-white px-5 py-2 rounded-lg text-sm hover:bg-navy-900"
          >
            <Save className="w-4 h-4" /> حفظ الإعدادات
          </button>
        </div>
      </section>

      <section className="surface-card p-6 mb-6">
        <h2 className="font-bold mb-2 flex items-center gap-2">
          <Archive className="w-5 h-5 text-gold-600" /> النسخ الاحتياطي واستعادة البيانات
        </h2>
        <p className="text-sm text-gray-500 mb-5">تحتوي النسخة الاحتياطية على بيانات المكتب والعقارات والعملاء والملفات المرتبطة بها.</p>
        <div className="rounded-lg border border-line-light bg-ivory-100 px-4 py-3 mb-4">
          <span className="text-xs text-gray-500">آخر نسخة احتياطية:</span>
          <div className="font-medium text-navy-900 mt-1">
            {backupInfo ? new Date(backupInfo.createdAt).toLocaleString('ar-EG') : 'لم يتم إنشاء نسخة بعد'}
          </div>
          {backupInfo && <div className="text-xs text-gray-500 mt-1" dir="ltr">{backupInfo.filename}</div>}
        </div>
        {backupMessage && (
          <div className={`rounded-lg border px-4 py-3 mb-4 text-sm ${backupMessage.kind === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <div>{backupMessage.text}</div>
            {backupMessage.kind === 'success' && backupInfo && (
              <div className="mt-2 text-xs space-y-1">
                <div>{backupInfo.filename}</div>
                <div>{new Date(backupInfo.createdAt).toLocaleString('ar-EG')}</div>
                <div className="truncate" dir="ltr">{backupInfo.filePath}</div>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button onClick={createBackup} disabled={backupBusy != null} className="btn btn-premium">
            <Archive className="w-4 h-4" /> {backupBusy === 'create' ? 'جارٍ إنشاء النسخة...' : 'إنشاء نسخة احتياطية'}
          </button>
          <button onClick={chooseRestore} disabled={backupBusy != null} className="btn btn-secondary">
            <RotateCcw className="w-4 h-4" /> استعادة نسخة احتياطية
          </button>
          {backupInfo && (
            <button onClick={() => window.api.backup.openLocation(backupInfo.filePath)} className="btn btn-tertiary">
              <FolderOpen className="w-4 h-4" /> فتح مكان النسخة
            </button>
          )}
        </div>
      </section>

      <section className="surface-card p-6 mb-6">
        <h2 className="font-bold mb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-gold-600" /> الأمان</h2>
        <p className="text-sm text-gray-500 mb-5">تحكم في كلمة المرور وقفل النظام تلقائياً عند ترك الجهاز دون استخدام.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className={labelCls}>قفل تلقائي بعد عدم الاستخدام</label>
            <select className={inputCls} value={settings.autoLockMinutes ?? '15'} onChange={(event) => setSettings({ ...settings, autoLockMinutes: event.target.value })}>
              <option value="0">لا تقفل تلقائيًا</option>
              <option value="5">5 دقائق</option>
              <option value="10">10 دقائق</option>
              <option value="15">15 دقيقة</option>
              <option value="30">30 دقيقة</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <button onClick={() => setPasswordModal(true)} className="btn btn-secondary"><KeyRound className="w-4 h-4" /> تغيير كلمة المرور</button>
            <button onClick={saveSettings} className="btn btn-premium"><Save className="w-4 h-4" /> حفظ إعدادات الأمان</button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Percent className="w-5 h-5 text-navy-700" /> المطابقة الذكية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>سماحية السعر فوق الميزانية (٪)</label>
            <input
              type="number"
              className={inputCls}
              value={settings.matchingBudgetTolerance ?? '10'}
              onChange={(e) => setSettings({ ...settings, matchingBudgetTolerance: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">
              الافتراضي 10٪ — عقار أعلى من الميزانية بنسبة صغيرة يظل مطابقة جيدة.
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={saveSettings}
            className="flex items-center gap-2 bg-navy-800 text-white px-5 py-2 rounded-lg text-sm hover:bg-navy-900"
          >
            <Save className="w-4 h-4" /> حفظ الإعدادات
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-bold mb-2 flex items-center gap-2">
          <Image className="w-5 h-5 text-navy-700" /> الشعار والخلفية
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          ارفع شعار المكتب وخلفية الواجهة وخلفية الصفحة. تظهر في الشريط الجانبي ولوحة المعلومات وأيقونة النافذة.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="text-sm font-medium mb-3">شعار التطبيق</div>
            {branding.logo ? (
              <img src={fileUrl(branding.logo) ?? ''} alt="شعار" className="w-24 h-24 object-contain mb-3" />
            ) : (
              <div className="w-24 h-24 bg-navy-50 rounded-xl flex items-center justify-center text-xs text-gray-400 mb-3">
                لا يوجد شعار
              </div>
            )}
            <div className="flex gap-2">
              <label className="flex items-center gap-2 bg-navy-800 text-white px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-navy-900">
                <Upload className="w-3.5 h-3.5" /> رفع شعار
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => saveBranding('logo', e.target.files?.[0] ?? null)}
                />
              </label>
              {branding.logo && (
                <button
                  onClick={() => removeBranding('logo')}
                  className="flex items-center gap-2 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> إزالة
                </button>
              )}
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="text-sm font-medium mb-3">خلفية الواجهة (Banner)</div>
            {branding.banner ? (
              <img src={fileUrl(branding.banner) ?? ''} alt="خلفية" className="w-full h-24 object-cover rounded-lg mb-3" />
            ) : (
              <div className="w-full h-24 bg-navy-50 rounded-lg flex items-center justify-center text-xs text-gray-400 mb-3">
                لا توجد خلفية
              </div>
            )}
            <div className="flex gap-2">
              <label className="flex items-center gap-2 bg-navy-800 text-white px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-navy-900">
                <Upload className="w-3.5 h-3.5" /> رفع خلفية
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => saveBranding('banner', e.target.files?.[0] ?? null)}
                />
              </label>
              {branding.banner && (
                <button
                  onClick={() => removeBranding('banner')}
                  className="flex items-center gap-2 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> إزالة
                </button>
              )}
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="text-sm font-medium mb-3">خلفية الصفحة</div>
            {branding.background ? (
              <img
                src={fileUrl(branding.background) ?? ''}
                alt="خلفية الصفحة"
                className="w-full h-24 object-cover rounded-lg mb-3"
              />
            ) : (
              <div className="w-full h-24 bg-navy-50 rounded-lg flex items-center justify-center text-xs text-gray-400 mb-3">
                لا توجد خلفية
              </div>
            )}
            <div className="flex gap-2">
              <label className="flex items-center gap-2 bg-navy-800 text-white px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-navy-900">
                <Upload className="w-3.5 h-3.5" /> رفع خلفية الصفحة
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => saveBranding('background', e.target.files?.[0] ?? null)}
                />
              </label>
              {branding.background && (
                <button
                  onClick={() => removeBranding('background')}
                  className="flex items-center gap-2 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> إزالة
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">أنواع العقارات</h2>
          <button
            onClick={() => setModal('type')}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900"
          >
            <Plus className="w-4 h-4" /> إضافة نوع
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <span key={t.id} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg text-sm">
              {t.name}
              <button
                onClick={async () => {
                  await window.api.types.delete(t.id)
                  window.api.types.list().then(setTypes)
                }}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">الحقول المخصصة للعقارات</h2>
          <button
            onClick={() => setModal('field')}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900"
          >
            <Plus className="w-4 h-4" /> إضافة حقل
          </button>
        </div>
        {fields.length === 0 ? (
          <p className="text-sm text-gray-500">
            مثال: طول الواجهة، نسبة البناء، نوع التربة... تُظهر هذه الحقول في نموذج العقار.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {fields.map((f) => (
              <span key={f.id} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg text-sm">
                {f.name}
                <span className="text-xs text-gray-400">{f.fieldType === 'number' ? 'رقم' : 'نص'}</span>
                <button
                  onClick={async () => {
                    await window.api.customFields.delete(f.id)
                    window.api.customFields.list().then(setFields)
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {modal === 'type' && (
        <Modal title="إضافة نوع عقار" onClose={() => setModal(null)}>
          <label className={labelCls}>اسم النوع</label>
          <input
            className={inputCls}
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="مثال: استراحة، مزرعة، عمارة"
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setModal(null)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm">
              إلغاء
            </button>
            <button onClick={addType} className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm">
              إضافة
            </button>
          </div>
        </Modal>
      )}

      {modal === 'field' && (
        <Modal title="إضافة حقل مخصص" onClose={() => setModal(null)}>
          <label className={labelCls}>اسم الحقل</label>
          <input
            className={inputCls}
            value={newField.name}
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
            placeholder="مثال: طول الواجهة"
            autoFocus
          />
          <label className={`${labelCls} mt-4`}>نوع القيمة</label>
          <select
            className={inputCls}
            value={newField.fieldType}
            onChange={(e) => setNewField({ ...newField, fieldType: e.target.value as 'text' | 'number' })}
          >
            <option value="text">نص</option>
            <option value="number">رقم</option>
          </select>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setModal(null)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm">
              إلغاء
            </button>
            <button onClick={addField} className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm">
              إضافة
            </button>
          </div>
        </Modal>
      )}

      {selectedBackup && (
        <Modal title="تأكيد استعادة النسخة الاحتياطية" onClose={() => !backupBusy && setSelectedBackup(null)}>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">استعادة النسخة الاحتياطية ستستبدل بيانات المكتب الحالية بالبيانات الموجودة داخل النسخة.</p>
            <p className="text-sm mt-2">سيتم أولاً إنشاء نسخة أمان تلقائية من البيانات الحالية، ثم إعادة تشغيل البرنامج بعد نجاح الاستعادة.</p>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <div dir="ltr" className="truncate">{selectedBackup.filePath}</div>
            <div className="mt-1">تاريخ النسخة: {new Date(selectedBackup.createdAt).toLocaleString('ar-EG')}</div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setSelectedBackup(null)} disabled={backupBusy != null} className="btn btn-secondary">إلغاء</button>
            <button onClick={restoreBackup} disabled={backupBusy != null} className="btn btn-destructive">
              {backupBusy === 'restore' ? 'جارٍ الاستعادة...' : 'متابعة الاستعادة'}
            </button>
          </div>
        </Modal>
      )}

      {passwordModal && (
        <Modal title="تغيير كلمة المرور" onClose={() => setPasswordModal(false)}>
          <div className="space-y-4">
            <div><label className={labelCls}>كلمة المرور الحالية</label><input type="password" className={inputCls} value={passwordForm.current} onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })} autoComplete="current-password" autoFocus /></div>
            <div><label className={labelCls}>كلمة المرور الجديدة</label><input type="password" className={inputCls} value={passwordForm.next} onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })} autoComplete="new-password" /></div>
            <div><label className={labelCls}>تأكيد كلمة المرور الجديدة</label><input type="password" className={inputCls} value={passwordForm.confirm} onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })} autoComplete="new-password" /></div>
            {passwordError && <div className="text-sm text-red-600">{passwordError}</div>}
          </div>
          <div className="flex justify-end gap-3 mt-5"><button onClick={() => setPasswordModal(false)} className="btn btn-secondary">إلغاء</button><button onClick={changePassword} className="btn btn-premium">حفظ كلمة المرور</button></div>
        </Modal>
      )}
    </div>
  )
}
