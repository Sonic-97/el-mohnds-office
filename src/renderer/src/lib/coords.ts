export function validateCoords(latitude: number, longitude: number): string | null {
  if (!isFinite(latitude) || !isFinite(longitude)) {
    return 'أدخل أرقاماً صحيحة للإحداثيات'
  }
  if (latitude < -90 || latitude > 90) {
    return 'خط العرض يجب أن يكون بين -90 و 90'
  }
  if (longitude < -180 || longitude > 180) {
    return 'خط الطول يجب أن يكون بين -180 و 180'
  }
  return null
}
