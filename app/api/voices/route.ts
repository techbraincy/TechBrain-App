/**
 * GET /api/voices
 * Returns available ElevenLabs voices for the voice selector UI.
 * Cached for 1 hour to avoid hitting rate limits.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { listVoices } from "@/lib/elevenlabs/client";

export const revalidate = 3600; // cache for 1 hour

export async function GET() {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const voices = await listVoices();
    // Return only the fields the UI needs
    const simplified = voices.map((v) => ({
      voice_id:    v.voice_id,
      name:        v.name,
      category:    v.category,
      description: v.description,
      preview_url: v.preview_url,
      labels:      v.labels ?? {},
    }));
    return NextResponse.json(simplified);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
