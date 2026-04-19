/**
 * Geocode a plain-text address to [lat, lng] using Nominatim (OpenStreetMap).
 * Server-side only — Next.js caches fetch responses automatically.
 * Rate limit: 1 req/sec per Nominatim ToS; fine for server-side page loads.
 */
export async function geocodeAddress(query: string): Promise<[number, number] | null> {
  if (!query?.trim()) return null
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'VoiceAgentSaaS/1.0 (contact@voiceagent.app)' },
      next:    { revalidate: 86400 }, // cache for 24 hours
    })
    const data = await res.json()
    if (!Array.isArray(data) || !data[0]) return null
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch {
    return null
  }
}
