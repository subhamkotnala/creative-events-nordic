import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/api';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  updateUser: (user: UserProfile) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      await api.init();
      // Use Supabase Auth getSession/onAuthStateChange instead of api.getCurrentSession
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', session.user.email)
            .single();

        if (!profile) {
            const { data: profileByAuthId } = await supabase
                .from('profiles')
                .select('*')
                .eq('auth_id', session.user.id)
                .single();
            profile = profileByAuthId;
        }

        if (!profile) {
            const { data: profileById } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            profile = profileById;
        }

        if (profile) {
            setUser({
                id: profile.id,
                email: profile.email,
                name: profile.business_name || profile.email,
                role: profile.role,
                favorites: [],
                createdAt: profile.joined_at,
                avatarUrl: profile.application_image_url || profile.services?.[0]?.imageUrl || ''
            });
        }
      }
      setIsInitializing(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: password || '' });
      if (error) throw error;
      
      if (!data.user) {
        throw new Error("Login succeeded but user data was not returned. Please ensure your email is confirmed.");
      }

      let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', data.user.email)
          .single();
          
      if (!profile) {
          const { data: profileByAuthId } = await supabase
              .from('profiles')
              .select('*')
              .eq('auth_id', data.user.id)
              .single();
          profile = profileByAuthId;
      }
      
      if (!profile) {
          const { data: profileById } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
          profile = profileById;
      }
      
      if (!profile) {
          throw new Error("User found in auth, but no associated profile found. Please register or contact support.");
      }
      
      const userProfile: UserProfile = {
          id: profile.id,
          email: profile.email,
          name: profile.business_name || profile.email,
          role: profile.role,
          favorites: [],
          createdAt: profile.joined_at,
          avatarUrl: profile.application_image_url || profile.services?.[0]?.imageUrl || ''
      };

      setUser(userProfile);
      return userProfile;
    } catch (error) {
      throw error;
    } 
  };
  
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };


  const updateUser = async (updatedUser: UserProfile) => {
    await api.updateProfile(updatedUser);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: isInitializing, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};