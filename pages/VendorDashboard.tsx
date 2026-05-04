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

const VendorDashboard: React.FC<VendorDashboardProps> = ({ vendors, onAddVendor }) => {
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
  const [formError, setFormError] = useState<string | null>(null);
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
      const servicesToSave = updatedServices || services;
      const updatedVendor: Vendor = {
        ...currentVendor,
        ...formData,
        services: servicesToSave,
      };

      // Detect new categories
      const currentServiceIds = new Set(currentVendor.services?.map(s => s.id) || []);
      const newServices = servicesToSave.filter(s => !currentServiceIds.has(s.id));
      
      if (newServices.length > 0 && EMAILJS_SERVICE_ID && EMAILJS_NEW_SERVICE_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
        try {
          await Promise.all(newServices.map(service => 
            emailjs.send(
              EMAILJS_SERVICE_ID,
              EMAILJS_NEW_SERVICE_TEMPLATE_ID,
              {
                vendor_name: currentVendor.name,
                service_name: service.category,
                service_location: service.location,
                vendor_email: currentVendor.email
              },
              EMAILJS_PUBLIC_KEY
            )
          ));
        } catch (emailErr) {
          console.error("Failed to send new service notifications:", emailErr);
        }
      }

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
            <h1 className="text-4xl serif">Vendor Dashboard</h1>
            {isSyncing && <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
          </div>
          <p className="text-slate-500">Overview of your metrics and service categories.</p>
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

      {/* Analytics Section */}
      <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3 text-slate-400">
                <div className="p-2 bg-slate-50 rounded-xl">
                    <Eye className="w-4 h-4 text-sky-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">{t('vendorDashboard.profileViews')}</span>
            </div>
            <p className="text-4xl font-light text-slate-900 ml-1">
                {currentVendor?.views?.toLocaleString() || 0}
            </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3 text-slate-400">
                <div className="p-2 bg-slate-50 rounded-xl">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">{t('vendorDashboard.inquiries')}</span>
            </div>
            <p className="text-4xl font-light text-slate-900 ml-1">
                {currentVendor?.inquiries?.toLocaleString() || 0}
            </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12 pb-24">
        {/* Services Section */}
        <div className="bg-white p-8 border border-slate-200 rounded-3xl space-y-8 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="text-xl serif">Service Categories</h2>
            <button 
              type="button" 
              onClick={() => {
                const newService: VendorService = { 
                  id: Date.now().toString(), 
                  category: VendorCategory.PHOTOGRAPHY, 
                  location: AVAILABLE_LOCATIONS[0], 
                  description: '', 
                  packages: [],
                  imageUrls: [] 
                };
                setTempService(newService);
                setEditingServiceIdx(-1); // -1 indicates a brand new service
              }} 
              className="bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2"
            >
              <Plus className="w-3 h-3" /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service, idx) => (
              <div key={service.id} className="group bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 flex flex-col hover:shadow-xl hover:border-sky-100 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-500">
                     <Settings className="w-5 h-5 text-sky-600" />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setServiceToDeleteIdx(idx)} 
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1 mb-6">
                  <h3 className="text-lg serif text-slate-900">{service.category}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{service.location}</p>
                </div>

                <p className="text-sm text-slate-500 line-clamp-2 font-light leading-relaxed mb-8 flex-grow">
                  {service.description || "No description set yet. Click edit to tell your story."}
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-slate-200/50">
                  <div className="flex -space-x-2">
                    {(service.imageUrls || []).slice(0, 3).map((url) => (
                      <div key={url} className="w-8 h-8 rounded-full border-2 border-slate-50 overflow-hidden bg-slate-200">
                        <img src={url} className="w-full h-full object-cover" alt="" />
                      </div>
                    ))}
                    {(service.imageUrls?.length || 0) > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-slate-50 bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                        +{(service.imageUrls?.length || 0) - 3}
                      </div>
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setTempService({ ...service });
                      setEditingServiceIdx(idx);
                    }}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    Edit Service
                  </button>
                </div>
              </div>
            ))}
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

      {/* Edit Service Modal */}
      {editingServiceIdx !== null && tempService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl serif text-slate-900">
                  {editingServiceIdx === -1 ? 'Add New' : t('vendorDashboard.manageTitle')} Service
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {tempService.category} • {tempService.location}
                </p>
              </div>
              <button 
                onClick={() => {
                  setEditingServiceIdx(null);
                  setTempService(null);
                }} 
                className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm group"
              >
                <X className="w-6 h-6 text-slate-300 group-hover:text-slate-600" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-grow space-y-10">
              {/* Basic Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-500/20" 
                    value={tempService.category} 
                    onChange={e => {
                      setTempService({ ...tempService, category: e.target.value as VendorCategory });
                    }}
                  >
                    {Object.values(VendorCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-500/20" 
                    value={tempService.location} 
                    onChange={e => {
                      setTempService({ ...tempService, location: e.target.value });
                    }}
                  >
                    {AVAILABLE_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
              </div>

              {/* Story */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Service Description</label>
                <textarea 
                  placeholder="Tell clients what makes this service unique..." 
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 resize-none leading-relaxed" 
                  rows={4} 
                  value={tempService.description} 
                  onChange={e => {
                    setTempService({ ...tempService, description: e.target.value });
                  }} 
                />
              </div>

              {/* Packages */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Service Packages</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setTempService({
                        ...tempService,
                        packages: [...(tempService.packages || []), { id: Date.now().toString(), name: '', description: '', price: 0 }]
                      });
                    }} 
                    className="text-[10px] text-sky-600 font-bold uppercase flex items-center gap-2 px-4 py-2 bg-sky-50 rounded-xl hover:bg-sky-100 transition-colors"
                  >
                    <Plus className="w-3 h-3"/> Add Package
                  </button>
                </div>
                <div className="space-y-3">
                  {(tempService.packages || []).map((pkg, pIdx) => (
                    <div key={pkg.id} className="p-4 bg-slate-50 rounded-2xl space-y-4 border border-slate-100">
                      <div className="flex gap-3">
                        <input 
                          placeholder="Package Name (e.g. Full Day Coverage)" 
                          className="flex-grow bg-white border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500/20" 
                          value={pkg.name} 
                          onChange={e => {
                            const pkgs = [...(tempService.packages || [])];
                            pkgs[pIdx].name = e.target.value;
                            setTempService({ ...tempService, packages: pkgs });
                          }} 
                        />
                        <div className="relative w-32">
                          <input 
                            type="number" 
                            placeholder="Price" 
                            className="w-full bg-white border-none rounded-xl pl-4 pr-10 py-3 text-sm focus:ring-2 focus:ring-sky-500/20" 
                            value={pkg.price} 
                            onChange={e => {
                              const pkgs = [...(tempService.packages || [])];
                              pkgs[pIdx].price = Number(e.target.value);
                              setTempService({ ...tempService, packages: pkgs });
                            }} 
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">SEK</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            const pkgs = (tempService.packages || []).filter(p => p.id !== pkg.id);
                            setTempService({ ...tempService, packages: pkgs });
                          }} 
                          className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5"/>
                        </button>
                      </div>
                      <textarea 
                        placeholder="What's included in this package?" 
                        className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500/20 resize-none" 
                        rows={2} 
                        value={pkg.description} 
                        onChange={e => {
                          const pkgs = [...(tempService.packages || [])];
                          pkgs[pIdx].description = e.target.value;
                          setTempService({ ...tempService, packages: pkgs });
                        }} 
                      />
                    </div>
                  ))}
                  {(tempService.packages?.length || 0) === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 text-xs italic font-light">
                      No packages added yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Photos */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category Portfolio</label>
                  <label className="cursor-pointer bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-sky-600 shadow-lg flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Upload Photos
                    <input type="file" multiple className="hidden" accept="image/*" onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setIsProcessingImages(true);
                        try {
                          const filesArray = Array.from(e.target.files) as File[];
                          const compressedImages = await Promise.all(
                            filesArray.map(file => compressImage(file, 600, 600, 0.4))
                          );
                          setTempService({
                            ...tempService,
                            imageUrls: [...(tempService.imageUrls || []), ...compressedImages].slice(0, 6)
                          });
                        } catch (err) {
                          console.error("Photo processing failed", err);
                        } finally {
                          setIsProcessingImages(false);
                        }
                      }
                    }} />
                  </label>
                </div>
                
                {tempService.imageUrls && tempService.imageUrls.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {tempService.imageUrls.map((url) => (
                      <div key={url} className="relative aspect-square rounded-[1.5rem] overflow-hidden group shadow-sm border border-slate-100">
                        <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Service" />
                        <button 
                          type="button" 
                          onClick={() => {
                            const urls = (tempService.imageUrls || []).filter((u) => u !== url);
                            setTempService({ ...tempService, imageUrls: urls });
                          }} 
                          className="absolute top-2 right-2 p-2 bg-white/90 text-red-500 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-110"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-[21/9] border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400">
                     <Camera className="w-8 h-8 mb-4 opacity-20" />
                     <p className="text-xs font-light italic">No category-specific photos uploaded.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-4">                
                {formError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{formError}</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <button 
                    type="button"
                    disabled={isSubmitting || isProcessingImages}
                    onClick={async () => {
                      setFormError(null);
                      
                      if (!tempService.description.trim()) {
                        setFormError("Please provide a service description.");
                        return;
                      }
                      
                      if (!tempService.packages || tempService.packages.length === 0) {
                        setFormError("Please add at least one package.");
                        return;
                      }
                      
                      if (!tempService.imageUrls || tempService.imageUrls.length === 0) {
                        setFormError("Please upload at least one image for the service gallery.");
                        return;
                      }
                      
                      let finalServices: VendorService[];
                      if (editingServiceIdx === -1) {
                        finalServices = [...services, tempService];
                      } else {
                        finalServices = [...services];
                        finalServices[editingServiceIdx!] = tempService;
                      }
                      
                      setServices(finalServices);
                      await saveVendorData(finalServices);
                      
                      setEditingServiceIdx(null);
                      setTempService(null);
                    }} 
                    className="bg-slate-900 text-white px-12 py-5 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-sky-600 transition-all shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingServiceIdx === -1 ? 'Add Category' : 'Save Changes')}
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {serviceToDeleteIdx !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl serif text-slate-900 mb-4">Delete Service?</h3>
            <p className="text-slate-500 font-light leading-relaxed mb-10">
              Are you sure you want to delete <span className="font-bold text-slate-700">{services[serviceToDeleteIdx]?.category}</span>? This will remove the service and all its packages from your public profile immediately.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                className="w-full bg-red-500 text-white py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-lg"
                onClick={async () => {
                  const newServices = services.filter((_, i) => i !== serviceToDeleteIdx);
                  setServices(newServices);
                  setServiceToDeleteIdx(null);
                  await saveVendorData(newServices);
                }}
              >
                Delete Categorically
              </button>
              <button 
                type="button"
                className="w-full bg-slate-100 text-slate-600 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                onClick={() => setServiceToDeleteIdx(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;