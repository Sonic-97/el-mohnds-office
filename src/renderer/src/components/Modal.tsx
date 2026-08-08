import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg' | 'xl'
}

export default function Modal({ title, onClose, children, size = 'md' }: ModalProps) {
  const sizes = { md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-6xl' }
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6">
      <div className={`modal-surface w-full ${sizes[size]} mt-8 mb-8`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header flex items-center justify-between px-6 py-4">
          <h2 className="type-section-title">{title}</h2>
          <button onClick={onClose} className="btn btn-tertiary btn-icon" aria-label="إغلاق النافذة" title="إغلاق">
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
