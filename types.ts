
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