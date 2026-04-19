'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'

interface Props {
  initialLat?: number | null
  initialLng?: number | null
  onChange: (lat: number, lng: number) => void
}

// Inner map component loaded only client-side
function LeafletPicker({ initialLat, initialLng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const markerRef    = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Default: Athens
    const lat = initialLat ?? 37.9838
    const lng = initialLng ?? 23.7275

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, { center: [lat, lng], zoom: 15 })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map)

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
      marker.bindPopup('Σύρτε τον δείκτη στην ακριβή τοποθεσία').openPopup()

      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        onChange(pos.lat, pos.lng)
      })

      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng)
        onChange(e.latlng.lat, e.latlng.lng)
      })

      mapRef.current    = map
      markerRef.current = marker
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="w-full h-full" />
}

export function AddressPickerMap(props: Props) {
  return (
    <div className="relative w-full h-56 rounded-xl overflow-hidden border border-border">
      <LeafletPicker {...props} />
      <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5 pointer-events-none">
        <MapPin className="size-3 shrink-0" />
        Κάντε κλικ στον χάρτη ή σύρτε τον δείκτη για να επιλέξετε τη διεύθυνσή σας
      </div>
    </div>
  )
}
