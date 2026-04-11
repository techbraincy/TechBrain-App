"use client";

import { useState } from "react";
import { MapPin, Navigation, ExternalLink, X } from "lucide-react";

function extractCoords(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

function toGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function toOSMEmbed(lat: number, lng: number): string {
  const d = 0.003;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  businessName?: string;
}

export default function LocationPickerInput({ value, onChange, businessName }: Props) {
  const [pasteUrl, setPasteUrl] = useState(value);
  const [coords, setCoords]     = useState<{ lat: number; lng: number } | null>(() => extractCoords(value));
  const [loading, setLoading]   = useState(false);
  const [geoError, setGeoError] = useState("");

  function handlePaste(url: string) {
    setPasteUrl(url);
    setGeoError("");
    if (!url) { setCoords(null); onChange(""); return; }
    const c = extractCoords(url);
    if (c) {
      setCoords(c);
      onChange(toGoogleMapsLink(c.lat, c.lng));
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        const link = toGoogleMapsLink(lat, lng);
        setPasteUrl(link);
        onChange(link);
        setLoading(false);
      },
      () => {
        setGeoError("Location access denied. Please enable location permissions in your browser.");
        setLoading(false);
      },
      { timeout: 10000 }
    );
  }

  function openGoogleMaps() {
    const q = businessName ? encodeURIComponent(businessName) : "my+business";
    window.open(`https://www.google.com/maps/search/${q}`, "_blank", "noopener,noreferrer");
  }

  function clear() {
    setCoords(null);
    setPasteUrl("");
    onChange("");
    setGeoError("");
  }

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-600 rounded-full animate-spin flex-shrink-0" />
          ) : (
            <Navigation className="w-4 h-4 flex-shrink-0" />
          )}
          Use My Location
        </button>
        <button
          type="button"
          onClick={openGoogleMaps}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
        >
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          Find on Google Maps
        </button>
      </div>

      {/* URL input */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="url"
          value={pasteUrl}
          onChange={(e) => handlePaste(e.target.value)}
          placeholder="Paste Google Maps URL here…"
          className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
        {pasteUrl && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Click <strong className="text-gray-500">Find on Google Maps</strong> → search your business → copy the URL from the address bar → paste above.
      </p>

      {geoError && <p className="text-xs text-red-500">{geoError}</p>}

      {/* Map preview */}
      {coords && (
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <iframe
            src={toOSMEmbed(coords.lat, coords.lng)}
            width="100%"
            height="200"
            className="block"
            title="Location preview"
            loading="lazy"
          />
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 font-mono">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
            <a
              href={toGoogleMapsLink(coords.lat, coords.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 whitespace-nowrap"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
