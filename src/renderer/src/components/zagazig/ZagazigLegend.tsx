import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { MapArea } from '@shared/types'
import { POI_EMOJI, POI_LABELS, POI_COLORS } from '../../lib/poi'
import type { ZagazigPoiCategory } from '@shared/types'

const LEGEND_POIS: ZagazigPoiCategory[] = ['hospital', 'university', 'transport', 'park', 'bank']

export default function ZagazigLegend({ areas }: { areas: MapArea[] }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="absolute bottom-6 start-3 z-[500] w-52">
      <div className="bg-white/95 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-navy-900"
        >
          <span>مفتاح الخريطة</span>
          {open ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
        </button>
        {open && (
          <div className="px-3 pb-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-navy-800" />
              <span>عقار المكتب</span>
            </div>
            {LEGEND_POIS.map((c) => (
              <div key={c} className="flex items-center gap-2">
                <span className="text-base leading-none">{POI_EMOJI[c]}</span>
                <span>{POI_LABELS[c]}</span>
              </div>
            ))}
            {areas.length > 0 && (
              <>
                <div className="pt-1.5 mt-1 border-t border-gray-100 font-bold text-navy-800">الأحياء والمناطق</div>
                {areas.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm border" style={{ background: a.color, borderColor: a.color }} />
                    <span>{a.name}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
