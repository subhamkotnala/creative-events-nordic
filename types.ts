
export enum VendorCategory {
  VENUES = 'Venues',
  PHOTOGRAPHY = 'Photography',
  VIDEOGRAPHY = 'Videography',
  MUSIC = 'Music',
  KIDS_ENTERTAINMENT = 'Kids Entertainment',
  CATERING = 'Catering',
  BARTENDING = 'Bartending',
  EVENT_PLANNERS = 'Event Planners',
  DECOR = 'Decor',
  FLORALS = 'Florals',
  RENTALS_PROPS = 'Rentals / Props',
  LIGHTING = 'Lighting',
  AUDIO = 'Audio',
  BEAUTY = 'Beauty',
  STYLING = 'Styling',
  EVENT_STAFF = 'Event Staff',
  HOST = 'Host',
  BAND_LIVE_MUSIC = 'Band / Live Music',
  OTHER = 'Other'
}

export enum VendorStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NOT_VERIFIED = 'NOT_VERIFIED',
  VERIFIED = 'VERIFIED'
}

export type Language = 'en' | 'sv';

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrls?: string[];
  capacity?: number;
}

export interface VendorService {
  id: string;
  category: VendorCategory;
  location: string;
  description: string;
  imageUrl?: string;
  imageUrls?: string[];
  packages: ServicePackage[];
  count?: number;
}

export interface Vendor {
  id: string;
  userId: string; // Linked to a User account
  auth_id?: string; // Optional auth_id
  name: string;
  status: VendorStatus;
  services: VendorService[];
  email: string;
  phone?: string;
  website?: string;
  joinedAt: string;
  rating: number;
  isFeatured?: boolean;
  views?: number;
  inquiries?: number;
  // Initial application details
  applicationStory?: string;
  applicationLocation?: string;
  applicationImageUrl?: string;
  applicationGalleryUrls?: string[];
  socials?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    tiktok?: string;
  };
  verified?: boolean;
}

export type UserRole = 'USER' | 'VENDOR' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  favorites: string[]; // List of vendor IDs
  createdAt: string;
  avatarUrl?: string;
}

export interface Session {
  user: UserProfile | null;
  token: string | null;
}

export interface Conversation {
  id: string;
  user_id: string;
  vendor_id: string;
  package_name?: string;
  package_price?: number;
  service_category?: string;
  vendor_name?: string;
  user_name?: string;
  created_at: string;
  last_message_at: string;
  last_message?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'USER' | 'VENDOR';
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface Ad {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  budget?: number;
  location?: string;
  event_date?: string;
  status: 'OPEN' | 'CLOSED';
  created_at: string;
  updated_at: string;
  // Joined fields (not in DB — enriched client-side)
  user_name?: string;
  user_email?: string;
  reply_count?: number;
}

export interface AdReply {
  id: string;
  ad_id: string;
  sender_id: string;
  sender_role: 'USER' | 'VENDOR' | 'ADMIN';
  content: string;
  is_read: boolean;
  created_at: string;
  // Joined field
  sender_name?: string;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  caption?: string;
  location?: string;
  sort_order?: number;
  created_at: string;
}

export interface TicketTier {
  id: string;
  name: string;
  price_sek: number;
  description?: string;
  badge?: string;
}

export interface EventTicketOrder {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_time?: string;
  event_location: string;
  event_city: string;
  tier_name: string;
  quantity: number;
  total_price_sek: number;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  payment_method: 'SWISH' | 'STRIPE' | 'FREE' | 'CARD';
  payment_reference: string;
  qr_code_data: string;
  created_at: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
}

export interface VendorTableBookingInfo {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  category: string;
  booking_reference: string;
  booked_at: string;
  payment_method?: 'SWISH' | 'STRIPE' | 'CARD';
}

export interface VendorTable {
  id: string;
  table_number: string;
  zone: string;
  size?: string;
  price_sek: number;
  power_included?: boolean;
  status: 'AVAILABLE' | 'RESERVED' | 'BOOKED';
  location_description?: string;
  map_coordinates?: { x: number; y: number };
  booked_by_name?: string;
  booked_by_email?: string;
  booked_by_phone?: string;
  booked_by_vendor?: VendorTableBookingInfo;
  booking_ref?: string;
  merchandise_category?: string;
}

export interface OrganizedEvent {
  id: string;
  title: string;
  tagline?: string;
  description: string;
  category: string;
  start_date: string;
  end_date?: string;
  time?: string;
  location_name: string;
  city: string;
  address?: string;
  image_url: string;
  gallery_urls?: string[];
  price?: string;
  capacity?: string | number;
  ticket_url?: string;
  registration_email?: string;
  registration_phone?: string;
  highlights?: string[];
  organizer?: string;
  is_featured: boolean;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'SOLD_OUT';
  created_at: string;
  updated_at?: string;
  // Floorplan / Map & Tables
  floor_plan_image_url?: string;
  vendor_tables?: VendorTable[];
  ticket_tiers?: TicketTier[];
  ticket_price_sek?: number;
}

export type EventBookingStatus = 'PENDING' | 'APPROVED' | 'CONFIRMED' | 'WAITLIST' | 'REJECTED' | 'CANCELLED';
export type BookingPaymentStatus = 'UNPAID' | 'DEPOSIT_PAID' | 'PAID_IN_FULL' | 'REFUNDED';

export interface BoothPackage {
  id: string;
  event_id?: string;
  name: string;
  tier: 'standard' | 'premium' | 'culinary' | 'artisan' | 'sponsor';
  dimensions: string; // e.g. "3x3m (9m²)"
  price: number; // in SEK
  currency: string;
  description: string;
  features: string[];
  badge?: string;
  popular?: boolean;
  allowed_zones?: string[];
  max_spots?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EventTableSlot {
  id: string; // e.g. "A-01"
  table_number: string; // "Table A-01"
  zone: string; // "Zone A - Premium Island", "Zone B - Standard Hall", "Zone C - Culinary", "Zone D - Artisan Pop-up"
  tier: 'standard' | 'premium' | 'culinary' | 'artisan' | 'sponsor';
  description?: string;
  status: 'available' | 'reserved' | 'booked';
  booked_by_name?: string;
  booked_booking_ref?: string;
  price_override?: number;
  row?: number;
  col?: number;
  x?: number; // 0-100% position on map image
  y?: number; // 0-100% position on map image
  map_coordinates?: { x: number; y: number };
  size?: string;
  price_sek?: number;
  power_included?: boolean;
}

export interface EventMarketLayout {
  id: string;
  event_id: string;
  name: string;
  description?: string;
  map_image_url?: string;
  floor_plan_image_url?: string;
  zones?: string[];
  slots: EventTableSlot[];
  updated_at?: string;
}

export interface VendorEventBooking {
  id: string;
  booking_ref: string; // e.g. "CEB-2026-8491"
  event_id: string;
  event_title: string;
  event_date: string;
  event_city: string;
  event_location: string;
  
  // Vendor info
  vendor_id?: string;
  user_id?: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  category: string;
  website?: string;
  socials?: string;
  
  // Booth Selection & Table Number
  booth_package_id: string;
  booth_package_name: string;
  price: number;
  currency: string;
  selected_table_id?: string;
  selected_table_number?: string;
  
  // Technical / Logistics Requirements
  power_needed: boolean;
  power_type?: 'standard_230v' | 'high_load_400v' | 'none';
  tables_count: number;
  chairs_count: number;
  staff_count: number;
  special_requests?: string;
  showcase_pitch?: string;
  
  // Payment Details
  payment_method?: 'swish' | 'card' | 'klarna' | 'invoice';
  payment_transaction_id?: string;
  payment_date?: string;
  subtotal?: number;
  vat_amount?: number;
  payer_company_vat?: string;
  
  // Administration
  status: EventBookingStatus;
  payment_status: BookingPaymentStatus;
  assigned_booth?: string; // e.g. "Stall #B-12"
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}