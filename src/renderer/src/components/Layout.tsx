import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
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
import { fileUrl, onBrandingChanged, notifyBrandingChanged, saveBrandingFile } from '../lib/branding'

const navItems = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
  { to: '/properties', label: 'العقارات', icon: Building2 },
  { to: '/clients', label: 'العملاء', icon: Users },
  { to: '/matches', label: 'المطابقات', icon: Link2 },
  { to: '/calc', label: 'أدوات العميل', icon: Calculator },
  { to: '/materials', label: 'مواد البناء', icon: Hammer },
  { to: '/commissions', label: 'العمولات', icon: Coins },
  { to: '/demand', label: 'طلب العملاء', icon: ChartColumn },
  { to: '/map', label: 'الخريطة', icon: MapIcon },
  { to: '/zagazig', label: 'خريطة الزقازيق', icon: MapPinned },
  { to: '/market', label: 'سوق الزقازيق', icon: LineChart },
  { to: '/settings', label: 'الإعدادات', icon: SettingsIcon }
]

export default function Layout() {
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
    <div className="flex h-screen">
      <aside className="w-60 shrink-0 bg-navy-950 text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
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
              <h1 className="font-bold text-lg leading-tight">{officeName}</h1>
              <p className="text-[11px] text-gold-400 tracking-wide">Real Estate Office</p>
            </div>
          </div>
          <div className="gold-divider mt-4" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors border-r-2 ${
                  isActive
                    ? 'bg-navy-800 text-white border-gold-500'
                    : 'text-slate-300 border-transparent hover:bg-navy-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-xs text-slate-500 border-t border-white/10">الإصدار 1.0</div>
      </aside>
      <main
        className="flex-1 overflow-y-auto"
        style={
          pageBg
            ? {
                backgroundImage: `linear-gradient(rgba(248,250,252,0.88), rgba(248,250,252,0.88)), url("${pageBg}")`,
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
  )
}
