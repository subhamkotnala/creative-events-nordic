
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Star, Shield, Layout, ChevronLeft, ChevronRight, Search, MapPin, Grid, Building2, Camera, Music, UtensilsCrossed, Flower, ClipboardList, Award, HeartHandshake, Send } from 'lucide-react';
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
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [contactForm, setContactForm] = useState({ vision: '', email: '', phone: '' });

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
    { name: VendorCategory.VENUES, icon: Building2 },
    { name: VendorCategory.PHOTOGRAPHY, icon: Camera },
    { name: VendorCategory.MUSIC, icon: Music },
    { name: VendorCategory.CATERING, icon: UtensilsCrossed },
    { name: VendorCategory.DECOR, icon: Flower },
    { name: VendorCategory.EVENT_PLANNERS, icon: ClipboardList },
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
          user_phone: contactForm.phone || 'Not provided'
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "xaAogphDl0s4ydiOa"
      );
      setFormSubmitted(true);
      setContactForm({ vision: '', email: '', phone: '' });
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
              <div className="flex-1 flex items-center px-6 border-b md:border-b-0 md:border-r border-slate-100 w-full md:w-auto h-14">
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
              
              <div className="flex-1 flex items-center px-6 w-full md:w-auto h-14">
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

              <button 
                onClick={handleSearch}
                className="w-full md:w-auto bg-slate-900 text-white px-10 h-14 rounded-2xl flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-sky-600 transition-all shadow-xl hover:scale-105 active:scale-95"
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

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
            <Award className="w-3 h-3" /> {t('home.selectionBadge')}
          </div>
          <h2 className="text-4xl serif mb-4">{t('home.categoriesTitle')}</h2>
          <p className="text-slate-500">{t('home.categoriesSub')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {CATEGORIES_DATA.map(cat => (
            <Link to={`/explore?category=${cat.name}`} key={cat.name} className="group text-center">
              <div className="w-24 h-24 bg-white border border-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-xl group-hover:border-sky-200 group-hover:scale-105 transition-all duration-300">
                <cat.icon className="w-8 h-8 text-slate-400 group-hover:text-sky-600 transition-colors" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-sky-700">{t(`categories.${cat.name}`)}</h3>
            </Link>
          ))}
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
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:ring-1 focus:ring-sky-500 outline-none text-white placeholder:text-slate-700" 
                        placeholder={t('home.visionPlaceholder')} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t('home.emailLabel')}</label>
                      <input 
                        type="email" required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:ring-1 focus:ring-sky-500 outline-none text-white placeholder:text-slate-700" 
                        placeholder="your@email.com" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Phone Number</label>
                      <input 
                        type="tel" required
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({...contactForm, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '')})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:ring-1 focus:ring-sky-500 outline-none text-white placeholder:text-slate-700" 
                        placeholder="+46 70 123 45 67" 
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isSending}
                      className="w-full bg-sky-600 text-white font-bold py-5 rounded-2xl text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-slate-900 transition-all shadow-xl shadow-sky-950 disabled:opacity-50"
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
