// ─────────────────────────────────────────────
// TypeScript types for the Voice Agent Builder
// ─────────────────────────────────────────────

export type BusinessCategory =
  | "restaurant"
  | "cafe"
  | "clinic"
  | "salon"
  | "hotel"
  | "retail"
  | "service"
  | "other";

export const BUSINESS_CATEGORIES: { value: BusinessCategory; label: string; emoji: string }[] = [
  { value: "restaurant", label: "Restaurant",         emoji: "🍽️" },
  { value: "cafe",       label: "Café / Coffee Shop", emoji: "☕" },
  { value: "clinic",     label: "Clinic / Medical",   emoji: "🏥" },
  { value: "salon",      label: "Salon / Beauty",     emoji: "💇" },
  { value: "hotel",      label: "Hotel / Hospitality",emoji: "🏨" },
  { value: "retail",     label: "Retail Store",       emoji: "🛍️" },
  { value: "service",    label: "Service Business",   emoji: "🔧" },
  { value: "other",      label: "Other",              emoji: "🏢" },
];

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface DayHours {
  open:   string;  // "09:00"
  close:  string;  // "22:00"
  closed: boolean;
}

export type OpeningHours = Partial<Record<DayOfWeek, DayHours>>;

export interface ServiceItem {
  id:          string;
  name:        string;
  description: string;
  price:       string;  // empty string = free / on request
  category:    string;
}

export interface FAQItem {
  id:       string;
  question: string;
  answer:   string;
}

export interface HolidayHour {
  date:   string;        // "YYYY-MM-DD"
  name:   string;        // "Christmas"
  closed: boolean;
  open:   string | null; // null when closed=true
  close:  string | null;
}

export interface EscalationRules {
  escalate_on_complaint:       boolean;
  escalate_on_special_request: boolean;
  human_handoff_number:        string;
  escalation_triggers:         string[];
  max_failed_attempts:         number;
}

export interface BrandingSettings {
  primary_color:   string;  // hex "#8B5CF6"
  secondary_color: string;
  accent_color:    string;
  logo_url:        string | null;
}

export interface ThemeSettings {
  font:      string;
  radius:    "sm" | "md" | "lg";
  dark_mode: boolean;
}

export interface AgentVoiceSettings {
  voice_id:        string;
  voice_name:      string;
  stability:       number;  // 0–1
  similarity_boost: number; // 0–1
  style:           number;  // 0–1
  speed:           number;  // 0.5–2.0
}

export interface GreetingSettings {
  greeting_el:       string;
  greeting_en:       string;
  farewell_el:       string;
  farewell_en:       string;
  on_hold_message:   string;
}

export interface WorkflowSettings {
  require_confirmation_for_orders:   boolean;
  require_confirmation_for_bookings: boolean;
  auto_accept_orders:                boolean;  // skip staff approval, go straight to accepted
  send_sms_confirmation:             boolean;
  sms_confirmation_number:           string | null;
  booking_lead_time_hours:           number;
  max_party_size:                    number;
  delivery_radius_km:                number;
  delivery_fee:                      string;
  min_order_value:                   string;
  cancellation_window_hours:         number;
  avg_prep_time_minutes:             number;   // used for estimated ready time
  avg_delivery_time_minutes:         number;
}

export interface CustomPermissions {
  can_book:         boolean;
  can_order:        boolean;
  can_cancel:       boolean;
  allowed_actions:  string[];
  blocked_topics:   string[];
}

export interface LanguageSettings {
  primary:     "el" | "en";
  secondary:   "el" | "en";
  auto_detect: boolean;
}

// ─── Database row types ───────────────────────────────────────────────────────

export interface Business {
  id:                       string;
  user_id:                  string;
  business_name:            string;
  phone_number:             string | null;
  business_category:        BusinessCategory;
  address:                  string | null;
  google_maps_link:         string | null;
  opening_hours:            OpeningHours;
  languages_supported:      string[];
  services:                 ServiceItem[];
  menu_catalog:             ServiceItem[];
  faq:                      FAQItem[];
  reservation_enabled:      boolean;
  meetings_enabled:         boolean;
  delivery_enabled:         boolean;
  takeaway_enabled:         boolean;
  custom_agent_instructions: string | null;
  escalation_rules:         EscalationRules;
  branding_settings:        BrandingSettings;
  theme_settings:           ThemeSettings;
  agent_voice_settings:     AgentVoiceSettings;
  greeting_settings:        GreetingSettings;
  workflow_settings:        WorkflowSettings;
  custom_permissions:       CustomPermissions;
  service_area:             string | null;
  holiday_hours:            HolidayHour[];
  onboarding_complete:      boolean;
  onboarding_step:          number;
  created_at:               string;
  updated_at:               string;
}

export type BusinessInsert = Omit<Business, "id" | "created_at" | "updated_at">;
export type BusinessUpdate = Partial<Omit<Business, "id" | "user_id" | "created_at" | "updated_at">>;

export type AgentStatus = "pending" | "creating" | "active" | "error" | "disabled";

export interface ElevenLabsAgent {
  id:                  string;
  business_id:         string;
  elevenlabs_agent_id: string | null;
  agent_name:          string;
  voice_id:            string | null;
  voice_name:          string | null;
  system_prompt:       string | null;
  language_settings:   LanguageSettings;
  personality:         string;
  tone:                string;
  capabilities:        Record<string, boolean>;
  status:              AgentStatus;
  last_synced_at:      string | null;
  error_message:       string | null;
  created_at:          string;
  updated_at:          string;
}

export type AgentInsert = Omit<ElevenLabsAgent, "id" | "created_at" | "updated_at">;
export type AgentUpdate = Partial<Omit<ElevenLabsAgent, "id" | "business_id" | "created_at" | "updated_at">>;

// ── Business + agent joined ───────────────────────────────────────────────────
export interface BusinessWithAgent extends Business {
  agent: ElevenLabsAgent | null;
}

// ─── ElevenLabs API types ─────────────────────────────────────────────────────

export interface ElevenLabsVoice {
  voice_id:     string;
  name:         string;
  category:     string;
  description:  string | null;
  preview_url:  string | null;
  labels:       Record<string, string>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday:    { open: "09:00", close: "21:00", closed: false },
  tuesday:   { open: "09:00", close: "21:00", closed: false },
  wednesday: { open: "09:00", close: "21:00", closed: false },
  thursday:  { open: "09:00", close: "21:00", closed: false },
  friday:    { open: "09:00", close: "22:00", closed: false },
  saturday:  { open: "10:00", close: "22:00", closed: false },
  sunday:    { open: "10:00", close: "20:00", closed: false },
};

export const DEFAULT_ESCALATION_RULES: EscalationRules = {
  escalate_on_complaint:       true,
  escalate_on_special_request: true,
  human_handoff_number:        "",
  escalation_triggers:         ["angry", "complaint", "emergency", "legal"],
  max_failed_attempts:         3,
};

export const DEFAULT_BRANDING: BrandingSettings = {
  primary_color:   "#8B5CF6",
  secondary_color: "#6366F1",
  accent_color:    "#F59E0B",
  logo_url:        null,
};

export const DEFAULT_THEME: ThemeSettings = {
  font:      "inter",
  radius:    "lg",
  dark_mode: false,
};

export const DEFAULT_VOICE_SETTINGS: AgentVoiceSettings = {
  voice_id:         "",
  voice_name:       "",
  stability:        0.5,
  similarity_boost: 0.75,
  style:            0.0,
  speed:            1.0,
};

export const DEFAULT_GREETING: GreetingSettings = {
  greeting_el:     "Γεια σας! Είμαι ο βοηθός σας. Πώς μπορώ να σας εξυπηρετήσω;",
  greeting_en:     "Hello! I'm your assistant. How can I help you today?",
  farewell_el:     "Ευχαριστούμε για την επικοινωνία! Καλή συνέχεια!",
  farewell_en:     "Thank you for calling! Have a great day!",
  on_hold_message: "Please hold for a moment...",
};

export const DEFAULT_WORKFLOW: WorkflowSettings = {
  require_confirmation_for_orders:   true,
  require_confirmation_for_bookings: true,
  auto_accept_orders:                false,
  send_sms_confirmation:             false,
  sms_confirmation_number:           null,
  booking_lead_time_hours:           1,
  max_party_size:                    10,
  delivery_radius_km:                5,
  delivery_fee:                      "2.00",
  min_order_value:                   "15.00",
  cancellation_window_hours:         2,
  avg_prep_time_minutes:             20,
  avg_delivery_time_minutes:         40,
};

export const DEFAULT_PERMISSIONS: CustomPermissions = {
  can_book:        true,
  can_order:       true,
  can_cancel:      false,
  allowed_actions: [],
  blocked_topics:  [],
};

export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
  primary:     "el",
  secondary:   "en",
  auto_detect: true,
};
