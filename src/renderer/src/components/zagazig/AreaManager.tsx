import { Plus, Pencil, Trash2, Map as MapIcon } from 'lucide-react'
import type { MapArea } from '@shared/types'
import Modal from '../Modal'
import { fmtDate } from '../../lib/geo'

interface AreaManagerProps {
  areas: MapArea[]
  onAdd: () => void
  onEdit: (a: MapArea) => void
  onDelete: (id: number) => void
  onClose: () => void
}

export default function AreaManager({ areas, onAdd, onEdit, onDelete, onClose }: AreaManagerProps) {
  return (
    <Modal title="إدارة الأحياء والمناطق" onClose={onClose} size="lg">
      <p className="text-xs text-gray-500 mb-4">
        ارسم حدود الأحياء يدوياً على الخريطة. تُخزَّن الإحداثيات في قاعدة بيانات المكتب، وتظهر كمساحات شبه شفافة مع
        بيانات السعر والإيجار عند توفرها.
      </p>
      {areas.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <MapIcon className="w-10 h-10 mx-auto mb-2" />
          <p className="text-sm">لا توجد مناطق محفوظة بعد.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {areas.map((a) => (
            <div key={a.id} className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2">
              <span className="w-4 h-4 rounded-full shrink-0 border" style={{ background: a.color, borderColor: a.color }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{a.name}</div>
                <div className="text-[11px] text-gray-400">
                  {a.points.length} نقطة · {fmtDate(a.updatedAt)}
                </div>
              </div>
              <button onClick={() => onEdit(a)} className="text-gray-500 hover:text-navy-800" title="تعديل الحدود">
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(a.id)}
                className="text-gray-400 hover:text-red-600"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-4">
        <button onClick={onAdd} className="flex items-center gap-2 bg-navy-800 text-white px-5 py-2 rounded-lg text-sm hover:bg-navy-900">
          <Plus className="w-4 h-4" /> إضافة منطقة
        </button>
      </div>
    </Modal>
  )
}
