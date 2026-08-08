import type { PropertyStatus } from '@shared/types'

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  available: 'متاح',
  sold: 'مباع',
  reserved: 'محجوز',
  rented: 'مؤجر'
}

export const STATUS_COLORS: Record<PropertyStatus, string> = {
  available: 'bg-green-100 text-green-800',
  sold: 'bg-red-100 text-red-800',
  reserved: 'bg-amber-100 text-amber-800',
  rented: 'bg-navy-100 text-navy-800'
}

export const SERIOUSNESS_LABELS: Record<string, string> = {
  very_serious: 'جاد جدًا',
  serious: 'جاد',
  possible: 'محتمل',
  not_serious: 'غير جاد'
}

export const SERIOUSNESS_COLORS: Record<string, string> = {
  very_serious: 'bg-red-100 text-red-800',
  serious: 'bg-orange-100 text-orange-800',
  possible: 'bg-yellow-100 text-yellow-800',
  not_serious: 'bg-gray-100 text-gray-600'
}

export const ROLE_LABELS: Record<string, string> = {
  seller: 'بائع',
  buyer: 'مشتري'
}

export const FOLLOWUP_STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  interested: 'مهتم',
  viewing: 'معاينة',
  negotiating: 'تفاوض',
  closed: 'مغلق'
}

export const FOLLOWUP_STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-800',
  interested: 'bg-violet-100 text-violet-800',
  viewing: 'bg-amber-100 text-amber-800',
  negotiating: 'bg-orange-100 text-orange-800',
  closed: 'bg-gray-200 text-gray-500'
}

export const DOC_TYPES = ['عقد', 'ملكية', 'رخصة', 'مرافق', 'مستندات أخرى']

export const FACING_OPTIONS = ['شمالية', 'جنوبية', 'شرقية', 'غربية', 'شمالية شرقية', 'شمالية غربية', 'جنوبية شرقية', 'جنوبية غربية', 'بحرية', 'نيلية']

export const FILE_KINDS: Record<string, string> = {
  image: 'صورة',
  pdf: 'PDF',
  contract: 'عقد',
  drawing: 'رسم/لوحة',
  other: 'ملف'
}

export function formatPrice(value: number | null): string {
  if (value == null) return '-'
  return `${Math.round(value).toLocaleString('ar-EG')} ج.م`
}

export function formatArea(value: number | null): string {
  if (value == null) return '-'
  return `${value.toLocaleString('ar-EG')} م²`
}

export function formatDate(value: string): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString('ar-EG')
}
