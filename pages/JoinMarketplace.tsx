
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vendor, VendorCategory, VendorStatus } from '../types';
import { AVAILABLE_LOCATIONS } from '../constants';
import { optimizeVendorDescription } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Globe, Music, Loader2, Instagram, Facebook, Rocket, TrendingUp, Users, AlertCircle, Check,
  Camera, Trash2, Sparkles, UploadCloud, Lock, ArrowLeft, Info, MapPin, Utensils,
  Headphones, Flower2, Mic2, MoreHorizontal, Shield, BadgeCheck, Tag,
  ChevronRight, Star, Quote
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
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
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

// Category icons
const TOP_CATEGORIES = [
  { label: 'Venues', icon: MapPin },
  { label: 'Catering', icon: Utensils },
  { label: 'Photography', icon: Camera },
  { label: 'DJs', icon: Headphones },
  { label: 'Decor & Styling', icon: Flower2 },
  { label: 'Entertainment', icon: Mic2 },
  { label: 'More', icon: MoreHorizontal },
];

// Trust badges with descriptions (matching the reference image)
const TRUST_BADGES = [
  { icon: Shield, label: 'GDPR Compliant', desc: 'Your data is safe and protected.' },
  { icon: BadgeCheck, label: 'Verified Vendors', desc: 'Every vendor profile is verified.' },
  { icon: Lock, label: 'Secure Platform', desc: 'Bank-level security you can trust.' },
  { icon: Tag, label: 'Free Registration', desc: 'Join completely free. No hidden fees.' },
];

// Stats with icons (SVG paths for custom icons)
const STATS = [
  { value: '50+', label: 'Vendors', iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { value: '250+', label: 'Leads Monthly', iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { value: '1000+', label: 'Visitors Monthly', iconPath: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  { value: '10+', label: 'Categories', iconPath: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
];

// Testimonials data
const TESTIMONIALS = [
  {
    name: 'Sofia Lindström',
    role: 'Wedding Photographer, Stockholm',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120',
    rating: 5,
    text: 'Joining Creative Events was the best decision for my business. Within the first month I received 12 new inquiry leads and booked 4 weddings. The platform is incredibly easy to use.'
  },
  {
    name: 'Marcus Eriksson',
    role: 'DJ & Entertainment, Gothenburg',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120',
    rating: 5,
    text: 'The visibility I get here is unmatched. Clients actively search and find me, which means less time marketing and more time doing what I love. Highly recommend to any event professional.'
  },
  {
    name: 'Anna Bergström',
    role: 'Floral Designer, Malmö',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120&h=120',
    rating: 5,
    text: 'The application process was so smooth. Within 3 days I was live on the platform and already receiving messages from potential clients. The support team is also fantastic.'
  },
];

const JoinMarketplace: React.FC<JoinMarketplaceProps> = ({ onJoin }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<'landing' | 'form'>('landing');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    location: AVAILABLE_LOCATIONS[0],
    description: '',
    email: user?.email || '',
    password: '',
    passwordConfirm: '',
    phone: '',
    website: '',
    imageUrl: 'https://images.unsplash.com/photo-1519222970733-f546218fa6d7?auto=format&fit=crop&q=80&w=800',
    socials: { instagram: '', facebook: '', linkedin: '', tiktok: '' }
  });

  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const goToForm = () => { setCurrentStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessingImages(true);
      try { const c = await compressImage(e.target.files[0], 1000, 600, 0.5); setFormData(prev => ({ ...prev, imageUrl: c })); }
      catch (err) { console.error("Image processing failed", err); }
      finally { setIsProcessingImages(false); }
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setIsProcessingImages(true);
      const files = Array.from(e.target.files) as File[];
      const compressed: string[] = [];
      const slots = 6 - galleryImages.length;
      for (const file of files.slice(0, slots)) {
        try { compressed.push(await compressImage(file, 600, 600, 0.4)); }
        catch (err) { console.error("Gallery image processing failed", err); }
      }
      setGalleryImages(prev => [...prev, ...compressed].slice(0, 6));
      setIsProcessingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!formData.name.trim()) { setSubmitError(t('join.businessNameRequired')); scrollTop(); setIsSubmitting(false); return; }
    if (!user && !formData.email.trim()) { setSubmitError(t('join.emailRequired')); scrollTop(); setIsSubmitting(false); return; }
    if (!formData.phone.trim()) { setSubmitError(t('join.phoneRequired')); scrollTop(); setIsSubmitting(false); return; }
    if (!formData.location.trim()) { setSubmitError(t('join.locationRequired')); scrollTop(); setIsSubmitting(false); return; }
    if (!formData.description.trim()) { setSubmitError(t('join.descriptionRequired')); scrollTop(); setIsSubmitting(false); return; }
    if (!user && formData.password !== formData.passwordConfirm) { setSubmitError(t('join.passwordsMatch')); scrollTop(); setIsSubmitting(false); return; }
    if (!formData.imageUrl) { setSubmitError(t('join.coverRequired')); scrollTop(); setIsSubmitting(false); return; }
    if (galleryImages.length === 0) { setSubmitError(t('join.galleryRequired')); scrollTop(); setIsSubmitting(false); return; }
    if (!formData.website?.trim() && !formData.socials?.instagram?.trim() && !formData.socials?.facebook?.trim() && !formData.socials?.tiktok?.trim()) {
      setSubmitError(t('join.socialRequired'));
      scrollTop(); setIsSubmitting(false); return;
    }
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15) { setSubmitError(t('join.phoneDigitsLimit')); scrollTop(); setIsSubmitting(false); return; }

    try {
      let authUserId: string;
      let applicationEmail: string;
      if (user) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('Session expired. Please sign in again.');
        authUserId = authUser.id;
        applicationEmail = user.email;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email: formData.email, password: formData.password });
        console.log({ authData, authError });
        if (authError) { console.error("Supabase sign up error:", authError); throw authError; }
        if (!authData.user) throw new Error(t('join.signUpFailed'));
        authUserId = authData.user.id;
        applicationEmail = formData.email;
      }
      const newVendor: Vendor = {
        name: formData.name, email: applicationEmail, phone: formData.phone, website: formData.website,
        id: crypto.randomUUID(), userId: authUserId, auth_id: authUserId,
        status: VendorStatus.NOT_VERIFIED, joinedAt: new Date().getFullYear().toString(),
        services: [], applicationStory: formData.description, applicationLocation: formData.location,
        applicationImageUrl: formData.imageUrl, applicationGalleryUrls: galleryImages,
        rating: 0, socials: formData.socials
      };
      await onJoin(newVendor);
      try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_JOIN_TEMPLATE_ID, {
          vendor_name: newVendor.name, vendor_email: newVendor.email, vendor_phone: newVendor.phone
        }, EMAILJS_PUBLIC_KEY);
      } catch (emailErr) { console.error("Failed to send join notification email to admin:", emailErr); }
      setShowSuccess(true);
      scrollTop();
    } catch (err: any) {
      console.error("Submission failed", err);
      setSubmitError(err.message || t('join.somethingWentWrong'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setIsSubmitting(false); }
  };

  // ─── SUCCESS STATE ────────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f8fafc' }}>
        <div className="max-w-lg w-full bg-white p-12 md:p-16 rounded-[2rem] shadow-2xl flex flex-col items-center text-center" style={{ border: '1px solid #e2e8f0' }}>
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-8">
            <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            {t('join.successTitle')}
          </h1>
          <p className="text-slate-500 text-base font-light leading-relaxed mb-10">{t('join.successSub')}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 4px 20px rgba(2,132,199,0.35)' }}
          >
            {t('join.backHome')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── LANDING VIEW ─────────────────────────────────────────────────────────────
  if (currentStep === 'landing') {
    return (
      <div className="w-full bg-white overflow-x-hidden">

        {/* ════════════════════════════════════════════════════════════
            HERO — full-bleed dark section, text left + form card right
        ════════════════════════════════════════════════════════════ */}
        <section className="relative w-full overflow-hidden" style={{ background: '#0d0d14', minHeight: '560px' }}>

          {/* Background photo */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1510076857177-7470076d4098?auto=format&fit=crop&q=80&w=1800')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 30%',
              opacity: 0.42,
            }}
          />

          {/* Gradient — left strong dark, right slightly lighter so form pops */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(105deg, rgba(13,13,20,0.92) 0%, rgba(13,13,20,0.65) 48%, rgba(13,13,20,0.30) 100%)',
            }}
          />

          {/* Inner layout */}
          <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-14 md:py-16">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-6">

              {/* LEFT — headline */}
              <div className="max-w-lg">
                <h1
                  className="text-4xl sm:text-5xl xl:text-6xl font-bold text-white leading-[1.1] mb-5"
                  style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '-0.015em' }}
                >
                  {language === 'sv' ? (
                    <>Din nästa<br />bokning<br />börjar här</>
                  ) : (
                    <>Your Next<br />Booking<br />Starts Here</>
                  )}<span style={{ color: '#0284c7' }}></span>
                </h1>
                <p className="text-white/65 text-base md:text-[17px] font-light mb-8 leading-relaxed max-w-sm">
                  {t('join.nordicDescription')}
                </p>
                <button
                  id="join-now-hero-btn"
                  onClick={goToForm}
                  className="inline-flex items-center gap-2 px-7 py-[14px] rounded-[14px] text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.03] active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 6px 28px rgba(2,132,199,0.5)' }}
                >
                  {t('join.joinNowFree')} <ChevronRight className="w-4 h-4" />
                </button>
                <p className="text-white/35 text-xs mt-3 font-light">{t('join.freeReg')}</p>
              </div>

              {/* RIGHT — floating form card */}
              <div
                className="w-full lg:w-[400px] xl:w-[430px] flex-shrink-0 rounded-2xl p-6 sm:p-7"
                style={{
                  background: 'rgba(255,255,255,0.97)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
                }}
              >
                <h2 className="text-xl font-bold text-slate-900 mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {t('join.joinAsVendor')}
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    { ph: t('join.fullName'), type: 'text' },
                    { ph: t('join.businessName'), type: 'text' },
                    { ph: t('join.emailAddress'), type: 'email' },
                    { ph: t('join.phoneNumber'), type: 'tel' },
                  ].map(({ ph, type }) => (
                    <input
                      key={ph}
                      type={type}
                      placeholder={ph}
                      readOnly
                      onFocus={goToForm}
                      className="w-full rounded-xl px-3 py-[10px] text-[13px] text-slate-700 placeholder-slate-400 outline-none cursor-pointer transition-all"
                      style={{ border: '1px solid #e2e8f0', background: '#fafafa' }}
                    />
                  ))}
                  {[
                    { ph: t('join.selectCategory') },
                    { ph: t('join.selectCity') },
                  ].map(({ ph }) => (
                    <div key={ph} className="relative">
                      <select
                        disabled
                        className="w-full appearance-none rounded-xl px-3 py-[10px] text-[13px] text-slate-400 outline-none cursor-pointer"
                        style={{ border: '1px solid #e2e8f0', background: '#fafafa' }}
                      >
                        <option>{ph}</option>
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">▾</span>
                    </div>
                  ))}
                </div>
                <button
                  id="get-started-hero-form-btn"
                  onClick={goToForm}
                  className="w-full flex items-center justify-center gap-2 py-[13px] rounded-[12px] text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-95 mb-2"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 4px 16px rgba(2,132,199,0.4)' }}
                >
                  {t('join.getStartedFree')} <ChevronRight className="w-4 h-4" />
                </button>
                <p className="text-center text-[11px] text-slate-400">{t('join.lessThanTwo')}</p>
              </div>
            </div>

            {/* Stats row — inside hero, below the split */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
              {STATS.map((s) => (
                <div key={s.label} className="flex items-center gap-3 px-5 py-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(2,132,199,0.22)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d={s.iconPath} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-base font-bold leading-none" style={{ fontFamily: "'Montserrat', sans-serif" }}>{s.value}</p>
                    <p className="text-white/45 text-[11px] mt-0.5 font-medium">
                      {s.label === 'Vendors' ? (language === 'sv' ? 'Leverantörer' : 'Vendors') :
                       s.label === 'Leads Monthly' ? (language === 'sv' ? 'Förfrågningar/månad' : 'Leads Monthly') :
                       s.label === 'Visitors Monthly' ? (language === 'sv' ? 'Besökare/månad' : 'Visitors Monthly') :
                       s.label === 'Categories' ? (language === 'sv' ? 'Kategorier' : 'Categories') :
                       s.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>



        {/* ════════════════════════════════════════════════════════════
            TOP CATEGORIES
        ════════════════════════════════════════════════════════════ */}
        <section className="py-10 bg-white">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {language === 'sv' ? 'Toppkategorier' : 'Top Categories'}
              </h2>
              <button
                onClick={() => navigate('/explore')}
                className="flex items-center gap-1 text-sm font-semibold transition-colors"
                style={{ color: '#0284c7' }}
              >
                {language === 'sv' ? 'Visa alla kategorier' : 'View all categories'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 sm:gap-4">
              {TOP_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const getCategoryLabel = (label: string) => {
                  if (language === 'sv') {
                    const svLabels: Record<string, string> = {
                      'Venues': 'Festlokaler',
                      'Catering': 'Catering',
                      'Photography': 'Fotografering',
                      'DJs': 'DJs',
                      'Decor & Styling': 'Dekor & Styling',
                      'Entertainment': 'Underhållning',
                      'More': 'Mer'
                    };
                    return svLabels[label] || label;
                  }
                  return label;
                };
                return (
                  <button
                    key={cat.label}
                    onClick={() => {
                      const categoryMap: Record<string, string> = {
                        'Venues': VendorCategory.VENUES,
                        'Catering': VendorCategory.CATERING,
                        'Photography': VendorCategory.PHOTOGRAPHY,
                        'DJs': VendorCategory.MUSIC,
                        'Decor & Styling': VendorCategory.DECOR,
                        'Entertainment': VendorCategory.BAND_LIVE_MUSIC,
                      };
                      const targetCategory = categoryMap[cat.label];
                      if (targetCategory) {
                        navigate(`/explore?category=${encodeURIComponent(targetCategory)}`);
                      } else {
                        navigate('/explore');
                      }
                    }}
                    className="flex flex-col items-center gap-2.5 group focus:outline-none"
                  >
                    <div
                      className="w-14 h-14 sm:w-[68px] sm:h-[68px] rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-hover:shadow-md"
                      style={{
                        border: '1.5px solid #e0f2fe',
                        background: 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)',
                      }}
                    >
                      <Icon className="w-6 h-6" style={{ color: '#0284c7' }} />
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-600 text-center leading-tight group-hover:text-sky-700 transition-colors">
                      {getCategoryLabel(cat.label)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            TESTIMONIALS
        ════════════════════════════════════════════════════════════ */}
        <section className="py-14 bg-slate-50 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
              <div>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-3"
                  style={{ background: '#e0f2fe', color: '#0284c7' }}
                >
                  <Star className="w-3 h-3 fill-current" /> {language === 'sv' ? 'Berättelser från partners' : 'Vendor Stories'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {language === 'sv' ? 'Vad våra partners säger' : 'What Our Vendors Say'}
                </h2>
              </div>
              <button
                onClick={goToForm}
                className="self-start sm:self-auto flex items-center gap-1 text-sm font-semibold pb-0.5 transition-colors"
                style={{ color: '#0284c7', borderBottom: '1.5px solid #0284c7' }}
              >
                {language === 'sv' ? 'Gå med dem idag' : 'Join them today'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Cards */}
            <div className="grid md:grid-cols-3 gap-5">
              {TESTIMONIALS.map((t, idx) => {
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
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: '#f59e0b' }} />
                      ))}
                    </div>

                    {/* Text */}
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">"{t.text}"</p>

                    {/* Author */}
                    <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                      <img
                        src={t.avatar}
                        alt={t.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        style={{ border: '2px solid #e0f2fe' }}
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{t.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{t.role}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA below testimonials */}
            <div className="mt-10 text-center">
              <button
                id="join-after-testimonials-btn"
                onClick={goToForm}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 6px 24px rgba(2,132,199,0.38)' }}
              >
                {language === 'sv' ? 'Starta din gratis ansökan' : 'Start Your Free Application'} <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-slate-400 text-xs mt-3">
                {language === 'sv' ? 'Gratis registrering. Granskas inom 48 timmar.' : 'Free registration. Reviewed within 48 hours.'}
              </p>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            TRUST BADGES
        ════════════════════════════════════════════════════════════ */}
        <section className="py-12 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {TRUST_BADGES.map((badge) => {
                const Icon = badge.icon;
                const localizedLabel = badge.label === 'GDPR Compliant' ? t('join.gdprTitle') :
                                      badge.label === 'Verified Vendors' ? t('join.verifiedTitle') :
                                      badge.label === 'Secure Platform' ? t('join.secureTitle') :
                                      badge.label === 'Free Registration' ? t('join.freeRegTitle') : badge.label;
                const localizedDesc = badge.label === 'GDPR Compliant' ? t('join.gdprDesc') :
                                     badge.label === 'Verified Vendors' ? t('join.verifiedDesc') :
                                     badge.label === 'Secure Platform' ? t('join.secureDesc') :
                                     badge.label === 'Free Registration' ? t('join.freeRegDesc') : badge.desc;
                return (
                  <div key={badge.label} className="flex flex-col items-center sm:items-start gap-3 text-center sm:text-left">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ border: '1.5px solid #e0f2fe', background: '#f0f9ff' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: '#0284c7' }} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{localizedLabel}</p>
                      <p className="text-slate-400 text-xs mt-0.5 leading-snug">{localizedDesc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ─── FULL FORM VIEW ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>

      {/* Form Header */}
      <div className="w-full" style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 100%)' }}>
        <div className="max-w-4xl mx-auto px-5 py-10">
          <button
            onClick={() => setCurrentStep('landing')}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-xs font-semibold uppercase tracking-widest mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {t('join.back')}
          </button>
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t('join.title')}
            </h1>
            <p className="text-white/50 text-base font-light max-w-lg mx-auto">{t('join.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 -mt-6 pb-24">

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            { Icon: Rocket, label: t('join.reachMore'), sub: t('join.reachMoreSub'), bg: '#eff6ff', color: '#2563eb' },
            { Icon: TrendingUp, label: t('home.featuredTitle'), sub: t('home.featuredSub'), bg: '#f0f9ff', color: '#0284c7' },
            { Icon: Users, label: t('join.easyTools'), sub: t('join.easyToolsSub'), bg: '#f0fdf4', color: '#16a34a' },
          ].map(({ Icon, label, sub, bg, color }) => (
            <div key={label} className="bg-white p-5 rounded-2xl text-center" style={{ border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: bg, color }}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 mb-1">{label}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{sub}</p>
            </div>
          ))}
        </div>

        {/* Logged-in user banner */}
        {user && (
          <div className="mb-8 flex items-start gap-3 px-5 py-4 rounded-2xl" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">{t('join.upgradingAccount')}</p>
              <p className="text-xs text-blue-600 mt-0.5">{t('join.signedInAs')} <span className="font-bold">{user.name || user.email}</span>. {t('join.fillDetails')}</p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-8 p-4 rounded-2xl flex items-center gap-3" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Basic Info ─────────────────────────────────────────────── */}
          <div className="bg-white p-8 rounded-3xl space-y-8" style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-100 pb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t('vendorDashboard.basicInfo')}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('vendorDashboard.businessName')}</label>
                <input required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  onFocus={e => (e.target.style.borderColor = '#0284c7')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              {!user && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('home.emailLabel')}</label>
                  <input required type="email"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    onFocus={e => (e.target.style.borderColor = '#0284c7')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              )}
              {!user && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('join.password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required type="password" placeholder={t('join.createSecurePassword')}
                      className="w-full rounded-xl pl-11 pr-4 py-3 text-sm outline-none transition-all"
                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                      onFocus={e => (e.target.style.borderColor = '#0284c7')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                      value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>
              )}
              {!user && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('join.confirmPassword')}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required type="password" placeholder={t('join.confirmYourPassword')}
                      className="w-full rounded-xl pl-11 pr-4 py-3 text-sm outline-none transition-all"
                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                      onFocus={e => (e.target.style.borderColor = '#0284c7')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                      value={formData.passwordConfirm} onChange={e => setFormData({ ...formData, passwordConfirm: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('join.phoneNumber')}</label>
                <input type="tel" placeholder="+46 70 123 45 67"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  onFocus={e => (e.target.style.borderColor = '#0284c7')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '') })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('vendorDashboard.mainRegion')}</label>
                <select
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all cursor-pointer"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  onFocus={e => (e.target.style.borderColor = '#0284c7')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })}
                >
                  {AVAILABLE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('join.businessStory')}</label>
                <button type="button"
                  onClick={async () => {
                    if (!formData.description) return;
                    setIsOptimizing(true);
                    const opt = await optimizeVendorDescription(formData.name, VendorCategory.OTHER, formData.description);
                    setFormData(prev => ({ ...prev, description: opt }));
                    setIsOptimizing(false);
                  }}
                  disabled={isOptimizing || !formData.description}
                  className="text-[10px] font-bold uppercase flex items-center gap-1 transition-colors disabled:opacity-40"
                  style={{ color: '#0284c7' }}
                >
                  {isOptimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} {t('vendorDashboard.optimize')}
                </button>
              </div>
              <textarea required rows={4}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                onFocus={e => (e.target.style.borderColor = '#0284c7')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                placeholder={t('join.businessStoryPlaceholder')}
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* ── Portfolio ──────────────────────────────────────────────── */}
          <div className="bg-white p-8 rounded-3xl space-y-8" style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-100 pb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t('vendorDashboard.photoGallery')}
            </h2>
            <div className="space-y-10">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-4">{t('vendorDashboard.coverImage')}</label>
                <div className="relative w-full aspect-[21/9] bg-slate-100 rounded-2xl overflow-hidden group border border-slate-100 shadow-inner">
                  <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Main Cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                    <button type="button" onClick={() => coverFileInputRef.current?.click()} className="p-4 bg-white rounded-full text-slate-900 shadow-2xl hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </button>
                    <span className="text-white text-[10px] font-bold uppercase tracking-widest mt-3">{t('join.coverImageUpload')}</span>
                  </div>
                  <input type="file" ref={coverFileInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block">{language === 'sv' ? 'Galleribilder' : 'Gallery Images'}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {galleryImages.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm border border-slate-100">
                      <img src={img} className="w-full h-full object-cover" alt={`Gallery item ${i}`} />
                      <button type="button"
                        onClick={() => setGalleryImages(galleryImages.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {galleryImages.length < 6 && (
                    <button type="button" onClick={() => galleryFileInputRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-sky-400 hover:bg-sky-50 transition-all group"
                    >
                      <UploadCloud className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform group-hover:text-sky-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest group-hover:text-sky-500">{t('join.addPhoto')}</span>
                    </button>
                  )}
                  <input type="file" ref={galleryFileInputRef} className="hidden" multiple accept="image/*" onChange={handleGalleryUpload} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Socials ────────────────────────────────────────────────── */}
          <div className="bg-white p-8 rounded-3xl space-y-8" style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <h2 className="text-xl font-semibold text-slate-900 border-b border-slate-100 pb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t('vendorDashboard.socialProfiles')}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { label: t('vendorDashboard.website'), icon: Globe, placeholder: 'https://yourwebsite.com', field: 'website', social: false },
              ].map(({ label, icon: Icon, placeholder, field }) => (
                <div key={label} className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      className="w-full rounded-xl pl-11 pr-4 py-3 text-sm outline-none transition-all"
                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                      onFocus={e => (e.target.style.borderColor = '#0284c7')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                      placeholder={placeholder}
                      value={(formData as any)[field]}
                      onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                    />
                  </div>
                </div>
              ))}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('join.instagramUrl')}</label>
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="w-full rounded-xl pl-11 pr-4 py-3 text-sm outline-none transition-all"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    onFocus={e => (e.target.style.borderColor = '#0284c7')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    placeholder="https://instagram.com/yourprofile"
                    value={formData.socials.instagram}
                    onChange={e => setFormData({ ...formData, socials: { ...formData.socials, instagram: e.target.value } })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('join.tiktokUrl')}</label>
                <div className="relative">
                  <Music className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="w-full rounded-xl pl-11 pr-4 py-3 text-sm outline-none transition-all"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    onFocus={e => (e.target.style.borderColor = '#0284c7')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    placeholder="https://tiktok.com/@yourid"
                    value={formData.socials.tiktok}
                    onChange={e => setFormData({ ...formData, socials: { ...formData.socials, tiktok: e.target.value } })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('join.facebookUrl')}</label>
                <div className="relative">
                  <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="w-full rounded-xl pl-11 pr-4 py-3 text-sm outline-none transition-all"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                    onFocus={e => (e.target.style.borderColor = '#0284c7')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    placeholder="https://facebook.com/yourbusiness"
                    value={formData.socials.facebook}
                    onChange={e => setFormData({ ...formData, socials: { ...formData.socials, facebook: e.target.value } })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isProcessingImages || isOptimizing || isSubmitting}
            className="w-full py-5 rounded-3xl text-sm font-bold uppercase tracking-[0.2em] text-white transition-all hover:scale-[1.01] active:scale-95 duration-300 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-3"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 6px 28px rgba(2,132,199,0.4)' }}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('join.processing')}</>
            ) : (
              isProcessingImages ? t('join.optimizingUploads') : t('join.submitApp')
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinMarketplace;
