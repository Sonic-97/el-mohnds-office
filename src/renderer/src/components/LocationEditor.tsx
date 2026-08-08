import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import MapPicker from './MapPicker'
import { validateCoords } from '../lib/coords'

interface LocationEditorProps {
  latitude: number | null
  longitude: number | null
  onChange: (latitude: number, longitude: number) => void
}

const inputCls = 'control-input'
const labelCls = 'field-label'

export default function LocationEditor({ latitude, longitude, onChange }: LocationEditorProps) {
  const [latText, setLatText] = useState(latitude != null ? String(latitude) : '')
  const [lngText, setLngText] = useState(longitude != null ? String(longitude) : '')
  const [error, setError] = useState('')

  useEffect(() => {
    setLatText(latitude != null ? String(latitude) : '')
    setLngText(longitude != null ? String(longitude) : '')
  }, [latitude, longitude])

  function commit(lat: number, lng: number) {
    const err = validateCoords(lat, lng)
    if (err) {
      setError(err)
      return
    }
    setError('')
    onChange(lat, lng)
  }

  function handleMapPick(lat: number, lng: number) {
    setLatText(String(lat))
    setLngText(String(lng))
    commit(lat, lng)
  }

  function handleInput(field: 'lat' | 'lng', value: string) {
    if (field === 'lat') setLatText(value)
    else setLngText(value)
    if (value.trim() === '') return
    if (latText.trim() === '' && field === 'lng') return
    if (lngText.trim() === '' && field === 'lat') return
    const lat = Number(field === 'lat' ? value : latText)
    const lng = Number(field === 'lng' ? value : lngText)
    if (isFinite(lat) && isFinite(lng)) commit(lat, lng)
  }

  return (
    <div>
      <MapPicker latitude={latitude} longitude={longitude} onChange={handleMapPick} draggable height="280px" />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className={labelCls}>خط العرض (Latitude)</label>
          <input
            dir="ltr"
            className={inputCls}
            value={latText}
            onChange={(e) => handleInput('lat', e.target.value)}
            placeholder="-90 إلى 90"
          />
        </div>
        <div>
          <label className={labelCls}>خط الطول (Longitude)</label>
          <input
            dir="ltr"
            className={inputCls}
            value={lngText}
            onChange={(e) => handleInput('lng', e.target.value)}
            placeholder="-180 إلى 180"
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {error}
        </p>
      )}
      <p className="text-xs text-gray-400 mt-2">
        اضغط على الخريطة، أو اسحب المؤشر، أو أدخل الإحداثيات مباشرة — كل الطرق تحدّث نفس الموقع.
      </p>
    </div>
  )
}
