// Database types matching the Supabase schema.
// Keep in sync with migrations/*.sql

export type BusinessType =
  | 'restaurant' | 'cafe' | 'bar' | 'bakery'
  | 'retail' | 'services' | 'beauty' | 'healthcare' | 'other'

export type BusinessRole = 'owner' | 'manager' | 'staff'

export type SetupStatus = 'pending' | 'in_progress' | 'complete' | 'failed'

export type AgentSyncStatus = 'pending' | 'synced' | 'failed'
export type AgentLanguage   = 'greek' | 'english' | 'bilingual'
export type AgentTone       = 'professional' | 'friendly' | 'casual'

export type OrderType   = 'takeaway' | 'delivery' | 'dine_in'
export type OrderSource = 'phone' | 'portal' | 'staff' | 'webhook'
export type OrderStatus =
  | 'pending' | 'awaiting_approval' | 'accepted' | 'rejected'
  | 'preparing' | 'ready' | 'dispatched' | 'completed' | 'cancelled'

export type ReservationStatus =
  | 'pending' | 'confirmed' | 'rejected' | 'completed' | 'no_show' | 'cancelled'
export type ReservationSource = 'phone' | 'portal' | 'staff'

export type CallOutcome = 'completed' | 'no_answer' | 'escalated' | 'error' | 'voicemail'


// ----------------------------------------------------------------
// Table row types
// ----------------------------------------------------------------

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Business {
  id: string
  slug: string
  name: string
  type: BusinessType
  description: string | null
  logo_url: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  country: string
  timezone: string
  currency: string
  locale: string
  primary_color: string
  accent_color: string
  elevenlabs_agent_id: string | null
  setup_status: SetupStatus
  setup_error: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BusinessMember {
  id: string
  business_id: string
  user_id: string
  role: BusinessRole
  invited_by: string | null
  joined_at: string
}

export interface BusinessFeatures {
  id: string
  business_id: string
  orders_enabled: boolean
  reservations_enabled: boolean
  takeaway_enabled: boolean
  delivery_enabled: boolean
  staff_approval_enabled: boolean
  faqs_enabled: boolean
  customer_portal_enabled: boolean
  live_tracking_enabled: boolean
  created_at: string
  updated_at: string
}

export interface OperatingHours {
  id: string
  business_id: string
  day_of_week: number   // 0=Sun … 6=Sat
  is_open: boolean
  open_time: string | null   // HH:MM
  close_time: string | null
}

export interface AgentConfig {
  id: string
  business_id: string
  language: AgentLanguage
  tone: AgentTone
  greeting_greek: string | null
  greeting_english: string | null
  agent_name: string
  custom_instructions: string | null
  escalation_enabled: boolean
  escalation_phone: string | null
  escalation_message_greek: string | null
  escalation_message_english: string | null
  sync_status: AgentSyncStatus
  sync_error: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface MenuCategory {
  id: string
  business_id: string
  name_el: string
  name_en: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  business_id: string
  category_id: string | null
  name_el: string
  name_en: string | null
  description_el: string | null
  description_en: string | null
  price: number
  image_url: string | null
  is_available: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Faq {
  id: string
  business_id: string
  question_el: string
  question_en: string | null
  answer_el: string
  answer_en: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ReservationConfig {
  id: string
  business_id: string
  slot_duration_minutes: number
  max_party_size: number
  min_advance_minutes: number
  max_advance_days: number
  buffer_minutes: number
  auto_confirm: boolean
  created_at: string
  updated_at: string
}

export interface DeliveryConfig {
  id: string
  business_id: string
  delivery_radius_km: number
  min_order_amount: number
  delivery_fee: number
  free_delivery_above: number | null | undefined
  estimated_minutes: number
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  business_id: string
  phone: string | null
  name: string | null
  email: string | null
  language: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  business_id: string
  customer_id: string | null
  reference: string
  type: OrderType
  source: OrderSource
  status: OrderStatus
  subtotal: number
  delivery_fee: number
  total: number
  delivery_address: string | null
  delivery_notes: string | null
  estimated_minutes: number | null
  customer_phone: string | null
  customer_name: string | null
  preferred_language: string
  accepted_by: string | null
  accepted_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  // Live delivery tracking
  driver_lat:        number | null
  driver_lng:        number | null
  driver_updated_at: string | null
  // Customer app fields
  app_customer_id:   string | null
  tip_amount:        number
  service_fee:       number
  coupon_id:         string | null
  coupon_code:       string | null
  coupon_discount:   number
  driver_comment:    string | null
  payment_method:    string
  payment_reference: string | null
  address_snapshot:  Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  business_id: string
  menu_item_id: string | null
  name_el: string
  name_en: string | null
  unit_price: number
  quantity: number
  subtotal: number
  notes: string | null
  created_at: string
}

export interface Reservation {
  id: string
  business_id: string
  customer_id: string | null
  reference: string
  status: ReservationStatus
  source: ReservationSource
  reserved_at: string
  party_size: number
  duration_minutes: number
  table_number: string | null
  customer_name: string | null
  customer_phone: string | null
  preferred_language: string
  notes: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface CallLog {
  id: string
  business_id: string
  customer_id: string | null
  elevenlabs_call_id: string | null
  caller_phone: string | null
  language_detected: string | null
  duration_seconds: number | null
  outcome: CallOutcome
  order_id: string | null
  reservation_id: string | null
  transcript_excerpt: string | null
  created_at: string
}

// ----------------------------------------------------------------
// Customer app types
// ----------------------------------------------------------------

export interface AppCustomer {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  preferred_language: string
  notify_order_updates: boolean
  notify_promotions: boolean
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface CustomerAddress {
  id: string
  customer_id: string
  label: string
  address_text: string
  lat: number | null
  lng: number | null
  instructions: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export type CouponType = 'percent' | 'fixed'

export interface Coupon {
  id: string
  business_id: string
  code: string
  type: CouponType
  value: number
  min_order_amount: number
  max_uses: number | null
  uses_count: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

export interface SavedPaymentMethod {
  id: string
  customer_id: string
  stripe_payment_method_id: string
  type: string
  card_brand: string | null
  card_last4: string | null
  card_exp_month: number | null
  card_exp_year: number | null
  is_default: boolean
  created_at: string
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  status: string
  note: string | null
  changed_by: string | null
  created_at: string
}

// Cart types (client-side only)
export interface CartItem {
  menu_item_id: string
  name_el: string
  name_en: string | null
  price: number
  quantity: number
  notes: string | null
  image_url: string | null
}

export interface Cart {
  business_id: string
  items: CartItem[]
  fulfillment_type: 'takeaway' | 'delivery'
  address_id: string | null
  order_notes: string | null
  driver_comment: string | null
  tip_amount: number
  coupon_code: string | null
}

export interface ShopConfig {
  id: string
  business_id: string
  is_published: boolean
  cover_image_url: string | null
  announcement: string | null
  seo_title: string | null
  seo_description: string | null
  subtitle: string | null
  logo_url: string | null
  hero_tagline: string | null
  banners: Array<{
    id: string; title: string; description: string
    bg_color?: string | null; text_color?: string | null
    emoji?: string | null; image_url?: string | null; link_cat_id?: string | null
  }>
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  business_id: string | null
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}


// ----------------------------------------------------------------
// Composite / joined types used in the UI
// ----------------------------------------------------------------

export interface BusinessWithFeatures extends Business {
  features: BusinessFeatures
}

export interface BusinessWithMembership extends Business {
  role: BusinessRole
  features: BusinessFeatures
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
  customer: Customer | null
}

export interface ReservationWithCustomer extends Reservation {
  customer: Customer | null
}

export interface MemberWithProfile extends BusinessMember {
  profile: Profile
}


// ----------------------------------------------------------------
// Onboarding input types (used in wizard → provisioning)
// ----------------------------------------------------------------

export interface OnboardingInput {
  // Step 1: Basics
  name: string
  type: BusinessType
  description?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  city?: string
  postal_code?: string
  country: string
  timezone: string
  locale: string
  primary_color?: string
  accent_color?: string

  // Step 2: Hours (indexed 0=Sun … 6=Sat)
  operating_hours: Array<{
    day_of_week: number
    is_open: boolean
    open_time: string | null
    close_time: string | null
  }>

  // Step 3: Features
  features: {
    orders_enabled: boolean
    reservations_enabled: boolean
    takeaway_enabled: boolean
    delivery_enabled: boolean
    staff_approval_enabled: boolean
    faqs_enabled: boolean
    live_tracking_enabled: boolean
  }

  // Step 4: Reservation config (conditional)
  reservation_config?: Omit<ReservationConfig, 'id' | 'business_id' | 'created_at' | 'updated_at'>

  // Step 5: Delivery config (conditional)
  delivery_config?: Omit<DeliveryConfig, 'id' | 'business_id' | 'created_at' | 'updated_at' | 'free_delivery_above'> & { free_delivery_above?: number | null }

  // Step 6: Menu (conditional)
  menu_items?: Array<{
    name_el: string
    name_en?: string
    description_el?: string
    description_en?: string
    price: number
    category_name_el?: string
  }>

  // Step 7: FAQs (conditional)
  faqs?: Array<{
    question_el: string
    question_en?: string
    answer_el: string
    answer_en?: string
  }>

  // Step 8: Agent
  agent: {
    agent_name: string
    language: AgentLanguage
    tone: AgentTone
    greeting_greek?: string
    greeting_english?: string
    custom_instructions?: string
    escalation_enabled: boolean
    escalation_phone?: string
  }
}
