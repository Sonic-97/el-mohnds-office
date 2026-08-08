import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  Circle,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents
} from 'react-leaflet'
import {
  Eye,
  RefreshCw,
  Search,
  Map as MapIcon,
  Plus,
  Undo2,
  Save,
  X,
  Crosshair,
  LocateFixed
} from 'lucide-react'
import type {
  Client,
  MapArea,
  MarketArea,
  Property,
  PropertyMatchSummary,
  ZagazigPoiData,
  ZagazigAreaProfile
} from '@shared/types'
import { STATUS_LABELS, STATUS_COLORS, formatPrice } from '../lib/constants'
import { fmtM2 } from '../lib/market'
import { POI_EMOJI, POI_LABELS, poiIcon, transportIcon, SERVICE_FILTERS, zagazigPin } from '../lib/poi'
import { haversineMeters, formatDistance, areaCentroid, areaBounds, type LatLon } from '../lib/geo'
import { buildZoneProfiles, zoneEquals } from '../lib/zagazig'
import SidePanel, { type ZagazigPanelMode } from '../components/zagazig/ZagazigSidePanel'
import ZagazigLegend from '../components/zagazig/ZagazigLegend'
import AreaManager from '../components/zagazig/AreaManager'
import CompareModal from '../components/CompareModal'
import { useClientMode } from '../components/ClientModeContext'

const ZAGAZIG_CENTER: [number, number] = [30.5877, 31.502]
const ZAGAZIG_ZOOM = 13
const AREA_PALETTE = ['#2a4872', '#a8851f', '#2f7d57', '#7c3aed', '#b45309', '#0f766e', '#be185d', '#374151', '#6d28d9', '#b91c1c']

interface FlyTarget {
  lat: number
  lng: number
  zoom: number
  token: number
}

interface SearchHit {
  kind: 'property' | 'area' | 'zone'
  id: number
  label: string
  sub: string
  lat: number | null
  lng: number | null
}

function Flyer({ fly }: { fly: FlyTarget | null }) {
  const map = useMap()
  useEffect(() => {
    if (fly) {
      map.flyTo([fly.lat, fly.lng], fly.zoom, { duration: 0.8 })
    }
  }, [fly, map])
  return null
}

function ClickCapture({ enabled, onPick }: { enabled: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) onPick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

function LayerButton({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-navy-800 text-white' : 'bg-white/80 text-gray-600 hover:bg-white'
      }`}
    >
      {children}
    </button>
  )
}

export default function ZagazigMap() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const presentationMode = useClientMode()

  const [poiData, setPoiData] = useState<ZagazigPoiData | null>(null)
  const [poiLoading, setPoiLoading] = useState(true)
  const [poiError, setPoiError] = useState('')
  const [properties, setProperties] = useState<Property[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [marketAreas, setMarketAreas] = useState<MarketArea[]>([])
  const [areas, setAreas] = useState<MapArea[]>([])
  const [propMatchSummaries, setPropMatchSummaries] = useState<PropertyMatchSummary[]>([])

  const [layers, setLayers] = useState({
    properties: true,
    areas: true,
    services: true,
    transport: true,
    prices: false,
    around: false
  })
  const [serviceFilter, setServiceFilter] = useState('all')
  const clientMode = presentationMode.active
  const [matchClient, setMatchClient] = useState<Client | null>(null)
  const [matchScores, setMatchScores] = useState<Record<number, number>>({})

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [radius, setRadius] = useState(1000)
  const [compare, setCompare] = useState<Property[]>([])
  const [panel, setPanel] = useState<ZagazigPanelMode>('none')
  const [panelArea, setPanelArea] = useState<{ area: MapArea; profile: ZagazigAreaProfile | null } | null>(null)
  const [hoverArea, setHoverArea] = useState<MapArea | null>(null)
  const [fly, setFly] = useState<FlyTarget | null>(null)
  const [showAreaManager, setShowAreaManager] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [drawing, setDrawing] = useState<{
    id: number | null
    name: string
    color: string
    notes: string
    points: LatLon[]
  } | null>(null)
  const [drawError, setDrawError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const flyOnce = useRef(false)

  useEffect(() => {
    if (!clientMode) return
    setShowAreaManager(false)
    setDrawing(null)
    setMatchClient(null)
  }, [clientMode])

  const load = useCallback(() => {
    window.api.zmap.getPoiData().then(setPoiData).catch(() => setPoiError('تعذر تحميل بيانات الخدمات')).finally(() => setPoiLoading(false))
    window.api.properties.list().then(setProperties)
    window.api.clients.list().then(setClients)
    window.api.market.listAreas().then(setMarketAreas)
    window.api.zmap.listAreas().then(setAreas)
    window.api.matching.opportunities().then((o) => setPropMatchSummaries(o.propertySummaries))
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusedClientId = searchParams.get('client')

  useEffect(() => {
    if (!focusedClientId || clients.length === 0) return
    const c = clients.find((x) => x.id === Number(focusedClientId))
    if (c) setMatchClient(c)
  }, [focusedClientId, clients])

  useEffect(() => {
    if (matchClient) {
      window.api.matching.clientMatches(matchClient.id).then((m) => {
        const scores: Record<number, number> = {}
        for (const x of m) scores[x.property.id] = x.score
        setMatchScores(scores)
      })
    } else {
      setMatchScores({})
    }
  }, [matchClient])

  const profiles = useMemo(
    () => buildZoneProfiles(properties, clients, marketAreas, propMatchSummaries),
    [properties, clients, marketAreas, propMatchSummaries]
  )

  function profileFor(areaName: string): ZagazigAreaProfile | null {
    return Object.values(profiles).find((p) => zoneEquals(areaName, p.name)) ?? null
  }

  const focusedId = searchParams.get('focus') || (location.state as { focusProperty?: number } | null)?.focusProperty

  useEffect(() => {
    if (flyOnce.current || !focusedId || properties.length === 0) return
    const p = properties.find((x) => x.id === Number(focusedId))
    if (!p || p.latitude == null || p.longitude == null) return
    flyOnce.current = true
    setSelectedProperty(p)
    setLayers((prev) => ({ ...prev, around: true }))
    setPanel('nearby')
    setFly({ lat: p.latitude, lng: p.longitude, zoom: 15, token: Date.now() })
  }, [focusedId, properties])

  const nearProperties = useMemo(() => {
    if (!selectedProperty) return []
    const { latitude, longitude } = selectedProperty
    if (latitude == null || longitude == null) return []
    return poiData?.pois
      .map((poi) => ({ poi, distance: haversineMeters({ lat: latitude, lon: longitude }, { lat: poi.lat, lon: poi.lon }) }))
      .filter((n) => n.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 15) ?? []
  }, [selectedProperty, radius, poiData])

  const visiblePois = useMemo(() => {
    if (!poiData) return []
    const f = SERVICE_FILTERS.find((x) => x.key === serviceFilter)
    let list = poiData.pois
    if (f && f.key !== 'all') list = list.filter((p) => f.cats.includes(p.category))
    return list.filter((p) => p.category !== 'transport')
  }, [poiData, serviceFilter])

  const transportPois = useMemo(() => (poiData ? poiData.pois.filter((p) => p.category === 'transport') : []), [poiData])

  const mappedProperties = useMemo(() => {
    let list = properties.filter((p) => p.latitude != null && p.longitude != null)
    if (matchClient) {
      list = list.filter((p) => matchScores[p.id] != null)
    }
    return list
  }, [properties, matchClient, matchScores])

  const compareSet = useMemo(() => new Set(compare.map((c) => c.id)), [compare])

  const compareContext = useMemo(() => {
    const out: Record<number, { name: string; category: string; distance: number }> = {}
    if (!poiData) return out
    for (const p of compare) {
      if (p.latitude == null || p.longitude == null) continue
      let best: { name: string; category: string; distance: number } | null = null
      for (const poi of poiData.pois) {
        const d = haversineMeters({ lat: p.latitude, lon: p.longitude }, { lat: poi.lat, lon: poi.lon })
        if (!best || d < best.distance) best = { name: poi.name, category: poi.category, distance: d }
      }
      if (best) out[p.id] = best
    }
    return out
  }, [compare, poiData])

  function toggleCompare(p: Property) {
    setCompare((prev) => {
      if (prev.find((c) => c.id === p.id)) return prev.filter((c) => c.id !== p.id)
      if (prev.length >= 3) return prev
      return [...prev, p]
    })
  }

  function focusAround(p: Property) {
    setSelectedProperty(p)
    setLayers((prev) => ({ ...prev, around: true }))
    setPanel('nearby')
    setFly({ lat: p.latitude as number, lng: p.longitude as number, zoom: 14, token: Date.now() })
  }

  function openAreaProfile(a: MapArea) {
    setPanelArea({ area: a, profile: profileFor(a.name) })
    setPanel('area')
    const c = areaCentroid(a.points)
    if (c) setFly({ lat: c.lat, lng: c.lon, zoom: 14, token: Date.now() })
  }

  function startDrawing(a: MapArea | null) {
    setShowAreaManager(false)
    setDrawError('')
    setDrawing(
      a
        ? { id: a.id, name: a.name, color: a.color, notes: a.notes, points: [...a.points] }
        : { id: null, name: '', color: AREA_PALETTE[areas.length % AREA_PALETTE.length], notes: '', points: [] }
    )
  }

  function addDrawPoint(lat: number, lng: number) {
    setDrawing((prev) => (prev ? { ...prev, points: [...prev.points, { lat, lon: lng }] } : prev))
  }

  async function saveDrawing() {
    if (!drawing) return
    if (!drawing.name.trim()) {
      setDrawError('أدخل اسم المنطقة')
      return
    }
    if (drawing.points.length < 3) {
      setDrawError('اضغط على الخريطة لإضافة 3 نقاط على الأقل')
      return
    }
    try {
      await window.api.zmap.saveArea({
        id: drawing.id ?? undefined,
        name: drawing.name.trim(),
        color: drawing.color,
        points: drawing.points,
        notes: drawing.notes
      })
      setDrawing(null)
      window.api.zmap.listAreas().then(setAreas)
    } catch (e) {
      setDrawError(String(e))
    }
  }

  const searchResults = useMemo<SearchHit[]>(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return []
    const hits: SearchHit[] = []
    for (const p of properties) {
      const hay = `${p.name} ${p.propertyNumber} ${p.street} ${p.zone} ${p.city}`.toLowerCase()
      if (hay.includes(q)) {
        hits.push({
          kind: 'property',
          id: p.id,
          label: p.name,
          sub: [p.zone, p.city].filter(Boolean).join(' - ') || p.type,
          lat: p.latitude,
          lng: p.longitude
        })
      }
    }
    for (const a of areas) {
      if (a.name.toLowerCase().includes(q)) {
        const c = areaCentroid(a.points)
        hits.push({ kind: 'area', id: a.id, label: a.name, sub: `${a.points.length} نقطة`, lat: c?.lat ?? null, lng: c?.lon ?? null })
      }
    }
    for (const name of Object.keys(profiles)) {
      if (name.toLowerCase().includes(q) && !areas.some((a) => zoneEquals(a.name, name))) {
        hits.push({ kind: 'zone', id: 0, label: name, sub: 'منطقة بيانات السوق', lat: null, lng: null })
      }
    }
    return hits.slice(0, 8)
  }, [searchQuery, properties, areas, profiles])

  function pickSearch(hit: SearchHit) {
    setSearchQuery('')
    if (hit.lat != null && hit.lng != null) {
      setFly({ lat: hit.lat, lng: hit.lng, zoom: 15, token: Date.now() })
    }
    if (hit.kind === 'property') {
      const p = properties.find((x) => x.id === hit.id)
      if (p) setSelectedProperty(p)
    }
    if (hit.kind === 'area') {
      const a = areas.find((x) => x.id === hit.id)
      if (a) openAreaProfile(a)
    }
  }

  async function refreshPoi() {
    setPoiLoading(true)
    setPoiError('')
    try {
      const data = await window.api.zmap.getPoiData(true)
      setPoiData(data)
      if (data.error) setPoiError('تعذر التحديث — يتم عرض آخر بيانات متاحة')
    } catch {
      setPoiError('تعذر تحميل بيانات الخدمات')
    } finally {
      setPoiLoading(false)
    }
  }

  const pIcon = (p: Property) => {
    const letterIdx = compare.findIndex((c) => c.id === p.id)
    const score = matchClient ? matchScores[p.id] : null
    return zagazigPin({
      selected: selectedProperty?.id === p.id,
      letter: letterIdx >= 0 ? String.fromCharCode(65 + letterIdx) : undefined,
      score: score != null && !clientMode ? score : undefined,
      priceLabel: layers.prices ? fmtM2(p.pricePerMeter) : undefined
    })
  }

  const layerToggle = (key: keyof typeof layers) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="type-page-title">خريطة الزقازيق العقارية</h1>
          <p className="text-sm text-gray-500 mt-1">
            خريطة عرض للعميل — الخدمات والمواصلات والطرق والمناطق والأسعار من بيانات حقيقية فقط.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!clientMode && (
            <button onClick={presentationMode.enter} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-slate-800 text-white hover:bg-slate-900" title="إخفاء بيانات المكتب الداخلية عند العرض للعميل">
              <Eye className="w-4 h-4" /> عرض للعميل
            </button>
          )}
          {!clientMode && (
            <>
              <button
                onClick={() => setShowAreaManager(true)}
                className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-navy-900"
              >
                <MapIcon className="w-4 h-4" /> إدارة المناطق
              </button>
              <button
                onClick={refreshPoi}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 ${poiLoading ? 'animate-spin' : ''}`} /> تحديث الخدمات
              </button>
            </>
          )}
          <button
            onClick={() => setFly({ lat: ZAGAZIG_CENTER[0], lng: ZAGAZIG_CENTER[1], zoom: ZAGAZIG_ZOOM, token: Date.now() })}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <LocateFixed className="w-4 h-4" /> الزقازيق
          </button>
        </div>
      </div>

      {clientMode && (
        <div className="bg-violet-50 border border-violet-200 text-violet-700 text-sm rounded-lg px-4 py-2 mb-3">
          وضع العرض للعميل — إخفاء درجات المطابقة وأي بيانات مكتب داخلية. تُعرض فقط بيانات العقار والسوق العامة.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <LayerButton active={layers.properties} onClick={() => layerToggle('properties')}>
          🏠 العقارات
        </LayerButton>
        <LayerButton active={layers.areas} onClick={() => layerToggle('areas')}>
          🗺️ الأحياء
        </LayerButton>
        <LayerButton active={layers.services} onClick={() => layerToggle('services')}>
          🏥 الخدمات
        </LayerButton>
        <LayerButton active={layers.transport} onClick={() => layerToggle('transport')}>
          🚌 المواصلات
        </LayerButton>
        <LayerButton active={layers.prices} onClick={() => layerToggle('prices')}>
          💰 الأسعار
        </LayerButton>
        <LayerButton active={layers.around} onClick={() => layerToggle('around')}>
          ⭕ حول العقار
        </LayerButton>

        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-2.5 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث: منطقة، شارع، كود عقار، اسم..."
            className="ps-9 pe-3 py-2 rounded-lg text-sm bg-white/80 border border-transparent focus:outline-none focus:ring-2 focus:ring-gold-500 w-64"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-1 start-0 w-80 bg-white rounded-xl shadow-xl z-[900] p-2 max-h-80 overflow-y-auto">
              {searchResults.map((h, i) => (
                <button
                  key={i}
                  onClick={() => pickSearch(h)}
                  className="w-full text-start px-3 py-2 rounded-lg hover:bg-navy-50 flex items-center gap-3"
                >
                  <span className="text-base">{h.kind === 'property' ? '🏠' : h.kind === 'area' ? '🗺️' : '📍'}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{h.label}</span>
                    <span className="block text-[11px] text-gray-400 truncate">{h.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!clientMode && <select
          value={matchClient?.id ?? ''}
          onChange={(e) => {
            const id = Number(e.target.value)
            setMatchClient(clients.find((c) => c.id === id) ?? null)
          }}
          className="px-3 py-2 rounded-lg text-sm bg-white/80 border border-transparent focus:outline-none focus:ring-2 focus:ring-gold-500 max-w-52"
        >
          <option value="">عرض عقارات عميل على الخريطة...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.area ? `- ${c.area}` : ''}
            </option>
          ))}
        </select>}

        {layers.services && (
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm bg-white/80 border border-transparent focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            {SERVICE_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="surface-card flex-1 min-h-[420px] overflow-hidden relative">
        {poiLoading && (
          <div className="absolute top-3 inset-x-0 z-[500] flex justify-center pointer-events-none">
            <span className="bg-navy-950/85 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> جارٍ تحميل بيانات الخدمات من OpenStreetMap...
            </span>
          </div>
        )}
        {poiError && !poiLoading && (
          <div className="absolute top-3 inset-x-0 z-[500] flex justify-center pointer-events-none">
            <span className="bg-amber-100 text-amber-800 text-sm px-4 py-2 rounded-lg shadow-lg">{poiError}</span>
          </div>
        )}

        <MapContainer center={ZAGAZIG_CENTER} zoom={ZAGAZIG_ZOOM} className="h-full w-full" zoomControl={true}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ClickCapture enabled={drawing != null} onPick={addDrawPoint} />
          <Flyer fly={fly} />

          {layers.areas &&
            areas.map((a) => (
              <Polygon
                key={a.id}
                positions={a.points.map((p) => [p.lat, p.lon])}
                pathOptions={{ color: a.color, fillColor: a.color, fillOpacity: 0.16, weight: 2 }}
                eventHandlers={{
                  mouseover: () => setHoverArea(a),
                  mouseout: () => setHoverArea(null),
                  click: () => openAreaProfile(a)
                }}
              >
                <Tooltip sticky opacity={1} direction="top">
                  <AreaHoverTip name={a.name} profile={profileFor(a.name)} />
                </Tooltip>
              </Polygon>
            ))}

          {layers.transport &&
            poiData?.roads.map((r) => (
              <Polyline
                key={r.id}
                positions={r.points.map((p) => [p.lat, p.lon])}
                pathOptions={{
                  color: r.kind === 'main' ? '#d4af37' : '#94a3b8',
                  weight: r.kind === 'main' ? 4 : 2.5,
                  opacity: r.kind === 'main' ? 0.85 : 0.6
                }}
              />
            ))}

          {layers.services && visiblePois.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lon]} icon={poiIcon(p.category)}>
              <Popup>
                <div className="min-w-[180px]">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span className="text-lg">{POI_EMOJI[p.category]}</span> {p.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{POI_LABELS[p.category]}</div>
                  {selectedProperty && (
                    <div className="text-xs text-navy-700 mt-2 flex items-center gap-1">
                      <Crosshair className="w-3 h-3" />
                      {formatDistance(
                        haversineMeters({ lat: p.lat, lon: p.lon }, { lat: selectedProperty.latitude as number, lon: selectedProperty.longitude as number })
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {layers.transport && transportPois.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lon]} icon={transportIcon(p.name.includes('قطار') || p.name.includes('سكة') ? 'station' : 'stop')}>
              <Popup>
                <div className="min-w-[180px]">
                  <div className="font-bold text-sm">🚉 {p.name}</div>
                  <div className="text-xs text-gray-500 mt-1">نقطة مواصلات</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {layers.properties &&
            mappedProperties.map((p) => (
              <Marker
                key={p.id}
                position={[p.latitude as number, p.longitude as number]}
                icon={pIcon(p)}
                opacity={clientMode && selectedProperty && selectedProperty.id !== p.id && !compareSet.has(p.id) ? 0.35 : 1}
              >
                <Popup>
                  <div className="min-w-[220px]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold">{p.name}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.type}</div>
                    <div className="text-sm mt-1.5">
                      <span className="font-bold text-green-700">{formatPrice(p.price)}</span>
                      {p.area != null && <span className="text-gray-500 ms-2">{p.area.toLocaleString('ar-EG')} م²</span>}
                    </div>
                    {p.pricePerMeter != null && <div className="text-xs text-gray-500 mt-0.5">سعر المتر: {fmtM2(p.pricePerMeter)}</div>}
                    <div className="text-xs text-gray-500 mt-1">{p.zone || p.city || 'موقع غير محدد'}</div>
                    <div className="flex gap-1.5 mt-2">
                      <Link
                        to={`/properties/${p.id}`}
                        className="flex-1 bg-navy-800 text-white text-center text-xs py-1.5 rounded-lg hover:bg-navy-900"
                      >
                        عرض العقار
                      </Link>
                      <button
                        onClick={() => focusAround(p)}
                        className="flex-1 border border-gold-300 text-gold-700 text-center text-xs py-1.5 rounded-lg hover:bg-gold-100"
                      >
                        حول هذا العقار
                      </button>
                      <button
                        onClick={() => toggleCompare(p)}
                        className={`flex-1 border text-center text-xs py-1.5 rounded-lg ${
                          compareSet.has(p.id)
                            ? 'bg-navy-800 text-white border-navy-800'
                            : 'border-navy-200 text-navy-700 hover:bg-navy-50'
                        }`}
                      >
                        {compareSet.has(p.id) ? `مقارنة ${String.fromCharCode(65 + compare.findIndex((c) => c.id === p.id))}` : 'مقارنة'}
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {layers.around && selectedProperty && selectedProperty.latitude != null && selectedProperty.longitude != null && (
            <>
              <Circle
                center={[selectedProperty.latitude, selectedProperty.longitude]}
                radius={radius}
                pathOptions={{ color: '#d4af37', weight: 1.5, dashArray: '5 5', fillColor: '#d4af37', fillOpacity: 0.06 }}
              />
              <CircleMarker
                center={[selectedProperty.latitude, selectedProperty.longitude]}
                radius={8}
                pathOptions={{ color: '#162841', fillColor: '#d4af37', fillOpacity: 1, weight: 2 }}
              />
            </>
          )}

          {!clientMode && drawing && (
            <>
              {drawing.points.length >= 2 && (
                <Polyline positions={drawing.points.map((p) => [p.lat, p.lon])} pathOptions={{ color: '#d4af37', weight: 2 }} />
              )}
              {drawing.points.map((p, i) => (
                <CircleMarker
                  key={i}
                  center={[p.lat, p.lon]}
                  radius={5}
                  pathOptions={{ color: '#162841', fillColor: '#d4af37', fillOpacity: 1 }}
                />
              ))}
            </>
          )}
        </MapContainer>

        <ZagazigLegend areas={areas} />

        <SidePanel
          mode={panel}
          nearby={nearProperties}
          area={panelArea?.area ?? null}
          profile={panelArea?.profile ?? null}
          compare={compare}
          compareContext={compareContext}
          radius={radius}
          onSetRadius={setRadius}
          onClose={() => setPanel('none')}
          onOpenProperty={(id) => {
            window.location.hash = `#/properties/${id}`
          }}
          onOpenCompare={() => setShowCompare(true)}
          clientMode={clientMode}
        />

        {!clientMode && drawing && (
          <div className="absolute top-16 inset-x-0 z-[800] flex justify-center pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl p-4 w-96 pointer-events-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-sm">{drawing.id ? 'تعديل حدود المنطقة' : 'إضافة منطقة'}</div>
                <button onClick={() => setDrawing(null)} className="text-gray-400 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                value={drawing.name}
                onChange={(e) => setDrawing({ ...drawing, name: e.target.value })}
                placeholder="اسم المنطقة (مثال: القومية)"
                className="w-full border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <div className="text-xs text-gray-500 mb-3">
                اضغط على الخريطة لإضافة نقاط الحدود ({drawing.points.length} نقطة)
              </div>
              {drawError && <div className="text-xs text-red-600 mb-2">{drawError}</div>}
              <div className="flex gap-2">
                <button
                  onClick={saveDrawing}
                  className="flex items-center gap-1.5 flex-1 bg-gold-500 text-navy-950 font-semibold text-sm py-2 rounded-lg hover:bg-gold-400 justify-center"
                >
                  <Save className="w-4 h-4" /> حفظ
                </button>
                <button
                  onClick={() => setDrawing((prev) => (prev ? { ...prev, points: prev.points.slice(0, -1) } : prev))}
                  className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50 px-3 justify-center"
                >
                  <Undo2 className="w-4 h-4" /> تراجع
                </button>
                <button
                  onClick={() => setDrawing(null)}
                  className="border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50 px-3"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!clientMode && showAreaManager && (
        <AreaManager
          areas={areas}
          onAdd={() => startDrawing(null)}
          onEdit={(a) => startDrawing(a)}
          onDelete={async (id) => {
            if (confirm('حذف هذه المنطقة؟')) {
              await window.api.zmap.deleteArea(id)
              window.api.zmap.listAreas().then(setAreas)
            }
          }}
          onClose={() => setShowAreaManager(false)}
        />
      )}

      {showCompare && compare.length > 0 && (
        <CompareModal properties={compare} onClose={() => setShowCompare(false)} />
      )}
    </div>
  )
}

function AreaHoverTip({ name, profile }: { name: string; profile: ZagazigAreaProfile | null }) {
  const market = profile?.market
  const office = profile?.office
  const hasMarket = market && (market.aptAvg != null || market.landAvg != null || market.aptMin != null || market.landMin != null)
  const hasRent = market && (market.rentAvg != null || market.rentMin != null)
  return (
    <div className="min-w-[200px]">
      <div className="font-bold text-navy-900 mb-1">{name}</div>
      {!hasMarket && !office ? (
        <div className="text-xs text-gray-500">لا توجد بيانات أسعار محدثة</div>
      ) : (
        <div className="space-y-1 text-xs">
          {market && market.aptAvg != null && (
            <div>
              <div className="text-gray-500">بيع الشقق:</div>
              <div className="font-bold text-navy-900">
                {fmtM2(market.aptMin)} – {fmtM2(market.aptMax)}
              </div>
              <div className="text-gray-400">متوسط: {fmtM2(market.aptAvg)}</div>
            </div>
          )}
          {market && market.landAvg != null && (
            <div className="text-gray-500">
              الأرض: {fmtM2(market.landMin)} – {fmtM2(market.landMax)}
            </div>
          )}
          {hasRent && (
            <div className="text-gray-500">
              الإيجار: {market!.rentMin != null ? `${Math.round(market!.rentMin).toLocaleString('ar-EG')}` : '-'} –{' '}
              {market!.rentMax != null ? `${Math.round(market!.rentMax).toLocaleString('ar-EG')}` : '-'} ج/شهر
            </div>
          )}
          {office && <div className="text-gray-500">عقارات المكتب: {office.count.toLocaleString('ar-EG')}</div>}
          <div className="text-[10px] text-gray-400">
            آخر تحديث: {market ? (market.sourceDate || market.updatedAt).slice(0, 7) : '-'}
          </div>
        </div>
      )}
    </div>
  )
}
