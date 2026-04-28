import { Vendor, UserProfile, VendorStatus, Session, VendorCategory } from '../types';
import { supabase } from '../supabaseClient';

class ApiService {
  
  async init(): Promise<void> {
    // Initialization logic if needed
    return Promise.resolve();
  }

  // --- AUTH METHODS ---
  async login(email: string, password?: string): Promise<Session> {
    if (!password) {
      throw new Error("Password is required");
    }

    // AUTHENTICATION STRATEGY: 
    // We strictly use the 'profiles' table for authentication.
    // Supabase Auth (GoTrue) logic has been completely removed as per requirements.

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !profile) {
      throw new Error("Invalid credentials: User not found.");
    }

    // Password check (Plaintext comparison as per current simple architecture)
    if (profile.password !== password) {
      throw new Error("Invalid credentials: Password incorrect.");
    }

    const user = this.mapProfileToUser(profile);
    
    // Create a custom session token
    const session = { 
      user, 
      token: 'ce-custom-token-' + Date.now() 
    };

    // Persist session
    localStorage.setItem('ce_session', JSON.stringify(session));
    return session;
  }

  async logout() {
    // Simply clear the local storage session
    localStorage.removeItem('ce_session');
  }

  async getCurrentSession(): Promise<Session | null> {
    const saved = localStorage.getItem('ce_session');
    if (!saved) return null;

    try {
      const session = JSON.parse(saved);
      
      // Verification step: Ensure the user still exists in the database
      // This prevents using stale sessions if a user is deleted/banned
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          // Refresh user details in the session (e.g. if role changed)
          const user = this.mapProfileToUser(profile);
          const newSession = { ...session, user };
          localStorage.setItem('ce_session', JSON.stringify(newSession));
          return newSession;
        }
      }
      
      // If validation fails (no profile found), clear session
      localStorage.removeItem('ce_session');
      return null;
    } catch (e) {
      // If JSON parse fails
      localStorage.removeItem('ce_session');
      return null;
    }
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
        // Update existing approved vendor in profiles
        const updateData: any = {
            business_name: vendor.name,
            service_type: vendor.category,
            location: vendor.location,
            description: vendor.description,
            image_url: vendor.imageUrl,
            image_urls: vendor.imageUrls,
            phone: vendor.phone,
            website: vendor.website,
            socials: vendor.socials,
            services: vendor.services,
            is_featured: vendor.isFeatured,
            rating: vendor.rating
        };

        if (vendor.password) {
            updateData.password = vendor.password;
        }

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', vendor.id);
        if (error) throw error;
    } else {
        // Create or Update Application
        const payload = {
            id: vendor.id, // Explicitly pass ID for upsert
            business_name: vendor.name,
            email: vendor.email,
            service_type: vendor.category,
            location: vendor.location,
            description: vendor.description,
            image_url: vendor.imageUrl,
            image_urls: vendor.imageUrls || [],
            phone: vendor.phone,
            website: vendor.website,
            socials: vendor.socials || {},
            services: vendor.services || [],
            status: vendor.status || 'PENDING'
        };

        // Use UPSERT to handle both creation of new applications (with client-gen IDs)
        // and updates to existing pending applications.
        const { error } = await supabase.from('applications').upsert(payload);
        if (error) throw error;
    }
  }

  async deleteVendor(id: string): Promise<void> {
    await supabase.from('profiles').delete().eq('id', id);
    await supabase.from('applications').delete().eq('id', id);
  }

  async updateVendorStatus(id: string, status: VendorStatus, password?: string): Promise<void> {
    if (status === VendorStatus.APPROVED) {
        const { data: app, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', id)
            .single();
        
        if (fetchError || !app) throw new Error("Application not found.");

        // Move from applications to profiles
        const { error: insertError } = await supabase.from('profiles').insert([{
           id: app.id, 
           email: app.email,
           role: 'VENDOR',
           business_name: app.business_name,
           service_type: app.service_type,
           location: app.location,
           description: app.description,
           image_url: app.image_url,
           image_urls: app.image_urls,
           phone: app.phone,
           website: app.website,
           socials: app.socials,
           services: app.services,
           is_featured: false,
           rating: 0,
           joined_at: new Date().toISOString(),
           password: password || 'password123'
        }]);

        if (insertError) throw insertError;

        await supabase.from('applications').delete().eq('id', id);
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
    const { data: profile } = await supabase
        .from('profiles')
        .select('password')
        .eq('id', userId)
        .single();
        
    if (profile && profile.password === newPassword) {
        throw new Error("New password cannot be the same as the old password.");
    }

    const { error } = await supabase
        .from('profiles')
        .update({ password: newPassword })
        .eq('id', userId);
        
    if (error) throw error;
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (profile) return true;

    const { data: app } = await supabase
      .from('applications')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (app) return true;

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
          avatarUrl: p.image_url
      };
  }

  private mapProfileToVendor(p: any, status: VendorStatus): Vendor {
      return {
          id: p.id,
          userId: p.id,
          name: p.business_name,
          category: p.service_type as VendorCategory,
          location: p.location || 'Sweden',
          description: p.description || '',
          imageUrl: p.image_url || '',
          imageUrls: p.image_urls || [],
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
          password: p.password,
          passwordSet: p.password !== undefined && p.password !== '123456' // Just as an indicator, but password is the key
      };
  }

  private mapApplicationToVendor(a: any): Vendor {
      return {
          id: a.id,
          userId: 'pending',
          name: a.business_name,
          category: a.service_type as VendorCategory,
          location: a.location || 'Sweden',
          description: a.description || '',
          imageUrl: a.image_url || '',
          imageUrls: a.image_urls || [],
          status: a.status as VendorStatus,
          services: a.services || [],
          email: a.email,
          phone: a.phone,
          website: a.website,
          joinedAt: a.created_at,
          rating: 0,
          isFeatured: false,
          socials: a.socials || {}
      };
  }
}

export const api = new ApiService();