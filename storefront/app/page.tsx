import { redirect } from 'next/navigation'

// Root redirects to a default shop or info page
export default function RootPage() {
  redirect('/s/ipanema-kiti')
}
