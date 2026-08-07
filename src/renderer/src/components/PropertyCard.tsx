import { Link } from 'react-router-dom'
import { MapPin, Phone, Ruler, Trash2 } from 'lucide-react'
import type { Property } from '@shared/types'
import { STATUS_LABELS, STATUS_COLORS, formatPrice, formatArea } from '../lib/constants'

interface PropertyCardProps {
  property: Property
  selected?: boolean
  onToggleSelect?: (id: number) => void
  selectable?: boolean
  onDelete?: (property: Property) => void
}

export default function PropertyCard({ property, selected, onToggleSelect, selectable, onDelete }: PropertyCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(property.id)}
              className="w-4 h-4 accent-gold-500"
            />
          )}
          <span className="font-bold">{property.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{property.type}</span>
          <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[property.status]}`}>
            {STATUS_LABELS[property.status]}
          </span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400" />
          {property.zone || property.city || property.governorate || 'موقع غير محدد'}
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm">
          <span className="font-bold text-green-700">{formatPrice(property.price)}</span>
          <span className="flex items-center gap-1 text-gray-600">
            <Ruler className="w-4 h-4 text-gray-400" /> {formatArea(property.area)}
          </span>
        </div>
        {property.pricePerMeter != null && (
          <div className="text-xs text-gray-500 mt-1">
            {formatPrice(property.pricePerMeter)} / م²
          </div>
        )}
        {property.ownerName && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
            <Phone className="w-3.5 h-3.5" /> {property.ownerName} {property.ownerPhone && `- ${property.ownerPhone}`}
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <Link
            to={`/properties/${property.id}`}
            className="flex-1 bg-navy-800 text-white text-center text-sm py-2 rounded-lg hover:bg-navy-900"
          >
            التفاصيل
          </Link>
          <Link
            to={`/properties/${property.id}/edit`}
            className="flex-1 border border-gray-300 text-gray-700 text-center text-sm py-2 rounded-lg hover:bg-gray-50"
          >
            تعديل
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(property)}
              title="حذف العقار"
              className="flex items-center justify-center px-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
