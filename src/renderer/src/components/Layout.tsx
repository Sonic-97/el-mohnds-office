import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  Map as MapIcon,
  MapPinned,
  Settings as SettingsIcon,
  LineChart,
  Pencil,
  Link2,
  Hammer,
  Calculator,
  Coins,
  ChartColumn,
  LockKeyhole,
  LogOut,
  CalendarDays,
  Clock3,
  UserRound,
  Eye
} from 'lucide-react'
import Logo from './Logo'
import QuickAddMenu from './QuickAddMenu'
import { useClientMode } from './ClientModeContext'
import { useAuth } from './AuthContext'
import { fileUrl, onBrandingChanged, notifyBrandingChanged, saveBrandingFile } from '../lib/branding'

const navGroups = [
  { label: 'الرئيسية', items: [{ to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, end: true }] },
  {
    label: 'العقارات والعملاء',
    items: [
      { to: '/properties', label: 'العقارات', icon: Building2 },
      { to: '/clients', label: 'العملاء', icon: Users },
      { to: '/matches', label: 'المطابقات', icon: Link2 }
    ]
  },
  {
    label: 'السوق والأدوات',
    items: [
      { to: '/market', label: 'سوق الزقازيق', icon: LineChart },
      { to: '/materials', label: 'مواد البناء', icon: Hammer },
      { to: '/calc', label: 'أدوات العميل', icon: Calculator },
      { to: '/demand', label: 'طلب العملاء', icon: ChartColumn }
    ]
  },
  {
    label: 'إدارة المكتب',
    items: [
      { to: '/commissions', label: 'العمولات', icon: Coins },
      { to: '/map', label: 'الخريطة', icon: MapIcon },
      { to: '/zagazig', label: 'خريطة الزقازيق', icon: MapPinned },
      { to: '/settings', label: 'الإعدادات', icon: SettingsIcon }
    ]
  }
]

function pageTitle(pathname: string): string {
  if (pathname.startsWith('/properties')) return pathname.includes('/new') ? 'إضافة عقار' : 'العقارات'
  if (pathname.startsWith('/clients')) return 'العملاء'
  if (pathname.startsWith('/matches')) return 'المطابقات'
  if (pathname.startsWith('/market')) return 'سوق الزقازيق'
  if (pathname.startsWith('/materials')) return 'مواد البناء'
  if (pathname.startsWith('/calc')) return 'أدوات العميل'
  if (pathname.startsWith('/demand')) return 'طلب العملاء'
  if (pathname.startsWith('/commissions')) return 'العمولات'
  if (pathname.startsWith('/zagazig')) return 'خريطة الزقازيق'
  if (pathname.startsWith('/map')) return 'الخريطة'
  if (pathname.startsWith('/settings')) return 'الإعدادات'
  return 'لوحة التحكم'
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const clientMode = useClientMode()
  const auth = useAuth()
  const [officeName, setOfficeName] = useState('المهندس')
  const [pageBg, setPageBg] = useState<string | null>(null)
  const now = new Date()

  useEffect(() => {
    window.api.settings.getAll().then((s) => {
      if (s.officeName) setOfficeName(s.officeName)
    })
    async function loadBg() {
      const b = await window.api.branding.get()
      setPageBg(b.background ? fileUrl(b.background) : null)
    }
    loadBg()
    const off = onBrandingChanged(loadBg)
    return off
  }, [])

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      if (!window.api.branding) {
        alert('أعد تشغيل التطبيق ليتم تفعيل رفع الشعار')
        return
      }
      await saveBrandingFile('logo', file)
      notifyBrandingChanged()
    } catch (err) {
      alert('فشل رفع الشعار: ' + String(err))
    }
  }

  function openClientMode() {
    clientMode.enter()
    navigate('/zagazig')
  }

  return (
    <div className={`app-shell flex h-screen ${clientMode.active ? 'client-presentation-active' : ''}`}>
      {!clientMode.active && <aside className="app-sidebar w-56 shrink-0 bg-shell-950 text-white flex flex-col border-l border-line-dark">
        <div className="sidebar-brand px-5 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Logo size={46} />
              <label
                title="رفع شعار المكتب"
                className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer flex items-center justify-center transition-opacity"
              >
                <Pencil className="w-4 h-4 text-gold-400" />
                <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
              </label>
            </div>
            <div>
              <h1 className="font-semibold text-base leading-tight">{officeName}</h1>
              <p className="mt-1 text-[10px] text-gold-300/80 tracking-[0.12em]">REAL ESTATE OFFICE</p>
            </div>
          </div>
          <div className="gold-divider mt-4" />
        </div>
        <nav className="sidebar-nav flex-1 overflow-y-auto px-3 py-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="sidebar-group-label">{group.label}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  >
                    <item.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="sidebar-account">
          <div className="sidebar-account-avatar"><UserRound /></div>
          <div className="min-w-0 flex-1"><strong>{auth.username}</strong><span>مدير المكتب</span></div>
          <button onClick={auth.logout} title="تسجيل الخروج"><LogOut /></button>
        </div>
      </aside>}
      <div className="min-w-0 flex-1 flex flex-col">
        {clientMode.active ? (
          <header className="client-presentation-topbar">
            <div className="flex items-center gap-3">
              <Logo size={34} />
              <div>
                <div className="text-sm font-semibold text-white">{officeName}</div>
                <div className="text-[10px] tracking-[.12em] text-gold-300/75">PROPERTY PRESENTATION</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={auth.lock} className="client-mode-exit"><LockKeyhole className="w-3.5 h-3.5" /> قفل النظام</button>
              <button onClick={clientMode.exit} className="client-mode-exit">خروج من وضع العميل</button>
            </div>
          </header>
        ) : <header className="app-topbar">
          <div className="topbar-date-block">
            <div><CalendarDays /> {now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <span><Clock3 /> {now.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="topbar-page-name">{pageTitle(location.pathname)}</div>
            <button onClick={openClientMode} className="btn btn-operational btn-sm"><Eye className="w-4 h-4" /> وضع العميل</button>
            <QuickAddMenu premium />
            <button onClick={auth.lock} className="btn btn-secondary btn-sm" title="قفل النظام"><LockKeyhole className="w-4 h-4" /> قفل</button>
          </div>
        </header>}
        <main
        className="workspace-surface min-h-0 flex-1 overflow-y-auto"
        style={
          pageBg
            ? {
                backgroundImage: `linear-gradient(rgba(243,244,243,0.94), rgba(243,244,243,0.94)), url("${pageBg}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
              }
            : undefined
        }
      >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
