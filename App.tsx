import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Vendor, VendorStatus } from './types';
import { INITIAL_VENDORS } from './constants';
import Home from './pages/Home';
import Explore from './pages/Explore';
import VendorDashboard from './pages/VendorDashboard';
import JoinMarketplace from './pages/JoinMarketplace';
import AdminDashboard from './pages/AdminDashboard';
import VendorDetail from './pages/VendorDetail';
import VendorMockup from './pages/VendorMockup';
import RegisterVendor from './pages/RegisterVendor';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Chatbot from './components/Chatbot';
import { api } from './services/api';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { User, ShieldCheck, ShoppingBag, Menu, X, Settings, LogOut, Heart, Clock, Languages, Loader2, LogIn, Lock } from 'lucide-react';

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

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Authenticating...</p>
    </div>
  );

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { language, setLanguage, t } = useLanguage();
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
        
        // Auto-seed data if database is empty
        if (data.length === 0) {
          console.log("Database empty. Seeding initial vendors...");
          for (const v of INITIAL_VENDORS) {
            await api.saveVendor(v);
          }
          // Fetch again after seeding
          const seededData = await api.getVendors();
          setVendors(seededData);
        } else {
          setVendors(data);
        }
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

  const updateStatus = async (id: string, status: VendorStatus, password?: string) => {
    // Return the credentials result so AdminDashboard can use it
    const result = await api.updateVendorStatus(id, status, password);
    await refreshVendors();
    return result;
  };

  const toggleFeature = async (id: string) => {
    await api.toggleFeatured(id);
    await refreshVendors();
  };

  const deleteVendor = async (id: string) => {
    await api.deleteVendor(id);
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

  if (isDataLoading || isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Syncing with Creative Cloud...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[5rem] py-3 md:py-0 flex flex-wrap justify-between items-center gap-y-3">
          <Link to="/" className="hover:opacity-80 transition-opacity flex items-center gap-3 order-1">
            <motion.img 
              src="/logo.svg" 
              alt="Logo" 
              className="h-[42px] w-[42px] object-contain drop-shadow-sm"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.05 }}
            />
            <span className="font-brand text-base sm:text-lg font-extrabold uppercase tracking-[0.15em] text-slate-900 pt-1">Creative Events</span>
          </Link>

          <div className="flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 pt-1 order-3 md:order-2 w-full md:w-auto mt-1 md:mt-0 md:mr-auto md:ml-8">
            <Link to="/explore" className="hover:text-sky-600 transition-colors">Marketplace</Link>
            {user?.role !== 'VENDOR' && (
              <Link to="/join" className="hover:text-sky-600 transition-colors">Join Marketplace</Link>
            )}
          </div>

          <div className="flex items-center gap-4 order-2 md:order-3">
            <div className="hidden md:flex bg-slate-100 rounded-full p-1 mr-2">
              <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${language === 'en' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-400'}`}>EN</button>
              <button onClick={() => setLanguage('sv')} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${language === 'sv' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-400'}`}>SV</button>
            </div>

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
                        <Link 
                          to="/admin" 
                          onClick={() => setIsUserMenuOpen(false)}
                          className={getMenuLinkClass('/admin')}
                        >
                          <ShieldCheck className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      {user.role === 'VENDOR' && (
                        <Link 
                          to="/dashboard" 
                          onClick={() => setIsUserMenuOpen(false)}
                          className={getMenuLinkClass('/dashboard')}
                        >
                          <ShoppingBag className="w-4 h-4" /> Merchant Center
                        </Link>
                      )}
                      <button className="w-full flex items-center gap-3 px-4 py-3 text-xs text-slate-600 hover:bg-slate-50 rounded-2xl">
                        <Heart className="w-4 h-4" /> Favorites
                      </button>
                      <Link 
                        to="/change-password" 
                        onClick={() => setIsUserMenuOpen(false)}
                        className={getMenuLinkClass('/change-password')}
                      >
                        <Lock className="w-4 h-4" /> Change Password
                      </Link>
                      <button onClick={() => { logout(); setIsUserMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs text-red-500 hover:bg-red-50 rounded-2xl"><LogOut className="w-4 h-4" /> Sign Out</button>
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
        </div>
      </nav>

      <main className="flex-grow flex flex-col">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Home vendors={vendors} /></PageTransition>} />
            <Route path="/explore" element={<PageTransition><Explore vendors={vendors.filter(v => v.status === VendorStatus.APPROVED)} /></PageTransition>} />
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/vendors/:id" element={<PageTransition><VendorDetail vendors={vendors} /></PageTransition>} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<PageTransition><PrivateRoute roles={['VENDOR']}><VendorDashboard vendors={vendors} onAddVendor={addVendor} /></PrivateRoute></PageTransition>} />
            <Route path="/admin" element={<PageTransition><PrivateRoute roles={['ADMIN']}><AdminDashboard vendors={vendors} onUpdateStatus={updateStatus} onToggleFeature={toggleFeature} onDeleteVendor={deleteVendor} onUpdateVendor={addVendor} onAddVendor={addVendor} /></PrivateRoute></PageTransition>} />
            
            {/* New Change Password Route (Accessible to authenticated users) */}
            <Route path="/change-password" element={<PageTransition><PrivateRoute><ChangePassword /></PrivateRoute></PageTransition>} />

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
            
            <Route path="/register/:id" element={<PageTransition><RegisterVendor vendors={vendors} onUpdateVendor={addVendor} /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </main>

      <Chatbot vendors={vendors} />
      
      <footer className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-3 mb-6">
            <motion.img 
              src="/logo.svg" 
              alt="Logo" 
              className="h-[46px] w-[46px] object-contain drop-shadow-sm"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.05 }}
            />
            <h2 className="font-brand text-xl font-extrabold uppercase tracking-[0.15em] text-slate-900 m-0 pt-1">Creative Events</h2>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Nordic Marketplace Hub</p>
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
