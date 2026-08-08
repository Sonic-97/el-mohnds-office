import { useEffect, useMemo, useState } from 'react'
import { Building2, DoorOpen, ExternalLink, MapPin, Ruler, Share2, Tag } from 'lucide-react'
import type { MarketArea, PropertyDetail, PropertyFile } from '@shared/types'
import { STATUS_COLORS, STATUS_LABELS, formatArea, formatPrice } from '../lib/constants'
import { fmtM2 } from '../lib/market'
import PropertyLocationContext from './zagazig/PropertyLocationContext'

export default function ClientPropertyPresentation({ property: p, onShare }: { property: PropertyDetail; onShare: () => void }) {
  const [marketAreas, setMarketAreas] = useState<MarketArea[]>([])
  const images = p.files.filter((file) => file.kind === 'image')
  const [activeImage, setActiveImage] = useState<PropertyFile | null>(images[0] ?? null)

  useEffect(() => { window.api.market.listAreas().then(setMarketAreas) }, [])
  useEffect(() => { setActiveImage(images[0] ?? null) }, [p.id])

  const market = useMemo(() => {
    const zone = (p.zone || p.neighborhood || p.city).trim()
    if (!zone) return null
    return marketAreas.find((area) => area.area === zone || zone.includes(area.area) || area.area.includes(zone)) ?? null
  }, [marketAreas, p.zone, p.neighborhood, p.city])

  const facts = [
    p.area != null ? { label: 'المساحة', value: formatArea(p.area), icon: Ruler } : null,
    p.type ? { label: 'نوع العقار', value: p.type, icon: Building2 } : null,
    p.pricePerMeter != null ? { label: 'سعر المتر', value: fmtM2(p.pricePerMeter), icon: Tag } : null,
    p.facadeDirection ? { label: 'اتجاه الواجهة', value: p.facadeDirection, icon: DoorOpen } : null,
    p.streetWidth != null ? { label: 'عرض الشارع', value: `${p.streetWidth.toLocaleString('ar-EG')} م`, icon: Ruler } : null
  ].filter((item): item is NonNullable<typeof item> => item != null)

  const details = [
    p.governorate ? ['المحافظة', p.governorate] : null,
    p.city ? ['المدينة', p.city] : null,
    p.center ? ['المركز', p.center] : null,
    p.neighborhood ? ['الحي', p.neighborhood] : null,
    p.zone ? ['المنطقة', p.zone] : null,
    p.street ? ['الشارع', p.street] : null
  ].filter((item): item is string[] => item != null)

  return (
    <div className="client-property-presentation page-presentation">
      <section className="client-property-hero">
        <div className="client-gallery-stage">
          {activeImage ? <img src={`file:///${activeImage.path.replace(/\\/g, '/')}`} alt={p.name} /> : <div className="client-gallery-placeholder"><Building2 className="h-16 w-16" strokeWidth={1.15} /><div className="mt-4 text-lg font-semibold">{p.type || 'عقار'}</div><div className="mt-1 text-xs text-slate-400">المهندس للتطوير العقاري</div></div>}
          {images.length > 1 && <div className="client-gallery-thumbs">{images.slice(0, 5).map((image) => <button key={image.id} onClick={() => setActiveImage(image)} className={activeImage?.id === image.id ? 'active' : ''}><img src={`file:///${image.path.replace(/\\/g, '/')}`} alt="" /></button>)}</div>}
        </div>
        <div className="client-property-identity">
          <div className="flex flex-wrap items-center gap-2">
            <span className={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</span>
            {p.type && <span className="badge badge-neutral">{p.type}</span>}
            {p.propertyNumber && <span className="type-meta">كود العقار: <b className="text-navy-700">{p.propertyNumber}</b></span>}
          </div>
          <h1>{p.name}</h1>
          <div className="client-property-location"><MapPin className="h-4 w-4" strokeWidth={1.75} /> {[p.zone, p.city, p.governorate].filter(Boolean).join(' · ') || 'الموقع غير محدد'}</div>
          <div className="client-property-price">{formatPrice(p.price)}</div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={onShare} className="btn btn-premium"><Share2 className="h-4 w-4" /> مشاركة واتساب</button>
            {p.mapsUrl && <button onClick={() => window.open(p.mapsUrl, '_blank')} className="btn btn-secondary"><ExternalLink className="h-4 w-4" /> فتح الموقع</button>}
          </div>
        </div>
      </section>

      {facts.length > 0 && <section className="client-facts-strip">{facts.map(({ label, value, icon: Icon }) => <div key={label} className="client-fact"><Icon className="h-5 w-5" strokeWidth={1.5} /><div><span>{label}</span><strong>{value}</strong></div></div>)}</section>}

      <div className="client-presentation-grid">
        {details.length > 0 && <section className="client-editorial-section"><h2>تفاصيل العقار</h2><div className="client-detail-list">{details.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>}
        <section className="client-editorial-section"><h2>سياق السوق في المنطقة</h2>{market ? <div className="client-market-context">
          {market.aptAvg != null && <div><span>متوسط متر الشقق</span><strong>{fmtM2(market.aptAvg)}</strong></div>}
          {market.landAvg != null && <div><span>متوسط متر الأراضي</span><strong>{fmtM2(market.landAvg)}</strong></div>}
          {market.rentAvg != null && <div><span>متوسط الإيجارات</span><strong>{fmtM2(market.rentAvg)}</strong></div>}
          <p>{market.sourceName || 'بيانات السوق المسجلة'}{(market.sourceDate || market.updatedAt) && ` · آخر تحديث ${(market.sourceDate || market.updatedAt).slice(0, 10)}`}</p>
        </div> : <p className="text-sm text-muted-500">لا توجد بيانات سوق محدثة لهذه المنطقة.</p>}</section>
      </div>

      {p.latitude != null && p.longitude != null && <section className="client-location-section"><PropertyLocationContext property={p} /></section>}
    </div>
  )
}

