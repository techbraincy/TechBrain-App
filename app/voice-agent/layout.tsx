// Wrapper layout for /voice-agent/* routes.
// The per-business layout is in /voice-agent/[businessId]/layout.tsx.
// This file only exists so Next.js can resolve the route group correctly.

export default function VoiceAgentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
