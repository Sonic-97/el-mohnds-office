import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
  ChartColumn
} from 'lucide-react'
import Logo from './Logo'
import QuickAddMenu from './QuickAddMenu'
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
  const [officeName, setOfficeName] = useState('المهندس')
  const [pageBg, setPageBg] = useState<string | null>(null)

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

  return (
    <div className="app-shell flex h-screen">
      <aside className="app-sidebar w-56 shrink-0 bg-shell-950 text-white flex flex-col border-l border-line-dark">
        <div className="px-5 py-5 border-b border-white/8">
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
        <div className="p-4 text-xs text-slate-500 border-t border-white/10">الإصدار 1.0</div>
      </aside>
      <div className="min-w-0 flex-1 flex flex-col">
        <header className="app-topbar">
          <div>
            <div className="type-label text-ink-900">{pageTitle(location.pathname)}</div>
            <div className="type-meta">نظام إدارة المكتب العقاري</div>
          </div>
          <QuickAddMenu premium />
        </header>
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
