import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, MapPin, Ruler, Trash2 } from 'lucide-react'
import type { Property, PropertyFile } from '@shared/types'
import { STATUS_LABELS, STATUS_COLORS, formatPrice, formatArea } from '../lib/constants'

interface PropertyCardProps {
  property: Property
  selected?: boolean
  onToggleSelect?: (id: number) => void
  selectable?: boolean
  onDelete?: (property: Property) => void
  compact?: boolean
}

export default function PropertyCard({ property, selected, onToggleSelect, selectable, onDelete, compact = false }: PropertyCardProps) {
  const [image, setImage] = useState<PropertyFile | null>(null)

  useEffect(() => {
    let active = true
    window.api.files.list(property.id).then((files: PropertyFile[]) => {
      if (active) setImage(files.find((file) => file.kind === 'image') ?? null)
    })
    return () => { active = false }
  }, [property.id])

  return (
    <article className={`property-listing-card group ${selected ? 'property-listing-selected' : ''}`}>
      <Link to={`/properties/${property.id}`} className="property-card-media" tabIndex={-1} aria-hidden="true">
        {image ? (
          <img src={`file:///${image.path.replace(/\\/g, '/')}`} alt="" className="property-card-image" />
        ) : (
          <div className="property-card-placeholder">
            <Building2 className="h-9 w-9" strokeWidth={1.35} />
            <span>{property.type || 'عقار'}</span>
            <small>المهندس للتطوير العقاري</small>
          </div>
        )}
        <div className="property-card-badges">
          <span className="badge badge-neutral">{property.type || 'عقار'}</span>
          <span className={STATUS_COLORS[property.status]}>{STATUS_LABELS[property.status]}</span>
        </div>
      </Link>
      <div className={compact ? 'p-4' : 'p-4 pb-3'}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/properties/${property.id}`} className="type-card-title block truncate hover:text-navy-700">{property.name}</Link>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{property.zone || property.city || property.governorate || 'موقع غير محدد'}</span>
            </div>
          </div>
          {selectable && (
            <label className="property-select-control" title="اختيار للمقارنة">
              <input type="checkbox" checked={selected} onChange={() => onToggleSelect?.(property.id)} className="h-4 w-4 accent-gold-500" />
            </label>
          )}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="property-card-price">{formatPrice(property.price)}</div>
          <div className="flex items-center gap-1 text-xs text-muted-500"><Ruler className="h-3.5 w-3.5" strokeWidth={1.75} /> {formatArea(property.area)}</div>
        </div>
        {!compact && <div className="mt-2 flex items-center justify-between text-[11px] text-muted-500">
          <span>{property.pricePerMeter != null ? `${formatPrice(property.pricePerMeter)} / م²` : 'سعر المتر غير محدد'}</span>
          <span>{property.propertyNumber ? `كود ${property.propertyNumber}` : ''}</span>
        </div>}
        {!compact && <div className="mt-4 flex gap-2 border-t border-line-light pt-3">
          <Link
            to={`/properties/${property.id}`}
            className="btn btn-operational btn-sm flex-1"
          >
            عرض العقار
          </Link>
          <Link
            to={`/properties/${property.id}/edit`}
            className="btn btn-secondary btn-sm"
          >
            تعديل
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(property)}
              title="حذف العقار"
              className="btn btn-tertiary btn-icon text-danger hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>}
      </div>
    </article>
  )
}
