
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight, Star, Shield, ChevronLeft, ChevronRight, Search, MapPin, Grid,
  Building2, Camera, Music, UtensilsCrossed, Flower, ClipboardList, Send, Users,
  BadgeCheck, Heart, Zap, Clock, CheckCircle, Bell, UserPlus, Calendar,
  Lock, X, Loader2, Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VendorCategory, Vendor, GalleryPhoto } from '../types';
import { AVAILABLE_LOCATIONS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/api';
import emailjs from '@emailjs/browser';

interface HomeProps {
  vendors: Vendor[];
}

/* ─── Static data ────────────────────────────────────────────────────────── */
const STATS = [
  { icon: Users,        value: '50+',    label: 'Verified Vendors',    sub: 'Across Nordic' },
  { icon: CheckCircle,  value: '200+',   label: 'Successful Events',   sub: 'And counting' },
  { icon: Star,         value: '4.9/5',  label: 'Average Rating',      sub: 'From happy clients' },
  { icon: Zap,          value: '98%',    label: 'Client Satisfaction', sub: 'Based on reviews' },
  { icon: Grid,         value: '10+',    label: 'Event Categories',    sub: 'To choose from' },
];

const CATEGORIES_DATA = [
  { name: VendorCategory.VENUES,          icon: Building2,    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800' },
  { name: VendorCategory.PHOTOGRAPHY,     icon: Camera,       image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800' },
  { name: VendorCategory.CATERING,        icon: UtensilsCrossed, image: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=800' },
  { name: VendorCategory.DECOR,           icon: Flower,       image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=800' },
  { name: VendorCategory.MUSIC,           icon: Music,        image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800' },
  { name: VendorCategory.KIDS_ENTERTAINMENT, icon: ClipboardList, image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800' },
];

const POPULAR_CITIES = [
  { name: 'Stockholm',  image: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?auto=format&fit=crop&q=80&w=800' },
  { name: 'Gothenburg', image: 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&q=80&w=800' },
  { name: 'Malmö',      image: 'https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?auto=format&fit=crop&q=80&w=800' },
  { name: 'Uppsala',    image: 'https://images.unsplash.com/photo-1561542320-9a18cd340469?auto=format&fit=crop&q=80&w=800' },
];

const CUSTOMER_REVIEWS = [
  {
    name: 'Emma Johansson',
    role: { sv: 'Bröllop i Stockholm', en: 'Wedding in Stockholm' },
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120&h=120',
    rating: 5,
    text: {
      sv: 'Vi hittade vår fantastiska bröllopslokal och fotograf genom Creative Events på mindre än en vecka. Att kunna begära offerter direkt sparade oss så mycket tid!',
      en: 'We found our amazing wedding venue and photographer through Creative Events in less than a week. Being able to request custom quotes directly saved us so much time!'
    }
  },
  {
    name: 'Johan Lindqvist',
    role: { sv: 'Företagsfest i Göteborg', en: 'Corporate Event in Gothenburg' },
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120&h=120',
    rating: 5,
    text: {
      sv: 'Fantastisk plattform för att arrangera företagsevenemang. Catering och DJ var i absolut världsklass, och hela kommunikationen skedde smidigt på ett ställe.',
      en: 'Fantastic platform for arranging corporate events. The catering and DJ were absolute world-class, and all communication was handled seamlessly in one place.'
    }
  },
  {
    name: 'Linnea Berg',
    role: { sv: '30-årsfest i Malmö', en: '30th Birthday Party in Malmö' },
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120&h=120',
    rating: 5,
    text: {
      sv: 'Att boka dekorationer och catering till min födelsedagsfest var otroligt enkelt. Alla leverantörer var verifierade och mycket professionella. Rekommenderas varmt!',
      en: 'Booking decorations and catering for my birthday party was incredibly simple. All the vendors were verified and highly professional. Highly recommended!'
    }
  }
];

const LIVE_ACTIVITY = [
  { icon: CheckCircle, color: '#0284c7', bg: '#e0f2fe', text: 'New booking made',   detail: 'Wedding in Stockholm',         time: '2 min ago' },
  { icon: UserPlus,    color: '#16a34a', bg: '#dcfce7', text: 'Vendor joined',      detail: 'Elite Catering',              time: '5 min ago' },
  { icon: Bell,        color: '#f97316', bg: '#ffedd5', text: 'New inquiry',        detail: 'Photography in Malmö',        time: '7 min ago' },
  { icon: Calendar,    color: '#7c3aed', bg: '#ede9fe', text: 'Event booked',       detail: 'Corporate Event in Gothenburg', time: '10 min ago' },
];

// Fallback gallery images if Supabase is empty
const GALLERY_FALLBACK: GalleryPhoto[] = [
  { id: 'f1', url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80', caption: 'Luxury Wedding Reception', location: 'Stockholm',  created_at: '' },
  { id: 'f2', url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80', caption: 'Fine Dining Event',        location: 'Gothenburg', created_at: '' },
  { id: 'f3', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80', caption: 'Live Music Performance',   location: 'Malmö',      created_at: '' },
  { id: 'f4', url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80', caption: 'Elegant Table Setting',    location: 'Stockholm',  created_at: '' },
  { id: 'f5', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80', caption: 'Grand Ballroom Event',     location: 'Uppsala',    created_at: '' },
  { id: 'f6', url: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=800&q=80', caption: 'Outdoor Celebration',      location: 'Gothenburg', created_at: '' },
];

/* ─── Contact Form Modal ─────────────────────────────────────────────────── */
interface ContactModalProps {
  onClose: () => void;
  language: string;
  t: (key: string) => string;
}
const ContactModal: React.FC<ContactModalProps> = ({ onClose, language, t }) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [contactForm, setContactForm] = useState({ vision: '', email: '', phone: '', capacity: '', eventDate: '', category: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_fcxafes',
        import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID || 'template_cqrzyss',
        {
          message: contactForm.vision,
          user_email: contactForm.email,
          user_phone: contactForm.phone || 'Not provided',
          user_capacity: contactForm.capacity || 'Not provided',
          event_date: contactForm.eventDate || 'Not provided',
          category: contactForm.category || 'Not specified',
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'xaAogphDl0s4ydiOa'
      );
      setFormSubmitted(true);
      setContactForm({ vision: '', email: '', phone: '', capacity: '', eventDate: '', category: '' });
      setTimeout(() => { setFormSubmitted(false); onClose(); }, 4000);
    } catch (error) {
      console.error('Failed to send contact form:', error);
      alert('Could not send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-sky-50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t('home.contactTitle')}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Vendors will reach out with custom quotes</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {formSubmitted ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-sky-600" fill="currentColor" />
              </div>
              <p className="text-slate-900 font-bold text-xl">{t('home.successTitle')}</p>
              <p className="text-slate-400 text-xs mt-4 uppercase tracking-widest font-bold">{t('home.successBadge')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('home.visionLabel')}</label>
                <input
                  type="text" required
                  value={contactForm.vision}
                  onChange={e => setContactForm({ ...contactForm, vision: e.target.value })}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  onFocus={e => (e.target.style.borderColor = '#0284c7')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  placeholder={t('home.visionPlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('home.emailLabel')}</label>
                  <input
                    type="email" required
                    value={contactForm.email}
                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    onFocus={e => (e.target.style.borderColor = '#0284c7')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                  <input
                    type="tel" required
                    value={contactForm.phone}
                    onChange={e => setContactForm({ ...contactForm, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '') })}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    onFocus={e => (e.target.style.borderColor = '#0284c7')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    placeholder="+46 70 123 45 67"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{language === 'sv' ? 'Antal gäster' : 'Guest Capacity'}</label>
                  <input
                    type="number" required
                    value={contactForm.capacity}
                    onChange={e => setContactForm({ ...contactForm, capacity: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    onFocus={e => (e.target.style.borderColor = '#0284c7')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    placeholder="e.g. 150"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{language === 'sv' ? 'Kategori' : 'Category'}</label>
                  <select
                    required
                    value={contactForm.category}
                    onChange={e => setContactForm({ ...contactForm, category: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: contactForm.category ? '#1e293b' : '#94a3b8' }}
                  >
                    <option value="" disabled>{language === 'sv' ? 'Välj kategori...' : 'Select a category...'}</option>
                    {Object.values(VendorCategory).map(cat => (
                      <option key={cat} value={cat} style={{ color: '#1e293b' }}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{language === 'sv' ? 'Evenemangsdatum' : 'Event Date'}</label>
                <input
                  type="date" required
                  value={contactForm.eventDate}
                  onChange={e => setContactForm({ ...contactForm, eventDate: e.target.value })}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: contactForm.eventDate ? '#1e293b' : '#94a3b8' }}
                  onFocus={e => (e.target.style.borderColor = '#0284c7')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
              <button
                type="submit"
                disabled={isSending}
                className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', boxShadow: '0 4px 16px rgba(2,132,199,0.35)' }}
              >
                {isSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> {t('home.sendRequest')}</>}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

/* ─── Main Home Component ────────────────────────────────────────────────── */
const Home: React.FC<HomeProps> = ({ vendors }) => {
  const { t, language } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedCapacity, setSelectedCapacity] = useState<number>(0);
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [showContactModal, setShowContactModal] = useState(false);
  const [likedVendors, setLikedVendors] = useState<Set<string>>(new Set());
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);

  const SLIDES = [
    { url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2500', title: t('hero.venues'),       subtitle: t('hero.venues_sub') },
    { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=2500', title: t('hero.photography'), subtitle: t('hero.photography_sub') },
    { url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=2500', title: t('hero.catering'),    subtitle: t('hero.catering_sub') },
    { url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=2500', title: t('hero.planning'),    subtitle: t('hero.planning_sub') },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide(prev => (prev + 1) % SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, [SLIDES.length]);

  // Load gallery preview
  useEffect(() => {
    api.getGalleryPhotos().then(data => {
      setGalleryPhotos(data.length > 0 ? data.slice(0, 6) : GALLERY_FALLBACK);
    }).catch(() => {
      setGalleryPhotos(GALLERY_FALLBACK);
    });
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedLocation !== 'All') params.set('location', selectedLocation);
    if (selectedCapacity > 0) params.set('minCapacity', selectedCapacity.toString());
    navigate(`/explore?${params.toString()}`);
  };

  const toggleLike = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setLikedVendors(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const featuredVendors = vendors.filter(v => v.isFeatured).slice(0, 4);

  // Vendor count per category
  const vendorCountForCat = (catName: string) =>
    vendors.filter(v => v.services?.some(s => s.category === catName)).length;

  return (
    <div className="bg-white">

      {/* ══════════════════════════════════════════════════════════════
          HERO SECTION — UNCHANGED
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative h-[95vh] flex items-center justify-center overflow-hidden bg-slate-900">
        {SLIDES.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="absolute inset-0 bg-black/40 z-10" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 z-10" />
            <img
              src={slide.url}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transform transition-transform duration-[10000ms] ease-out ${index === currentSlide ? 'scale-[1.15]' : 'scale-100'}`}
              alt={slide.title}
            />
          </div>
        ))}

        <div className="relative z-20 text-center px-4 max-w-5xl">
          {/* Elegant Floating Events Gallery Badge */}
          <div className="mb-4">
            <Link
              to="/events"
              className="group inline-flex items-center gap-1.5 sm:gap-2.5 bg-white/10 hover:bg-white/15 active:bg-white/20 backdrop-blur-md px-2.5 py-1 sm:px-4 sm:py-2 rounded-full border border-white/20 text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(56,189,248,0.25)] hover:border-white/40"
            >
              <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-sky-400"></span>
              </span>
              <span className="text-white font-semibold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-[9px] sm:text-[10px]">
                {language === 'sv' ? 'Evenemangsgalleri' : 'Events Gallery'}
              </span>
              <span className="text-white/30 text-xs">|</span>
              <span className="text-sky-300 group-hover:text-white transition-colors font-medium text-[10px] sm:text-[11px] flex items-center gap-1">
                <span className="hidden sm:inline">
                  {language === 'sv' ? 'Se fantastiska minnen' : 'Explore beautiful memories'}
                </span>
                <span className="sm:hidden">
                  {language === 'sv' ? 'Visa' : 'View'}
                </span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>

          <div className="min-h-[240px] flex flex-col justify-center items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="flex flex-col items-center"
              >
                <span className="inline-block px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-[0.3em] mb-8 shadow-lg">
                  {SLIDES[currentSlide].subtitle}
                </span>
                <h1 className="text-4xl md:text-6xl lg:text-7xl text-white mb-12 leading-tight serif italic drop-shadow-2xl">
                  {SLIDES[currentSlide].title}
                </h1>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="bg-white/10 backdrop-blur-xl p-2 rounded-[2rem] border border-white/20 max-w-3xl mx-auto shadow-2xl animate-in fade-in zoom-in duration-1000 delay-300">
            <div className="flex flex-col md:flex-row items-center gap-2 bg-white rounded-[1.8rem] p-2">
              <div className="flex-1 flex items-center px-6 border-b md:border-b-0 md:border-r border-slate-100 w-full md:w-auto h-12">
                <Grid className="w-5 h-5 text-sky-600 mr-3 flex-shrink-0" />
                <select
                  className="w-full h-full text-sm font-semibold text-slate-700 bg-transparent border-none focus:ring-0 outline-none cursor-pointer tracking-wide"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <option value="All">{t('search.category')}</option>
                  {Object.values(VendorCategory).map(cat => (
                    <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 flex items-center px-6 border-b md:border-b-0 md:border-r border-slate-100 w-full md:w-auto h-12">
                <MapPin className="w-5 h-5 text-sky-600 mr-3 flex-shrink-0" />
                <select
                  className="w-full h-full text-sm font-semibold text-slate-700 bg-transparent border-none focus:ring-0 outline-none cursor-pointer tracking-wide"
                  value={selectedLocation}
                  onChange={e => setSelectedLocation(e.target.value)}
                >
                  <option value="All">{t('search.location')}</option>
                  {AVAILABLE_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div className="flex-1 flex items-center px-6 w-full md:w-auto h-12">
                <Users className="w-5 h-5 text-sky-600 mr-3 flex-shrink-0" />
                <select
                  className="w-full h-full text-sm font-semibold text-slate-700 bg-transparent border-none focus:ring-0 outline-none cursor-pointer tracking-wide"
                  value={selectedCapacity}
                  onChange={e => setSelectedCapacity(Number(e.target.value))}
                >
                  <option value={0}>{language === 'sv' ? 'Storlek' : 'Capacity'}</option>
                  <option value={20}>20+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
                  <option value={50}>50+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
                  <option value={100}>100+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
                  <option value={200}>200+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
                  <option value={500}>500+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
                </select>
              </div>
              <button
                onClick={handleSearch}
                className="w-full md:w-auto bg-slate-900 text-white px-10 h-12 rounded-2xl flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-sky-600 transition-all shadow-xl hover:scale-105 active:scale-95"
              >
                <Search className="w-4 h-4" /> {t('hero.explore')}
              </button>
            </div>
          </div>

          <p className="text-white/80 text-sm mt-10 font-medium tracking-widest uppercase drop-shadow-md animate-in fade-in duration-1000 delay-500">
            {t('hero.searchPlaceholder')}
          </p>
        </div>

        <div className="absolute bottom-10 z-30 flex gap-4">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-500 shadow-sm backdrop-blur-sm ${index === currentSlide ? 'w-16 bg-white' : 'w-8 bg-white/40 hover:bg-white/60'}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left pt-6 sm:pt-0 sm:px-6 first:pl-0 last:pr-0"
                >
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#e0f2fe' }}>
                    <Icon className="w-5 h-5" style={{ color: '#0284c7' }} />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-900 leading-tight">{stat.value}</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{stat.label}</p>
                    <p className="text-[11px] text-slate-400 font-light">{stat.sub}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TOP CATEGORIES
      ══════════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                {t('home.categoriesTitle')}
              </h2>
              <p className="text-slate-400 text-sm mt-1 font-light">{t('home.categoriesSub')}</p>
            </div>
            <Link
              to="/explore"
              className="hidden sm:flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-70"
              style={{ color: '#0284c7' }}
            >
              View all categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES_DATA.map((cat, idx) => {
              const Icon = cat.icon;
              const count = vendorCountForCat(cat.name);
              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.07 }}
                >
                  <Link
                    to={`/explore?category=${cat.name}`}
                    className="group block relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-200"
                  >
                    <img
                      src={cat.image}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-0 p-4 flex flex-col justify-end">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: 'rgba(2,132,199,0.85)' }}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-white leading-snug">{cat.name}</h3>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <div className="flex sm:hidden justify-center mt-6">
            <Link to="/explore" className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#0284c7' }}>
              View all categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FEATURED VENDORS + LIVE ACTIVITY
      ══════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Featured Vendors — left */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {t('home.featuredTitle')}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1 font-light">{t('home.featuredSub')}</p>
                </div>
                <Link to="/vendors" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: '#0284c7' }}>
                  View all vendors <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {featuredVendors.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                  {featuredVendors.map((vendor, idx) => {
                    const primaryService = vendor.services?.[0];
                    const imageUrl = primaryService?.imageUrl || primaryService?.imageUrls?.[0] || vendor.applicationImageUrl;
                    const lowestPrice = primaryService?.packages?.map(p => p.price).filter(p => p > 0).sort((a,b) => a-b)[0];
                    const isLiked = likedVendors.has(vendor.id);
                    const badge = vendor.verified || vendor.rating >= 4.8
                      ? { label: 'TOP RATED', color: '#ca8a04', bg: 'rgba(202,138,4,0.18)' }
                      : vendor.isFeatured
                      ? { label: 'POPULAR', color: '#f97316', bg: 'rgba(249,115,22,0.18)' }
                      : null;

                    return (
                      <motion.div
                        key={vendor.id}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: idx * 0.08 }}
                        className="h-full"
                      >
                        <Link
                          to={`/vendors/${vendor.id}`}
                          state={{ history: [routerLocation.pathname + routerLocation.search] }}
                          className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border border-slate-100"
                          style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}
                        >
                          {/* Image */}
                          <div className="relative aspect-[4/3] overflow-hidden bg-slate-50 flex-shrink-0">
                            {imageUrl
                              ? <img src={imageUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={vendor.name} />
                              : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-sky-100"><Building2 className="w-10 h-10 text-sky-200" /></div>
                            }
                            {badge && (
                              <div className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider" style={{ background: badge.bg, color: badge.color, backdropFilter: 'blur(8px)' }}>
                                🔥 {badge.label}
                              </div>
                            )}
                          </div>

                          {/* Card body */}
                          <div className="flex-1 p-4 flex flex-col justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-slate-950 leading-snug line-clamp-2 group-hover:text-sky-600 transition-colors">
                                {vendor.name}
                              </h3>
                              {vendor.applicationLocation && (
                                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                                  <MapPin className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                                  <span className="font-medium truncate">{vendor.applicationLocation}</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 mt-4 border-t border-slate-50 flex items-center justify-between">
                              {lowestPrice && lowestPrice > 0 ? (
                                <>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    {language === 'sv' ? 'Från' : 'Starting from'}
                                  </span>
                                  <span className="text-sm font-black text-sky-600">
                                    SEK {lowestPrice.toLocaleString('sv-SE')}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  {language === 'sv' ? 'Kontakta för pris' : 'Contact for Price'}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-slate-400 text-sm">Featured vendors coming soon!</p>
                </div>
              )}
            </div>

            {/* Live Activity — right */}
            <div className="lg:w-72 flex-shrink-0">
              <div
                className="rounded-2xl overflow-hidden h-full"
                style={{ border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Live Activity</h3>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: '#dcfce7' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Live</span>
                  </div>
                </div>

                {/* Activity items */}
                <div className="p-4 space-y-3">
                  {LIVE_ACTIVITY.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: i * 0.08 }}
                        className="flex items-start gap-3 p-3 rounded-xl"
                        style={{ background: '#f8fafc' }}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.bg }}>
                          <Icon className="w-4 h-4" style={{ color: item.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 leading-snug">{item.text}</p>
                          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{item.detail}</p>
                          <p className="text-[10px] text-slate-300 mt-0.5">{item.time}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="px-4 pb-4">
                  <Link
                    to="/ad-board"
                    className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-70 transition-opacity"
                    style={{ color: '#0284c7' }}
                  >
                    View all activity <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          HAVE A UNIQUE VISION — BANNER
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="py-12 px-4"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c4a6e 50%, #0369a1 100%)' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left */}
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Planning something special?
                </h2>
                <p className="text-white/65 text-sm font-light mt-1 max-w-sm">
                  Get custom quotes from verified vendors and make your event unforgettable.
                </p>
              </div>
            </div>

            {/* Center stats */}
            <div className="hidden lg:flex items-center gap-10 flex-shrink-0">
              {[
                { value: '3',    label: 'Avg. Quotes\nPer Request' },
                { value: '24h',  label: 'Avg. Response\nTime' },
                { value: '100%', label: 'Free to Use\nNo Hidden Fees' },
              ].map(s => (
                <div key={s.value} className="text-center">
                  <p className="text-3xl font-black" style={{ color: '#38bdf8' }}>{s.value}</p>
                  <p className="text-white/55 text-[11px] font-medium leading-tight mt-0.5 whitespace-pre-line">{s.label}</p>
                </div>
              ))}
            </div>

            {/* CTA button */}
            <button
              id="get-custom-quotes-btn"
              onClick={() => setShowContactModal(true)}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold text-white flex-shrink-0 transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', boxShadow: '0 6px 24px rgba(2,132,199,0.45)' }}
            >
              Get Custom Quotes <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          OUR EVENTS GALLERY PREVIEW
      ══════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-7">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                Our Events
              </h2>
              <p className="text-slate-400 text-sm mt-1 font-light">Real moments, real celebrations.</p>
            </div>
            <Link
              to="/events"
              className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity"
              style={{ color: '#0284c7' }}
            >
              View full gallery <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 3-column asymmetric grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {galleryPhotos.slice(0, 6).map((photo, idx) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
                className={`relative overflow-hidden rounded-2xl group cursor-pointer ${idx === 0 ? 'row-span-2' : ''}`}
                style={{ aspectRatio: idx === 0 ? undefined : '4/3', minHeight: idx === 0 ? '320px' : undefined }}
                onClick={() => navigate('/events')}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || 'Event'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  style={{ height: idx === 0 ? '100%' : undefined }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100">
                  {photo.caption && <p className="text-white text-sm font-bold">{photo.caption}</p>}
                  {photo.location && (
                    <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {photo.location}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          POPULAR CITIES
      ══════════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-7">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              Popular Cities
            </h2>
            <Link to="/vendors" className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: '#0284c7' }}>
              Explore all cities <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {POPULAR_CITIES.map((city, idx) => (
              <motion.div
                key={city.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
              >
                <Link
                  to={`/vendors?location=${city.name}`}
                  className="group block relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-200"
                >
                  <img
                    src={city.image}
                    alt={city.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-0 p-5 flex flex-col justify-end">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-300" />
                      <span className="text-white font-bold text-base">{city.name}</span>
                    </div>
                    <span className="text-white/70 text-xs font-medium flex items-center gap-1 group-hover:text-white transition-colors">
                      Explore Vendors <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CUSTOMER REVIEWS
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-14 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section header */}
          <div className="mb-10">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-3"
              style={{ background: '#e0f2fe', color: '#0284c7' }}
            >
              <Star className="w-3 h-3 fill-current" /> {language === 'sv' ? 'Kundomdömen' : 'Customer Reviews'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {language === 'sv' ? 'Vad våra kunder säger' : 'What Our Customers Say'}
            </h2>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-5">
            {CUSTOMER_REVIEWS.map((review, idx) => {
              return (
                <div
                  key={idx}
                  className="relative flex flex-col justify-between p-6 rounded-2xl bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  style={{ border: '1px solid #e0f2fe', boxShadow: '0 2px 12px rgba(2,132,199,0.06)' }}
                >
                  {/* Quote icon */}
                  <div
                    className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: '#f0f9ff' }}
                  >
                    <Quote className="w-4 h-4" style={{ color: '#0284c7' }} />
                  </div>

                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: '#f59e0b' }} />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">
                    "{language === 'sv' ? review.text.sv : review.text.en}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                    <img
                      src={review.avatar}
                      alt={review.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      style={{ border: '2px solid #e0f2fe' }}
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{review.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {language === 'sv' ? review.role.sv : review.role.en}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form Modal */}
      <AnimatePresence>
        {showContactModal && (
          <ContactModal
            onClose={() => setShowContactModal(false)}
            language={language}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
