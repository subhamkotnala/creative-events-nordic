import { Vendor, UserProfile, VendorStatus, Session, VendorCategory, Conversation, Message } from '../types';
import { supabase } from '../supabaseClient';

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
    const response = await fetch(`/api/users/${auth_id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      let errorMessage = "Deletion failed on server.";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Not a JSON response, maybe get text
        const text = await response.text();
        errorMessage = `Server Error (${response.status}): ${text || "No response body"}`;
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
}

export const api = new ApiService();