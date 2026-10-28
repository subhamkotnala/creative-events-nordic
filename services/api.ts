import { 
  Vendor, UserProfile, VendorStatus, Session, VendorCategory, 
  Conversation, Message, Ad, AdReply, OrganizedEvent,
  VendorEventBooking, BoothPackage, EventBookingStatus, BookingPaymentStatus,
  EventTableSlot, EventMarketLayout, VendorTable, TicketTier, EventTicketOrder
} from '../types';
import { supabase } from '../supabaseClient';
import { safeStorage, compressImage } from './safeStorage';

export const DEFAULT_MAP_PRESETS = [
  {
    name: 'Stockholm Annexet & Arena Blueprint',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=1400&q=80'
  },
  {
    name: 'Grand Convention Hall & Pavilion Plan',
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=80'
  },
  {
    name: 'Münchenbryggeriet Event Hall Plan',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80'
  }
];

export function generateDefaultVendorTables(eventId?: string): VendorTable[] {
  return [
    {
      id: 'table-p-01',
      table_number: 'P-01',
      zone: 'Premium Front Entrance',
      size: '3.0m x 2.0m Corner Showcase',
      price_sek: 3500,
      power_included: true,
      status: 'AVAILABLE',
      location_description: 'Facing Main Welcome Arch & Registration',
      map_coordinates: { x: 20, y: 35 }
    },
    {
      id: 'table-p-02',
      table_number: 'P-02',
      zone: 'Premium Front Entrance',
      size: '3.0m x 2.0m Prime Island',
      price_sek: 3500,
      power_included: true,
      status: 'AVAILABLE',
      location_description: 'Boulevard Entrance Left Flank',
      map_coordinates: { x: 34, y: 35 }
    },
    {
      id: 'table-f-01',
      table_number: 'F-01',
      zone: 'Food & Sweets Bazaar',
      size: '2.5m x 1.5m Culinary Table',
      price_sek: 2800,
      power_included: true,
      status: 'AVAILABLE',
      location_description: 'Culinary Court North Wing with water supply',
      map_coordinates: { x: 50, y: 35 }
    },
    {
      id: 'table-f-02',
      table_number: 'F-02',
      zone: 'Food & Sweets Bazaar',
      size: '2.5m x 1.5m Culinary Table',
      price_sek: 2800,
      power_included: true,
      status: 'AVAILABLE',
      location_description: 'Culinary Court Central Alley',
      map_coordinates: { x: 65, y: 35 }
    },
    {
      id: 'table-j-01',
      table_number: 'J-01',
      zone: 'Ethnic Wear & Jewelry Pavilion',
      size: '2.0m x 1.2m Fashion Booth',
      price_sek: 2200,
      power_included: false,
      status: 'AVAILABLE',
      location_description: 'Designer Showcase Row A',
      map_coordinates: { x: 80, y: 35 }
    },
    {
      id: 'table-j-02',
      table_number: 'J-02',
      zone: 'Ethnic Wear & Jewelry Pavilion',
      size: '2.0m x 1.2m Fashion Booth',
      price_sek: 2200,
      power_included: false,
      status: 'AVAILABLE',
      location_description: 'Designer Showcase Row B',
      map_coordinates: { x: 20, y: 65 }
    },
    {
      id: 'table-c-01',
      table_number: 'C-01',
      zone: 'Henna, Crafts & Decor',
      size: '2.0m x 1.0m Artisan Table',
      price_sek: 1500,
      power_included: false,
      status: 'AVAILABLE',
      location_description: 'Artisan Arcade Stall 1',
      map_coordinates: { x: 38, y: 65 }
    },
    {
      id: 'table-c-02',
      table_number: 'C-02',
      zone: 'Henna, Crafts & Decor',
      size: '2.0m x 1.0m Artisan Table',
      price_sek: 1500,
      power_included: false,
      status: 'AVAILABLE',
      location_description: 'Artisan Arcade Stall 2',
      map_coordinates: { x: 54, y: 65 }
    },
    {
      id: 'table-c-03',
      table_number: 'C-03',
      zone: 'Henna, Crafts & Decor',
      size: '2.0m x 1.0m Artisan Table',
      price_sek: 1500,
      power_included: false,
      status: 'AVAILABLE',
      location_description: 'Artisan Arcade Stall 3',
      map_coordinates: { x: 70, y: 65 }
    },
    {
      id: 'table-t-01',
      table_number: 'T-01',
      zone: 'General Vendor Stall',
      size: '2.0m x 1.2m Standard Table',
      price_sek: 1800,
      power_included: false,
      status: 'AVAILABLE',
      location_description: 'Exhibition Hall General Row',
      map_coordinates: { x: 85, y: 65 }
    }
  ];
}

export const DEFAULT_ORGANIZED_EVENTS: OrganizedEvent[] = [
  {
    id: 'ce-event-1',
    title: 'Nordic Grand Wedding & Bridal Showcase 2026',
    tagline: "Sweden's premier gathering of luxury bridal designers, florist masters, caterers, and photographers.",
    description: "Join us for the pinnacle wedding planning event of the season curated exclusively by Creative Events Nordic. Explore breathtaking tablescape displays, meet verified photographers, sample bespoke wedding cakes, and experience our 14:00 bridal runway show with Scandinavia's most acclaimed wedding houses.",
    category: 'Bridal & Wedding Fair',
    start_date: '2026-11-14',
    end_date: '2026-11-14',
    time: '11:00 - 18:00',
    location_name: 'Münchenbryggeriet Event Hall',
    city: 'Stockholm',
    address: 'Torkel Knutssonsgatan 2, 118 25 Stockholm',
    image_url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
    floor_plan_image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80',
    vendor_tables: generateDefaultVendorTables('ce-event-1'),
    gallery_urls: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'
    ],
    price: 'Free Registration',
    capacity: '600 Attendees',
    ticket_url: '',
    registration_email: 'sandy@creativeventsnordic.com',
    registration_phone: '+46 70 123 45 67',
    highlights: [
      'Over 50 curated Nordic wedding specialists',
      'Runway Fashion Showcase at 14:00',
      'Complimentary sparkling wine tasting',
      'Exclusive booking discounts and prize giveaways'
    ],
    organizer: 'Creative Events Nordic',
    is_featured: true,
    status: 'UPCOMING',
    created_at: '2026-03-01T10:00:00Z'
  },
  {
    id: 'ce-event-2',
    title: 'Stockholm Waterfront Food & Culture Festival',
    tagline: 'A celebration of Nordic gastronomy, artisanal street food, craft mixology, and acoustic live stages.',
    description: "Creative Events brings together Stockholm's finest caterers, food trucks, craft microbrewers, and artisan dessert creators for an unforgettable weekend by the water. Featuring interactive culinary masterclasses, acoustic sunset sessions, and activities for families.",
    category: 'Festival & Culinary',
    start_date: '2026-12-05',
    end_date: '2026-12-06',
    time: '12:00 - 22:00',
    location_name: 'Skeppsholmen Waterfront Grounds',
    city: 'Stockholm',
    address: 'Slupskjulsvägen 26, 111 49 Stockholm',
    image_url: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80',
    price: '150 SEK (Kids under 12 Free)',
    capacity: '1200 Attendees',
    ticket_url: '',
    registration_email: 'sandy@creativeventsnordic.com',
    highlights: [
      '25+ Award-winning culinary stations',
      'Live DJ sets & sunset waterfront lounge',
      'Interactive cocktail & barista masterclasses',
      'Family entertainment & games zone'
    ],
    organizer: 'Creative Events Nordic',
    is_featured: true,
    status: 'UPCOMING',
    created_at: '2026-03-02T10:00:00Z'
  },
  {
    id: 'ce-event-3',
    title: 'Nordic Event Industry Leadership & Vendor Gala',
    tagline: 'Annual gala and networking summit honoring vendor excellence, sustainability, and collaborative growth.',
    description: 'An exclusive black-tie gala hosted by Creative Events Nordic, celebrating the vendors, planners, and creatives who transform events across Sweden. The evening includes a seated 3-course dinner, vendor awards, panel discussions on event trends, and high-energy networking.',
    category: 'Networking & Gala',
    start_date: '2027-01-22',
    end_date: '2027-01-22',
    time: '18:30 - 23:30',
    location_name: 'Clarion Hotel Post Grand Ballroom',
    city: 'Gothenburg',
    address: 'Drottningtorget 10, 411 03 Göteborg',
    image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    price: '350 SEK',
    capacity: '350 Attendees',
    ticket_url: '',
    registration_email: 'sandy@creativeventsnordic.com',
    highlights: [
      'Keynotes on 2027 Event Design & Green Staging',
      'Nordic Vendor of the Year Awards',
      'Three-course Nordic banquet with wine pairing',
      'Live swing & soul band afterparty'
    ],
    organizer: 'Creative Events Nordic',
    is_featured: true,
    status: 'UPCOMING',
    created_at: '2026-03-03T10:00:00Z'
  },
  {
    id: 'ce-event-4',
    title: 'Malmö Creative Pop-Up Market & Design Fair',
    tagline: 'A vibrant indoor market showcasing indie florists, rental stylists, bakers, and sound engineers.',
    description: 'Discover fresh event concepts and hire local indie talent directly. Creative Events transforms Lokstallarna into an immersive bazaar of creative table settings, photo installations, bespoke invitations, and live lighting demonstrations.',
    category: 'Market & Fair',
    start_date: '2027-02-14',
    end_date: '2027-02-14',
    time: '10:00 - 17:00',
    location_name: 'Lokstallarna i Kirseberg',
    city: 'Malmö',
    address: 'Södra Bulltoftavägen 51, 212 22 Malmö',
    image_url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
    price: 'Free Entry',
    capacity: '800 Attendees',
    ticket_url: '',
    registration_email: 'sandy@creativeventsnordic.com',
    highlights: [
      '40+ Boutique creators & rental specialists',
      'Live floral arrangement and balloon styling workshops',
      'Valentine photo installation stations',
      'Local bakery & specialty coffee bar'
    ],
    organizer: 'Creative Events Nordic',
    is_featured: false,
    status: 'UPCOMING',
    created_at: '2026-03-04T10:00:00Z'
  }
];

class ApiService {
  
  async init(): Promise<void> {
    // Initialization logic if needed
    return Promise.resolve();
  }

  // --- AUTH METHODS (Refactored to Supabase Auth - to be implemented fully) ---
  async login(email: string, password?: string): Promise<Session> {
    throw new Error("Login functionality is being migrated to Supabase Auth SDK.");
  }

  async logout() {
    await supabase.auth.signOut();
  }

  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return null;

    // Fetch profile for role checking with robust fallback
    let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

    if (!profile) {
        const { data: profileByAuthId } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_id', session.user.id)
            .maybeSingle();
        profile = profileByAuthId;
    }

    if (!profile) {
        const { data: profileById } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
        profile = profileById;
    }
        
    return {
        user: profile ? this.mapProfileToUser(profile) : { id: session.user.id, email: session.user.email || '', name: session.user.email || '', role: 'USER', favorites: [], createdAt: '', avatarUrl: '' },
        token: session.access_token
    } as Session;
  }

  // --- VENDOR METHODS ---
  async getVendors(): Promise<Vendor[]> {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'VENDOR');

    const { data: applications } = await supabase
      .from('applications')
      .select('*')
      .neq('status', 'APPROVED');

    const vendors: Vendor[] = [];

    if (profiles) {
      vendors.push(...profiles.map(p => this.mapProfileToVendor(p, VendorStatus.APPROVED)));
    }

    if (applications) {
      vendors.push(...applications.map(a => this.mapApplicationToVendor(a)));
    }

    return vendors;
  }

  async getVendor(id: string): Promise<Vendor | null> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !profile) return null;

    return this.mapProfileToVendor(profile, VendorStatus.APPROVED);
  }

  async incrementVendorViews(id: string): Promise<void> {
    const { data } = await supabase.from('profiles').select('views').eq('id', id).single();
    const current = data?.views || 0;
    await supabase.from('profiles').update({ views: current + 1 }).eq('id', id);
  }

  async incrementVendorInquiries(id: string): Promise<void> {
    const { data } = await supabase.from('profiles').select('inquiries').eq('id', id).single();
    const current = data?.inquiries || 0;
    await supabase.from('profiles').update({ inquiries: current + 1 }).eq('id', id);
  }

  async saveVendor(vendor: Vendor): Promise<void> {
    if (vendor.status === VendorStatus.APPROVED) {
        // Upsert approved vendor in profiles
        const updateData: any = {
            id: vendor.id,
            auth_id: vendor.auth_id,
            business_name: vendor.name,
            email: vendor.email,
            role: 'VENDOR',
            phone: vendor.phone,
            website: vendor.website,
            socials: vendor.socials,
            services: vendor.services,
            is_featured: vendor.isFeatured,
            rating: vendor.rating,
            application_story: vendor.applicationStory,
            application_location: vendor.applicationLocation,
            application_image_url: vendor.applicationImageUrl,
            application_gallery_urls: vendor.applicationGalleryUrls
        };

        const { error } = await supabase
            .from('profiles')
            .upsert(updateData);
        if (error) throw error;
    } else {
        // Create or Update Application
        const payload = {
            id: vendor.id, // Explicitly pass ID for upsert
            business_name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            website: vendor.website,
            socials: vendor.socials || {},
            services: vendor.services || [],
            status: vendor.status || 'PENDING',
            application_story: vendor.applicationStory,
            application_location: vendor.applicationLocation,
            application_image_url: vendor.applicationImageUrl,
            application_gallery_urls: vendor.applicationGalleryUrls,
            auth_id: vendor.auth_id
        };

        // Use UPSERT to handle both creation of new applications (with client-gen IDs)
        // and updates to existing pending applications.
        const { error } = await supabase.from('applications').upsert(payload);
        if (error) throw error;
    }
  }

  async deleteUser(auth_id: string, id: string): Promise<void> {
    console.log(`[API] deleteUser requested for auth_id: ${auth_id}, id: ${id}`);
    
    if (!auth_id) {
      console.warn("[API] No auth_id provided for deletion, using id as fallback");
      auth_id = id;
    }

    // 1. Call server API to delete from auth.users AND profiles/applications by auth_id
    const response = await fetch(`/api/delete-user?auth_id=${encodeURIComponent(auth_id)}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      let errorMessage = "Deletion failed on server.";
      try {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server Error (${response.status}): ${text || "No response body"}`;
        }
      } catch (e) {
        errorMessage = `Server Error (${response.status}): Unable to read response body.`;
      }
      throw new Error(errorMessage);
    }

    // 2. Local cleanup for any remaining records
    // Even if id and auth_id are same, we try redundant delete as safety measure
    // Note: This might be blocked by RLS if not using service role, but server-side handles it too
    try {
      await supabase.from('profiles').delete().eq('id', id);
      if (auth_id) await supabase.from('profiles').delete().eq('auth_id', auth_id);
      await supabase.from('applications').delete().eq('id', id);
      if (auth_id) await supabase.from('applications').delete().eq('auth_id', auth_id);
    } catch (localErr) {
      console.warn("[API] Local cleanup warning (likely RLS):", localErr);
    }
  }

  async deleteVendor(id: string): Promise<void> {
    // Try both id and auth_id
    await supabase.from('profiles').delete().eq('id', id);
    await supabase.from('profiles').delete().eq('auth_id', id);
    await supabase.from('applications').delete().eq('id', id);
    await supabase.from('applications').delete().eq('auth_id', id);
  }

  async updateVendorStatus(id: string, status: VendorStatus): Promise<void> {
    if (status === VendorStatus.APPROVED) {
        // 1. Fetch application record
        const { data: app, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', id)
            .single();
        
        if (fetchError || !app) throw new Error("Application not found.");
        
        if (!app.auth_id) throw new Error("Application is not linked to a user.");

        // 2. Find existing profile record
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_id', app.auth_id)
            .single();

        if (profileError || !profile) throw new Error("Profile not found for this user.");

        // 3. Update existing profile record from application details
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                role: 'VENDOR',
                business_name: app.business_name,
                phone: app.phone,
                website: app.website,
                socials: app.socials,
                services: app.services,
                application_story: app.application_story,
                application_location: app.application_location,
                application_image_url: app.application_image_url,
                application_gallery_urls: app.application_gallery_urls
            })
            .eq('id', profile.id); // Update by profile.id

        if (updateError) throw updateError;

        // 4. Delete the application record
        const { error: deleteError } = await supabase.from('applications').delete().eq('id', id);
        if (deleteError) throw deleteError;
    } else {
        const { error } = await supabase.from('applications').update({ status }).eq('id', id);
        if (error) throw error;
    }
  }

  async toggleFeatured(id: string): Promise<void> {
    const { data: profile } = await supabase.from('profiles').select('is_featured').eq('id', id).single();
    if (profile) {
        await supabase.from('profiles').update({ is_featured: !profile.is_featured }).eq('id', id);
    }
  }

  async toggleVerified(id: string): Promise<void> {
    try {
      const { data: profile } = await supabase.from('profiles').select('verified').eq('id', id).single();
      if (profile && 'verified' in profile) {
        await supabase.from('profiles').update({ verified: !profile.verified }).eq('id', id);
        localStorage.setItem(`verified_vendor_${id}`, String(!profile.verified));
        return;
      }
    } catch (e) {
      console.warn("Could not select/update verified column from database", e);
    }
    const current = localStorage.getItem(`verified_vendor_${id}`) === 'true';
    localStorage.setItem(`verified_vendor_${id}`, String(!current));
  }

  async updateProfile(user: UserProfile): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ business_name: user.name })
        .eq('id', user.id);
        
    if (error) throw error;

    const session = await this.getCurrentSession();
    if (session) {
      session.user = user;
      localStorage.setItem('ce_session', JSON.stringify(session));
    }
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
        
    if (error) throw error;
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .limit(1);

    if (profiles && profiles.length > 0) return true;

    // Only block if there is an application that is NOT rejected
    const { data: apps } = await supabase
      .from('applications')
      .select('id')
      .ilike('email', email)
      .neq('status', VendorStatus.REJECTED)
      .limit(1);

    if (apps && apps.length > 0) return true;

    return false;
  }

  // --- MAPPERS ---
  private mapProfileToUser(p: any): UserProfile {
      return {
          id: p.id,
          email: p.email,
          name: p.business_name || p.email,
          role: p.role as any,
          favorites: [], 
          createdAt: p.joined_at,
          avatarUrl: p.application_image_url || p.services?.[0]?.imageUrl || p.avatarUrl
      };
  }

  private mapProfileToVendor(p: any, status: VendorStatus): Vendor {
      return {
          id: p.id,
          userId: p.id,
          auth_id: p.auth_id || p.id, // Profile id is usually the auth_id
          name: p.business_name,
          status: status,
          services: p.services || [],
          email: p.email,
          phone: p.phone,
          website: p.website,
          joinedAt: p.joined_at,
          rating: p.rating || 0,
          isFeatured: p.is_featured,
          views: p.views || 0,
          inquiries: p.inquiries || 0,
          socials: p.socials || {},
          verified: p.verified !== undefined ? !!p.verified : (p.is_verified !== undefined ? !!p.is_verified : (localStorage.getItem(`verified_vendor_${p.id}`) === 'true')),
          applicationStory: p.application_story,
          applicationLocation: p.application_location,
          applicationImageUrl: p.application_image_url,
          applicationGalleryUrls: p.application_gallery_urls
      };
  }

  private mapApplicationToVendor(a: any): Vendor {
      return {
          id: a.id,
          userId: 'pending',
          auth_id: a.auth_id,
          name: a.business_name,
          status: a.status as VendorStatus,
          services: a.services || [],
          email: a.email,
          phone: a.phone,
          website: a.website,
          joinedAt: a.created_at,
          rating: 0,
          isFeatured: false,
          socials: a.socials || {},
          verified: !!a.verified,
          applicationStory: a.application_story,
          applicationLocation: a.application_location,
          applicationImageUrl: a.application_image_url,
          applicationGalleryUrls: a.application_gallery_urls
      };
  }
  // --- CHAT METHODS ---

  async createOrGetConversation(
    userId: string,
    vendorId: string,
    packageName: string | undefined,
    packagePrice: number | undefined,
    serviceCategory: string | undefined,
    vendorName: string,
    userName: string
  ): Promise<Conversation> {
    // Try to find an existing conversation for this user/vendor/package combo
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('vendor_id', vendorId);

    if (packageName) {
      query = query.eq('package_name', packageName);
    } else {
      query = query.is('package_name', null);
    }

    const { data: existing } = await query.maybeSingle();
    if (existing) return existing as Conversation;

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        vendor_id: vendorId,
        package_name: packageName || null,
        package_price: packagePrice || null,
        service_category: serviceCategory || null,
        vendor_name: vendorName,
        user_name: userName,
        last_message: '',
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Conversation;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: 'USER' | 'VENDOR',
    content: string
  ): Promise<Message> {
    const session = await this.getCurrentSession();
    if (session?.user?.role === 'ADMIN') {
      try {
        const response = await fetch(`/api/admin/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ conversationId, senderId, senderRole, content })
        });
        if (response.ok) {
          return await response.json() as Message;
        } else {
          const errData = await response.json();
          throw new Error(errData.error || "Failed admin message posting");
        }
      } catch (err) {
        console.error("Failed to send message via admin proxy, falling back:", err);
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_role: senderRole,
        content,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Update last_message on conversation
    await supabase
      .from('conversations')
      .update({
        last_message: content.length > 80 ? content.slice(0, 80) + '...' : content,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return data as Message;
  }

  async getConversations(profileId: string, role: 'USER' | 'VENDOR'): Promise<Conversation[]> {
    const field = role === 'USER' ? 'user_id' : 'vendor_id';
    
    const session = await this.getCurrentSession();
    if (session?.user?.role === 'ADMIN') {
      try {
        const response = await fetch(`/api/admin/conversations/${profileId}`, {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          return await response.json() as Conversation[];
        }
      } catch (err) {
        console.error("Failed to fetch admin conversation proxy:", err);
      }
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq(field, profileId)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Conversation[];
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const session = await this.getCurrentSession();
    if (session?.user?.role === 'ADMIN') {
      try {
        const response = await fetch(`/api/admin/conversations/${conversationId}/messages`, {
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          return await response.json() as Message[];
        }
      } catch (err) {
        console.error("Failed to fetch admin messages proxy:", err);
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as Message[];
  }

  async markMessagesRead(conversationId: string, viewerRole: 'USER' | 'VENDOR'): Promise<void> {
    const session = await this.getCurrentSession();
    if (session?.user?.role === 'ADMIN') {
      try {
        const response = await fetch(`/api/admin/conversations/${conversationId}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ viewerRole })
        });
        if (response.ok) return;
      } catch (err) {
        console.error("Failed to mark read via admin proxy:", err);
      }
    }

    const senderRole = viewerRole === 'USER' ? 'VENDOR' : 'USER';
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_role', senderRole)
      .eq('is_read', false);
  }

  async getUnreadCount(profileId: string, role: 'USER' | 'VENDOR'): Promise<number> {
    const field = role === 'USER' ? 'user_id' : 'vendor_id';
    const senderRole = role === 'USER' ? 'VENDOR' : 'USER';

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq(field, profileId);

    if (!conversations || conversations.length === 0) return 0;

    const convIds = conversations.map((c: any) => c.id);
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .eq('sender_role', senderRole)
      .eq('is_read', false);

    return count || 0;
  }

  // --- AD BOARD METHODS ---

  async getAds(filters?: { category?: string; status?: string }): Promise<Ad[]> {
    let query = supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;

    const ads = data || [];

    // Enrich with user names from profiles
    const userIds = [...new Set(ads.map((a: any) => a.user_id))];
    let profileMap: Record<string, string> = {};
    let emailMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const uuidUserIds = userIds.filter((id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      const emailUserIds = userIds.filter((id: string) => id.includes('@'));
      
      let queryByFields = supabase
        .from('profiles')
        .select('id, auth_id, business_name, email');
      
      let orClauses: string[] = [];
      const cleanIds = userIds.filter(id => !id.includes('@'));
      if (cleanIds.length > 0) {
        orClauses.push(`id.in.(${cleanIds.join(',')})`);
      }
      if (uuidUserIds.length > 0) {
        orClauses.push(`auth_id.in.(${uuidUserIds.join(',')})`);
      }
      if (emailUserIds.length > 0) {
        orClauses.push(`email.in.(${emailUserIds.join(',')})`);
      }
      
      if (orClauses.length > 0) {
        queryByFields = queryByFields.or(orClauses.join(','));
      }

      const { data: profiles } = await queryByFields;
      (profiles || []).forEach((p: any) => {
        const name = p.business_name || p.email || 'User';
        profileMap[p.id] = name;
        if (p.email) {
          emailMap[p.id] = p.email;
        }
        if (p.auth_id) {
          profileMap[p.auth_id] = name;
          if (p.email) {
            emailMap[p.auth_id] = p.email;
          }
        }
        if (p.email) {
          profileMap[p.email] = name;
          profileMap[p.email.toLowerCase()] = name;
          emailMap[p.email] = p.email;
          emailMap[p.email.toLowerCase()] = p.email;
        }
      });
    }

    return ads.map((a: any) => ({
      ...a,
      user_name: profileMap[a.user_id] || a.user_id || 'User',
      user_email: emailMap[a.user_id] || (a.user_id.includes('@') ? a.user_id : undefined),
    })) as Ad[];
  }

  async createAd(data: {
    title: string;
    description: string;
    category: string;
    budget?: number;
    location?: string;
    event_date?: string;
  }): Promise<Ad> {
    const session = await this.getCurrentSession();
    if (!session?.user) throw new Error('Not authenticated');

    const { data: result, error } = await supabase
      .from('ads')
      .insert({
        user_id: session.user.id,
        title: data.title,
        description: data.description,
        category: data.category,
        budget: data.budget || null,
        location: data.location || null,
        event_date: data.event_date || null,
        status: 'OPEN',
      })
      .select()
      .single();

    if (error) throw error;
    return result as Ad;
  }

  async updateAdStatus(adId: string, status: 'OPEN' | 'CLOSED'): Promise<void> {
    const { error } = await supabase
      .from('ads')
      .update({ status })
      .eq('id', adId);
    if (error) throw error;
  }

  async deleteAd(adId: string): Promise<void> {
    const { error } = await supabase
      .from('ads')
      .delete()
      .eq('id', adId);
    if (error) throw error;
  }

  async getAdReplies(adId: string): Promise<AdReply[]> {
    const { data, error } = await supabase
      .from('ad_replies')
      .select('*')
      .eq('ad_id', adId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    const replies = data || [];

    // Enrich with sender names
    const senderIds = [...new Set(replies.map((r: any) => r.sender_id))];
    let profileMap: Record<string, string> = {};
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, business_name, email')
        .in('id', senderIds);
      (profiles || []).forEach((p: any) => {
        profileMap[p.id] = p.business_name || p.email || 'Vendor';
      });
    }

    return replies.map((r: any) => ({
      ...r,
      sender_name: profileMap[r.sender_id] || 'Vendor',
    })) as AdReply[];
  }

  async sendAdReply(adId: string, content: string, vendorId?: string): Promise<AdReply> {
    const session = await this.getCurrentSession();
    if (!session || !session.user) throw new Error('Not authenticated');
    const currentUser = session.user;

    const isUser = currentUser.role === 'USER';
    const finalSenderId = (isUser && vendorId) ? vendorId : currentUser.id;

    if (session.token) {
      try {
        const response = await fetch('/api/ad-replies', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            adId,
            content,
            senderId: finalSenderId,
            senderRole: currentUser.role,
          }),
        });

        if (response.ok) {
          return await response.json() as AdReply;
        } else {
          const errData = await response.json();
          console.warn('Failed to send ad reply via server proxy, falling back:', errData.error);
        }
      } catch (err) {
        console.warn('Failed to send ad reply via server proxy, falling back:', err);
      }
    }

    const insertPayload = {
      ad_id: adId,
      sender_id: finalSenderId,
      sender_role: currentUser.role as 'USER' | 'VENDOR' | 'ADMIN',
      content,
      is_read: false,
    };

    // Fallback: client-side direct database call
    // For USER (ad owner): the SELECT RLS on ad_replies does not cover their own
    // sent rows — it only surfaces vendor→user replies. Chaining .select().single()
    // after INSERT would therefore return PGRST116 (0 rows) and throw, making the
    // UI appear as if the send failed even though the INSERT succeeded.
    // Fix: insert-only for users, then return a locally constructed AdReply.
    if (isUser) {
      const { error } = await supabase.from('ad_replies').insert(insertPayload);
      if (error) throw error;
      return {
        id: crypto.randomUUID(),
        ad_id: adId,
        sender_id: finalSenderId,
        sender_role: 'USER',
        content,
        is_read: false,
        created_at: new Date().toISOString(),
      } as AdReply;
    }

    // For VENDOR and ADMIN: .select().single() works correctly with their RLS policies.
    const { data, error } = await supabase
      .from('ad_replies')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;
    return data as AdReply;
  }


  async markAdRepliesRead(adId: string, vendorId?: string): Promise<void> {
    const session = await this.getCurrentSession();
    if (!session?.user) return;
    
    let query = supabase
      .from('ad_replies')
      .update({ is_read: true })
      .eq('ad_id', adId)
      .eq('is_read', false);
      
    if (session.user.role === 'USER') {
      if (vendorId) {
        query = query.eq('sender_id', vendorId).eq('sender_role', 'VENDOR');
      } else {
        query = query.eq('sender_role', 'VENDOR');
      }
    } else if (session.user.role === 'VENDOR') {
      query = query.eq('sender_id', session.user.id).eq('sender_role', 'USER');
    }
    
    await query;
  }

  async getUnreadAdReplies(): Promise<Record<string, number>> {
    const session = await this.getCurrentSession();
    if (!session?.user) return {};

    const userId = session.user.id;
    const role = session.user.role;

    let query = supabase.from('ad_replies').select('ad_id');

    if (role === 'USER') {
      query = query.eq('sender_role', 'VENDOR').eq('is_read', false);
    } else if (role === 'VENDOR') {
      query = query.eq('sender_id', userId).eq('sender_role', 'USER').eq('is_read', false);
    } else if (role === 'ADMIN') {
      query = query.eq('is_read', false);
    } else {
      return {};
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching unread ad replies:', error);
      return {};
    }

    const counts: Record<string, number> = {};
    (data || []).forEach((item: any) => {
      counts[item.ad_id] = (counts[item.ad_id] || 0) + 1;
    });

    return counts;
  }

  // Returns the list of unique vendor senders for a given ad — for admin to build vendor-wise thread list
  async getAdReplyVendors(adId: string): Promise<{ sender_id: string; sender_name: string; sender_role: string }[]> {
    const { data, error } = await supabase
      .from('ad_replies')
      .select('sender_id, sender_role')
      .eq('ad_id', adId)
      .neq('sender_role', 'USER');

    if (error) throw error;
    const replies = data || [];

    // Unique sender_ids
    const seen = new Set<string>();
    const unique = replies.filter((r: any) => {
      if (seen.has(r.sender_id)) return false;
      seen.add(r.sender_id);
      return true;
    });

    if (unique.length === 0) return [];

    const senderIds = unique.map((r: any) => r.sender_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, business_name, email')
      .in('id', senderIds);

    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => {
      profileMap[p.id] = p.business_name || p.email || 'Vendor';
    });

    return unique.map((r: any) => ({
      sender_id: r.sender_id,
      sender_role: r.sender_role,
      sender_name: profileMap[r.sender_id] || 'Vendor',
    }));
  }

  async optimizeDescription(title: string): Promise<string> {
    const res = await fetch("/api/gemini/optimize-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to optimize description with AI.");
    }
    const data = await res.json();
    return data.description;
  }

  // ─── Gallery Photos ──────────────────────────────────────────────────────

  async getGalleryPhotos() {
    const { data, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async addGalleryPhoto(photo: { url: string; caption?: string; location?: string }) {
    const { data, error } = await supabase
      .from('gallery_photos')
      .insert([photo])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteGalleryPhoto(id: string) {
    const { error } = await supabase
      .from('gallery_photos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async uploadGalleryFile(file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const fileName = `gallery_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('gallery')
      .upload(fileName, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('gallery').getPublicUrl(fileName);
    return data.publicUrl;
  }

  // ─── Organized Events (Curated by Creative Events) ──────────────────────

  async getOrganizedEvents(): Promise<OrganizedEvent[]> {
    try {
      const { data, error } = await supabase
        .from('organized_events')
        .select('*')
        .order('start_date', { ascending: true });

      if (!error && data && data.length > 0) {
        await safeStorage.setItem('creative_organized_events', JSON.stringify(data));
        return data as OrganizedEvent[];
      }
    } catch (err) {
      console.warn('Supabase organized_events query skipped or failed, using local store:', err);
    }

    // Fallback to local storage or defaults
    const cached = await safeStorage.getItem('creative_organized_events');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as OrganizedEvent[];
        }
      } catch (e) {
        console.error('Error parsing cached organized events:', e);
      }
    }

    await safeStorage.setItem('creative_organized_events', JSON.stringify(DEFAULT_ORGANIZED_EVENTS));
    return DEFAULT_ORGANIZED_EVENTS;
  }

  async getOrganizedEvent(id: string): Promise<OrganizedEvent | null> {
    const all = await this.getOrganizedEvents();
    return all.find(e => e.id === id) || null;
  }

  async saveOrganizedEvent(eventData: Partial<OrganizedEvent>): Promise<OrganizedEvent> {
    const isNew = !eventData.id;
    const id = eventData.id || `ce-event-${Date.now()}`;
    const existingList = await this.getOrganizedEvents();

    const existingEvent = existingList.find(e => e.id === id);

    let floorPlanUrl = eventData.floor_plan_image_url !== undefined ? eventData.floor_plan_image_url : (existingEvent?.floor_plan_image_url || '');
    if (floorPlanUrl && floorPlanUrl.startsWith('data:image/') && floorPlanUrl.length > 150000) {
      try {
        floorPlanUrl = await compressImage(floorPlanUrl, 1600, 1200, 0.78);
      } catch {
        // ignore
      }
    }

    let coverImageUrl = eventData.image_url || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80';
    if (coverImageUrl && coverImageUrl.startsWith('data:image/') && coverImageUrl.length > 150000) {
      try {
        coverImageUrl = await compressImage(coverImageUrl, 1600, 1200, 0.78);
      } catch {
        // ignore
      }
    }

    const fullEvent: OrganizedEvent = {
      id,
      title: eventData.title || 'Creative Event',
      tagline: eventData.tagline || '',
      description: eventData.description || '',
      category: eventData.category || 'Exhibition & Expo',
      start_date: eventData.start_date || new Date().toISOString().split('T')[0],
      end_date: eventData.end_date || eventData.start_date || new Date().toISOString().split('T')[0],
      time: eventData.time || '10:00 - 18:00',
      location_name: eventData.location_name || 'Stockholm Venue',
      city: eventData.city || 'Stockholm',
      address: eventData.address || '',
      image_url: coverImageUrl,
      floor_plan_image_url: floorPlanUrl,
      vendor_tables: eventData.vendor_tables !== undefined ? eventData.vendor_tables : (existingEvent?.vendor_tables || []),
      ticket_tiers: eventData.ticket_tiers !== undefined ? eventData.ticket_tiers : (existingEvent?.ticket_tiers || []),
      ticket_price_sek: eventData.ticket_price_sek !== undefined ? eventData.ticket_price_sek : existingEvent?.ticket_price_sek,
      gallery_urls: eventData.gallery_urls || [],
      price: eventData.price || 'Free Entry',
      capacity: eventData.capacity || '500 Attendees',
      ticket_url: eventData.ticket_url || '',
      registration_email: eventData.registration_email || 'sandy@creativeventsnordic.com',
      registration_phone: eventData.registration_phone || '',
      highlights: eventData.highlights || [],
      organizer: eventData.organizer || 'Creative Events Nordic',
      is_featured: eventData.is_featured !== undefined ? eventData.is_featured : true,
      status: eventData.status || 'UPCOMING',
      created_at: eventData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Try saving to Supabase
    try {
      if (isNew) {
        await supabase.from('organized_events').insert([fullEvent]);
      } else {
        await supabase.from('organized_events').update(fullEvent).eq('id', id);
      }
    } catch (err) {
      console.warn('Could not persist organized event to Supabase, updating local state:', err);
    }

    // Always update storage safely
    const updatedList = isNew
      ? [fullEvent, ...existingList]
      : existingList.map(e => (e.id === id ? fullEvent : e));

    await safeStorage.setItem('creative_organized_events', JSON.stringify(updatedList));

    // Also update layout floor_plan_image_url if present
    if (fullEvent.floor_plan_image_url) {
      try {
        const layoutCached = await safeStorage.getItem(`creative_layout_${id}`);
        if (layoutCached) {
          const parsed = JSON.parse(layoutCached);
          parsed.map_image_url = fullEvent.floor_plan_image_url;
          parsed.floor_plan_image_url = fullEvent.floor_plan_image_url;
          await safeStorage.setItem(`creative_layout_${id}`, JSON.stringify(parsed));
        }
      } catch (e) {
        // ignore
      }
    }

    return fullEvent;
  }

  async bookVendorTable(
    eventId: string,
    tableId: string,
    bookingData: NonNullable<VendorTable['booked_by_vendor']>
  ): Promise<{ event: OrganizedEvent; table: VendorTable }> {
    const event = await this.getOrganizedEvent(eventId);
    if (!event) throw new Error('Event not found');

    const tables = event.vendor_tables && event.vendor_tables.length > 0
      ? event.vendor_tables
      : generateDefaultVendorTables(eventId);

    const updatedTables = tables.map(t => {
      if (t.id === tableId || t.table_number === tableId) {
        return {
          ...t,
          status: 'BOOKED' as const,
          booked_by_name: bookingData.business_name,
          booked_by_vendor: bookingData,
          booking_ref: bookingData.booking_reference
        };
      }
      return t;
    });

    const bookedTable = updatedTables.find(t => t.id === tableId || t.table_number === tableId) || tables[0];
    const updatedEvent = await this.saveOrganizedEvent({
      ...event,
      vendor_tables: updatedTables
    });

    // Also sync with vendor event bookings
    const newBooking: Partial<VendorEventBooking> = {
      event_id: event.id,
      event_title: event.title,
      event_date: event.start_date,
      event_city: event.city,
      event_location: event.location_name,
      business_name: bookingData.business_name,
      contact_name: bookingData.contact_name,
      email: bookingData.email,
      phone: bookingData.phone,
      category: bookingData.category,
      booth_package_id: 'booth-standard',
      booth_package_name: `${bookedTable.zone} (${bookedTable.table_number})`,
      price: bookedTable.price_sek || 3000,
      currency: 'SEK',
      selected_table_id: bookedTable.id,
      selected_table_number: bookedTable.table_number,
      assigned_booth: bookedTable.table_number,
      status: 'CONFIRMED',
      payment_status: 'PAID_IN_FULL',
      payment_method: (bookingData.payment_method?.toLowerCase() as any) || 'swish',
      payment_transaction_id: bookingData.booking_reference
    };
    await this.saveVendorEventBooking(newBooking).catch(e => console.warn('Sync booking error:', e));

    return { event: updatedEvent, table: bookedTable };
  }

  async getAllTicketOrders(): Promise<EventTicketOrder[]> {
    const cached = await safeStorage.getItem('creative_event_ticket_orders');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.warn('Error parsing ticket orders:', e);
      }
    }
    return [];
  }

  async saveTicketOrder(order: EventTicketOrder): Promise<EventTicketOrder> {
    const current = await this.getAllTicketOrders();
    const updated = [order, ...current.filter(o => o.id !== order.id)];
    await safeStorage.setItem('creative_event_ticket_orders', JSON.stringify(updated));
    return order;
  }

  async getAllVendorTableBookings(): Promise<any[]> {
    return this.getVendorEventBookings();
  }

  async deleteOrganizedEvent(id: string): Promise<void> {
    try {
      await supabase.from('organized_events').delete().eq('id', id);
    } catch (err) {
      console.warn('Could not delete organized event from Supabase, removing locally:', err);
    }

    const existingList = await this.getOrganizedEvents();
    const updated = existingList.filter(e => e.id !== id);
    await safeStorage.setItem('creative_organized_events', JSON.stringify(updated));
  }

  async uploadEventImage(file: File): Promise<string> {
    try {
      const ext = file.name.split('.').pop();
      const fileName = `event_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file, { upsert: false });
      if (!uploadError) {
        const { data } = supabase.storage.from('gallery').getPublicUrl(fileName);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch (e) {
      console.warn('Storage bucket upload failed, using optimized local data URL:', e);
    }

    // Fallback: Read and compress image client-side to keep data URL under 150KB
    return compressImage(file, 1600, 1200, 0.78);
  }

  // ─── Vendor Event Bookings, Booth Packages & Market Layouts ──────────────

  async getBoothPackages(): Promise<BoothPackage[]> {
    const cached = await safeStorage.getItem('creative_booth_packages');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as BoothPackage[];
        }
      } catch (e) {
        console.warn('Failed to parse cached booth packages:', e);
      }
    }
    await safeStorage.setItem('creative_booth_packages', JSON.stringify(DEFAULT_BOOTH_PACKAGES));
    return DEFAULT_BOOTH_PACKAGES;
  }

  async saveBoothPackage(pkgData: Partial<BoothPackage>): Promise<BoothPackage> {
    const existing = await this.getBoothPackages();
    const isNew = !pkgData.id;
    const id = pkgData.id || `booth-pkg-${Date.now()}`;

    const fullPackage: BoothPackage = {
      id,
      name: pkgData.name || 'Exhibitor Booth Package',
      tier: pkgData.tier || 'standard',
      dimensions: pkgData.dimensions || '3m x 3m (9m²)',
      price: pkgData.price !== undefined ? pkgData.price : 4500,
      currency: pkgData.currency || 'SEK',
      description: pkgData.description || '',
      features: pkgData.features || ['Standard shell scheme partitions', '1 Table & 2 Chairs', 'Electricity socket 230V'],
      badge: pkgData.badge || '',
      popular: pkgData.popular ?? false,
      allowed_zones: pkgData.allowed_zones || [],
      max_spots: pkgData.max_spots
    };

    const updated = isNew 
      ? [...existing, fullPackage]
      : existing.map(p => (p.id === id ? fullPackage : p));

    await safeStorage.setItem('creative_booth_packages', JSON.stringify(updated));
    return fullPackage;
  }

  async deleteBoothPackage(id: string): Promise<void> {
    const existing = await this.getBoothPackages();
    const updated = existing.filter(p => p.id !== id);
    await safeStorage.setItem('creative_booth_packages', JSON.stringify(updated));
  }

  // ── Market Layout & Table Slots ──

  generateDefaultEventLayout(eventId: string): EventMarketLayout {
    const event = DEFAULT_ORGANIZED_EVENTS.find(e => e.id === eventId);
    const mapUrl = event?.floor_plan_image_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80';
    return {
      id: `layout-${eventId}`,
      event_id: eventId,
      name: 'Standard Arena Market Floorplan',
      description: 'Main exhibition arena with premium island booths, central boulevard, culinary hub, and artisan row.',
      map_image_url: mapUrl,
      floor_plan_image_url: mapUrl,
      slots: DEFAULT_EVENT_SLOTS.map(slot => ({ ...slot })),
      updated_at: new Date().toISOString()
    };
  }

  async getEventMarketLayout(eventId: string): Promise<EventMarketLayout> {
    let layout: EventMarketLayout;
    const cached = await safeStorage.getItem(`creative_layout_${eventId}`);
    if (cached) {
      try {
        layout = JSON.parse(cached);
      } catch (e) {
        layout = this.generateDefaultEventLayout(eventId);
      }
    } else {
      layout = this.generateDefaultEventLayout(eventId);
      await safeStorage.setItem(`creative_layout_${eventId}`, JSON.stringify(layout));
    }

    // Ensure layout has map_image_url if event has floor_plan_image_url
    const allEvents = await this.getOrganizedEvents();
    const match = allEvents.find(e => e.id === eventId);
    if (match) {
      if (match.floor_plan_image_url) {
        layout.map_image_url = match.floor_plan_image_url;
        layout.floor_plan_image_url = match.floor_plan_image_url;
      }
      if (match.vendor_tables && match.vendor_tables.length > 0) {
        layout.slots = match.vendor_tables.map((t, idx) => ({
          id: t.id,
          table_number: t.table_number,
          zone: t.zone,
          tier: (t.price_sek >= 7000 ? 'premium' : t.price_sek >= 5000 ? 'culinary' : 'standard') as any,
          description: t.location_description || `${t.size || 'Table'} - ${t.zone}`,
          status: (t.status === 'BOOKED' ? 'booked' : 'available') as any,
          x: t.map_coordinates?.x ?? (15 + ((idx * 16) % 70)),
          y: t.map_coordinates?.y ?? (20 + (Math.floor(idx / 5) * 15) % 65),
          map_coordinates: t.map_coordinates || { x: 15 + ((idx * 16) % 70), y: 20 + (Math.floor(idx / 5) * 15) % 65 },
          size: t.size,
          price_sek: t.price_sek,
          power_included: t.power_included,
          booked_by_name: t.booked_by_vendor?.business_name
        }));
      }
    }

    // Cross-reference with all active bookings to dynamically lock booked tables
    const bookings = await this.getVendorEventBookings(eventId);
    const activeBookings = bookings.filter(b => b.status !== 'REJECTED' && b.status !== 'CANCELLED');

    const syncedSlots = layout.slots.map(slot => {
      const matchingBooking = activeBookings.find(b => 
        (b.selected_table_id && b.selected_table_id === slot.id) ||
        (b.selected_table_number && b.selected_table_number.toLowerCase() === slot.table_number.toLowerCase()) ||
        (b.assigned_booth && b.assigned_booth.toLowerCase().includes(slot.id.toLowerCase()))
      );

      if (matchingBooking) {
        return {
          ...slot,
          status: 'booked' as const,
          booked_by_name: matchingBooking.business_name,
          booked_booking_ref: matchingBooking.booking_ref
        };
      }
      return slot;
    });

    return {
      ...layout,
      slots: syncedSlots
    };
  }

  async saveEventMarketLayout(layout: EventMarketLayout): Promise<EventMarketLayout> {
    layout.updated_at = new Date().toISOString();

    // Optimize map images if they are large data URLs
    if (layout.map_image_url && layout.map_image_url.startsWith('data:image/') && layout.map_image_url.length > 150000) {
      try {
        layout.map_image_url = await compressImage(layout.map_image_url, 1600, 1200, 0.78);
      } catch {
        // ignore
      }
    }
    if (layout.floor_plan_image_url && layout.floor_plan_image_url.startsWith('data:image/') && layout.floor_plan_image_url.length > 150000) {
      try {
        layout.floor_plan_image_url = await compressImage(layout.floor_plan_image_url, 1600, 1200, 0.78);
      } catch {
        // ignore
      }
    }

    await safeStorage.setItem(`creative_layout_${layout.event_id}`, JSON.stringify(layout));
    return layout;
  }

  async updateTableSlot(eventId: string, slotId: string, updates: Partial<EventTableSlot>): Promise<EventMarketLayout> {
    const layout = await this.getEventMarketLayout(eventId);
    const updatedSlots = layout.slots.map(s => {
      if (s.id === slotId) {
        return { ...s, ...updates };
      }
      return s;
    });

    const updatedLayout = { ...layout, slots: updatedSlots };
    return this.saveEventMarketLayout(updatedLayout);
  }

  async deleteTableSlot(eventId: string, slotId: string): Promise<EventMarketLayout> {
    const layout = await this.getEventMarketLayout(eventId);
    const updatedSlots = layout.slots.filter(s => s.id !== slotId);
    const updatedLayout = { ...layout, slots: updatedSlots };
    return this.saveEventMarketLayout(updatedLayout);
  }

  async batchAddTableSlots(eventId: string, newSlots: EventTableSlot[]): Promise<EventMarketLayout> {
    const layout = await this.getEventMarketLayout(eventId);
    const updatedSlots = [...layout.slots, ...newSlots];
    const updatedLayout = { ...layout, slots: updatedSlots };
    return this.saveEventMarketLayout(updatedLayout);
  }

  async getVendorEventBookings(eventId?: string): Promise<VendorEventBooking[]> {
    try {
      let query = supabase
        .from('vendor_event_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        await safeStorage.setItem('creative_vendor_event_bookings', JSON.stringify(data));
        return data as VendorEventBooking[];
      }
    } catch (err) {
      console.warn('Supabase vendor_event_bookings query failed or table not found, using safeStorage:', err);
    }

    // Storage fallback
    const cached = await safeStorage.getItem('creative_vendor_event_bookings');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (eventId) {
            return parsed.filter((b: VendorEventBooking) => b.event_id === eventId);
          }
          return parsed as VendorEventBooking[];
        }
      } catch (e) {
        console.error('Error parsing cached vendor bookings:', e);
      }
    }

    // Seed defaults
    await safeStorage.setItem('creative_vendor_event_bookings', JSON.stringify(DEFAULT_VENDOR_EVENT_BOOKINGS));
    if (eventId) {
      return DEFAULT_VENDOR_EVENT_BOOKINGS.filter(b => b.event_id === eventId);
    }
    return DEFAULT_VENDOR_EVENT_BOOKINGS;
  }

  async getVendorEventBooking(id: string): Promise<VendorEventBooking | null> {
    const all = await this.getVendorEventBookings();
    return all.find(b => b.id === id || b.booking_ref === id) || null;
  }

  async saveVendorEventBooking(bookingData: Partial<VendorEventBooking>): Promise<VendorEventBooking> {
    const isNew = !bookingData.id;
    const id = bookingData.id || `booking-${Date.now()}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const booking_ref = bookingData.booking_ref || `CEB-${new Date().getFullYear()}-${randomSuffix}`;
    const existingList = await this.getVendorEventBookings();

    const fullBooking: VendorEventBooking = {
      id,
      booking_ref,
      event_id: bookingData.event_id || 'ce-event-1',
      event_title: bookingData.event_title || 'Nordic Grand Wedding & Bridal Showcase 2026',
      event_date: bookingData.event_date || '2026-11-14',
      event_city: bookingData.event_city || 'Stockholm',
      event_location: bookingData.event_location || 'Münchenbryggeriet Event Hall',

      vendor_id: bookingData.vendor_id,
      user_id: bookingData.user_id,
      business_name: bookingData.business_name || 'Vendor Business',
      contact_name: bookingData.contact_name || 'Contact Person',
      email: bookingData.email || '',
      phone: bookingData.phone || '',
      category: bookingData.category || 'Other',
      website: bookingData.website || '',
      socials: bookingData.socials || '',

      booth_package_id: bookingData.booth_package_id || 'booth-standard',
      booth_package_name: bookingData.booth_package_name || 'Standard Shell Scheme',
      price: bookingData.price !== undefined ? bookingData.price : 4500,
      currency: bookingData.currency || 'SEK',
      selected_table_id: bookingData.selected_table_id || '',
      selected_table_number: bookingData.selected_table_number || '',

      power_needed: bookingData.power_needed ?? true,
      power_type: bookingData.power_type || 'standard_230v',
      tables_count: bookingData.tables_count ?? 1,
      chairs_count: bookingData.chairs_count ?? 2,
      staff_count: bookingData.staff_count ?? 2,
      special_requests: bookingData.special_requests || '',
      showcase_pitch: bookingData.showcase_pitch || '',

      payment_method: bookingData.payment_method || 'swish',
      payment_transaction_id: bookingData.payment_transaction_id || '',
      payment_date: bookingData.payment_date || (bookingData.payment_status === 'PAID_IN_FULL' ? new Date().toISOString() : ''),
      subtotal: bookingData.subtotal !== undefined ? bookingData.subtotal : Math.round((bookingData.price || 4500) * 0.8),
      vat_amount: bookingData.vat_amount !== undefined ? bookingData.vat_amount : Math.round((bookingData.price || 4500) * 0.2),
      payer_company_vat: bookingData.payer_company_vat || '',

      status: bookingData.status || (bookingData.payment_status === 'PAID_IN_FULL' ? 'CONFIRMED' : 'PENDING'),
      payment_status: bookingData.payment_status || 'UNPAID',
      assigned_booth: bookingData.assigned_booth || bookingData.selected_table_number || '',
      admin_notes: bookingData.admin_notes || '',
      created_at: bookingData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Attempt to persist in Supabase
    try {
      if (isNew) {
        await supabase.from('vendor_event_bookings').insert([fullBooking]);
      } else {
        await supabase.from('vendor_event_bookings').update(fullBooking).eq('id', id);
      }
    } catch (err) {
      console.warn('Could not save booking to Supabase, persisting locally:', err);
    }

    const updatedList = isNew
      ? [fullBooking, ...existingList]
      : existingList.map(b => (b.id === id ? fullBooking : b));

    await safeStorage.setItem('creative_vendor_event_bookings', JSON.stringify(updatedList));
    return fullBooking;
  }

  async updateBookingStatus(
    id: string, 
    status: EventBookingStatus, 
    assigned_booth?: string, 
    admin_notes?: string,
    payment_status?: BookingPaymentStatus
  ): Promise<VendorEventBooking | null> {
    const list = await this.getVendorEventBookings();
    const existing = list.find(b => b.id === id);
    if (!existing) return null;

    const updated: VendorEventBooking = {
      ...existing,
      status,
      assigned_booth: assigned_booth !== undefined ? assigned_booth : existing.assigned_booth,
      admin_notes: admin_notes !== undefined ? admin_notes : existing.admin_notes,
      payment_status: payment_status !== undefined ? payment_status : existing.payment_status,
      updated_at: new Date().toISOString()
    };

    return this.saveVendorEventBooking(updated);
  }

  async deleteVendorEventBooking(id: string): Promise<void> {
    try {
      await supabase.from('vendor_event_bookings').delete().eq('id', id);
    } catch (err) {
      console.warn('Could not delete booking from Supabase, removing locally:', err);
    }

    const list = await this.getVendorEventBookings();
    const updated = list.filter(b => b.id !== id);
    await safeStorage.setItem('creative_vendor_event_bookings', JSON.stringify(updated));
  }
}

export const DEFAULT_BOOTH_PACKAGES: BoothPackage[] = [
  {
    id: 'booth-standard',
    name: 'Standard Shell Scheme',
    tier: 'standard',
    dimensions: '3m x 3m (9m²)',
    price: 4500,
    currency: 'SEK',
    description: 'Ideal for established event specialists, photographers, planners, and styling studios.',
    features: [
      'Modular wall partitions (2.4m height)',
      '1x Dressed conference table & 2x chairs',
      'Single 230V / 10A standard electrical socket',
      '2x Vendor exhibitor badges & lanyard passes',
      'Listing in official Nordic Event Guide & online directory',
      'Free high-speed venue Wi-Fi access'
    ],
    popular: true,
    badge: 'Most Popular'
  },
  {
    id: 'booth-premium-corner',
    name: 'Premium Corner & Island Showcase',
    tier: 'premium',
    dimensions: '4m x 3m (12m²)',
    price: 7800,
    currency: 'SEK',
    description: 'Double frontage on primary walkways with heightened visibility and high attendee foot traffic.',
    features: [
      'Open 2-sided corner positioning on primary walkways',
      '2x Spotlight fixtures mounted on fascia',
      '2x Dressed tables & 4x designer chairs',
      'Dedicated 230V power connection (16A)',
      '4x Exhibitor passes with VIP Lounge access',
      'Featured social media highlight before the event',
      'Priority loading dock delivery slot'
    ],
    badge: 'High Footfall'
  },
  {
    id: 'booth-culinary',
    name: 'Culinary & Beverage Station',
    tier: 'culinary',
    dimensions: '3.5m x 3.5m (12.2m²)',
    price: 6200,
    currency: 'SEK',
    description: 'Specialized setup designed for caterers, mixologists, artisan bakeries, and tasting bars.',
    features: [
      'Food-safe washable surface floor prep layout',
      'High-capacity power supply (3-phase 400V or 2x 16A 230V)',
      'Direct grey water disposal & potable water access nearby',
      '3x Culinary exhibitor passes',
      'Tasting allowance & waste management service included',
      'Hygiene & municipality permit inspection assistance'
    ],
    badge: 'Food & Drinks'
  },
  {
    id: 'booth-artisan',
    name: 'Artisan & Indie Creator Tabletop',
    tier: 'artisan',
    dimensions: '2m x 1.5m (3m²)',
    price: 2500,
    currency: 'SEK',
    description: 'Accessible package tailored for indie craftspeople, florists, invitation makers, and emerging creators.',
    features: [
      '1x 180cm wooden presentation trestle table',
      '2x Chairs & branded table runner allowance',
      'Access to shared charging stations',
      '2x Creator passes',
      'Community pop-up zone placement',
      'Feature in Creative Events artisan lookbook'
    ],
    badge: 'Budget Friendly'
  },
  {
    id: 'booth-sponsor',
    name: 'Runway & Main Stage VIP Sponsor',
    tier: 'sponsor',
    dimensions: '6m x 4m (24m²)',
    price: 13500,
    currency: 'SEK',
    description: 'Flagship presence adjacent to runway or central stage with top-tier brand association.',
    features: [
      'Prime entrance or main stage adjacent positioning',
      'Custom truss rigging & dedicated directional spotlights',
      'Stage announcement shout-out & 5-min runway presentation slot',
      'Full-page feature in Nordic Event print & digital program',
      '6x All-access VIP badges with champagne reception',
      'Dedicated concierge logistics assistant on setup day'
    ],
    badge: 'Exclusive VIP'
  }
];

export const DEFAULT_EVENT_SLOTS: EventTableSlot[] = [
  // Zone A: Main Stage & Entrance (VIP & Premium Corner)
  { id: 'A-01', table_number: 'Table A-01', zone: 'Zone A - Premium Island', tier: 'premium', description: 'Corner facing main entrance, 4x3m showcase with spotlight fixture', status: 'available', row: 1, col: 1, x: 18, y: 28, map_coordinates: { x: 18, y: 28 }, size: '4m x 3m (12m²)', price_sek: 7800, power_included: true },
  { id: 'A-02', table_number: 'Table A-02', zone: 'Zone A - Premium Island', tier: 'premium', description: 'Adjacent to bridal runway stage, highest visitor footfall', status: 'available', row: 1, col: 2, x: 34, y: 28, map_coordinates: { x: 34, y: 28 }, size: '4m x 3m (12m²)', price_sek: 7800, power_included: true },
  { id: 'A-03', table_number: 'Table A-03', zone: 'Zone A - Premium Island', tier: 'sponsor', description: 'VIP Main Stage sponsor pavilion, 6x4m prime placement', status: 'available', row: 1, col: 3, x: 50, y: 28, map_coordinates: { x: 50, y: 28 }, size: '6m x 4m (24m²)', price_sek: 13500, power_included: true },
  { id: 'A-04', table_number: 'Table A-04', zone: 'Zone A - Premium Island', tier: 'premium', description: 'Corner showcase on central boulevard with 2 open sides', status: 'available', row: 2, col: 1, x: 66, y: 28, map_coordinates: { x: 66, y: 28 }, size: '4m x 3m (12m²)', price_sek: 7800, power_included: true },
  { id: 'A-05', table_number: 'Table A-05', zone: 'Zone A - Premium Island', tier: 'premium', description: 'East walkway corner booth with power feed', status: 'available', row: 2, col: 2, x: 82, y: 28, map_coordinates: { x: 82, y: 28 }, size: '4m x 3m (12m²)', price_sek: 7800, power_included: true },
  { id: 'A-06', table_number: 'Table A-06', zone: 'Zone A - Premium Island', tier: 'premium', description: 'Facing VIP lounge reception and press backdrop', status: 'available', row: 2, col: 3, x: 88, y: 44, map_coordinates: { x: 88, y: 44 }, size: '4m x 3m (12m²)', price_sek: 7800, power_included: true },

  // Zone B: Central Exhibition Hall (Standard Shell Scheme)
  { id: 'B-01', table_number: 'Table B-01', zone: 'Zone B - Standard Hall', tier: 'standard', description: 'Standard 3x3m shell scheme with partitions & table', status: 'available', row: 3, col: 1, x: 18, y: 48, map_coordinates: { x: 18, y: 48 }, size: '3m x 3m (9m²)', price_sek: 4500, power_included: true },
  { id: 'B-02', table_number: 'Table B-02', zone: 'Zone B - Standard Hall', tier: 'standard', description: 'Standard 3x3m shell scheme, central aisle', status: 'available', row: 3, col: 2, x: 32, y: 48, map_coordinates: { x: 32, y: 48 }, size: '3m x 3m (9m²)', price_sek: 4500, power_included: true },
  { id: 'B-03', table_number: 'Table B-03', zone: 'Zone B - Standard Hall', tier: 'standard', description: 'Standard 3x3m shell scheme, near seminar room', status: 'available', row: 3, col: 3, x: 46, y: 48, map_coordinates: { x: 46, y: 48 }, size: '3m x 3m (9m²)', price_sek: 4500, power_included: true },
  { id: 'B-04', table_number: 'Table B-04', zone: 'Zone B - Standard Hall', tier: 'standard', description: 'Standard 3x3m shell scheme with socket', status: 'available', row: 3, col: 4, x: 60, y: 48, map_coordinates: { x: 60, y: 48 }, size: '3m x 3m (9m²)', price_sek: 4500, power_included: true },
  { id: 'B-05', table_number: 'Table B-05', zone: 'Zone B - Standard Hall', tier: 'standard', description: 'Standard 3x3m shell scheme, west wing', status: 'available', row: 4, col: 1, x: 18, y: 64, map_coordinates: { x: 18, y: 64 }, size: '3m x 3m (9m²)', price_sek: 4500, power_included: true },
  { id: 'B-06', table_number: 'Table B-06', zone: 'Zone B - Standard Hall', tier: 'standard', description: 'Standard 3x3m shell scheme', status: 'available', row: 4, col: 2, x: 32, y: 64, map_coordinates: { x: 32, y: 64 }, size: '3m x 3m (9m²)', price_sek: 4500, power_included: true },
  { id: 'B-07', table_number: 'Table B-07', zone: 'Zone B - Standard Hall', tier: 'standard', description: 'Standard 3x3m shell scheme', status: 'available', row: 4, col: 3, x: 46, y: 64, map_coordinates: { x: 46, y: 64 }, size: '3m x 3m (9m²)', price_sek: 4500, power_included: true },
  { id: 'B-08', table_number: 'Table B-08', zone: 'Zone B - Standard Hall', tier: 'standard', description: 'Standard 3x3m shell scheme with display wall', status: 'available', row: 4, col: 4, x: 60, y: 64, map_coordinates: { x: 60, y: 64 }, size: '3m x 3m (9m²)', price_sek: 4500, power_included: true },

  // Zone C: Culinary & Food Tasting Arcade
  { id: 'C-01', table_number: 'Stall C-01', zone: 'Zone C - Culinary Alley', tier: 'culinary', description: 'Food preparation station with potable water & 400V feed', status: 'available', row: 5, col: 1, x: 74, y: 48, map_coordinates: { x: 74, y: 48 }, size: '3.5m x 3.5m (12m²)', price_sek: 6200, power_included: true },
  { id: 'C-02', table_number: 'Stall C-02', zone: 'Zone C - Culinary Alley', tier: 'culinary', description: 'Tasting counter with sneeze guard & greywater access', status: 'available', row: 5, col: 2, x: 86, y: 48, map_coordinates: { x: 86, y: 48 }, size: '3.5m x 3.5m (12m²)', price_sek: 6200, power_included: true },
  { id: 'C-03', table_number: 'Stall C-03', zone: 'Zone C - Culinary Alley', tier: 'culinary', description: 'High-power mixology & craft beverage station', status: 'available', row: 5, col: 3, x: 74, y: 64, map_coordinates: { x: 74, y: 64 }, size: '3.5m x 3.5m (12m²)', price_sek: 6200, power_included: true },
  { id: 'C-04', table_number: 'Stall C-04', zone: 'Zone C - Culinary Alley', tier: 'culinary', description: 'Artisan bakery & confectionery display booth', status: 'available', row: 5, col: 4, x: 86, y: 64, map_coordinates: { x: 86, y: 64 }, size: '3.5m x 3.5m (12m²)', price_sek: 6200, power_included: true },

  // Zone D: Artisan & Creator Pop-Up Row
  { id: 'D-01', table_number: 'Table D-01', zone: 'Zone D - Artisan Row', tier: 'artisan', description: 'Trestle table 180cm for independent craft & stationery', status: 'available', row: 6, col: 1, x: 16, y: 82, map_coordinates: { x: 16, y: 82 }, size: '2m x 1.5m (3m²)', price_sek: 2500, power_included: false },
  { id: 'D-02', table_number: 'Table D-02', zone: 'Zone D - Artisan Row', tier: 'artisan', description: 'Indie florist & botanical display tabletop', status: 'available', row: 6, col: 2, x: 28, y: 82, map_coordinates: { x: 28, y: 82 }, size: '2m x 1.5m (3m²)', price_sek: 2500, power_included: false },
  { id: 'D-03', table_number: 'Table D-03', zone: 'Zone D - Artisan Row', tier: 'artisan', description: 'Bespoke stationery & accessories display', status: 'available', row: 6, col: 3, x: 40, y: 82, map_coordinates: { x: 40, y: 82 }, size: '2m x 1.5m (3m²)', price_sek: 2500, power_included: false },
  { id: 'D-04', table_number: 'Table D-04', zone: 'Zone D - Artisan Row', tier: 'artisan', description: 'Artisan craft table with skylight natural lighting', status: 'available', row: 6, col: 4, x: 54, y: 82, map_coordinates: { x: 54, y: 82 }, size: '2m x 1.5m (3m²)', price_sek: 2500, power_included: false },
  { id: 'D-05', table_number: 'Table D-05', zone: 'Zone D - Artisan Row', tier: 'artisan', description: 'Jewelry & hair accessory presentation', status: 'available', row: 6, col: 5, x: 68, y: 82, map_coordinates: { x: 68, y: 82 }, size: '2m x 1.5m (3m²)', price_sek: 2500, power_included: false },
  { id: 'D-06', table_number: 'Table D-06', zone: 'Zone D - Artisan Row', tier: 'artisan', description: 'Eco-conscious design & handmade props table', status: 'available', row: 6, col: 6, x: 82, y: 82, map_coordinates: { x: 82, y: 82 }, size: '2m x 1.5m (3m²)', price_sek: 2500, power_included: false },
];

export const DEFAULT_VENDOR_EVENT_BOOKINGS: VendorEventBooking[] = [
  {
    id: 'booking-seed-1',
    booking_ref: 'CEB-2026-1042',
    event_id: 'ce-event-1',
    event_title: 'Nordic Grand Wedding & Bridal Showcase 2026',
    event_date: '2026-11-14',
    event_city: 'Stockholm',
    event_location: 'Münchenbryggeriet Event Hall',
    business_name: 'Nordic Bloom Florals & Botanical Styling',
    contact_name: 'Astrid Lindqvist',
    email: 'astrid@nordicbloom.se',
    phone: '+46 70 812 34 56',
    category: 'Florals',
    website: 'https://nordicbloom.se',
    socials: '@nordicbloomflorals',
    booth_package_id: 'booth-premium-corner',
    booth_package_name: 'Premium Corner & Island Showcase',
    price: 7800,
    currency: 'SEK',
    selected_table_id: 'A-02',
    selected_table_number: 'Table A-02',
    power_needed: true,
    power_type: 'standard_230v',
    tables_count: 2,
    chairs_count: 4,
    staff_count: 3,
    special_requests: 'Requires proximity to water point for fresh floral arrangements and flower preservation buckets.',
    showcase_pitch: 'Showcasing sustainable Swedish autumn wedding bouquets, wild archways, and tabletop floral installations.',
    payment_method: 'card',
    payment_transaction_id: 'TXN-SWED-98421',
    payment_date: '2026-03-05T09:35:00Z',
    subtotal: 6240,
    vat_amount: 1560,
    status: 'CONFIRMED',
    payment_status: 'PAID_IN_FULL',
    assigned_booth: 'Table A-02',
    admin_notes: 'Approved and confirmed. Direct payment settled via Visa. Table A-02 reserved on floorplan.',
    created_at: '2026-03-05T09:30:00Z',
    updated_at: '2026-03-05T14:15:00Z'
  },
  {
    id: 'booking-seed-2',
    booking_ref: 'CEB-2026-1088',
    event_id: 'ce-event-1',
    event_title: 'Nordic Grand Wedding & Bridal Showcase 2026',
    event_date: '2026-11-14',
    event_city: 'Stockholm',
    event_location: 'Münchenbryggeriet Event Hall',
    business_name: 'Stockholm Lumière Photography & Cinema',
    contact_name: 'Elias Bergström',
    email: 'contact@lumierephotos.se',
    phone: '+46 73 998 12 34',
    category: 'Photography',
    website: 'https://lumierephotos.se',
    socials: '@lumiere_stockholm',
    booth_package_id: 'booth-standard',
    booth_package_name: 'Standard Shell Scheme',
    price: 4500,
    currency: 'SEK',
    selected_table_id: 'B-08',
    selected_table_number: 'Table B-08',
    power_needed: true,
    power_type: 'standard_230v',
    tables_count: 1,
    chairs_count: 2,
    staff_count: 2,
    special_requests: 'Will have 1x 55-inch display screen playing sample 4K wedding films. Needs steady power.',
    showcase_pitch: 'Cinematic candid wedding photography portfolios, sample bespoke leather albums, and live portrait session signups.',
    payment_method: 'swish',
    payment_transaction_id: 'SWISH-88319',
    payment_date: '2026-03-06T11:22:00Z',
    subtotal: 3600,
    vat_amount: 900,
    status: 'CONFIRMED',
    payment_status: 'PAID_IN_FULL',
    assigned_booth: 'Table B-08',
    admin_notes: 'Paid in full via Swish. Screen display approved. Exhibitor badges will be ready at registration.',
    created_at: '2026-03-06T11:20:00Z',
    updated_at: '2026-03-06T16:00:00Z'
  },
  {
    id: 'booking-seed-3',
    booking_ref: 'CEB-2026-1145',
    event_id: 'ce-event-2',
    event_title: 'Stockholm Waterfront Food & Culture Festival',
    event_date: '2026-12-05',
    event_city: 'Stockholm',
    event_location: 'Skeppsholmen Waterfront Grounds',
    business_name: 'Skärgården Artisan Bakery & Canapés',
    contact_name: 'Maja Holmberg',
    email: 'maja@skargardenbakery.se',
    phone: '+46 72 456 78 90',
    category: 'Catering',
    website: 'https://skargardenbakery.se',
    socials: '@skargardenbakery',
    booth_package_id: 'booth-culinary',
    booth_package_name: 'Culinary & Beverage Station',
    price: 6200,
    currency: 'SEK',
    selected_table_id: 'C-01',
    selected_table_number: 'Stall C-01',
    power_needed: true,
    power_type: 'high_load_400v',
    tables_count: 2,
    chairs_count: 2,
    staff_count: 4,
    special_requests: 'Requires 400V 16A connection for portable pastry warmer and mini convection oven.',
    showcase_pitch: 'Tasting samples of Nordic sourdough canapés, cloudberry tartlets, and festive wedding dessert tables.',
    status: 'PENDING',
    payment_status: 'UNPAID',
    assigned_booth: '',
    admin_notes: 'Needs technical review by electrical coordinator for 400V socket at Skeppsholmen zone C.',
    created_at: '2026-03-07T14:45:00Z',
    updated_at: '2026-03-07T14:45:00Z'
  },
  {
    id: 'booking-seed-4',
    booking_ref: 'CEB-2026-1219',
    event_id: 'ce-event-4',
    event_title: 'Malmö Creative Pop-Up Market & Design Fair',
    event_date: '2027-02-14',
    event_city: 'Malmö',
    event_location: 'Lokstallarna i Kirseberg',
    business_name: 'Ateljé Linnea Bespoke Calligraphy & Stationery',
    contact_name: 'Linnea Ek',
    email: 'linnea@ateljelinnea.com',
    phone: '+46 76 333 44 55',
    category: 'Decor',
    website: 'https://ateljelinnea.com',
    socials: '@ateljelinnea',
    booth_package_id: 'booth-artisan',
    booth_package_name: 'Artisan & Indie Creator Tabletop',
    price: 2500,
    currency: 'SEK',
    selected_table_id: 'D-04',
    selected_table_number: 'Table D-04',
    power_needed: false,
    power_type: 'none',
    tables_count: 1,
    chairs_count: 2,
    staff_count: 1,
    special_requests: 'Would love tabletop lighting clip or position under good venue skylight for paper calligraphy demonstration.',
    showcase_pitch: 'Handmade cotton rag paper wedding suites, wax seal stamping bar, and live custom envelope calligraphy for visitors.',
    payment_method: 'swish',
    payment_transaction_id: 'SWISH-44021',
    payment_date: '2026-03-08T08:18:00Z',
    subtotal: 2000,
    vat_amount: 500,
    status: 'CONFIRMED',
    payment_status: 'PAID_IN_FULL',
    assigned_booth: 'Table D-04',
    admin_notes: 'Paid in full via Swish. Great artisan fit for Malmö fair. Assigned under natural light in Section B.',
    created_at: '2026-03-08T08:15:00Z',
    updated_at: '2026-03-08T10:00:00Z'
  }
];

export const api = new ApiService();

