import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, GitCompare, Filter, Building2 } from 'lucide-react'
import type { Property, PropertyType } from '@shared/types'
import PropertyCard from '../components/PropertyCard'
import CompareModal from '../components/CompareModal'
import { STATUS_LABELS } from '../lib/constants'

const EMPTY_FILTERS = {
  type: '',
  zone: '',
  status: '',
  maxPrice: '',
  minArea: '',
  maxArea: '',
  query: ''
}

export default function Properties() {
  const [types, setTypes] = useState<PropertyType[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [selected, setSelected] = useState<number[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Property | null>(null)

  useEffect(() => {
    window.api.types.list().then(setTypes)
    runSearch(EMPTY_FILTERS)
  }, [])

  function runSearch(f: typeof EMPTY_FILTERS) {
    window.api.properties
      .search({
        type: f.type,
        zone: f.zone,
        status: f.status,
        maxPrice: f.maxPrice ? Number(f.maxPrice) : null,
        minArea: f.minArea ? Number(f.minArea) : null,
        maxArea: f.maxArea ? Number(f.maxArea) : null,
        query: f.query
      })
      .then((res: Property[]) => {
        setProperties(res)
        setSelected((prev) => prev.filter((id) => res.some((p) => p.id === id)))
      })
  }

  function toggleSelect(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]
    )
  }

  const compareProperties = properties.filter((p) => selected.includes(p.id))
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">العقارات</h1>
          <p className="text-sm text-gray-500 mt-1">{properties.length} عقار</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length >= 2 && (
            <button
              onClick={() => setCompareOpen(true)}
              className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900"
            >
              <GitCompare className="w-4 h-4" /> مقارنة ({selected.length})
            </button>
          )}
          <Link
            to="/properties/new"
            className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
          >
            <Plus className="w-4 h-4" /> إضافة عقار
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-3">
          <Filter className="w-4 h-4" /> البحث والتصفية
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <input
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="اسم العقار، المالك، الهاتف..."
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل الأنواع</option>
            {types.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            value={filters.zone}
            onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
            placeholder="المنطقة / المدينة"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            placeholder="الحد الأقصى للسعر"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={filters.minArea}
            onChange={(e) => setFilters({ ...filters, minArea: e.target.value })}
            placeholder="مساحة من"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={filters.maxArea}
            onChange={(e) => setFilters({ ...filters, maxArea: e.target.value })}
            placeholder="مساحة إلى"
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => runSearch(filters)}
            className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
          >
            <Search className="w-4 h-4" /> بحث
          </button>
          <button
            onClick={() => {
              setFilters(EMPTY_FILTERS)
              runSearch(EMPTY_FILTERS)
            }}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            مسح
          </button>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <Building2 className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {filtersActive ? 'لا توجد عقارات مطابقة للبحث.' : 'لا توجد عقارات مضافة بعد.'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {filtersActive
              ? 'جرّب تعديل معايير البحث أو مسحها.'
              : 'اضغط "إضافة عقار" لإدخال أول عقار في مكتبك.'}
          </p>
          {!filtersActive && (
            <Link
              to="/properties/new"
              className="inline-flex items-center gap-2 bg-navy-800 text-white px-5 py-2.5 rounded-lg text-sm mt-5 hover:bg-navy-900"
            >
              <Plus className="w-4 h-4" /> إضافة عقار
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              selectable
              selected={selected.includes(p.id)}
              onToggleSelect={toggleSelect}
              onDelete={(prop) => setToDelete(prop)}
            />
          ))}
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-bold text-lg mb-2">حذف العقار</h3>
            <p className="text-sm text-gray-600 mb-6">
              هل أنت متأكد من حذف "{toDelete.name}"؟ سيتم حذف العقار وملفاته والصور والمستندات نهائياً. لا يمكن التراجع.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setToDelete(null)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  await window.api.properties.delete(toDelete.id)
                  setToDelete(null)
                  runSearch(filters)
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {compareOpen && compareProperties.length >= 2 && (
        <CompareModal properties={compareProperties} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  )
}
