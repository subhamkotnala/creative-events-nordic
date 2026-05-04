
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vendor, VendorCategory, VendorStatus } from '../types';
import { AVAILABLE_LOCATIONS } from '../constants';
import { optimizeVendorDescription } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Globe, Music, Loader2, Instagram, Facebook, Rocket, TrendingUp, Users, AlertCircle, Check,
  Camera, Trash2, Sparkles, UploadCloud, Lock
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { api } from '../services/api';
import emailjs from '@emailjs/browser';

// Image processing utility
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

// EmailJS Configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_JOIN_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_JOIN_TEMPLATE_ID;
const EMAILJS_JOIN_ACK_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_JOIN_ACK_TEMPLATE_ID || "template_uoqt3lo";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

interface JoinMarketplaceProps {
  onJoin: (v: Vendor) => Promise<void>;
}

const JoinMarketplace: React.FC<JoinMarketplaceProps> = ({ onJoin }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    location: AVAILABLE_LOCATIONS[0],
    description: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    website: '',
    imageUrl: 'https://images.unsplash.com/photo-1519222970733-f546218fa6d7?auto=format&fit=crop&q=80&w=800',
    socials: {
      instagram: '',
      facebook: '',
      linkedin: '',
      tiktok: ''
    }
  });

  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessingImages(true);
      try {
        const compressed = await compressImage(e.target.files[0], 1000, 600, 0.5);
        setFormData(prev => ({ ...prev, imageUrl: compressed }));
      } catch (err) {
        console.error("Image processing failed", err);
      } finally {
        setIsProcessingImages(false);
      }
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setIsProcessingImages(true);
      const files = Array.from(e.target.files) as File[];
      const compressedImages: string[] = [];
      
      const remainingSlots = 6 - galleryImages.length;
      const filesToProcess = files.slice(0, remainingSlots);

      for (const file of filesToProcess) {
        try {
          const compressed = await compressImage(file, 600, 600, 0.4);
          compressedImages.push(compressed);
        } catch (err) {
          console.error("Gallery image processing failed", err);
        }
      }
      
      setGalleryImages(prev => [...prev, ...compressedImages].slice(0, 6));
      setIsProcessingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    // Required fields validation
    if (!formData.name.trim()) { setSubmitError("Business Name is required."); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsSubmitting(false); return; }
    if (!formData.email.trim()) { setSubmitError("Email Address is required."); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsSubmitting(false); return; }
    if (!formData.phone.trim()) { setSubmitError("Phone Number is required."); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsSubmitting(false); return; }
    if (!formData.location.trim()) { setSubmitError("Main Region is required."); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsSubmitting(false); return; }
    if (!formData.description.trim()) { setSubmitError("Business Story is required."); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsSubmitting(false); return; }
    if (formData.password !== formData.passwordConfirm) { setSubmitError("Passwords do not match."); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsSubmitting(false); return; }
    if (!formData.imageUrl) { setSubmitError("Cover Image is required."); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsSubmitting(false); return; }
    if (galleryImages.length === 0) { setSubmitError("At least 1 Gallery Image is required."); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsSubmitting(false); return; }
    
    if (!formData.website?.trim() && !formData.socials?.instagram?.trim() && !formData.socials?.facebook?.trim() && !formData.socials?.tiktok?.trim()) { 
      setSubmitError("At least 1 Social Link (Website, Instagram, Facebook, or TikTok) is required."); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); setIsSubmitting(false); return; 
    }

    // Phone validation
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      setSubmitError("Please enter a valid phone number (8-15 digits).");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      console.log({ authData, authError });

      if (authError) {
        console.error("Supabase sign up error:", authError);
        throw authError;
      }
      if (!authData.user) throw new Error("Sign up failed.");

      const newVendor: Vendor = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        id: crypto.randomUUID(), // App-generated ID
        userId: authData.user.id, // Auth user ID
        auth_id: authData.user.id, // Explicitly pass auth_id
        status: VendorStatus.NOT_VERIFIED,
        joinedAt: new Date().getFullYear().toString(),
        services: [], 
        applicationStory: formData.description,
        applicationLocation: formData.location,
        applicationImageUrl: formData.imageUrl,
        applicationGalleryUrls: galleryImages,
        rating: 0,
        socials: formData.socials
      };

      await onJoin(newVendor);
      
      // Send notification email to admin
      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_JOIN_TEMPLATE_ID,
          {
            vendor_name: newVendor.name,
            vendor_email: newVendor.email,
            vendor_phone: newVendor.phone
          },
          EMAILJS_PUBLIC_KEY
        );
      } catch (emailErr) {
        console.error("Failed to send join notification email to admin:", emailErr);
        // We don't want to block the success UI if just the email fails
      }

      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Submission failed", err);
      setSubmitError(err.message || "Something went wrong. Please check your connection and try again.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="bg-white border border-slate-200 p-12 md:p-20 rounded-[3rem] shadow-2xl flex flex-col items-center animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-10 shadow-inner">
            <Check className="w-12 h-12 text-green-500" strokeWidth={3} />
          </div>
          <h1 className="text-4xl md:text-5xl serif mb-6 text-slate-900 leading-tight">
            {t('join.successTitle')}
          </h1>
          <p className="text-slate-500 text-lg font-light leading-relaxed max-w-lg mb-12">
            {t('join.successSub')}
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="bg-slate-900 text-white px-8 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-sky-600 transition-all shadow-xl"
          >
            {t('join.backHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white py-20 pb-32">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl serif mb-6">{t('join.title')}</h1>
          <p className="text-slate-400 text-lg font-light max-w-2xl mx-auto">{t('join.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-20 pb-24">
        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 text-center">
                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Rocket className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm mb-2">{t('join.reachMore')}</h3>
                <p className="text-xs text-slate-500">{t('join.reachMoreSub')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 text-center">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm mb-2">{t('home.featuredTitle')}</h3>
                <p className="text-xs text-slate-500">{t('home.featuredSub')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 text-center">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm mb-2">{t('join.easyTools')}</h3>
                <p className="text-xs text-slate-500">{t('join.easyToolsSub')}</p>
            </div>
        </div>

        {submitError && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
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
                <input required type="email" className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-sky-500" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="password" placeholder="Create a secure password" className="w-full bg-slate-100 border-none rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-1 focus:ring-sky-500" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="password" placeholder="Confirm your password" className="w-full bg-slate-100 border-none rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-1 focus:ring-sky-500" value={formData.passwordConfirm} onChange={e => setFormData({ ...formData, passwordConfirm: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                <input type="tel" placeholder="+46 70 123 45 67" className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-sky-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '') })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('vendorDashboard.mainRegion')}</label>
                <select className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}>
                  {AVAILABLE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Business Story</label>
                <button type="button" onClick={async () => {
                  if (!formData.description) return;
                  setIsOptimizing(true);
                  const opt = await optimizeVendorDescription(formData.name, VendorCategory.OTHER, formData.description);
                  setFormData(prev => ({ ...prev, description: opt }));
                  setIsOptimizing(false);
                }} disabled={isOptimizing || !formData.description} className="text-[10px] font-bold text-sky-600 uppercase flex items-center gap-1 hover:text-sky-700 transition-colors">
                  {isOptimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} {t('vendorDashboard.optimize')}
                </button>
              </div>
              <textarea required rows={4} className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 outline-none resize-none focus:ring-1 focus:ring-sky-500" placeholder="Tell your future clients what makes your service unique..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>
          </div>

          {/* Portfolio */}
          <div className="bg-white p-8 border border-slate-200 rounded-3xl space-y-8 shadow-sm">
            <h2 className="text-xl serif border-b border-slate-100 pb-4">{t('vendorDashboard.photoGallery')}</h2>
            <div className="space-y-10">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-4">{t('vendorDashboard.coverImage')}</label>
                <div className="relative w-full aspect-[21/9] bg-slate-100 rounded-2xl overflow-hidden group border border-slate-100 shadow-inner">
                  <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Main Cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                    <button type="button" onClick={() => coverFileInputRef.current?.click()} className="p-4 bg-white rounded-full text-slate-900 shadow-2xl hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </button>
                    <span className="text-white text-[10px] font-bold uppercase tracking-widest mt-3">Upload Header</span>
                  </div>
                  <input type="file" ref={coverFileInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block">Gallery Images</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {galleryImages.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm border border-slate-100">
                      <img src={img} className="w-full h-full object-cover" alt={`Gallery item ${i}`} />
                      <button type="button" onClick={() => setGalleryImages(galleryImages.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-50">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {galleryImages.length < 6 && (
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

          {/* Socials */}
          <div className="bg-white p-8 border border-slate-200 rounded-3xl space-y-8 shadow-sm">
            <h2 className="text-xl serif border-b border-slate-100 pb-4">{t('vendorDashboard.socialProfiles')}</h2>
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

          <button 
            type="submit" 
            disabled={isProcessingImages || isOptimizing || isSubmitting}
            className="w-full bg-slate-900 text-white py-6 rounded-3xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-sky-600 transition-all shadow-xl hover:scale-[1.01] active:scale-95 duration-300 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              isProcessingImages ? 'Optimizing Uploads...' : t('join.submitApp')
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinMarketplace;
