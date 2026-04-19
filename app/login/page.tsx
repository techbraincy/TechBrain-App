import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { PhoneCall } from 'lucide-react'

export const metadata: Metadata = { title: 'Σύνδεση' }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[44%] flex-col justify-between bg-[#1e1b4b] p-12 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 backdrop-blur">
            <PhoneCall className="size-4 text-indigo-300" />
          </div>
          <span className="text-lg font-semibold tracking-tight">VoiceAgent</span>
        </div>

        <div className="space-y-5">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Ο AI βοηθός σου<br />
            απαντά στο τηλέφωνο.<br />
            <span className="text-indigo-300">Πάντα.</span>
          </h1>
          <p className="text-indigo-200/80 text-base leading-relaxed max-w-xs">
            Δημιούργησε έναν AI phone agent για την επιχείρησή σου σε λίγα λεπτά.
            Κρατήσεις, παραγγελίες, FAQs — όλα αυτοματοποιημένα.
          </p>
        </div>

        <div className="space-y-3">
          <Testimonial
            quote="Χάσαμε πολύ λιγότερες κλήσεις από τότε που ενεργοποιήσαμε τον agent."
            author="Σοφία Κ."
            role="Ιδιοκτήτρια εστιατορίου"
          />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <PhoneCall className="size-4 text-white" />
          </div>
          <span className="text-lg font-semibold">VoiceAgent</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Καλώς ήρθες πίσω</h2>
            <p className="text-sm text-muted-foreground">
              Σύνδεσε τον λογαριασμό σου για να συνεχίσεις
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function Testimonial({
  quote, author, role,
}: { quote: string; author: string; role: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <p className="text-sm text-indigo-100/90 leading-relaxed">"{quote}"</p>
      <div>
        <p className="text-sm font-medium text-white">{author}</p>
        <p className="text-xs text-indigo-300/70">{role}</p>
      </div>
    </div>
  )
}
