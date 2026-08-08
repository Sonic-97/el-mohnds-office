import { useEffect, useState, type FormEvent } from 'react'
import { Database, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, UserRound, WifiOff } from 'lucide-react'
import { useAuth } from './AuthContext'
import officialBrand from '../assets/official-brand.png'
import architecture from '../assets/login-architecture.png'

export default function AuthScreen() {
  const auth = useAuth()
  const setup = auth.screen === 'setup'
  const locked = auth.screen === 'locked'
  const [username, setUsername] = useState(auth.username)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (auth.username) setUsername(auth.username) }, [auth.username])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (setup && password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }
    if (setup && password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل')
      return
    }
    setBusy(true)
    try {
      if (setup) await auth.setup(username, password)
      else if (!(await auth.login(locked ? auth.username : username, password))) setError('اسم المستخدم أو كلمة المرور غير صحيحة')
    } catch (reason) {
      const text = String(reason)
      setError(text.includes('PASSWORD_TOO_SHORT') ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'تعذر إتمام تسجيل الدخول')
    } finally {
      setBusy(false)
      setPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <main className={`auth-shell ${locked ? 'auth-shell-locked' : ''}`} dir="rtl">
      <div className="auth-brand-visual" aria-hidden="true">
        <img src={architecture} alt="" />
        <div className="auth-brand-shade" />
      </div>
      <section className="auth-panel-wrap">
        <form className="auth-panel" onSubmit={submit}>
          <div className="auth-mark"><img src={officialBrand} alt="شعار المهندس للتطوير العقاري" /></div>
          <div className="type-label text-gold-600">PRIVATE REAL ESTATE INTELLIGENCE</div>
          <h1>{setup ? 'إعداد حساب المكتب' : locked ? 'تم قفل النظام' : 'أهلاً بعودتك'}</h1>
          <p>{setup ? 'أنشئ حساباً محلياً واحداً لحماية بيانات المكتب.' : locked ? 'أدخل كلمة المرور للعودة إلى مساحة العمل.' : 'سجّل الدخول للوصول إلى نظام إدارة المكتب.'}</p>

          {!locked ? <label className="auth-field">
            <span>اسم المستخدم</span>
            <div><UserRound /><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required autoFocus /></div>
          </label> : <div className="auth-locked-user"><UserRound /><span>{auth.username}</span></div>}

          <label className="auth-field">
            <span>كلمة المرور</span>
            <div><KeyRound /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={setup ? 'new-password' : 'current-password'} required autoFocus={locked} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPassword ? <EyeOff /> : <Eye />}</button>
            </div>
          </label>

          {setup && <label className="auth-field"><span>تأكيد كلمة المرور</span><div><LockKeyhole /><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></div></label>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button type="submit" className="btn btn-premium auth-submit" disabled={busy}>{busy ? 'جارٍ التحقق...' : setup ? 'إنشاء الحساب' : locked ? 'فتح النظام' : 'دخول النظام'}</button>
          {locked && <button type="button" className="auth-logout" onClick={auth.logout}>تسجيل الخروج</button>}
          {!setup && !locked && <div className="auth-no-recovery">الحساب محلي ولا توجد استعادة لكلمة المرور عبر الإنترنت.</div>}
          <div className="auth-trust-row" aria-label="خصائص حماية النظام">
            <div><ShieldCheck /><span>أمان وخصوصية</span></div>
            <div><Database /><span>بيانات محلية</span></div>
            <div><WifiOff /><span>يعمل دون إنترنت</span></div>
          </div>
        </form>
        <div className="auth-copyright">جميع الحقوق محفوظة | المهندس للتطوير العقاري</div>
      </section>
    </main>
  )
}
