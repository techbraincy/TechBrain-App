'use client'

import { useState }      from 'react'
import Link              from 'next/link'
import { MapPin, ShoppingBag, ArrowRight, Zap } from 'lucide-react'
import { useCart }       from '@/components/shop/CartContext'
import { formatCurrency, getInitials } from '@/lib/utils'
import type { MenuCategory } from '@/types/db'

interface Banner {
  id:           string
  title:        string
  description:  string
  image_url?:   string | null
  bg_color?:    string | null
  text_color?:  string | null
  emoji?:       string | null
  link_cat_id?: string | null
}

interface Props {
  businessId:        string
  businessName:      string
  businessAddress:   string | null
  primaryColor:      string
  logoUrl:           string | null
  coverImageUrl:     string | null
  subtitle:          string | null
  heroTagline:       string | null
  announcement:      string | null
  banners:           Banner[]
  isOpen:            boolean
  categories:        Pick<MenuCategory, 'id' | 'name_el' | 'name_en'>[]
  deliveryFee:       number | null
  freeDeliveryAbove: number | null
  minOrderAmount:    number | null
  estimatedMinutes:  number | null
  customer:          { first_name: string; email: string } | null
}

export function StorefrontHome({
  businessId, businessName, businessAddress, primaryColor,
  logoUrl, announcement, banners, isOpen, customer,
}: Props) {
  const { itemCount } = useCart()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-white px-5 pt-safe pt-5 pb-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Deliver to */}
          <div>
            <p className="text-[10px] font-bold text-brand-gray uppercase tracking-widest flex items-center gap-1">
              <MapPin className="size-3" /> Deliver to
            </p>
            <p className="text-sm font-bold text-brand-dark mt-0.5 max-w-[220px] truncate">
              {businessAddress ?? businessName}
            </p>
          </div>

          {/* Cart button */}
          <Link
            href={`/shop/${businessId}/cart`}
            className="relative size-11 rounded-full flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
            aria-label="Καλάθι"
          >
            <ShoppingBag className="size-5 text-white" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold"
                style={{ color: primaryColor }}>
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pb-8 space-y-6 pt-5">

        {/* ── Greeting ──────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">
            {greeting},{' '}
            {customer ? (
              <span style={{ color: primaryColor }}>{customer.first_name}</span>
            ) : (
              <span style={{ color: primaryColor }}>there</span>
            )}
            ! 👋
          </h1>
          <p className="text-sm text-brand-gray mt-1 font-medium">
            What would you like to eat today?
          </p>
        </div>

        {/* ── Open/closed ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
            isOpen ? 'bg-green-50 text-brand-success' : 'bg-gray-100 text-brand-gray'
          }`}>
            <span className={`size-1.5 rounded-full ${isOpen ? 'bg-brand-success' : 'bg-brand-gray'}`} />
            {isOpen ? 'Open now' : 'Closed'}
          </span>
        </div>

        {/* ── Announcement ──────────────────────────────────────────── */}
        {announcement && (
          <div
            className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold"
            style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
          >
            <Zap className="size-4 shrink-0" />
            {announcement}
          </div>
        )}

        {/* ── Offer cards ───────────────────────────────────────────── */}
        {banners.length > 0 ? (
          <div className="space-y-4">
            {banners.map((banner, i) => {
              const bg   = banner.bg_color   ?? (i % 2 === 0 ? '#FFF5E4' : '#E8F4FD')
              const tc   = banner.text_color ?? '#181C2E'
              const href = banner.link_cat_id
                ? `/shop/${businessId}/menu?cat=${banner.link_cat_id}`
                : `/shop/${businessId}/menu`
              return (
                <Link key={banner.id ?? i} href={href}>
                  <div
                    className="flex items-stretch rounded-3xl overflow-hidden min-h-[120px] active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: bg }}
                  >
                    {/* Text side */}
                    <div className="flex-1 p-5 flex flex-col justify-center gap-1.5">
                      <p className="font-bold text-[17px] leading-snug" style={{ color: tc }}>
                        {banner.title}
                      </p>
                      {banner.description && (
                        <p className="text-xs leading-relaxed font-medium" style={{ color: `${tc}99` }}>
                          {banner.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs font-bold mt-1"
                        style={{ color: primaryColor }}>
                        Order now <ArrowRight className="size-3" />
                      </div>
                    </div>

                    {/* Image or emoji side — alternates */}
                    {banner.image_url ? (
                      <div className={`w-32 shrink-0 self-stretch ${i % 2 === 1 ? 'order-first' : ''}`}>
                        <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-24 shrink-0 flex items-center justify-center text-5xl ${i % 2 === 1 ? 'order-first' : ''}`}>
                        {banner.emoji ?? '🍽️'}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          /* No banners — show a start-browsing CTA */
          <Link
            href={`/shop/${businessId}/menu`}
            className="flex items-center justify-center gap-3 w-full py-5 rounded-3xl text-white font-bold text-base shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: primaryColor }}
          >
            <ShoppingBag className="size-5" />
            {isOpen ? 'Browse the menu' : 'View the menu'}
            <ArrowRight className="size-5" />
          </Link>
        )}

        {/* ── Auth prompt ───────────────────────────────────────────── */}
        {!customer && (
          <div className="bg-white rounded-3xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
            <div className="size-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${primaryColor}18` }}>
              <span className="text-xl">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-brand-dark">Sign in for faster ordering</p>
              <p className="text-xs text-brand-gray mt-0.5">Save addresses and order history</p>
            </div>
            <Link
              href={`/shop/${businessId}/auth`}
              className="shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Sign in
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
