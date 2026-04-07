import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Session } from '../types';
import { api } from '../services/api';

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
      const session = await api.getCurrentSession();
      if (session) {
        setUser(session.user);
      }
      setIsInitializing(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    // Note: We do not set global isLoading here to prevent the entire App from re-rendering/unmounting 
    // during login, which would clear local error states in the Login component.
    try {
      const session = await api.login(email, password);
      setUser(session.user);
      return session.user;
    } catch (error) {
      throw error;
    } 
  };
  
  const logout = async () => {
    await api.logout();
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