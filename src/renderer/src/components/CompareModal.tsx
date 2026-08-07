import type { Property } from '@shared/types'
import Modal from './Modal'
import { STATUS_LABELS, STATUS_COLORS, formatPrice, formatArea } from '../lib/constants'

interface CompareModalProps {
  properties: Property[]
  onClose: () => void
}

const ROWS: { key: string; label: string; render: (p: Property) => string }[] = [
  { key: 'type', label: 'النوع', render: (p) => p.type },
  { key: 'status', label: 'الحالة', render: (p) => STATUS_LABELS[p.status] },
  { key: 'governorate', label: 'المحافظة', render: (p) => p.governorate || '-' },
  { key: 'city', label: 'المدينة', render: (p) => p.city || '-' },
  { key: 'zone', label: 'المنطقة', render: (p) => p.zone || '-' },
  { key: 'neighborhood', label: 'الحي', render: (p) => p.neighborhood || '-' },
  { key: 'street', label: 'الشارع', render: (p) => p.street || '-' },
  { key: 'propertyNumber', label: 'رقم العقار', render: (p) => p.propertyNumber || '-' },
  { key: 'area', label: 'المساحة', render: (p) => formatArea(p.area) },
  { key: 'price', label: 'السعر', render: (p) => formatPrice(p.price) },
  { key: 'pricePerMeter', label: 'سعر المتر', render: (p) => formatPrice(p.pricePerMeter) },
  { key: 'facadeDirection', label: 'اتجاه الواجهة', render: (p) => p.facadeDirection || '-' },
  { key: 'streetWidth', label: 'عرض الشارع', render: (p) => (p.streetWidth != null ? `${p.streetWidth} م` : '-') },
  { key: 'ownerName', label: 'المالك', render: (p) => p.ownerName || '-' },
  { key: 'notes', label: 'ملاحظات', render: (p) => p.notes || '-' }
]

export default function CompareModal({ properties, onClose }: CompareModalProps) {
  return (
    <Modal title={`مقارنة العقارات (${properties.length})`} onClose={onClose} size="xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-right text-gray-500 font-medium py-2 pr-2 w-40">المقارنة</th>
              {properties.map((p) => (
                <th key={p.id} className="text-right py-2 px-3 bg-gray-50 border-b">
                  {p.name}
                  <div className="mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-b border-gray-100">
                <td className="py-2.5 pr-2 text-gray-600">{row.label}</td>
                {properties.map((p) => (
                  <td key={p.id} className="py-2.5 px-3">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
