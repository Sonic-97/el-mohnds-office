import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Plus, GitCompare, Filter, Building2, X } from 'lucide-react'
import type { Property, PropertyType, PropertyStatus } from '@shared/types'
import PropertyCard from '../components/PropertyCard'
import CompareModal from '../components/CompareModal'
import { EmptyState } from '../components/ui'
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

const CHIP_LABELS: Record<string, string> = {
  type: 'النوع',
  zone: 'المنطقة',
  status: 'الحالة',
  maxPrice: 'أقصى سعر',
  minArea: 'مساحة من',
  maxArea: 'مساحة إلى',
  query: 'بحث'
}

export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [types, setTypes] = useState<PropertyType[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [selected, setSelected] = useState<number[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Property | null>(null)

  useEffect(() => {
    window.api.types.list().then(setTypes)
  }, [])

  useEffect(() => {
    const initial = {
      type: searchParams.get('type') ?? '',
      zone: searchParams.get('zone') ?? '',
      status: searchParams.get('status') ?? '',
      maxPrice: searchParams.get('maxPrice') ?? '',
      minArea: searchParams.get('minArea') ?? '',
      maxArea: searchParams.get('maxArea') ?? '',
      query: searchParams.get('query') ?? ''
    }
    setFilters(initial)
    runSearch(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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
    <div className="page-wide p-6 lg:p-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="type-page-title">العقارات</h1>
          <p className="text-sm text-gray-500 mt-1">{properties.length} عقار</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length >= 2 && (
            <button
              onClick={() => setCompareOpen(true)}
              className="btn btn-operational"
            >
              <GitCompare className="w-4 h-4" /> مقارنة ({selected.length})
            </button>
          )}
          <Link
            to="/properties/new"
          className="btn btn-premium"
          >
            <Plus className="w-4 h-4" /> إضافة عقار
          </Link>
        </div>
      </div>

      <div className="property-filter-panel p-4 mb-6">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-3">
          <Filter className="w-4 h-4" /> البحث والتصفية
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <input
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="اسم العقار، المالك، الهاتف..."
            className="control-input"
          />
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="control-input"
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
            className="control-input"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="control-input"
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
            className="control-input"
          />
          <input
            type="number"
            value={filters.minArea}
            onChange={(e) => setFilters({ ...filters, minArea: e.target.value })}
            placeholder="مساحة من"
            className="control-input"
          />
          <input
            type="number"
            value={filters.maxArea}
            onChange={(e) => setFilters({ ...filters, maxArea: e.target.value })}
            placeholder="مساحة إلى"
            className="control-input"
          />
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => runSearch(filters)}
            className="btn btn-operational btn-sm"
          >
            <Search className="w-4 h-4" /> بحث
          </button>
          <button
            onClick={() => {
              setFilters(EMPTY_FILTERS)
              runSearch(EMPTY_FILTERS)
              setSearchParams({})
            }}
            className="btn btn-secondary btn-sm"
          >
            مسح
          </button>
        </div>
      </div>

      {(Object.entries(filters) as [string, string][]).some(([, v]) => v) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-gray-500">العرض المفلتر:</span>
          {(Object.entries(filters) as [string, string][])
            .filter(([, v]) => v)
            .map(([key, value]) => {
              const display = key === 'status' ? (STATUS_LABELS[value as PropertyStatus] ?? value) : value
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 bg-navy-800 text-white text-xs px-3 py-1 rounded-full"
                >
                  {CHIP_LABELS[key]}: {display}
                  <button
                    onClick={() => {
                      const next = { ...filters, [key]: '' }
                      setFilters(next)
                      runSearch(next)
                      const params = new URLSearchParams(searchParams)
                      params.delete(key)
                      setSearchParams(params)
                    }}
                    className="hover:text-gold-300"
                    title="إزالة الفلتر"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })}
          <button
            onClick={() => {
              setFilters(EMPTY_FILTERS)
              runSearch(EMPTY_FILTERS)
              setSearchParams({})
            }}
            className="text-xs text-navy-700 hover:underline"
          >
            مسح الكل
          </button>
        </div>
      )}

      {properties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6" strokeWidth={1.75} />}
          title={filtersActive ? 'لا توجد عقارات مطابقة للبحث' : 'لا توجد عقارات مضافة بعد'}
          description={filtersActive ? 'جرّب تعديل معايير البحث أو مسحها.' : 'أضف أول عقار ليظهر في المكتب والخرائط والمطابقات.'}
          primaryAction={!filtersActive ? <Link to="/properties/new" className="btn btn-premium"><Plus className="w-4 h-4" /> إضافة عقار</Link> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
