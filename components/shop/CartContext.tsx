'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { CartItem } from '@/types/db'

interface CartState {
  items:            CartItem[]
  fulfillment_type: 'takeaway' | 'delivery'
  address_id:       string | null
  order_notes:      string | null
  driver_comment:   string | null
  tip_amount:       number
  coupon_code:      string | null
}

interface CartContextValue extends CartState {
  addItem:           (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem:        (menuItemId: string) => void
  updateQty:         (menuItemId: string, qty: number) => void
  setFulfillment:    (type: 'takeaway' | 'delivery') => void
  setAddress:        (id: string | null) => void
  setOrderNotes:     (notes: string | null) => void
  setDriverComment:  (comment: string | null) => void
  setTip:            (amount: number) => void
  setCoupon:         (code: string | null) => void
  clearCart:         () => void
  itemCount:         number
  subtotal:          number
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = (businessId: string) => `cart_${businessId}`

const EMPTY_CART: CartState = {
  items:            [],
  fulfillment_type: 'takeaway',
  address_id:       null,
  order_notes:      null,
  driver_comment:   null,
  tip_amount:       0,
  coupon_code:      null,
}

export function CartProvider({ children, businessId }: { children: ReactNode; businessId: string }) {
  const [cart, setCart] = useState<CartState>(EMPTY_CART)
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY(businessId))
      if (stored) setCart(JSON.parse(stored))
    } catch {}
    setHydrated(true)
  }, [businessId])

  // Persist to localStorage whenever cart changes
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY(businessId), JSON.stringify(cart))
  }, [cart, businessId, hydrated])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setCart((prev) => {
      const existing = prev.items.find((i) => i.menu_item_id === item.menu_item_id)
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.menu_item_id === item.menu_item_id
              ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
              : i
          ),
        }
      }
      return { ...prev, items: [...prev.items, { ...item, quantity: item.quantity ?? 1 }] }
    })
  }, [])

  const removeItem = useCallback((menuItemId: string) => {
    setCart((prev) => ({ ...prev, items: prev.items.filter((i) => i.menu_item_id !== menuItemId) }))
  }, [])

  const updateQty = useCallback((menuItemId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => ({ ...prev, items: prev.items.filter((i) => i.menu_item_id !== menuItemId) }))
    } else {
      setCart((prev) => ({
        ...prev,
        items: prev.items.map((i) => i.menu_item_id === menuItemId ? { ...i, quantity: qty } : i),
      }))
    }
  }, [])

  const setFulfillment  = useCallback((type: 'takeaway' | 'delivery') => setCart((p) => ({ ...p, fulfillment_type: type })), [])
  const setAddress      = useCallback((id: string | null) => setCart((p) => ({ ...p, address_id: id })), [])
  const setOrderNotes   = useCallback((notes: string | null) => setCart((p) => ({ ...p, order_notes: notes })), [])
  const setDriverComment= useCallback((comment: string | null) => setCart((p) => ({ ...p, driver_comment: comment })), [])
  const setTip          = useCallback((amount: number) => setCart((p) => ({ ...p, tip_amount: amount })), [])
  const setCoupon       = useCallback((code: string | null) => setCart((p) => ({ ...p, coupon_code: code })), [])
  const clearCart       = useCallback(() => setCart(EMPTY_CART), [])

  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0)
  const subtotal  = cart.items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{
      ...cart,
      addItem, removeItem, updateQty,
      setFulfillment, setAddress, setOrderNotes, setDriverComment, setTip, setCoupon,
      clearCart, itemCount, subtotal,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
