import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, Tooltip, useMapEvents, useMap } from 'react-leaflet'
import { Flame, MapPin, Plus, X, Crosshair, Pencil, ExternalLink } from 'lucide-react'
import type { MapPoint, PropertyType, MarketArea } from '@shared/types'
import { STATUS_LABELS, STATUS_COLORS, formatPrice, formatArea } from '../lib/constants'
import { fmtM2 } from '../lib/market'
import { createPinIcon } from '../components/mapIcons'
import AddLocationPanel from '../components/AddLocationPanel'
import { validateCoords } from '../lib/coords'

const EGYPT_CENTER: [number, number] = [30.0444, 31.2357]
const HEAT_TILE = 0.03
const pin = createPinIcon()
const tempPin = createPinIcon({ fill: '#d4af37', ring: '#162841' })

interface Cluster {
  key: string
  lat: number
  lng: number
  count: number
  points: MapPoint[]
}

function buildClusters(points: MapPoint[]): Cluster[] {
  const map = new Map<string, Cluster>()
  for (const p of points) {
    const lat = Math.round(p.latitude / HEAT_TILE) * HEAT_TILE
    const lng = Math.round(p.longitude / HEAT_TILE) * HEAT_TILE
    const key = `${lat},${lng}`
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      existing.points.push(p)
    } else {
      map.set(key, { key, lat, lng, count: 1, points: [p] })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

function heatColor(count: number): string {
  if (count >= 5) return '#dc2626'
  if (count >= 3) return '#f97316'
  if (count >= 2) return '#f59e0b'
  return '#10b981'
}

function propertyLocation(p: MapPoint): string {
  return [p.zone, p.city, p.governorate].filter(Boolean).join(' - ') || 'موقع غير محدد'
}

function MapClick({ enabled, onPick }: { enabled: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) onPick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

function Flyer({ fly }: { fly: { lat: number; lng: number; token: number } }) {
  const map = useMap()
  useEffect(() => {
    if (fly.token > 0) {
      map.flyTo([fly.lat, fly.lng], Math.max(map.getZoom(), 16), { duration: 0.7 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fly])
  return null
}

export default function MapPage() {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [types, setTypes] = useState<PropertyType[]>([])
  const [marketAreas, setMarketAreas] = useState<MarketArea[]>([])
  const [heatMode, setHeatMode] = useState(false)
  const [addMode, setAddMode] = useState(false)
  const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [latText, setLatText] = useState('')
  const [lngText, setLngText] = useState('')
  const [coordsError, setCoordsError] = useState('')
  const [fly, setFly] = useState({ lat: 0, lng: 0, token: 0 })

  function refresh() {
    window.api.properties.mapPoints().then(setPoints)
  }

  useEffect(() => {
    refresh()
    window.api.types.list().then(setTypes)
    window.api.market.listAreas().then(setMarketAreas)
  }, [])

  const marketLookup = useMemo(() => {
    const m = new Map<string, MarketArea>()
    for (const a of marketAreas) m.set(a.area, a)
    return m
  }, [marketAreas])

  function zoneMarket(zone: string): MarketArea | undefined {
    if (!zone) return undefined
    const direct = marketLookup.get(zone)
    if (direct) return direct
    return marketAreas.find((a) => a.area === zone || zone.includes(a.area) || a.area.includes(zone))
  }

  const clusters = useMemo(() => buildClusters(points), [points])

  function pickLocation(lat: number, lng: number) {
    setTempCoords({ lat, lng })
    setLatText(String(lat))
    setLngText(String(lng))
    setCoordsError('')
    setFly({ lat, lng, token: Date.now() })
  }

  function handleMapClick(lat: number, lng: number) {
    if (!addMode) return
    pickLocation(lat, lng)
    setShowPanel(true)
  }

  function handleInputChange(field: 'lat' | 'lng', value: string) {
    if (field === 'lat') setLatText(value)
    else setLngText(value)
    if (value.trim() === '') return
    const lat = Number(field === 'lat' ? value : latText)
    const lng = Number(field === 'lng' ? value : lngText)
    if (isFinite(lat) && isFinite(lng) && validateCoords(lat, lng) === null) {
      setTempCoords({ lat, lng })
      setCoordsError('')
    }
  }

  function handleTempDrag(lat: number, lng: number) {
    setTempCoords({ lat, lng })
    setLatText(String(lat))
    setLngText(String(lng))
    setCoordsError('')
  }

  function handleShowLocation() {
    const lat = Number(latText)
    const lng = Number(lngText)
    const err = validateCoords(lat, lng)
    if (err) {
      setCoordsError(err)
      return
    }
    pickLocation(lat, lng)
  }

  function cancelAdd() {
    setShowPanel(false)
    setTempCoords(null)
    setAddMode(false)
    setLatText('')
    setLngText('')
    setCoordsError('')
  }

  function onSaved() {
    cancelAdd()
    refresh()
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">الخريطة</h1>
          <p className="text-sm text-gray-500 mt-1">{points.length} عقار بموقع محدد</p>
        </div>
        <div className="flex items-center gap-2">
          {points.length > 0 && (
            <button
              onClick={() => setHeatMode((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                heatMode ? 'bg-gold-100 text-gold-700' : 'bg-navy-800 text-white hover:bg-navy-900'
              }`}
            >
              <Flame className="w-4 h-4" /> {heatMode ? 'إيقاف الخريطة الحرارية' : 'الخريطة الحرارية'}
            </button>
          )}
          <button
            onClick={() => setAddMode((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
              addMode ? 'bg-gold-500 text-navy-950 font-semibold' : 'bg-navy-800 text-white hover:bg-navy-900'
            }`}
          >
            <Plus className="w-4 h-4" /> {addMode ? 'إلغاء الإضافة من الخريطة' : '+ إضافة عقار من الخريطة'}
          </button>
          <Link
            to="/properties/new"
            className="flex items-center gap-2 border-2 border-gold-500 text-navy-900 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gold-100"
          >
            <Pencil className="w-4 h-4" /> نموذج كامل
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Crosshair className="w-4 h-4 text-gold-600" />
          <span className="text-sm font-bold text-gray-700">إضافة موقع بالإحداثيات</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">خط العرض (Latitude)</label>
            <input
              dir="ltr"
              value={latText}
              onChange={(e) => handleInputChange('lat', e.target.value)}
              placeholder="30.5877"
              className="w-44 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">خط الطول (Longitude)</label>
            <input
              dir="ltr"
              value={lngText}
              onChange={(e) => handleInputChange('lng', e.target.value)}
              placeholder="31.5020"
              className="w-44 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <button
            onClick={handleShowLocation}
            className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
          >
            عرض الموقع
          </button>
          {tempCoords && !coordsError && (
            <button
              onClick={() => setShowPanel(true)}
              className="flex items-center gap-1.5 bg-gold-500 text-navy-950 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gold-400"
            >
              <MapPin className="w-4 h-4" /> إضافة عقار في هذا الموقع
            </button>
          )}
          {coordsError && <span className="text-xs text-red-600">{coordsError}</span>}
        </div>
      </div>

      <div className="flex-1 min-h-[420px] bg-white rounded-xl shadow-sm overflow-hidden relative">
        {addMode && !showPanel && (
          <div className="absolute top-3 inset-x-0 z-[500] flex justify-center pointer-events-none">
            <div className="bg-navy-950/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
              <span className="text-sm">اضغط على موقع العقار على الخريطة</span>
              <button onClick={() => setAddMode(false)} className="pointer-events-auto text-gold-400 hover:text-gold-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {points.length === 0 && !addMode && !tempCoords && (
          <div className="absolute top-3 inset-x-0 z-[500] flex justify-center pointer-events-none">
            <span className="bg-navy-950/85 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
              لا توجد عقارات محددة على الخريطة بعد
            </span>
          </div>
        )}
        <MapContainer center={EGYPT_CENTER} zoom={6} className="h-full w-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapClick enabled={addMode && !showPanel} onPick={handleMapClick} />
          <Flyer fly={fly} />
          {heatMode
            ? clusters.map((c) => (
                <CircleMarker
                  key={c.key}
                  center={[c.lat, c.lng]}
                  radius={Math.max(10, 8 + c.count * 5)}
                  pathOptions={{ color: heatColor(c.count), fillColor: heatColor(c.count), fillOpacity: 0.55 }}
                >
                  <Tooltip direction="top" opacity={1}>
                    <div className="text-sm font-bold">{c.count} عقار</div>
                  </Tooltip>
                  <Popup>
                    <div className="space-y-1">
                      <div className="font-bold">{c.count} عقارات في هذه المنطقة</div>
                      {c.points.slice(0, 4).map((p) => (
                        <Link key={p.id} to={`/properties/${p.id}`} className="block text-navy-700 text-sm">
                          {p.name}
                        </Link>
                      ))}
                    </div>
                  </Popup>
                </CircleMarker>
              ))
            : points.map((p) => (
                <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pin}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold">{p.name}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{p.type}</div>
                      <div className="text-sm mt-1.5">
                        {formatArea(p.area)} · <span className="font-bold text-green-700">{formatPrice(p.price)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {propertyLocation(p)}
                      </div>
                      {zoneMarket(p.zone) && (zoneMarket(p.zone)!.aptAvg != null || zoneMarket(p.zone)!.landAvg != null) && (
                        <div className="text-xs text-gold-700 font-medium mt-1">
                          متوسط سعر المتر في المنطقة: {fmtM2(zoneMarket(p.zone)!.aptAvg ?? zoneMarket(p.zone)!.landAvg)}
                        </div>
                      )}
                      <div className="flex gap-1.5 mt-2">
                        <Link
                          to={`/properties/${p.id}`}
                          className="flex-1 bg-navy-800 text-white text-center text-xs py-1.5 rounded-lg hover:bg-navy-900"
                        >
                          عرض التفاصيل
                        </Link>
                        <Link
                          to={`/properties/${p.id}/edit`}
                          className="flex-1 border border-navy-200 text-navy-800 text-center text-xs py-1.5 rounded-lg hover:bg-navy-50"
                        >
                          تعديل
                        </Link>
                        <button
                          onClick={() => setFly({ lat: p.latitude, lng: p.longitude, token: Date.now() })}
                          className="flex-1 border border-gold-300 text-gold-700 text-center text-xs py-1.5 rounded-lg hover:bg-gold-100 flex items-center justify-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> فتح الموقع
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
          {tempCoords && (
            <Marker
              position={[tempCoords.lat, tempCoords.lng]}
              icon={tempPin}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng()
                  handleTempDrag(ll.lat, ll.lng)
                }
              }}
            />
          )}
        </MapContainer>
      </div>

      {showPanel && tempCoords && (
        <AddLocationPanel
          latitude={tempCoords.lat}
          longitude={tempCoords.lng}
          types={types}
          onSaved={onSaved}
          onCancel={cancelAdd}
        />
      )}
    </div>
  )
}
