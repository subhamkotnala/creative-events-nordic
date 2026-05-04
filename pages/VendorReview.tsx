import React, { useState } from 'react';
import { Vendor, VendorStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import emailjs from '@emailjs/browser';
import { api } from '../services/api';
import { 
  Check, X, Eye, Clock, Users, CheckCircle2, XCircle, Search, 
  MapPin, Globe, Instagram, Music, Facebook, Send, Loader2, Shield, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

interface VendorReviewProps {
  vendors: Vendor[];
  onUpdateStatus: (id: string, status: VendorStatus, password?: string) => Promise<any>;
}

const VendorReview: React.FC<VendorReviewProps> = ({ 
  vendors, 
  onUpdateStatus
}) => {
  const { t } = useLanguage();
  const [activeGallery, setActiveGallery] = useState<{ images: string[]; initialIndex: number } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGalleryImageLoading, setIsGalleryImageLoading] = useState(true);

  React.useEffect(() => {
    if (activeGallery) {
      setCurrentImageIndex(activeGallery.initialIndex);
      setIsGalleryImageLoading(true);
    }
  }, [activeGallery]);

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    action: () => void;
  } | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<{title: string, message: string} | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);

  const handleApprove = (v: Vendor) => {
    setConfirmAction({
      title: 'Approve Application',
      message: `Are you sure you want to approve ${v.name}? This will send an email and enable the account.`,
      action: async () => {
        setIsApproving(true); 

        const generatedPassword = Math.random().toString(36).slice(-6);

        try {
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    business_name: v.name,
                    to_email: v.email, 
                    email: v.email,
                    generated_password: generatedPassword,
                    to_name: v.name,
                },
                EMAILJS_PUBLIC_KEY
            );

            await onUpdateStatus(v.id, VendorStatus.APPROVED, generatedPassword);

            setNotifications(prev => [`System: Approved & Email sent to ${v.name}`, ...prev]);
            setActionSuccess({
                title: 'Vendor Approved',
                message: `Vendor approved and welcome email has been successfully sent to ${v.email}.`
            });
            setConfirmAction(null); 

        } catch (error) {
            console.error("Email failed to send:", error);
            alert('Email failed to send. Approval aborted.');
            setConfirmAction(null);
        } finally {
            setIsApproving(false);
        }
      }
    });
  };

  const handleDecline = (v: Vendor) => {
    setConfirmAction({
      title: 'Decline Application',
      message: `Are you sure you want to decline ${v.name}? This will delete the user from system i.e., he cannot login anymore and cannot be undone.`,
      action: async () => {
        try {
            if (v.auth_id) {
                await api.deleteUser(v.auth_id);
            }
            onUpdateStatus(v.id, VendorStatus.REJECTED);
            setNotifications(prev => [`System: Declined application for ${v.name}`, ...prev]);
            setActionSuccess({
                title: 'Application Declined',
                message: `The application for ${v.name} has been declined.`
            });
            setConfirmAction(null);
        } catch (err) {
            console.error("Decline failed:", err);
            alert("Decline failed.");
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl serif mb-10">{t('admin.queueTitle')}</h1>
        
        {vendors.filter(v => [VendorStatus.PENDING, VendorStatus.NOT_VERIFIED, VendorStatus.VERIFIED].includes(v.status)).map(v => (
            <div key={v.id} className="bg-white border border-slate-200 rounded-[3rem] p-8 md:p-10 flex flex-col gap-10 shadow-sm transition-all hover:shadow-md mb-8">
                <div className="flex flex-col md:flex-row gap-10">
                    <div className="w-full md:w-64 aspect-square flex-shrink-0">
                        <img src={v.applicationImageUrl || v.services?.[0]?.imageUrl} className="w-full h-full object-cover rounded-2xl shadow-sm border border-slate-100" alt="" />
                    </div>
                    <div className="flex-grow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-sky-600 mb-1 block tracking-widest">{v.applicationLocation || v.services?.[0]?.location}</span>
                                <h3 className="text-3xl serif">{v.name}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-right">
                                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                                    <MapPin className="w-3 h-3" /> {v.applicationLocation || v.services?.[0]?.location}
                                </div>
                                <div className="flex gap-3 mt-2">
                                    {v.socials?.instagram && <a href={v.socials.instagram} target="_blank" rel="noopener noreferrer" title="Instagram"><Instagram className="w-4 h-4 text-pink-500" /></a>}
                                    {v.socials?.facebook && <a href={v.socials.facebook} target="_blank" rel="noopener noreferrer" title="Facebook"><Facebook className="w-4 h-4 text-blue-600" /></a>}
                                    {v.socials?.tiktok && <a href={v.socials.tiktok} target="_blank" rel="noopener noreferrer" title="TikTok"><Music className="w-4 h-4 text-slate-800" /></a>}
                                    {v.website && <a href={v.website} target="_blank" rel="noopener noreferrer" title="Website"><Globe className="w-4 h-4 text-sky-600" /></a>}
                                </div>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm mb-6 font-light leading-relaxed line-clamp-3">{v.applicationStory || v.services?.[0]?.description}</p>
                        
                        {v.applicationGalleryUrls && v.applicationGalleryUrls.length > 0 && (
                          <div className="grid grid-cols-4 gap-3 mb-6">
                              {v.applicationGalleryUrls.slice(0, 4).map((url, idx) => (
                                  <img 
                                      key={idx} 
                                      src={url} 
                                      alt={`${v.name} gallery ${idx}`} 
                                      className="w-full h-20 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => {
                                          setActiveGallery({ images: v.applicationGalleryUrls!, initialIndex: idx });
                                          setCurrentImageIndex(idx);
                                      }}
                                  />
                              ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100">{v.email}</span>
                            {v.phone && <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100">{v.phone}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50">
                    <button 
                        onClick={() => handleApprove(v)} 
                        disabled={!v.verified}
                        className={`px-10 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 ${v.verified ? 'bg-slate-900 text-white hover:bg-sky-600' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                    >
                        <Send className="w-4 h-4" /> {v.verified ? t('admin.approveAndNotify') : 'Email Not Verified'}
                    </button>
                    {!v.verified && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" /> Vendor must verify email first
                        </p>
                    )}
                    <button 
                        onClick={() => handleDecline(v)}
                        className="px-8 py-4 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        Decline
                    </button>
                </div>
            </div>
        ))}
        {vendors.filter(v => [VendorStatus.PENDING, VendorStatus.NOT_VERIFIED, VendorStatus.VERIFIED].includes(v.status)).length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                <p className="text-slate-400 italic serif text-xl">Review queue is empty.</p>
            </div>
        )}
      </div>

       {/* Confirmation Modal */}
       {confirmAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isApproving && setConfirmAction(null)} />
          <div className="relative w-full max-w-sm">
             <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full border border-slate-100 text-center animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Shield className="w-6 h-6 text-slate-900" />
                </div>
                <h3 className="text-xl serif mb-2">{confirmAction.title}</h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed font-light">{confirmAction.message}</p>
                <div className="space-y-3">
                   <button 
                     onClick={confirmAction.action} 
                     disabled={isApproving}
                     className="w-full bg-slate-900 text-white py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg flex items-center justify-center gap-2"
                   >
                     {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                   </button>
                   <button 
                     onClick={() => setConfirmAction(null)} 
                     disabled={isApproving}
                     className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                   >
                     Cancel
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
      {/* Gallery Modal */}
      <AnimatePresence>
      {activeGallery && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm"
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white p-2 z-[210] bg-white/10 hover:bg-white/20 rounded-full transition-all" 
            onClick={() => setActiveGallery(null)}
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="relative w-full max-w-6xl px-4 flex items-center justify-center h-[80vh]">
            {currentImageIndex > 0 && (
              <button 
                className="absolute left-6 text-white/70 hover:text-white p-3 z-[210] hover:bg-white/20 rounded-full bg-white/10 transition-all" 
                onClick={(e) => { e.stopPropagation(); setIsGalleryImageLoading(true); setCurrentImageIndex(prev => prev - 1); }}
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
                alt="Gallery" 
                className="max-h-full max-w-full object-contain"
                onLoad={() => setIsGalleryImageLoading(false)}
              />
            </AnimatePresence>

            {currentImageIndex < activeGallery.images.length - 1 && (
              <button 
                className="absolute right-6 text-white/70 hover:text-white p-3 z-[210] hover:bg-white/20 rounded-full bg-white/10 transition-all" 
                onClick={(e) => { e.stopPropagation(); setIsGalleryImageLoading(true); setCurrentImageIndex(prev => prev + 1); }}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>

          <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="absolute bottom-8 left-0 right-0 flex justify-center flex-wrap gap-2 px-4 z-[210]"
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
    </div>
  );
};

export default VendorReview;
