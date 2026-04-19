'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import type { MenuCategory } from '@/types/db'

interface Props {
  categories:   Pick<MenuCategory, 'id' | 'name_el' | 'name_en'>[]
  activeId:     string | null   // null = All
  primaryColor: string
  lang:         'el' | 'en'
  onSelect:     (id: string | null) => void
}

export function CategoryFilter({ categories, activeId, primaryColor, lang, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scrollToActive(el: HTMLButtonElement | null) {
    if (!el || !scrollRef.current) return
    const container = scrollRef.current
    const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
    container.scrollTo({ left, behavior: 'smooth' })
  }

  return (
    <div className="sticky top-14 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div
        ref={scrollRef}
        className="flex gap-2 px-4 py-3 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* "All" option */}
        <button
          ref={(el) => { if (activeId === null) scrollToActive(el) }}
          onClick={() => onSelect(null)}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap',
            activeId === null
              ? 'text-white shadow-sm scale-105'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
          style={activeId === null ? { backgroundColor: primaryColor } : {}}
        >
          Όλα
        </button>

        {categories.map((cat) => {
          const name   = lang === 'en' && cat.name_en ? cat.name_en : cat.name_el
          const active = activeId === cat.id
          return (
            <button
              key={cat.id}
              ref={(el) => { if (active) scrollToActive(el) }}
              onClick={() => onSelect(cat.id)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap',
                active
                  ? 'text-white shadow-sm scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
              style={active ? { backgroundColor: primaryColor } : {}}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
