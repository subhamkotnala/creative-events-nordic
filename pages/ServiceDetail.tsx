import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { VendorCategory, Vendor } from '../types';
import { MapPin, ArrowLeft, Building2, ExternalLink, Mail, Calendar, Send, X, CheckCircle2, User, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import emailjs from '@emailjs/browser';
import CalendarPicker from '../components/CalendarPicker';
import { api } from '../services/api';

interface ServiceDetailProps {
  vendors: Vendor[];
}

// EmailJS Configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_INQUIRY_TEMPLATE_ID;
const EMAILJS_ACK_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_ACK_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const ServiceDetail: React.FC<ServiceDetailProps> = ({ vendors }) => {
  const { vendorId, serviceId } = useParams<{ vendorId: string; serviceId: string }>();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const historyStack: string[] = location.state?.history || ['/explore'];
  
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
      if (!vendor) return;
      const templateParams = {
        vendor_name: vendor.name,
        vendor_email: vendor.email,
        user_name: formData.name,
        user_email: formData.email,
        user_phone: formData.phone || 'Not provided',
        event_date: formData.date || 'Not specified',
        message: formData.message,
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      // Send acknowledgment email to the user
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_ACK_TEMPLATE_ID,
        {
          vendor_name: vendor.name,
          event_date: formData.date || 'Not specified',
          user_email: formData.email,
          user_name: formData.name,
        },
        EMAILJS_PUBLIC_KEY
      );

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
  
  const vendor = vendors.find(v => v.id === vendorId);
  const service = vendor?.services?.find(s => s.id === serviceId);

  if (!vendor || !service) {
    return <Navigate to="/explore" replace />;
  }

  const otherServices = vendor.services.filter(s => s.id !== serviceId);

  // Fallback images if the service doesn't have multiple images
  const galleryUrls = service.imageUrls && service.imageUrls.length > 0 
    ? service.imageUrls 
    : vendor.applicationGalleryUrls && vendor.applicationGalleryUrls.length > 0
      ? vendor.applicationGalleryUrls
      : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Inquiry Modal */}
      {isModalOpen && vendor && service && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full h-full relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              
              {/* Header Section */}
              <div className="relative h-32 bg-slate-900 overflow-hidden flex-shrink-0">
                <img src={service.imageUrl || vendor.applicationImageUrl || vendor.services?.[0]?.imageUrl} className="w-full h-full object-cover opacity-40" alt="" />
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
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '') })} 
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

      {inquirySent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setInquirySent(false)} />
          <div className="relative w-full max-w-md">
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative text-center">
              <button 
                onClick={() => setInquirySent(false)} 
                className="absolute top-6 right-6 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-20 h-20 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-3xl serif mb-4">{t('vendorDetail.inquirySent')}</h3>
              <p className="text-slate-400 text-sm font-light leading-relaxed mb-10">{t('vendorDetail.inquirySentSub')}</p>
              <button onClick={() => setInquirySent(false)} className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-sky-900/40 hover:bg-sky-500 hover:text-white transition-all">
                  Close
              </button>
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

      {/* Hero Header */}
      <div className="h-[50vh] w-full relative overflow-hidden bg-slate-900">
        <img 
          src={service.imageUrl || vendor.applicationImageUrl || vendor.services?.[0]?.imageUrl} 
          className="w-full h-full object-cover opacity-60" 
          alt={service.category} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const newStack = [...historyStack];
            const backUrl = newStack.pop();
            
            if (backUrl) {
              navigate(backUrl, { state: { history: newStack } });
            } else if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate('/explore');
            }
          }}
          className="absolute top-8 left-8 bg-white/20 backdrop-blur-md p-3 rounded-full hover:bg-white text-white hover:text-slate-900 transition-colors z-10" 
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-8 right-8 z-10">
            <Link 
              to={`/vendors/${vendor.id}`}
              state={{ history: [...historyStack, location.pathname + location.search] }}
              className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg"
            >
              <Building2 className="w-4 h-4" /> Provider Profile
            </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-32 relative z-10">
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-slate-200/50 mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-8">
            <div className="flex-grow">
              <span className="text-xs uppercase tracking-[0.2em] text-sky-600 font-bold mb-3 block">
                {t(`categories.${service.category}`)}
              </span>
              <h1 className="text-4xl md:text-5xl serif mb-4">{t(`categories.${service.category}`)}</h1>
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" /> By {vendor.name}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" /> {service.location || vendor.applicationLocation}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 w-full md:w-auto mt-4 md:mt-0">
               <button 
                 onClick={() => setIsModalOpen(true)} 
                 className="w-full md:w-auto py-4 px-8 bg-slate-900 text-white rounded-2xl text-xs uppercase tracking-[0.2em] font-bold hover:bg-sky-600 transition-all shadow-xl shadow-slate-200"
               >
                  {t('vendorDetail.inquireNow')}
               </button>
            </div>
          </div>

          <div className="prose prose-slate max-w-none mb-12">
            <h2 className="text-2xl serif text-slate-800 mb-4">About this Service</h2>
            <p className="text-slate-600 text-lg leading-relaxed font-light">
              {service.description}
            </p>
          </div>

          {/* Packages */}
          {service.packages && service.packages.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl serif text-slate-800 mb-6">Available Packages</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {service.packages.map(pkg => (
                  <div key={pkg.id} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow group flex flex-col h-full bg-slate-50 hover:bg-white">
                    <div className="flex-grow">
                      <h3 className="text-xl font-medium text-slate-900 mb-2 group-hover:text-sky-600 transition-colors">{pkg.name}</h3>
                      <p className="text-slate-500 text-sm mb-4 line-clamp-3">{pkg.description}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                       <span className="text-lg font-bold text-slate-900">{pkg.price} SEK</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery */}
          {galleryUrls.length > 0 && (
            <div>
              <h2 className="text-2xl serif text-slate-800 mb-6">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {galleryUrls.map((url, idx) => (
                  <div key={idx} onClick={() => setActiveGallery({ images: galleryUrls, initialIndex: idx })} className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 cursor-pointer">
                    <img src={url} alt={`Gallery image ${idx}`} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Other Services */}
        {otherServices.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl serif text-slate-800">More from {vendor.name}</h2>
              <Link to={`/vendors/${vendor.id}`} state={{ history: [...historyStack, location.pathname + location.search] }} className="text-sm font-bold text-sky-600 uppercase tracking-widest hover:text-sky-700 flex items-center gap-1">
                View Profile <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {otherServices.map(otherService => (
                <Link key={otherService.id} to={`/services/${vendor.id}/${otherService.id}`} state={{ history: [...historyStack, location.pathname + location.search] }} className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-lg transition-all flex flex-col">
                  <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                    <img 
                      src={otherService.imageUrl || vendor.applicationImageUrl || vendor.services?.[0]?.imageUrl} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      alt={otherService.category} 
                    />
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                       {t(`categories.${otherService.category}`)}
                    </span>
                    <h3 className="text-lg font-medium text-slate-900 group-hover:text-sky-600 transition-colors mb-2">{t(`categories.${otherService.category}`)}</h3>
                    <p className="text-slate-500 text-xs line-clamp-2 flex-grow">{otherService.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceDetail;
