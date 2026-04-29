
import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Vendor } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import CalendarPicker from '../components/CalendarPicker';
import emailjs from '@emailjs/browser';
import { MapPin, Mail, Calendar, ArrowLeft, Instagram, Facebook, Send, X, CheckCircle2, Music, Loader2, User, MessageSquare, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface VendorDetailProps {
  vendors: Vendor[];
}

// EmailJS Configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_INQUIRY_TEMPLATE_ID;
const EMAILJS_ACK_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_ACK_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const VendorDetail: React.FC<VendorDetailProps> = ({ vendors }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { id } = useParams();
  const vendor = vendors.find(v => v.id === id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', date: '', message: '' });
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeGallery, setActiveGallery] = useState<{ images: string[]; initialIndex: number } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGalleryImageLoading, setIsGalleryImageLoading] = useState(true);

  useEffect(() => {
    if (activeGallery) {
      setCurrentImageIndex(activeGallery.initialIndex);
      setIsGalleryImageLoading(true);
    }
  }, [activeGallery]);
  
  const calendarRef = useRef<HTMLDivElement>(null);

  // Increment view count on mount
  useEffect(() => {
    if (vendor?.id && vendor.status === 'APPROVED') {
      api.incrementVendorViews(vendor.id);
    }
  }, [vendor?.id, vendor?.status]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };
    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  if (!vendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl serif mb-4">{t('vendorDetail.notFound')}</h1>
        <Link to="/explore" className="text-slate-500 underline">{t('vendorDetail.back')}</Link>
      </div>
    );
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.date || !formData.message.trim()) {
      alert(language === 'sv' ? 'Vänligen fyll i alla fält (inklusive datum).' : 'Please fill out all fields (including the date).');
      return;
    }
    
    setIsSending(true);

    try {
      const templateParams = {
        vendor_name: vendor.name,
        vendor_email: vendor.email,
        user_name: formData.name,
        user_email: formData.email,
        user_phone: formData.phone || 'Not provided',
        event_date: formData.date || 'Not specified',
        message: formData.message,
      };

      const res1 = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: 'VENDOR_INQUIRY',
          data: templateParams
        })
      });

      if (!res1.ok) throw new Error('Failed to send vendor inquiry');

      // Send acknowledgment email to the user
      const res2 = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: 'VENDOR_INQUIRY_ACK',
          data: {
            vendor_name: vendor.name,
            event_date: formData.date || 'Not specified',
            user_email: formData.email,
            user_name: formData.name,
          }
        })
      });

      if (!res2.ok) throw new Error('Failed to send acknowledgment');

      // Increment inquiry count in database
      if (vendor.id) {
          await api.incrementVendorInquiries(vendor.id);
      }

      setInquirySent(true);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', date: '', message: '' });
    } catch (error) {
      console.error("Failed to send inquiry:", error);
      alert("Could not send inquiry. Please try again.");
    } finally {
      setIsSending(false);
    }
  };
  
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return language === 'sv' ? 'Välj datum' : 'Select date';
    return new Intl.DateTimeFormat(language === 'sv' ? 'sv-SE' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  return (
    <div className="pb-24">
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full h-full relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              
              {/* Header Section */}
              <div className="relative h-32 bg-slate-900 overflow-hidden flex-shrink-0">
                <img src={vendor.imageUrl} className="w-full h-full object-cover opacity-40" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all backdrop-blur-md z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-6 left-8 right-8">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400 mb-2 block">{t('vendorDetail.connectWith')}</span>
                  <h2 className="text-2xl serif text-white leading-tight truncate">{vendor.name}</h2>
                </div>
              </div>

              {/* Form Section */}
              <div className="p-8 overflow-y-auto custom-scrollbar">
                <p className="text-slate-500 text-xs font-medium mb-6 leading-relaxed">
                  {t('vendorDetail.inquirySub')}
                </p>
                
                <form onSubmit={handleInquirySubmit} className="space-y-5">
                  {/* Grid for Name/Email */}
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('vendorDetail.fullName')}</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text" 
                          name="name" 
                          required 
                          value={formData.name} 
                          onChange={handleFormChange} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-300 font-medium text-slate-700" 
                          placeholder="Jane Doe"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('vendorDetail.emailAddress')}</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="email" 
                          name="email" 
                          required 
                          value={formData.email} 
                          onChange={handleFormChange} 
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:ring-1 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-300 font-medium text-slate-700" 
                          placeholder="name@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                    <input 
                      type="tel" 
                      required
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleFormChange} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-300 font-medium text-slate-700" 
                      placeholder="+46 70 123 45 67"
                    />
                  </div>

                  {/* Date Picker */}
                  <div className="space-y-1.5 relative" ref={calendarRef}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('vendorDetail.eventDate')}</label>
                    <input 
                      type="text" 
                      required 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-12 opacity-0 pointer-events-none -z-10" 
                      value={formData.date} 
                      onChange={() => {}} 
                      tabIndex={-1} 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCalendar(!showCalendar)}
                      className={`w-full bg-slate-50 border rounded-xl px-4 py-3.5 text-sm flex justify-between items-center transition-all group ${showCalendar ? 'border-sky-500 ring-1 ring-sky-500' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <span className={`flex items-center gap-3 ${formData.date ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                        <Calendar className={`w-4 h-4 ${formData.date ? 'text-sky-600' : 'text-slate-300'}`} />
                        {formatDateDisplay(formData.date)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 group-hover:text-slate-500">Select</span>
                    </button>
                    
                    {showCalendar && (
                      <div className="absolute top-full left-0 mt-2 z-50">
                        <CalendarPicker 
                          selectedDate={formData.date}
                          minDate={new Date()}
                          onSelect={(date) => {
                            setFormData(prev => ({ ...prev, date }));
                            setShowCalendar(false);
                          }}
                          onClose={() => setShowCalendar(false)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('vendorDetail.message')}</label>
                    <textarea 
                      name="message" 
                      required 
                      rows={4} 
                      value={formData.message} 
                      onChange={handleFormChange} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-sky-500 outline-none transition-all resize-none placeholder:text-slate-300 text-slate-700" 
                      placeholder={language === 'sv' ? 'Berätta om din vision, gästantal och budget...' : 'Tell us about your vision, guest count, and estimated budget...'}
                    />
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    disabled={isSending}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-sky-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> 
                        {t('vendorDetail.sendInquiry')}
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-[9px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    By submitting this form, you agree to share your contact details with the vendor for the purpose of this inquiry.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <AnimatePresence>
        {activeGallery && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm"
          >
            <button 
              onClick={() => setActiveGallery(null)} 
              className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-20"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="relative w-full max-w-6xl px-4 flex items-center justify-center h-[80vh]">
              {activeGallery.images.length > 1 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGalleryImageLoading(true);
                    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : activeGallery.images.length - 1));
                  }}
                  className="absolute left-4 md:left-8 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-20"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
              )}

              {isGalleryImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
                </div>
              )}
              
              <AnimatePresence mode="wait">
                <motion.img 
                  key={currentImageIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: isGalleryImageLoading ? 0 : 1, scale: isGalleryImageLoading ? 0.95 : 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  src={activeGallery.images[currentImageIndex]} 
                  className="max-w-full max-h-full object-contain"
                  alt="Gallery Preview"
                  onLoad={() => setIsGalleryImageLoading(false)}
                />
              </AnimatePresence>

              {activeGallery.images.length > 1 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGalleryImageLoading(true);
                    setCurrentImageIndex((prev) => (prev < activeGallery.images.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-4 md:right-8 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-20"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              )}
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="absolute bottom-8 left-0 right-0 flex justify-center flex-wrap gap-2 px-4 z-20"
            >
              {activeGallery.images.map((img, i) => (
                <button 
                  key={i}
                  onClick={() => {
                    if (i !== currentImageIndex) {
                      setIsGalleryImageLoading(true);
                      setCurrentImageIndex(i);
                    }
                  }}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 border-transparent opacity-50 hover:opacity-100 relative`}
                >
                  {i === currentImageIndex && (
                     <motion.div layoutId="activeImageBorder" className="absolute inset-0 border-2 border-sky-500 rounded-xl" />
                  )}
                  <img src={img} className={`w-full h-full object-cover transition-all ${i === currentImageIndex ? 'scale-110 opacity-100' : ''}`} alt="" />
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-[65vh] w-full relative overflow-hidden bg-slate-200">
        <img src={vendor.imageUrl} className="w-full h-full object-cover" alt={vendor.name} />
        <Link to="/explore" className="absolute top-8 left-8 bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg hover:scale-110 transition-transform">
          <ArrowLeft className="w-5 h-5 text-slate-900" />
        </Link>
      </div>
      <div className="max-w-7xl mx-auto px-4 -mt-40 relative z-10">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <div className="bg-white p-12 border border-slate-100 rounded-[3rem] shadow-2xl shadow-slate-200/50">
              <span className="text-[10px] uppercase tracking-[0.3em] text-sky-600 font-bold mb-4 block">{t(`categories.${vendor.category}`)}</span>
              <h1 className="text-6xl serif mb-6 leading-tight">{vendor.name}</h1>
              <div className="flex flex-wrap items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-400 mb-10">
                <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100"><MapPin className="w-4 h-4 text-sky-500" /> {vendor.location}</span>
                <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100"><Calendar className="w-4 h-4 text-sky-500" /> Member since {vendor.joinedAt.split('-')[0]}</span>
                <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100"><MessageSquare className="w-4 h-4 text-sky-500" /> {vendor.inquiries || 0} Inquiries</span>
              </div>
              <h2 className="text-2xl serif text-slate-800 mb-6">{t('vendorDetail.heritage')}</h2>
              <p className="text-slate-600 text-xl leading-relaxed font-light italic">{vendor.description}</p>
              
              {/* Photo Gallery Grid */}
              {vendor.imageUrls && vendor.imageUrls.length > 0 && (
                <div className="mt-16 space-y-6">
                  <h2 className="text-2xl serif text-slate-800">{t('vendorDetail.portfolio')}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {vendor.imageUrls.map((url, i) => (
                      <div 
                        key={i} 
                        onClick={() => setActiveGallery({ images: vendor.imageUrls!, initialIndex: i })}
                        className="aspect-square rounded-[2rem] overflow-hidden bg-slate-100 cursor-pointer"
                      >
                        <img src={url} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt={`${vendor.name} work ${i+1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-8">
              <h2 className="text-3xl serif px-6">{t('vendorDetail.offerings')}</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {vendor.services.map(service => (
                  <div key={service.id} className="bg-white p-6 md:p-10 border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group flex flex-col">
                    {service.imageUrls && service.imageUrls.length > 0 && (
                      <div className="w-full grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6 flex-shrink-0">
                        {service.imageUrls.map((url, i) => (
                          <div 
                            key={i} 
                            onClick={() => setActiveGallery({ images: service.imageUrls!, initialIndex: i })}
                            className="rounded-xl overflow-hidden cursor-pointer bg-slate-100 aspect-square"
                          >
                            <img src={url} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" alt={`${service.name} ${i+1}`} />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-medium text-slate-800 group-hover:text-sky-600 transition-colors">{service.name}</h3>
                        <p className="text-[10px] font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full uppercase tracking-widest">{t('vendorDetail.from')} {service.price.toLocaleString()} SEK</p>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed mb-8 font-light h-20 line-clamp-4">{service.description}</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="w-full py-4 border border-slate-200 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-slate-900 hover:text-white transition-all shadow-sm mt-auto">
                      {t('vendorDetail.inquireNow')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-8">
             <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-8 sticky top-24 shadow-2xl shadow-slate-900/30">
                {inquirySent ? (
                   <div className="text-center py-10 animate-in fade-in slide-in-from-top-4">
                    <div className="w-20 h-20 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-400" />
                    </div>
                    <h3 className="text-3xl serif mb-4">{t('vendorDetail.inquirySent')}</h3>
                    <p className="text-slate-400 text-sm font-light leading-relaxed">{t('vendorDetail.inquirySentSub')}</p>
                    <button onClick={() => setInquirySent(false)} className="mt-10 px-6 py-3 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                        {t('vendorDetail.sendAnother')}
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-3xl serif italic">{t('vendorDetail.secureDate')}</h3>
                    <p className="text-slate-400 text-sm font-light leading-relaxed">{t('vendorDetail.sidebarSub')}</p>
                    <div className="space-y-4 pt-4">
                       <button onClick={() => setIsModalOpen(true)} className="w-full bg-white text-slate-900 font-bold py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-sky-500 hover:text-white transition-all shadow-xl shadow-sky-900/40">
                        {t('vendorDetail.sendInquiry')}
                       </button>
                       {user?.role === 'ADMIN' && vendor.website && (
                         <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="w-full border border-white/10 text-slate-500 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:text-white hover:border-white/30 transition-all text-center block">
                           {t('vendorDetail.visitWebsite')}
                         </a>
                       )}
                    </div>
                    
                    {/* Social Icons - NEW Clickable Links */}
                    {user?.role === 'ADMIN' && (vendor.website || vendor.socials?.instagram || vendor.socials?.facebook || vendor.socials?.tiktok) && (
                      <div className="pt-8 border-t border-white/5 space-y-4">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Connect With Us</p>
                        <div className="flex gap-4">
                          {vendor.website && (
                            <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-2xl hover:bg-sky-600 transition-all">
                              <Globe className="w-4 h-4" />
                            </a>
                          )}
                          {vendor.socials?.instagram && (
                            <a href={vendor.socials.instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-2xl hover:bg-sky-600 transition-all">
                              <Instagram className="w-4 h-4" />
                            </a>
                          )}
                          {vendor.socials?.facebook && (
                            <a href={vendor.socials.facebook} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-2xl hover:bg-sky-600 transition-all">
                              <Facebook className="w-4 h-4" />
                            </a>
                          )}
                          {vendor.socials?.tiktok && (
                            <a href={vendor.socials.tiktok} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-2xl hover:bg-sky-600 transition-all">
                              <Music className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-8 border-t border-white/5 space-y-4">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">{t('vendorDetail.alternatives')}</p>
                        <div className="flex flex-col gap-4">
                            {vendors.filter(v => v.id !== id && v.category === vendor.category).slice(0, 2).map(alt => (
                                <Link key={alt.id} to={`/vendors/${alt.id}`} className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-white/5">
                                        <img src={alt.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                                    </div>
                                    <div className="flex-grow overflow-hidden">
                                        <p className="text-xs font-bold text-slate-300 truncate group-hover:text-white transition-colors">{alt.name}</p>
                                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{alt.location}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                  </>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetail;
