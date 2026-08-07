import L from 'leaflet'

function pinSvg(fill: string, ring: string): string {
  return `
<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
  <path d="M17 1.5 C8.5 1.5 1.5 8.5 1.5 17 C1.5 30 17 42.5 17 42.5 C17 42.5 32.5 30 32.5 17 C32.5 8.5 25.5 1.5 17 1.5 Z"
        fill="${fill}" stroke="${ring}" stroke-width="2.5"/>
  <circle cx="17" cy="16.5" r="6.5" fill="${ring}"/>
</svg>`
}

export function createPinIcon(options?: { fill?: string; ring?: string }): L.DivIcon {
  const fill = options?.fill ?? '#162841'
  const ring = options?.ring ?? '#d4af37'
  return L.divIcon({
    className: 'almohands-pin',
    html: pinSvg(fill, ring),
    iconSize: [34, 44],
    iconAnchor: [17, 43],
    popupAnchor: [0, -40]
  })
}
