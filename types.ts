
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
}

export interface VendorService {
  id: string;
  category: VendorCategory;
  location: string;
  description: string;
  imageUrl?: string;
  imageUrls?: string[];
  packages: ServicePackage[];
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