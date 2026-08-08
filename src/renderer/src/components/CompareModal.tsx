import { useEffect, useMemo, useState } from 'react'
import { Building2, MapPin, Ruler, Sparkles } from 'lucide-react'
import type { Property, PropertyFile } from '@shared/types'
import Modal from './Modal'
import { useClientMode } from './ClientModeContext'
import { STATUS_LABELS, STATUS_COLORS, formatPrice, formatArea } from '../lib/constants'

interface CompareModalProps { properties: Property[]; onClose: () => void }
interface ComparisonRow { key: string; label: string; render: (property: Property) => string; private?: boolean }

const ROWS: ComparisonRow[] = [
  { key: 'type', label: 'النوع', render: (p) => p.type || '-' },
  { key: 'status', label: 'الحالة', render: (p) => STATUS_LABELS[p.status] },
  { key: 'location', label: 'الموقع', render: (p) => [p.street, p.neighborhood, p.zone, p.city].filter(Boolean).join('، ') || '-' },
  { key: 'area', label: 'المساحة', render: (p) => formatArea(p.area) },
  { key: 'price', label: 'السعر', render: (p) => formatPrice(p.price) },
  { key: 'pricePerMeter', label: 'سعر المتر', render: (p) => formatPrice(p.pricePerMeter) },
  { key: 'facadeDirection', label: 'اتجاه الواجهة', render: (p) => p.facadeDirection || '-' },
  { key: 'streetWidth', label: 'عرض الشارع', render: (p) => (p.streetWidth != null ? `${p.streetWidth} م` : '-') },
  { key: 'ownerName', label: 'المالك', render: (p) => p.ownerName || '-', private: true },
  { key: 'notes', label: 'ملاحظات', render: (p) => p.notes || '-', private: true }
]

function PropertyCompareImage({ property }: { property: Property }) {
  const [image, setImage] = useState<PropertyFile | null>(null)
  useEffect(() => {
    let active = true
    window.api.files.list(property.id).then((files: PropertyFile[]) => {
      if (active) setImage(files.find((file) => file.kind === 'image') ?? null)
    })
    return () => { active = false }
  }, [property.id])
  return image ? (
    <img src={`file:///${image.path.replace(/\\/g, '/')}`} alt={property.name} className="client-compare-image" />
  ) : (
    <div className="client-compare-placeholder"><Building2 className="h-8 w-8" strokeWidth={1.4} /><span>{property.type || 'عقار'}</span></div>
  )
}

export default function CompareModal({ properties, onClose }: CompareModalProps) {
  const clientMode = useClientMode()
  const highlights = useMemo(() => {
    const numeric = (key: 'price' | 'area' | 'pricePerMeter') => properties.filter((p) => p[key] != null)
    const cheapest = numeric('price').sort((a, b) => (a.price as number) - (b.price as number))[0]?.id
    const largest = numeric('area').sort((a, b) => (b.area as number) - (a.area as number))[0]?.id
    const bestMeter = numeric('pricePerMeter').sort((a, b) => (a.pricePerMeter as number) - (b.pricePerMeter as number))[0]?.id
    return { cheapest, largest, bestMeter }
  }, [properties])
  const rows = ROWS.filter((row) => !clientMode.active || !row.private).filter((row) => properties.some((p) => row.render(p) !== '-'))

  return (
    <Modal title={`مقارنة العقارات (${properties.length})`} onClose={onClose} size="xl">
      {!clientMode.active && <div className="mb-4 flex justify-end"><button className="btn btn-premium btn-sm" onClick={clientMode.enter}>عرض للعميل</button></div>}
      <div className={clientMode.active ? 'client-compare-table-wrap' : 'overflow-x-auto'}>
        <table className={`w-full text-sm ${clientMode.active ? 'client-compare-table' : ''}`}>
          <thead><tr>
            <th className="text-right text-gray-500 font-medium py-2 pr-2 w-40">المقارنة</th>
            {properties.map((p) => <th key={p.id} className="text-right py-2 px-3 bg-gray-50 border-b align-top">
              {clientMode.active && <PropertyCompareImage property={p} />}
              <div className={clientMode.active ? 'mt-3' : ''}>{p.name}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                {clientMode.active && highlights.cheapest === p.id && <span className="client-compare-highlight"><Sparkles />الأقل سعراً</span>}
                {clientMode.active && highlights.largest === p.id && <span className="client-compare-highlight"><Ruler />الأكبر مساحة</span>}
                {clientMode.active && highlights.bestMeter === p.id && <span className="client-compare-highlight"><MapPin />أفضل سعر متر</span>}
              </div>
            </th>)}
          </tr></thead>
          <tbody>{rows.map((row) => <tr key={row.key} className="border-b border-gray-100">
            <td className="py-2.5 pr-2 text-gray-600">{row.label}</td>
            {properties.map((p) => <td key={p.id} className="py-2.5 px-3">{row.render(p)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </Modal>
  )
}
