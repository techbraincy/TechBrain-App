'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingBag, Truck, CalendarDays,
  ClipboardCheck, MessageCircleQuestion,
  Users, Settings, PhoneCall, BarChart3, Bot, Store,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/auth/logout-button'
import { getInitials } from '@/lib/utils'
import type { BusinessWithMembership } from '@/types/db'

interface NavItem {
  href:     string
  label:    string
  icon:     React.ElementType
  feature?: string
}

function getNavItems(businessId: string): NavItem[] {
  return [
    { href: `/voice-agent/${businessId}/orders`,       label: 'Παραγγελίες',  icon: ShoppingBag,           feature: 'orders_enabled' },
    { href: `/voice-agent/${businessId}/delivery`,     label: 'Delivery',     icon: Truck,                 feature: 'delivery_enabled' },
    { href: `/voice-agent/${businessId}/approvals`,    label: 'Εγκρίσεις',    icon: ClipboardCheck,        feature: 'staff_approval_enabled' },
    { href: `/voice-agent/${businessId}/reservations`, label: 'Κρατήσεις',    icon: CalendarDays,          feature: 'reservations_enabled' },
    { href: `/voice-agent/${businessId}/faqs`,         label: 'FAQs',         icon: MessageCircleQuestion, feature: 'faqs_enabled' },
    { href: `/voice-agent/${businessId}/customers`,    label: 'Πελάτες',      icon: Users },
    { href: `/voice-agent/${businessId}/analytics`,    label: 'Στατιστικά',   icon: BarChart3 },
    { href: `/voice-agent/${businessId}/shop`,         label: 'Online Shop',  icon: Store },
    { href: `/voice-agent/${businessId}/agent`,        label: 'AI Agent',     icon: Bot },
    { href: `/voice-agent/${businessId}/settings`,     label: 'Ρυθμίσεις',    icon: Settings },
  ]
}

interface SidebarProps {
  business: BusinessWithMembership
  user: { full_name: string | null; email: string }
}

export function Sidebar({ business, user }: SidebarProps) {
  const pathname = usePathname()
  const navItems = getNavItems(business.id)
  const features = business.features as unknown as Record<string, boolean>

  const visibleItems = navItems.filter((item) => {
    if (!item.feature) return true
    return !!features?.[item.feature]
  })

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-background">
      {/* Business header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
          style={{ backgroundColor: business.primary_color ?? '#6366f1' }}
        >
          {getInitials(business.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{business.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{business.role}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {visibleItems.map((item) => {
          const active =
            pathname.startsWith(item.href) &&
            (item.href !== `/voice-agent/${business.id}` || pathname === item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Agent status pill */}
      <div className="px-4 pb-2">
        {business.elevenlabs_agent_id ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
            <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-700 font-medium">Agent ενεργός</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <span className="size-2 shrink-0 rounded-full bg-amber-500" />
            <span className="text-xs text-amber-700 font-medium">Agent εκκρεμεί</span>
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {getInitials(user.full_name ?? user.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{user.full_name ?? 'Χρήστης'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <LogoutButton variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground px-1.5" />
      </div>

      {/* Switch business */}
      <div className="px-4 pb-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <PhoneCall className="size-3" />
          Αλλαγή επιχείρησης
        </Link>
      </div>
    </aside>
  )
}
