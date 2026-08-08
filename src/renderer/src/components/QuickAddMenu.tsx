import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Building, ChevronDown, Castle, Home, LandPlot, Plus, Store, UserPlus } from 'lucide-react'

const propertyTypes = [
  { label: 'أرض', icon: LandPlot },
  { label: 'شقة', icon: Home },
  { label: 'محل', icon: Store },
  { label: 'فيلا', icon: Castle },
  { label: 'مكتب', icon: Briefcase }
]

export default function QuickAddMenu({ premium = false }: { premium?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={`btn ${premium ? 'btn-premium' : 'btn-operational'} btn-sm`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Plus className="w-4 h-4" strokeWidth={1.75} /> إضافة
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} aria-label="إغلاق قائمة الإضافة" />
          <div className="quick-add-menu absolute left-0 top-full z-40 mt-2 w-56 p-2" role="menu">
            <div className="type-meta px-3 py-2">إضافة عقار</div>
            {propertyTypes.map(({ label, icon: Icon }) => (
              <Link
                key={label}
                to={`/properties/new?type=${encodeURIComponent(label)}`}
                onClick={() => setOpen(false)}
                className="quick-add-item"
                role="menuitem"
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} /> {label}
              </Link>
            ))}
            <Link to="/properties/new" onClick={() => setOpen(false)} className="quick-add-item" role="menuitem">
              <Building className="w-4 h-4" strokeWidth={1.75} /> عقار آخر
            </Link>
            <div className="my-1 border-t border-line-light" />
            <Link to="/clients?new=1" onClick={() => setOpen(false)} className="quick-add-item" role="menuitem">
              <UserPlus className="w-4 h-4" strokeWidth={1.75} /> عميل جديد
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

