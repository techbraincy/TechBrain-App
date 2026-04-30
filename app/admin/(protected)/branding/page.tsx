import { redirect } from 'next/navigation'

// Branding is managed by platform admins via the voice-agent product.
// Restaurant/cafe users no longer see this page in their admin sidebar.
// The route stays in place so any old bookmarks redirect cleanly to the
// admin overview rather than 404. The business primary_color and logo_url
// columns and the importBrandingFromUrl action remain intact and are still
// used by the existing branding pipeline elsewhere.
export default function BrandingPage() {
  redirect('/admin')
}
