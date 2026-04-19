'use client'

/**
 * LiveMap — Leaflet/OpenStreetMap map for delivery tracking.
 * Dynamically imported (ssr: false) to avoid Next.js SSR issues.
 *
 * Shows:
 *  - Business/pickup pin (branded colour)
 *  - Customer destination pin (green)
 *  - Live driver pin (amber, updates smoothly via setLatLng)
 *  - Dashed polyline connecting the route
 */

import { useEffect, useRef } from 'react'

export interface LiveMapProps {
  pickupCoords:      [number, number] | null  // [lat, lng] — business location
  destinationCoords: [number, number] | null  // [lat, lng] — delivery address
  driverCoords:      [number, number] | null  // [lat, lng] — live driver position
  primaryColor:      string
}

type MapRefs = {
  L:            typeof import('leaflet')
  map:          import('leaflet').Map
  driverMarker: import('leaflet').Marker | null
  polyline:     import('leaflet').Polyline | null
}

export default function LiveMap({ pickupCoords, destinationCoords, driverCoords, primaryColor }: LiveMapProps) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const refsRef         = useRef<MapRefs | null>(null)
  // Keep a stable reference to props so the init effect can read latest values
  const latestProps     = useRef({ pickupCoords, destinationCoords, driverCoords, primaryColor })
  latestProps.current   = { pickupCoords, destinationCoords, driverCoords, primaryColor }

  // ── Initialise map once ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || refsRef.current) return
    let active = true

    import('leaflet').then((L) => {
      if (!active || !containerRef.current || refsRef.current) return

      // Fix Leaflet's default icon URLs being broken by webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const { pickupCoords, destinationCoords, driverCoords, primaryColor } = latestProps.current
      const center: [number, number] =
        driverCoords ?? destinationCoords ?? pickupCoords ?? [37.9838, 23.7275]

      const map = L.map(containerRef.current!, {
        center,
        zoom:            13,
        scrollWheelZoom: false,
        attributionControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom:     19,
      }).addTo(map)

      // Static: business/pickup pin
      if (pickupCoords) {
        L.marker(pickupCoords, { icon: buildIcon(L, primaryColor, STORE_SVG, 30) })
          .addTo(map)
          .bindPopup('<b>Κατάστημα</b>')
      }

      // Static: destination pin
      if (destinationCoords) {
        L.marker(destinationCoords, { icon: buildIcon(L, '#059669', PIN_SVG, 30) })
          .addTo(map)
          .bindPopup('<b>Διεύθυνσή σας</b>')
      }

      const refs: MapRefs = { L, map, driverMarker: null, polyline: null }
      refsRef.current = refs

      // Apply driver position if already known
      if (driverCoords) {
        applyDriver(refs, driverCoords, primaryColor, pickupCoords, destinationCoords)
      }

      // Auto-fit all visible points
      const pts = [pickupCoords, driverCoords ?? destinationCoords, destinationCoords]
        .filter((p): p is [number, number] => p !== null)
      if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 16 })
      }
    })

    return () => {
      active = false
      refsRef.current?.map.remove()
      refsRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update driver marker on location change ─────────────────────
  useEffect(() => {
    const refs = refsRef.current
    if (!refs || !driverCoords) return
    applyDriver(refs, driverCoords, primaryColor, pickupCoords, destinationCoords)
    refs.map.panTo(driverCoords, { animate: true, duration: 1.5 })
  }, [driverCoords]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} className="w-full h-full" />
  )
}

// ── Helpers ──────────────────────────────────────────────────────

function applyDriver(
  refs: MapRefs,
  coords: [number, number],
  primaryColor: string,
  pickup: [number, number] | null,
  dest: [number, number] | null,
) {
  const { L, map } = refs

  if (refs.driverMarker) {
    refs.driverMarker.setLatLng(coords)
  } else {
    refs.driverMarker = L.marker(coords, { icon: buildIcon(L, '#d97706', TRUCK_SVG, 38, true) })
      .addTo(map)
      .bindPopup('<b>Διανομέας</b>')
  }

  const pts = [pickup, coords, dest].filter((p): p is [number, number] => p !== null)
  if (refs.polyline) {
    refs.polyline.setLatLngs(pts)
  } else if (pts.length > 1) {
    refs.polyline = L.polyline(pts, {
      color:     primaryColor,
      weight:    3,
      opacity:   0.55,
      dashArray: '8 6',
    }).addTo(map)
  }
}

function buildIcon(L: any, color: string, svg: string, size: number, pulse = false) {
  const animation = pulse
    ? 'box-shadow:0 0 0 0 ' + color + ';animation:trackPulse 2s infinite;'
    : 'box-shadow:0 2px 6px rgba(0,0,0,.35);'
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2.5px solid white;${animation}display:flex;align-items:center;justify-content:center">${svg}</div>`,
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  })
}

const STORE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`
const PIN_SVG   = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`
const TRUCK_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`
