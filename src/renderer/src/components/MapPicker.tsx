import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import { createPinIcon } from './mapIcons'

interface MapPickerProps {
  latitude: number | null
  longitude: number | null
  onChange: (latitude: number, longitude: number) => void
  draggable?: boolean
  height?: string
}

const EGYPT_CENTER: LatLngExpression = [30.0444, 31.2357]

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.6 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])
  return null
}

export default function MapPicker({
  latitude,
  longitude,
  onChange,
  draggable = true,
  height = '300px'
}: MapPickerProps) {
  const hasLocation = latitude != null && longitude != null
  const center: LatLngExpression = hasLocation ? [latitude, longitude] : EGYPT_CENTER
  const zoom = hasLocation ? 12 : 6
  const pin = createPinIcon()

  return (
    <div style={{ height }} className="relative rounded-xl overflow-hidden border-2 border-navy-100">
      <MapContainer center={center} zoom={zoom} className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler onPick={onChange} />
        <Recenter lat={latitude} lng={longitude} />
        {hasLocation && (
          <Marker
            position={[latitude, longitude]}
            icon={pin}
            draggable={draggable}
            eventHandlers={{
              dragend: (e) => {
                const ll = e.target.getLatLng()
                onChange(ll.lat, ll.lng)
              }
            }}
          />
        )}
      </MapContainer>
      <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
        <span className="bg-navy-950/80 text-white text-[11px] px-3 py-1 rounded-lg shadow">
          اضغط على الخريطة أو اسحب المؤشر لتحديد الموقع
        </span>
      </div>
    </div>
  )
}
