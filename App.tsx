import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Vendor, VendorStatus } from './types';
import Home from './pages/Home';
import Explore from './pages/Explore';
import OurVendors from './pages/OurVendors';
import VendorDashboard from './pages/VendorDashboard';
import VendorProfile from './pages/VendorProfile';
import JoinMarketplace from './pages/JoinMarketplace';
import AdminDashboard from './pages/AdminDashboard';
import VendorDetail from './pages/VendorDetail';
import ServiceDetail from './pages/ServiceDetail';
import VendorReview from './pages/VendorReview';
import VendorMockup from './pages/VendorMockup';
import RegisterVendor from './pages/RegisterVendor';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import ResetPassword from './pages/ResetPassword';
import VendorInbox from './pages/VendorInbox';
import AdBoard from './pages/AdBoard';
import Chatbot from './components/Chatbot';
import UserChatbox from './components/UserChatbox';
import { api } from './services/api';
import { supabase } from './supabaseClient';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { User, ShieldCheck, ShoppingBag, Menu, X, Settings, LogOut, Clock, Languages, Loader2, LogIn, Lock, Inbox, Linkedin, Instagram, Facebook, Megaphone } from 'lucide-react';

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
    className="w-full flex-grow flex flex-col"
  >
    {children}
  </motion.div>
);

const PrivateRoute: React.FC<{ children: React.ReactNode, roles?: string[] }> = ({ children, roles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [initialLocation] = useState(location.pathname);

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Authenticating...</p>
    </div>
  );

  if (!user) {
    if (location.pathname === '/login') return null;
    return <Navigate to="/login" state={{ from: initialLocation }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    if (location.pathname === '/') return null;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { language, setLanguage, t } = useLanguage();
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userChatOpen, setUserChatOpen] = useState(false);
  const [userUnreadCount, setUserUnreadCount] = useState(0);
  const [requestBoardUnreadCount, setRequestBoardUnreadCount] = useState(0);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      setRequestBoardUnreadCount(0);
      return;
    }

    const updateCounts = async () => {
      try {
        const counts = await api.getUnreadAdReplies();
        const total = Object.values(counts).reduce((s, c) => s + c, 0);
        setRequestBoardUnreadCount(total);
      } catch (err) {
        console.error('Failed to get unread ad replies total:', err);
      }
    };

    updateCounts();

    const channel = supabase
      .channel('global-ad-replies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_replies' }, () => {
        updateCounts();
      })
      .subscribe();

    const interval = setInterval(updateCounts, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Handle Supabase PASSWORD_RECOVERY event globally.
  // When a user clicks the reset email link, Supabase appends auth tokens as
  // a hash fragment (e.g. #access_token=...&type=recovery). The HashRouter
  // cannot route to /#/reset-password AND receive tokens simultaneously,
  // so we listen here and navigate programmatically instead.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        await api.init();
        const data = await api.getVendors();
        setVendors(data);
      } catch (error) {
        console.error("Failed to load vendors:", error);
      } finally {
        setIsDataLoading(false);
      }
    };
    loadData();
  }, []);

  const refreshVendors = async () => {
    const data = await api.getVendors();
    setVendors(data);
  };

  const updateStatus = async (id: string, status: VendorStatus) => {
    // Return the credentials result so AdminDashboard can use it
    const result = await api.updateVendorStatus(id, status);
    await refreshVendors();
    return result;
  };

  const toggleFeature = async (id: string) => {
    await api.toggleFeatured(id);
    await refreshVendors();
  };

  const toggleVerify = async (id: string) => {
    await api.toggleVerified(id);
    await refreshVendors();
  };

  const deleteVendor = async (auth_id: string, id: string) => {
    await api.deleteUser(auth_id, id);
    await refreshVendors();
  };

  const addVendor = async (v: Vendor) => {
    await api.saveVendor(v);
    await refreshVendors();
  };

  const getMenuLinkClass = (path: string) => {
    const isActive = location.pathname === path;
    return `w-full flex items-center gap-3 px-4 py-3 text-xs rounded-2xl transition-colors ${
      isActive 
        ? 'bg-slate-900 text-white font-medium shadow-md' 
        : 'text-slate-600 hover:bg-slate-50'
    }`;
  };

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    setIsSigningOut(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    await logout();
    setIsSigningOut(false);
  };

  if (isDataLoading || isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center text-center px-4 animate-fade-in">
          <div className="relative flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full border border-slate-200 absolute animate-ping opacity-25"></div>
            <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-t-sky-600 animate-spin"></div>
          </div>
          <span className="font-brand text-base sm:text-lg font-extrabold uppercase tracking-[0.25em] text-slate-900 mb-1 ml-[0.25em]">
            Creative Events
          </span>
          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-slate-400">
            Nordic Marketplace Hub
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50 overflow-x-hidden w-full">
      <AnimatePresence>
        {isSigningOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <LogOut className="w-12 h-12 text-slate-300 mb-6" />
              <p className="text-white text-lg font-medium tracking-wide">Signing you out...</p>
              <div className="w-48 h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
                <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="h-full bg-slate-300"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-[5rem] flex justify-between items-center w-full">
          {/* Logo */}
          <Link to="/" className="hover:opacity-80 transition-opacity flex items-center gap-2">
            <span className="font-brand text-[16.5px] sm:text-[18px] md:text-lg font-extrabold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-slate-900 pt-1 whitespace-nowrap">Creative Events</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-5 lg:gap-8 text-[11px] font-brand font-bold uppercase tracking-[0.15em] text-slate-700 pt-1 mr-auto ml-12">
            <Link to="/explore" className="hover:text-slate-900 transition-colors py-1">Marketplace</Link>
            <Link to="/vendors" className="hover:text-slate-900 transition-colors py-1">Our Vendors</Link>
            <Link to="/ad-board" className="hover:text-slate-900 transition-colors py-1 flex items-center gap-1.5">
              <span>Get Quotes</span>
              {requestBoardUnreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center">
                  {requestBoardUnreadCount}
                </span>
              )}
            </Link>
            {user?.role !== 'VENDOR' && (
              <Link to="/join" className="hover:text-slate-900 transition-colors py-1">Join us</Link>
            )}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex bg-slate-100 rounded-full p-1 mr-2">
              <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${language === 'en' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-400'}`}>EN</button>
              <button onClick={() => setLanguage('sv')} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${language === 'sv' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-400'}`}>SV</button>
            </div>

            {/* Messages icon for USER role */}
            {user?.role === 'USER' && (
              <button
                onClick={() => setUserChatOpen(p => !p)}
                title="My Messages"
                className={`relative p-2.5 rounded-full transition-all ${
                  userChatOpen ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Inbox className="w-5 h-5" />
                {userUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {userUnreadCount > 9 ? '9+' : userUnreadCount}
                  </span>
                )}
              </button>
            )}

            {user ? (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} 
                  className={`p-2.5 rounded-full transition-all ${isUserMenuOpen ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white'}`}
                >
                  <User className="w-5 h-5" />
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl py-4 z-[100] animate-in fade-in slide-in-from-top-2">
                    <div className="px-6 py-4 border-b border-slate-50 mb-2">
                      <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">{user.role}</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{user.email}</p>
                    </div>
                    <div className="px-2 space-y-1">
                      {user.role === 'ADMIN' && (
                        <>
                          <Link 
                            to="/admin" 
                            onClick={() => setIsUserMenuOpen(false)}
                            className={getMenuLinkClass('/admin')}
                          >
                            <ShieldCheck className="w-4 h-4" /> Admin Panel
                          </Link>
                          <Link 
                            to="/vendor-review" 
                            onClick={() => setIsUserMenuOpen(false)}
                            className={getMenuLinkClass('/vendor-review')}
                          >
                            <Clock className="w-4 h-4" /> Vendor Review
                          </Link>
                        </>
                      )}
                      {user.role === 'VENDOR' && (
                        <>
                          <Link 
                            to="/dashboard" 
                            onClick={() => setIsUserMenuOpen(false)}
                            className={getMenuLinkClass('/dashboard')}
                          >
                            <ShoppingBag className="w-4 h-4" /> Dashboard
                          </Link>
                          <Link 
                            to="/vendor-inbox" 
                            onClick={() => setIsUserMenuOpen(false)}
                            className={getMenuLinkClass('/vendor-inbox')}
                          >
                            <Inbox className="w-4 h-4" /> Inbox
                          </Link>
                          <Link 
                            to="/profile" 
                            onClick={() => setIsUserMenuOpen(false)}
                            className={getMenuLinkClass('/profile')}
                          >
                            <Settings className="w-4 h-4" /> Profile
                          </Link>
                        </>
                      )}
                      <Link 
                        to="/change-password" 
                        onClick={() => setIsUserMenuOpen(false)}
                        className={getMenuLinkClass('/change-password')}
                      >
                        <Lock className="w-4 h-4" /> Change Password
                      </Link>
                      <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-xs text-red-500 hover:bg-red-50 rounded-2xl"><LogOut className="w-4 h-4" /> Sign Out</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg">
                <LogIn className="w-4 h-4" /> Sign In
              </Link>
            )}
          </div>

          {/* Mobile Actions Header Bar */}
          <div className="flex md:hidden items-center gap-1.5 sm:gap-2.5">
            {/* Mobile language switch */}
            <div className="flex bg-slate-100 rounded-full p-0.5 shrink-0">
              <button onClick={() => setLanguage('en')} className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase transition-all ${language === 'en' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-400'}`}>EN</button>
              <button onClick={() => setLanguage('sv')} className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase transition-all ${language === 'sv' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-400'}`}>SV</button>
            </div>

            {/* Messages icon for USER role on mobile */}
            {user?.role === 'USER' && (
              <button
                onClick={() => setUserChatOpen(p => !p)}
                title="My Messages"
                className={`relative p-2 rounded-full transition-all shrink-0 ${
                  userChatOpen ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Inbox className="w-4 h-4" />
                {userUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {userUnreadCount > 9 ? '9+' : userUnreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Hamburger button */}
            <button
              onClick={() => setIsMenuOpen(prev => !prev)}
              aria-label="Toggle Menu"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-slate-800 shrink-0"
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu Slider */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden border-t border-slate-100 bg-white shadow-xl overflow-hidden"
            >
              <div className="px-5 py-6 space-y-5">
                {/* Navigation Links */}
                <div className="flex flex-col gap-3">
                  <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest px-1">Navigation</p>
                  <Link 
                    to="/explore" 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 rounded-2xl"
                  >
                    Marketplace
                  </Link>
                  <Link 
                    to="/vendors" 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 rounded-2xl"
                  >
                    Our Vendors
                  </Link>
                  <Link 
                    to="/ad-board" 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 rounded-2xl"
                  >
                    <span>Get Quotes</span>
                    {requestBoardUnreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center">
                        {requestBoardUnreadCount}
                      </span>
                    )}
                  </Link>
                  {user?.role !== 'VENDOR' && (
                    <Link 
                      to="/join" 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 rounded-2xl"
                    >
                      Join us
                    </Link>
                  )}
                </div>

                {/* User section or Sign In */}
                <div className="border-t border-slate-100 pt-4">
                  {user ? (
                    <div className="space-y-4">
                      <div className="px-3 py-2 bg-slate-50 rounded-2xl">
                        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">{user.role}</p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{user.email}</p>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        {user.role === 'ADMIN' && (
                          <>
                            <Link 
                              to="/admin" 
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
                            >
                              <ShieldCheck className="w-4 h-4 text-slate-400" /> Admin Panel
                            </Link>
                            <Link 
                              to="/vendor-review" 
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
                            >
                              <Clock className="w-4 h-4 text-slate-400" /> Vendor Review
                            </Link>
                          </>
                        )}
                        {user.role === 'VENDOR' && (
                          <>
                            <Link 
                              to="/dashboard" 
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
                            >
                              <ShoppingBag className="w-4 h-4 text-slate-400" /> Dashboard
                            </Link>
                            <Link 
                              to="/vendor-inbox" 
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
                            >
                              <Inbox className="w-4 h-4 text-slate-400" /> Inbox
                            </Link>
                            <Link 
                              to="/profile" 
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
                            >
                              <Settings className="w-4 h-4 text-slate-400" /> Profile
                            </Link>
                          </>
                        )}
                        <Link 
                          to="/change-password" 
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
                        >
                          <Lock className="w-4 h-4 text-slate-400" /> Change Password
                        </Link>
                        
                        <button 
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleSignOut();
                          }} 
                          className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl w-full text-left mt-2"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Link 
                      to="/login" 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-2 bg-slate-900 text-white w-full py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg"
                    >
                      <LogIn className="w-4 h-4" /> Sign In
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="flex-grow flex flex-col">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Home vendors={vendors} /></PageTransition>} />
            <Route path="/explore" element={<PageTransition><Explore vendors={vendors.filter(v => v.status === VendorStatus.APPROVED)} /></PageTransition>} />
            <Route path="/vendors" element={<PageTransition><OurVendors vendors={vendors.filter(v => v.status === VendorStatus.APPROVED)} /></PageTransition>} />
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/vendors/:id" element={<PageTransition><VendorDetail vendors={vendors} /></PageTransition>} />
            <Route path="/services/:vendorId/:serviceId" element={<PageTransition><ServiceDetail vendors={vendors} /></PageTransition>} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<PageTransition><PrivateRoute roles={['VENDOR']}><VendorDashboard vendors={vendors} onAddVendor={addVendor} /></PrivateRoute></PageTransition>} />
            <Route path="/profile" element={<PageTransition><PrivateRoute roles={['VENDOR']}><VendorProfile vendors={vendors} onAddVendor={addVendor} /></PrivateRoute></PageTransition>} />
            <Route path="/admin" element={<PageTransition><PrivateRoute roles={['ADMIN']}><AdminDashboard vendors={vendors} onUpdateStatus={updateStatus} onToggleFeature={toggleFeature} onToggleVerify={toggleVerify} onDeleteVendor={deleteVendor} onUpdateVendor={addVendor} onAddVendor={addVendor} /></PrivateRoute></PageTransition>} />
            <Route path="/vendor-review" element={<PageTransition><PrivateRoute roles={['ADMIN']}><VendorReview vendors={vendors} onUpdateStatus={updateStatus} /></PrivateRoute></PageTransition>} />
            
            {/* Vendor Inbox */}
            <Route path="/vendor-inbox" element={<PageTransition><PrivateRoute roles={['VENDOR']}><VendorInbox /></PrivateRoute></PageTransition>} />
            
            {/* Ad Request Board — public */}
            <Route path="/ad-board" element={<PageTransition><AdBoard /></PageTransition>} />
            
            {/* New Change Password Route (Accessible to authenticated users) */}
            <Route path="/change-password" element={<PageTransition><PrivateRoute><ChangePassword /></PrivateRoute></PageTransition>} />

            {/* Public Reset Password Route */}
            <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />

            {/* Public Vendor Registration - Now separated, restricted for existing vendors */}
            <Route 
              path="/join" 
              element={
                <PageTransition>
                  {user?.role === 'VENDOR'
                      ? <Navigate to="/dashboard" replace />
                      : <JoinMarketplace onJoin={addVendor} />
                  }
                </PageTransition>
              } 
            />
            <Route path="/vendors/new" element={<Navigate to="/join" replace />} />
            
            <Route path="/register/:id" element={<PageTransition><RegisterVendor /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </main>

      <Chatbot vendors={vendors} />
      {user?.role === 'USER' && (
        <UserChatbox
          isOpen={userChatOpen}
          onClose={() => setUserChatOpen(false)}
          onUnreadCountChange={setUserUnreadCount}
        />
      )}
      
      <footer className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center mb-6">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-[110px] w-auto object-contain drop-shadow-sm"
            />
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Nordic Marketplace Hub</p>
          <div className="flex justify-center gap-6 mt-6 mb-2">
            <a 
              href="https://www.linkedin.com/company/creativeventsnordic/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-400 hover:text-slate-900 transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a 
              href="https://www.instagram.com/creativeventsnordic?igsh=MXh2ZjdhMmd3emJ3ZA%3D%3D&utm_source=qr" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-400 hover:text-slate-900 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a 
              href="https://www.facebook.com/share/1BcP2w6S9g/?mibextid=wwXIfr" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-400 hover:text-slate-900 transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>
          <p className="text-[10px] text-slate-400 font-light tracking-wide mt-3">
            &copy; {new Date().getFullYear()} Creative Events. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  </LanguageProvider>
);

export default App;