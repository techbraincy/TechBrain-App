import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

/**
 * Shared-secret authentication for /api/agent/* endpoints.
 *
 * These endpoints are called by ElevenLabs voice agents over HTTP. They must
 * NOT be reachable by unauthenticated clients — without this check anyone
 * could POST orders or reservations to any business.
 *
 * The agent must include header:  X-Agent-Secret: <AGENT_WEBHOOK_SECRET>
 *
 * Comparison is timing-safe to defeat secret-length / timing oracles.
 *
 * Returns NextResponse on failure (caller returns it directly), or null on success.
 */
export function requireAgentSecret(req: Request): NextResponse | null {
  const expected = process.env.AGENT_WEBHOOK_SECRET
  if (!expected) {
    // eslint-disable-next-line no-console
    console.error('[agent-auth] AGENT_WEBHOOK_SECRET env var is not set')
    return NextResponse.json(
      { success: false, error: 'Server misconfigured' },
      { status: 500 },
    )
  }

  const provided = req.headers.get('x-agent-secret') ?? ''
  // timingSafeEqual requires equal-length buffers
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    // eslint-disable-next-line no-console
    console.warn('[agent-auth] rejected request', {
      providedLen: a.length,
      hasSecret: a.length > 0,
    })
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  return null
}
