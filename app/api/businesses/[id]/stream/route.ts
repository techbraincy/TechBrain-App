import { NextRequest } from 'next/server'
import { createClient } from '@/lib/db/supabase-server'
import { requireBusinessAccess } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const maxDuration = 25

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session } = await requireBusinessAccess(params.id).catch(() => ({ session: null, business: null }))
  if (!session) return new Response('Unauthorized', { status: 401 })

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      const supabase = createClient()
      const channel = supabase
        .channel(`biz-stream-${params.id}-${Date.now()}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${params.id}`,
        }, () => {
          if (!closed) {
            try { controller.enqueue(encoder.encode('data: {"type":"orders"}\n\n')) } catch {}
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `business_id=eq.${params.id}`,
        }, () => {
          if (!closed) {
            try { controller.enqueue(encoder.encode('data: {"type":"reservations"}\n\n')) } catch {}
          }
        })
        .subscribe()

      const ping = setInterval(() => {
        if (!closed) {
          try { controller.enqueue(encoder.encode(': ping\n\n')) }
          catch { clearInterval(ping) }
        }
      }, 15_000)

      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(ping)
        supabase.removeChannel(channel)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
