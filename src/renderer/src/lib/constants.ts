import type { PropertyStatus } from '@shared/types'

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  available: 'متاح',
  sold: 'مباع',
  reserved: 'محجوز',
  rented: 'مؤجر'
}

export const STATUS_COLORS: Record<PropertyStatus, string> = {
  available: 'badge badge-success',
  sold: 'badge badge-danger',
  reserved: 'badge badge-warning',
  rented: 'badge badge-info'
}

export const SERIOUSNESS_LABELS: Record<string, string> = {
  very_serious: 'جاد جدًا',
  serious: 'جاد',
  possible: 'محتمل',
  not_serious: 'غير جاد'
}

export const SERIOUSNESS_COLORS: Record<string, string> = {
  very_serious: 'badge badge-danger',
  serious: 'badge badge-warning',
  possible: 'badge badge-info',
  not_serious: 'badge badge-neutral'
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
  new: 'badge badge-neutral',
  contacted: 'badge badge-info',
  interested: 'badge badge-success',
  viewing: 'badge badge-warning',
  negotiating: 'badge badge-warning',
  closed: 'badge badge-neutral'
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
