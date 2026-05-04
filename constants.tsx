
import { VendorCategory, VendorStatus, Vendor } from './types';

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: '1',
    // FIX: Added missing userId
    userId: 'admin-1',
    name: 'Stockholm Grand Hall',
    status: VendorStatus.APPROVED,
    isFeatured: true,
    services: [
      {
        id: 'vs1',
        category: VendorCategory.VENUES,
        location: 'Stockholm',
        description: 'A historic and prestigious venue in the heart of Stockholm, offering unparalleled elegance for high-end weddings and corporate galas.',
        imageUrl: 'https://images.unsplash.com/photo-1519222970733-f546218fa6d7?auto=format&fit=crop&q=80&w=800',
        packages: [
          { id: 's1', name: 'Exclusive Weekend Rental', description: 'Full access to the main hall and garden for the entire weekend.', price: 125000 }
        ]
      }
    ],
    email: 'events@grandhall.se',
    joinedAt: '2024-01-10',
    rating: 4.9,
    socials: {
      instagram: 'https://instagram.com/stockholmgrandhall',
    }
  },
  {
    id: '2',
    // FIX: Added missing userId
    userId: 'admin-1',
    name: 'Creative Frames',
    status: VendorStatus.APPROVED,
    isFeatured: true,
    services: [
      {
        id: 'vs2',
        category: VendorCategory.PHOTOGRAPHY,
        location: 'Gothenburg',
        description: 'Award-winning photography studio specializing in cinematic event coverage and high-fashion portraiture with a focus on natural light.',
        imageUrl: 'https://images.unsplash.com/photo-1512295767273-ac109ac31f33?auto=format&fit=crop&q=80&w=800',
        packages: [
          { id: 's2', name: 'Signature Wedding Collection', description: '10 hours of coverage, 2 photographers, and a premium leather-bound album.', price: 35000 }
        ]
      }
    ],
    email: 'hello@creativeframes.se',
    joinedAt: '2024-02-15',
    rating: 5.0,
  },
  {
    id: '3',
    // FIX: Added missing userId
    userId: 'admin-1',
    name: 'Malmö Flavors',
    status: VendorStatus.PENDING,
    services: [
      {
        id: 'vs3',
        category: VendorCategory.CATERING,
        location: 'Malmö',
        description: 'Exquisite Nordic fusion catering. We bring Michelin-star quality to your private events with locally sourced, seasonal ingredients.',
        imageUrl: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=800',
        packages: [
          { id: 's3', name: '7-Course Tasting Menu', description: 'A curated dining experience for up to 50 guests, including wine pairing.', price: 1800 }
        ]
      }
    ],
    email: 'info@malmoflavors.se',
    joinedAt: '2024-05-20',
    rating: 4.8,
  }
];

export const SWEDEN_REGIONS = [
  'Stockholm',
  'Gothenburg',
  'Malmö',
  'Uppsala',
  'Västerås',
  'Örebro',
  'Linköping',
  'Helsingborg',
  'Jönköping',
  'Norrköping',
  'Lund',
  'Umeå',
  'Gävle',
  'Borås',
  'Södertälje',
  'Eskilstuna',
  'Karlstad',
  'Halmstad',
  'Växjö',
  'Östersund',
  'Gotland',
  'Dalarna',
  'Lapland',
  'All of Sweden'
];

export const AVAILABLE_LOCATIONS = [...SWEDEN_REGIONS, 'All of Europe'];