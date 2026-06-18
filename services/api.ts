import { Vendor, UserProfile, VendorStatus, Session, VendorCategory, Conversation, Message, Ad, AdReply } from '../types';
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

  async sendAdReply(adId: string, content: string): Promise<AdReply> {
    const session = await this.getCurrentSession();
    if (!session || !session.user) throw new Error('Not authenticated');
    const currentUser = session.user;

    const { data, error } = await supabase
      .from('ad_replies')
      .insert({
        ad_id: adId,
        sender_id: currentUser.id,
        sender_role: currentUser.role as 'VENDOR' | 'ADMIN',
        content,
        is_read: false,
      })
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
      .eq('ad_id', adId);

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
}

export const api = new ApiService();
