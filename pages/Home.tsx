
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Star, Shield, Layout, ChevronLeft, ChevronRight, Search, MapPin, Grid, Building2, Camera, Music, UtensilsCrossed, Flower, ClipboardList, Award, HeartHandshake, Send, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VendorCategory, Vendor } from '../types';
import { AVAILABLE_LOCATIONS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import emailjs from '@emailjs/browser';

interface HomeProps {
  vendors: Vendor[];
}

const Home: React.FC<HomeProps> = ({ vendors }) => {
  const { t, language } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedCapacity, setSelectedCapacity] = useState<number>(0);
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [contactForm, setContactForm] = useState({ vision: '', email: '', phone: '', capacity: '' });

  const SLIDES = [
    {
      url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2500",
      title: t('hero.venues'),
      subtitle: t('hero.venues_sub')
    },
    {
      url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=2500",
      title: t('hero.photography'),
      subtitle: t('hero.photography_sub')
    },
    {
      url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=2500",
      title: t('hero.catering'),
      subtitle: t('hero.catering_sub')
    },
    {
      url: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=2500",
      title: t('hero.planning'),
      subtitle: t('hero.planning_sub')
    }
  ];

  const CATEGORIES_DATA = [
    { name: VendorCategory.VENUES, icon: Building2, color: 'text-blue-500/80', hoverBg: 'hover:bg-blue-50/40', accent: 'bg-blue-400', image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800" },
    { name: VendorCategory.PHOTOGRAPHY, icon: Camera, color: 'text-emerald-500/80', hoverBg: 'hover:bg-emerald-50/40', accent: 'bg-emerald-400', image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800" },
    { name: VendorCategory.MUSIC, icon: Music, color: 'text-rose-500/80', hoverBg: 'hover:bg-rose-50/40', accent: 'bg-rose-400', image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800" },
    { name: VendorCategory.CATERING, icon: UtensilsCrossed, color: 'text-amber-500/80', hoverBg: 'hover:bg-amber-50/40', accent: 'bg-amber-400', image: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=800" },
    { name: VendorCategory.DECOR, icon: Flower, color: 'text-indigo-500/80', hoverBg: 'hover:bg-indigo-50/40', accent: 'bg-indigo-400', image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=800" },
    { name: VendorCategory.EVENT_PLANNERS, icon: ClipboardList, color: 'text-violet-500/80', hoverBg: 'hover:bg-violet-50/40', accent: 'bg-violet-400', image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800" },
  ];

  const POPULAR_CITIES = [
    { name: 'Stockholm', color: 'text-slate-800', hoverBg: 'hover:bg-slate-50', accent: 'bg-slate-900' },
    { name: 'Gothenburg', color: 'text-slate-800', hoverBg: 'hover:bg-slate-50', accent: 'bg-slate-900' },
    { name: 'Malmö', color: 'text-slate-800', hoverBg: 'hover:bg-slate-50', accent: 'bg-slate-900' },
    { name: 'Uppsala', color: 'text-slate-800', hoverBg: 'hover:bg-slate-50', accent: 'bg-slate-900' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [SLIDES.length]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedLocation !== 'All') params.set('location', selectedLocation);
    if (selectedCapacity > 0) params.set('minCapacity', selectedCapacity.toString());
    navigate(`/explore?${params.toString()}`);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_fcxafes",
        import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID || "template_cqrzyss",
        {
          message: contactForm.vision,
          user_email: contactForm.email,
          user_phone: contactForm.phone || 'Not provided',
          user_capacity: contactForm.capacity || 'Not provided'
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "xaAogphDl0s4ydiOa"
      );
      setFormSubmitted(true);
      setContactForm({ vision: '', email: '', phone: '', capacity: '' });
      setTimeout(() => setFormSubmitted(false), 5000);
    } catch (error) {
      console.error("Failed to send contact form:", error);
      alert("Could not send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const featuredPartners = vendors.filter(v => v.isFeatured).slice(0, 4);

  return (
    <div>
      {/* Hero Section with Slider */}
      <section className="relative h-[95vh] flex items-center justify-center overflow-hidden bg-slate-900">
        
        {/* Background Images - Ken Burns Effect */}
        {SLIDES.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute inset-0 bg-black/40 z-10" /> {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 z-10" />
            <img 
              src={slide.url} 
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transform transition-transform duration-[10000ms] ease-out ${
                index === currentSlide ? 'scale-[1.15]' : 'scale-100'
              }`}
              alt={slide.title}
            />
          </div>
        ))}
        
        {/* Content Overlay */}
        <div className="relative z-20 text-center px-4 max-w-5xl">
            {/* Animated Text Block */}
           <div className="min-h-[240px] flex flex-col justify-center items-center">
             <AnimatePresence mode="wait">
               <motion.div
                 key={currentSlide}
                 initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                 animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                 exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                 transition={{ duration: 0.8, ease: "easeOut" }}
                 className="flex flex-col items-center"
               >
                  <span className="inline-block px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-[0.3em] mb-8 shadow-lg">
                    {SLIDES[currentSlide].subtitle}
                  </span>
                  <h1 className="text-5xl md:text-7xl lg:text-8xl text-white mb-12 leading-tight serif italic drop-shadow-2xl">
                    {SLIDES[currentSlide].title}
                  </h1>
               </motion.div>
             </AnimatePresence>
           </div>
          
          {/* Enhanced Search Bar */}
          <div className="bg-white/10 backdrop-blur-xl p-2 rounded-[2rem] border border-white/20 max-w-3xl mx-auto shadow-2xl animate-in fade-in zoom-in duration-1000 delay-300">
            <div className="flex flex-col md:flex-row items-center gap-2 bg-white rounded-[1.8rem] p-2">
              <div className="flex-1 flex items-center px-6 border-b md:border-b-0 md:border-r border-slate-100 w-full md:w-auto h-12">
                <Grid className="w-5 h-5 text-sky-600 mr-3 flex-shrink-0" />
                <select 
                  className="w-full h-full text-sm font-semibold text-slate-700 bg-transparent border-none focus:ring-0 outline-none cursor-pointer tracking-wide"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
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
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option value="All">{t('search.location')}</option>
                  {AVAILABLE_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex items-center px-6 w-full md:w-auto h-12">
                <Users className="w-5 h-5 text-sky-600 mr-3 flex-shrink-0" />
                <select 
                  className="w-full h-full text-sm font-semibold text-slate-700 bg-transparent border-none focus:ring-0 outline-none cursor-pointer tracking-wide"
                  value={selectedCapacity}
                  onChange={(e) => setSelectedCapacity(Number(e.target.value))}
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

        {/* Slider Indicators */}
        <div className="absolute bottom-10 z-30 flex gap-4">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-500 shadow-sm backdrop-blur-sm ${
                index === currentSlide 
                  ? 'w-16 bg-white' 
                  : 'w-8 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Categories Section - Minimalist Image Cards */}
      <section className="bg-white py-32 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl serif mb-4">
                {t('home.categoriesTitle')}
              </h2>
              <p className="text-slate-500 font-light text-lg">
                {t('home.categoriesSub')}
              </p>
            </div>
            <Link to="/explore" className="text-slate-900 font-medium text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 hover:opacity-70 transition-opacity border-b pb-1 border-slate-900">
              {language === 'sv' ? 'Utforska alla' : 'Explore All'} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES_DATA.map((cat, idx) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Link 
                  to={`/explore?category=${cat.name}`}
                  className="group block relative aspect-square w-[90%] mx-auto overflow-hidden rounded-[1.5rem] bg-slate-100"
                >
                  <img 
                    src={cat.image}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
                    alt={cat.name}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 transition-colors duration-700 group-hover:bg-black/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/20">
                        <cat.icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-3xl text-white serif tracking-wide mb-2">
                        {t(`categories.${cat.name}`)}
                      </h3>
                      <div className="overflow-hidden">
                        <p className="text-white/80 font-mono text-[10px] uppercase tracking-widest translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-75">
                          {language === 'sv' ? 'Utforska' : 'Explore'} →
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-5 relative min-h-[480px] rounded-[3.5rem] overflow-hidden group">
              <img 
                src="https://images.unsplash.com/photo-1550475056-bdb1b4d3c1b9?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                alt="Stockholm"
              />
              <div className="absolute inset-0 bg-black/20 transition-colors duration-700 group-hover:bg-black/30" />
              <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/20 to-transparent" />
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative z-10 h-full p-10 flex flex-col justify-between"
              >
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                    {language === 'sv' ? 'Våra Destinationer' : 'Our Destinations'}
                  </div>
                  <h2 className="text-5xl md:text-6xl serif italic leading-[1.1] text-white">
                    {language === 'sv' ? 'Upptäck charmiga platser i städerna.' : 'Discover charming spaces in the cities.'}
                  </h2>
                </div>

                <div className="flex items-center gap-6 group cursor-pointer" onClick={() => navigate('/explore')}>
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transform group-hover:rotate-45 transition-transform duration-500">
                    <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-white underline decoration-white/30 underline-offset-8 group-hover:decoration-white transition-all">
                    {language === 'sv' ? 'Se alla städer' : 'View all cities'}
                  </span>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              <div className="divide-y divide-slate-100">
                {POPULAR_CITIES.map((city, idx) => (
                  <motion.div
                    key={city.name}
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                  >
                    <Link 
                      to={`/explore?location=${city.name}`}
                      className={`group block relative py-8 px-6 transition-all duration-500 ${city.hoverBg} -mx-6 rounded-[2.5rem]`}
                    >
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-12">
                          <span className="text-slate-300 font-mono text-sm tracking-tighter">0{idx + 1}</span>
                          <h3 className={`text-2xl md:text-3xl serif italic transition-all duration-500 group-hover:translate-x-4 ${city.color}`}>
                            {city.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 -translate-x-10 group-hover:translate-x-0 transition-all duration-500">
                          <div className={`w-12 h-12 rounded-full ${city.accent} text-white flex items-center justify-center shadow-lg shadow-sky-900/10`}>
                            <ArrowRight className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Grid */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="max-w-xl">
              <h2 className="text-4xl serif mb-4">{t('home.featuredTitle')}</h2>
              <p className="text-slate-500 font-light">{t('home.featuredSub')}</p>
            </div>
            <Link to="/explore" className="text-sky-600 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 border-b-2 border-sky-600 pb-1 hover:border-sky-400 transition-colors">
              {t('home.viewAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredPartners.length > 0 ? (
              featuredPartners.map(vendor => {
                const primaryService = vendor.services?.[0];
                return (
                <Link key={vendor.id} to={`/vendors/${vendor.id}`} state={{ history: [routerLocation.pathname + routerLocation.search] }} className="bg-white rounded-[2.5rem] overflow-hidden group shadow-sm hover:shadow-xl transition-all border border-slate-100">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img 
                      src={primaryService?.imageUrl || primaryService?.imageUrls?.[0] || vendor.applicationImageUrl || vendor.services?.[0]?.imageUrl} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt={vendor.name}
                    />
                  </div>
                  <div className="p-8">
                    <p className="text-[10px] uppercase tracking-widest text-sky-600 font-bold mb-2">{primaryService?.category ? t(`categories.${primaryService.category}`) : ''}</p>
                    <h3 className="text-xl serif mb-2 truncate">{vendor.name}</h3>
                    <p className="text-slate-500 text-sm font-light leading-relaxed mb-6 line-clamp-2">{primaryService?.description}</p>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-50">
                      <span>{vendor.applicationLocation || primaryService?.location}</span>
                      <span className="text-sky-700">Featured</span>
                    </div>
                  </div>
                </Link>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                <p className="text-slate-400 italic serif text-xl">Our featured selection is updated weekly. Check back soon!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl serif mb-16">{language === 'sv' ? 'Så fungerar det' : 'How it Works'}</h2>
          <div className="grid md:grid-cols-3 gap-16">
            <div className="space-y-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500/80">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-2xl serif italic">{language === 'sv' ? '1. Hitta' : '1. Find'}</h3>
              <p className="text-slate-500 font-light leading-relaxed">
                {language === 'sv' ? 'Sök igenom Sveriges största urval av lokaler och tjänster för ditt evenemang.' : 'Search through Sweden\'s largest selection of event spaces and services for your event.'}
              </p>
            </div>
            <div className="space-y-6">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500/80">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-2xl serif italic">{language === 'sv' ? '2. Kontakta' : '2. Connect'}</h3>
              <p className="text-slate-500 font-light leading-relaxed">
                {language === 'sv' ? 'Skicka förfrågningar direkt till leverantörer och få de bästa erbjudandena.' : 'Send inquiries directly to providers and get the best offers.'}
              </p>
            </div>
            <div className="space-y-6">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500/80">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <h3 className="text-2xl serif italic">{language === 'sv' ? '3. Fira' : '3. Celebrate'}</h3>
              <p className="text-slate-500 font-light leading-relaxed">
                {language === 'sv' ? 'Boka den perfekta matchen och anordna ett oförglömligt evenemang.' : 'Book the perfect match and host an unforgettable event.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-slate-900 text-white py-24 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500 rounded-full blur-[120px] opacity-10 -mr-48 -mt-48"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-5xl serif italic leading-tight">{t('home.valuesTitle')}</h2>
                <p className="text-slate-400 font-light text-xl leading-relaxed">
                  {t('home.valuesSub')}
                </p>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-sky-400">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">{t('home.vettedTitle')}</h3>
                  <p className="text-slate-500 text-sm font-light leading-relaxed">{t('home.vettedSub')}</p>
                </div>
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-sky-400">
                    <Layout className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">{t('home.optionsTitle')}</h3>
                  <p className="text-slate-500 text-sm font-light leading-relaxed">{t('home.optionsSub')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-12 rounded-[3rem] shadow-2xl">
                <h3 className="text-2xl serif mb-6">{t('home.contactTitle')}</h3>
                {formSubmitted ? (
                  <div className="py-12 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Star className="w-8 h-8 text-sky-400" fill="currentColor" />
                    </div>
                    <p className="text-white serif text-xl italic">{t('home.successTitle')}</p>
                    <p className="text-slate-400 text-[10px] mt-4 uppercase tracking-widest font-bold">{t('home.successBadge')}</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('home.visionLabel')}</label>
                      <input 
                        type="text" required
                        value={contactForm.vision}
                        onChange={(e) => setContactForm({...contactForm, vision: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-sky-500 outline-none text-white placeholder:text-slate-700" 
                        placeholder={t('home.visionPlaceholder')} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('home.emailLabel')}</label>
                      <input 
                        type="email" required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-sky-500 outline-none text-white placeholder:text-slate-700" 
                        placeholder="your@email.com" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Phone Number</label>
                      <input 
                        type="tel" required
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({...contactForm, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '')})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-sky-500 outline-none text-white placeholder:text-slate-700" 
                        placeholder="+46 70 123 45 67" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{language === 'sv' ? 'Antal gäster' : 'Guest Capacity'}</label>
                      <input 
                        type="number" required
                        value={contactForm.capacity}
                        onChange={(e) => setContactForm({...contactForm, capacity: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-sky-500 outline-none text-white placeholder:text-slate-700" 
                        placeholder="e.g. 150" 
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isSending}
                      className="w-full bg-sky-600 text-white font-bold py-3.5 rounded-2xl text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-slate-900 transition-all shadow-xl shadow-sky-950 disabled:opacity-50"
                    >
                      {isSending ? 'Sending...' : t('home.sendRequest')}
                    </button>
                  </form>
                )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
