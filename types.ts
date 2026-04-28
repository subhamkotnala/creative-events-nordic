
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
  REJECTED = 'REJECTED'
}

export type Language = 'en' | 'sv';

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrls?: string[];
}

export interface Vendor {
  id: string;
  userId: string; // Linked to a User account
  name: string;
  category: VendorCategory;
  location: string;
  description: string;
  imageUrl: string;
  imageUrls?: string[];
  status: VendorStatus;
  services: Service[];
  email: string;
  phone?: string;
  website?: string;
  joinedAt: string;
  rating: number;
  isFeatured?: boolean;
  views?: number;
  inquiries?: number;
  socials?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    tiktok?: string;
  };
  // FIX: Added password fields to Vendor interface to resolve registration flow errors
  password?: string;
  passwordSet?: boolean;
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