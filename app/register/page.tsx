import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/register-form'
import { PhoneCall, Check } from 'lucide-react'

export const metadata: Metadata = { title: 'Εγγραφή' }

const FEATURES = [
  'Δωρεάν εγκατάσταση — χωρίς κάρτα',
  'Bilingual agent: Ελληνικά & Αγγλικά',
  'Κρατήσεις, παραγγελίες, FAQs',
  'Έτοιμος agent σε λίγα λεπτά',
]

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[44%] flex-col justify-between bg-[#1e1b4b] p-12 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 backdrop-blur">
            <PhoneCall className="size-4 text-indigo-300" />
          </div>
          <span className="text-lg font-semibold tracking-tight">VoiceAgent</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Ξεκίνα σήμερα.<br />
              <span className="text-indigo-300">Δεν χρειάζεσαι</span><br />
              κωδικό.
            </h1>
            <p className="text-indigo-200/80 text-base leading-relaxed max-w-xs">
              Ρύθμισε την επιχείρησή σου και τον AI agent σου στα πρώτα 5 λεπτά.
            </p>
          </div>

          <ul className="space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-indigo-100/90">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/30">
                  <Check className="size-3 text-indigo-300" />
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-indigo-300/50">
          © {new Date().getFullYear()} VoiceAgent. Όλα τα δικαιώματα κατοχυρωμένα.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <PhoneCall className="size-4 text-white" />
          </div>
          <span className="text-lg font-semibold">VoiceAgent</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Δημιούργησε λογαριασμό</h2>
            <p className="text-sm text-muted-foreground">
              Ένα βήμα πριν τον AI agent σου
            </p>
          </div>

          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
