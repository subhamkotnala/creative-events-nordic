import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Vendor, VendorCategory, VendorStatus, VendorService } from '../types';
import { AVAILABLE_LOCATIONS } from '../constants';
import { optimizeVendorDescription, generateServiceIdeas } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_NEW_SERVICE_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_NEW_SERVICE_TEMPLATE_ID || "template_q61t53d";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
import { 
  Plus, Sparkles, Check, Clock, XCircle, 
  Instagram, Facebook, Camera, UploadCloud,
  Globe, Music, Loader2, Trash2, CheckCircle2, AlertCircle,
  Eye, BarChart3, MousePointerClick, MessageSquare, X, Settings
} from 'lucide-react';

const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.5): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

interface VendorDashboardProps {
  vendors: Vendor[];
  onAddVendor: (v: Vendor) => Promise<void>;
}

const StatusBanner = ({ status }: { status: VendorStatus }) => {
  const statusInfo = {
    [VendorStatus.APPROVED]: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      text: "Your profile is live and visible on the marketplace.",
      color: "bg-green-50 text-green-800",
    },
    [VendorStatus.PENDING]: {
      icon: <Clock className="w-5 h-5" />,
      text: "Your application is under review. You will be notified of the outcome within 48 hours.",
      color: "bg-amber-50 text-amber-800",
    },
    [VendorStatus.REJECTED]: {
      icon: <XCircle className="w-5 h-5" />,
      text: "Your application was not approved. Please review our guidelines or contact support.",
      color: "bg-red-50 text-red-800",
    },
    [VendorStatus.NOT_VERIFIED]: {
      icon: <AlertCircle className="w-5 h-5" />,
      text: "Your email is not verified yet. Please check your inbox.",
      color: "bg-slate-50 text-slate-800",
    },
    [VendorStatus.VERIFIED]: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      text: "Your email is verified. Awaiting admin approval.",
      color: "bg-blue-50 text-blue-800",
    },
  };

  const currentStatus = statusInfo[status];
  if (!currentStatus) return null;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl mb-8 ${currentStatus.color}`}>
      {currentStatus.icon}
      <p className="text-sm font-medium">{currentStatus.text}</p>
    </div>
  );
};

const VendorProfile: React.FC<VendorDashboardProps> = ({ vendors, onAddVendor }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGeneratingServices, setIsGeneratingServices] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    socials: {
      instagram: '',
      facebook: '',
      linkedin: '',
      tiktok: ''
    }
  });

  const [services, setServices] = useState<VendorService[]>([]);
  const [editingServiceIdx, setEditingServiceIdx] = useState<number | null>(null);
  const [serviceToDeleteIdx, setServiceToDeleteIdx] = useState<number | null>(null);
  const [tempService, setTempService] = useState<VendorService | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  // setGalleryImages is obsolete now
  // Delete the galleryImages state if it exists, or just leave it.

  // 1. Initial Identity Resolution from Props
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Initial Identity Resolution from Props
    if (user && !currentVendor) {
        let foundVendor = vendors.find(v => v.id === user.id);
        
        if (!foundVendor && user.email === 'vendor@creative.se') {
            foundVendor = vendors.find(v => v.email === 'vendor@creative.se');
        }
        
        if (!foundVendor && user.role === 'VENDOR') {
            foundVendor = vendors.find(v => v.status === VendorStatus.APPROVED);
        }

        if (foundVendor) {
            setCurrentVendor(foundVendor);
            // Initialize form with prop data first (instant render)
            updateFormState(foundVendor);
        }
    }
  }, [user, vendors, currentVendor]);

  // 2. Fresh Data Synchronization
  useEffect(() => {
    const syncFreshData = async () => {
        if (currentVendor?.id) {
            try {
                // Fetch fresh data from DB to get latest views/stats
                const freshData = await api.getVendor(currentVendor.id);
                if (freshData) {
                    setCurrentVendor(freshData);
                    updateFormState(freshData);
                }
            } catch (err) {
                console.error("Background sync failed:", err);
            } finally {
                setIsSyncing(false);
            }
        }
    };

    if (currentVendor?.id) {
        syncFreshData();
    }
  }, [currentVendor?.id]);

  const updateFormState = (vendor: Vendor) => {
    setFormData({
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone || '',
        website: vendor.website || '',
        socials: {
            instagram: vendor.socials?.instagram || '',
            facebook: vendor.socials?.facebook || '',
            linkedin: vendor.socials?.linkedin || '',
            tiktok: vendor.socials?.tiktok || ''
        }
    });
    setServices(vendor.services || []);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentVendor) {
      setIsProcessingImages(true);
      try {
        const compressed = await compressImage(e.target.files[0], 1000, 600, 0.5);
        const updatedVendor = { ...currentVendor, applicationImageUrl: compressed };
        setCurrentVendor(updatedVendor);
      } catch (err) {
        console.error("Image processing failed", err);
      } finally {
        setIsProcessingImages(false);
      }
    }
  };

  const handleServiceImageUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessingImages(true);
      try {
        const filesArray = Array.from(e.target.files);
        const filesToProcess = filesArray.slice(0, 5);
        const compressedImages = await Promise.all(
          filesToProcess.map(file => compressImage(file, 600, 600, 0.4))
        );
        const s = [...services];
        if (!s[idx].imageUrls) s[idx].imageUrls = [];
        s[idx].imageUrls = [...(s[idx].imageUrls || []), ...compressedImages].slice(0, 5);
        setServices(s);
      } catch (err) {
        console.error("Service image processing failed", err);
      } finally {
        setIsProcessingImages(false);
      }
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && currentVendor) {
      setIsProcessingImages(true);
      const files = Array.from(e.target.files) as File[];
      const compressedImages: string[] = [];
      
      const currentImages = currentVendor.applicationGalleryUrls || [];
      const remainingSlots = 6 - currentImages.length;
      const filesToProcess = files.slice(0, remainingSlots);

      for (const file of filesToProcess) {
        try {
          const compressed = await compressImage(file, 600, 600, 0.4);
          compressedImages.push(compressed);
        } catch (err) {
          console.error("Gallery image processing failed", err);
        }
      }
      
      const updatedVendor = { 
        ...currentVendor, 
        applicationGalleryUrls: [...currentImages, ...compressedImages].slice(0, 6) 
      };
      setCurrentVendor(updatedVendor);
      setIsProcessingImages(false);
    }
  };

  const saveVendorData = async (updatedServices?: VendorService[]) => {
    if (!currentVendor) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const updatedVendor: Vendor = {
        ...currentVendor,
        ...formData,
      };

      await onAddVendor(updatedVendor);
      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Submission failed", err);
      setSubmitError(err.message || "Failed to submit updates. Please check your connection and try again.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveVendorData();
  };

  if (!currentVendor && !user) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
              <h2 className="text-2xl serif mb-4">Loading Profile...</h2>
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
      );
  }

  if (showSuccess) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="bg-white border border-slate-200 p-12 md:p-20 rounded-[3rem] shadow-2xl flex flex-col items-center animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-10 shadow-inner">
            <Check className="w-12 h-12 text-green-500" strokeWidth={3} />
          </div>
          <h1 className="text-4xl md:text-5xl serif mb-6 text-slate-900 leading-tight">
            Updates Saved
          </h1>
          <p className="text-slate-500 text-lg font-light leading-relaxed max-w-lg mb-12">
            Your profile changes have been successfully recorded and are now active.
          </p>
          <button 
            onClick={() => setShowSuccess(false)} 
            className="bg-slate-900 text-white px-8 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-sky-600 transition-all shadow-xl"
          >
            Continue Editing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl serif">Manage Profile</h1>
            {isSyncing && <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
          </div>
          <p className="text-slate-500">Manage your business information and online presence.</p>
        </div>
        {currentVendor && (
          <Link 
            to={`/vendors/${currentVendor.id}`} 
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100 transition-all shadow-sm group"
          >
            <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {t('vendorDashboard.preview')}
          </Link>
        )}
      </div>
      
      {submitError && (
        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{submitError}</p>
        </div>
      )}

      {currentVendor && <StatusBanner status={currentVendor.status} />}

      <form onSubmit={handleSubmit} className="space-y-12 pb-24">
        {/* Basic Info */}
        <div className="bg-white p-8 border border-slate-200 rounded-3xl space-y-8 shadow-sm">
          <h2 className="text-xl serif border-b border-slate-100 pb-4">{t('vendorDashboard.basicInfo')}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('vendorDashboard.businessName')}</label>
              <input required className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-sky-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('home.emailLabel')}</label>
              <input required type="email" disabled className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 outline-none text-slate-500 cursor-not-allowed" value={formData.email} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
              <input type="tel" className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-sky-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '') })} />
            </div>
          </div>
        </div>

        {/* Portfolio Assets Section */}
        <div className="bg-white p-8 border border-slate-200 rounded-3xl space-y-8 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
             <h2 className="text-xl serif">Portfolio & Visuals</h2>
             {isProcessingImages && <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-sky-600 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Optimizing...</div>}
          </div>
          <div className="space-y-10">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-4">{t('vendorDashboard.coverImage')}</label>
              <div className="relative w-full aspect-[21/9] bg-slate-100 rounded-2xl overflow-hidden group border border-slate-100 shadow-inner">
                <img src={currentVendor?.applicationImageUrl || services[0]?.imageUrl} className="w-full h-full object-cover" alt="Main Cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                  <button type="button" onClick={() => coverFileInputRef.current?.click()} className="p-4 bg-white rounded-full text-slate-900 shadow-2xl hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </button>
                  <span className="text-white text-[10px] font-bold uppercase tracking-widest mt-3">Replace Header</span>
                </div>
                <input type="file" ref={coverFileInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block">{t('vendorDashboard.photoGallery')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(currentVendor?.applicationGalleryUrls || []).map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm border border-slate-100">
                    <img src={img} className="w-full h-full object-cover" alt={`Gallery item ${i}`} />
                    <button type="button" onClick={() => {
                        if (currentVendor) {
                          const updated = currentVendor.applicationGalleryUrls?.filter((_, idx) => idx !== i);
                          setCurrentVendor({ ...currentVendor, applicationGalleryUrls: updated });
                        }
                    }} className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-50">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {(currentVendor?.applicationGalleryUrls?.length || 0) < 6 && (
                  <button 
                    type="button" 
                    onClick={() => galleryFileInputRef.current?.click()} 
                    className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50 transition-all group"
                  >
                    <UploadCloud className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Add Photo</span>
                  </button>
                )}
                <input type="file" ref={galleryFileInputRef} className="hidden" multiple accept="image/*" onChange={handleGalleryUpload} />
              </div>
            </div>
          </div>
        </div>

        {/* Web Presence Section */}
        <div className="bg-white p-8 border border-slate-200 rounded-3xl space-y-8 shadow-sm">
          <h2 className="text-xl serif border-b border-slate-100 pb-4">Web Presence & Socials</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('vendorDashboard.website')}</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className="w-full bg-slate-100 border-none rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-1 focus:ring-sky-500" placeholder="https://yourwebsite.com" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Instagram URL</label>
              <div className="relative">
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className="w-full bg-slate-100 border-none rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-1 focus:ring-sky-500" placeholder="https://instagram.com/yourprofile" value={formData.socials.instagram} onChange={e => setFormData({ ...formData, socials: { ...formData.socials, instagram: e.target.value } })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">TikTok URL</label>
              <div className="relative">
                <Music className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className="w-full bg-slate-100 border-none rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-1 focus:ring-sky-500" placeholder="https://tiktok.com/@yourid" value={formData.socials.tiktok} onChange={e => setFormData({ ...formData, socials: { ...formData.socials, tiktok: e.target.value } })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Facebook URL</label>
              <div className="relative">
                <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className="w-full bg-slate-100 border-none rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-1 focus:ring-sky-500" placeholder="https://facebook.com/yourbusiness" value={formData.socials.facebook} onChange={e => setFormData({ ...formData, socials: { ...formData.socials, facebook: e.target.value } })} />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-8">
          <button 
            type="submit" 
            disabled={isProcessingImages || isOptimizing || isSubmitting}
            className="w-full bg-slate-900 text-white py-6 rounded-3xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-sky-600 transition-all shadow-xl hover:scale-[1.01] active:scale-95 duration-300 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              t('vendorDashboard.saveChanges')
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorProfile;