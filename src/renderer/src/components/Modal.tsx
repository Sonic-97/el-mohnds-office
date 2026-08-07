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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-6">
      <div className={`bg-white rounded-xl shadow-xl w-full ${sizes[size]} mt-8 mb-8`}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
