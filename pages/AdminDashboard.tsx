
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Vendor, VendorStatus, VendorCategory, Service } from '../types';
import { analyzeVendorApplication, getMarketInsights } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import emailjs from '@emailjs/browser';
import { AVAILABLE_LOCATIONS } from '../constants';
import { Link } from 'react-router-dom';
import { 
  Check, X, Eye, Clock, Users, CheckCircle2, XCircle, Search, 
  TrendingUp, MoreVertical, MapPin, Mail, Calendar, 
  ArrowUpRight, Download, ChevronRight, Activity, Sparkles, Shield,
  Zap, BarChart3, History, Terminal, Star, Send, Globe, Instagram, Music, Facebook, Tag, Image as ImageIcon,
  Edit, Trash2, PlusCircle, Save, UploadCloud, Camera, Loader2, ExternalLink, Plus
} from 'lucide-react';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Compression utility for admin uploads
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

interface AdminDashboardProps {
  vendors: Vendor[];
  onUpdateStatus: (id: string, status: VendorStatus, password?: string) => Promise<any>;
  onToggleFeature: (id: string) => void;
  onDeleteVendor: (id: string) => void;
  onUpdateVendor: (v: Vendor) => void;
  onAddVendor: (v: Vendor) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  vendors, 
  onUpdateStatus, 
  onToggleFeature,
  onDeleteVendor,
  onUpdateVendor,
  onAddVendor
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [marketInsight, setMarketInsight] = useState<string>('Analyzing market patterns...');
  const [notifications, setNotifications] = useState<string[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Partial<Vendor> | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<{title: string, message: string} | null>(null);
  const [isApproving, setIsApproving] = useState(false); // Loader state for approval
  
  // Custom Confirmation State to replace window.confirm
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    action: () => void;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMarketInsights().then(setMarketInsight);
  }, []);

  const stats = useMemo(() => {
    const total = vendors.length;
    const approved = vendors.filter(v => v.status === VendorStatus.APPROVED).length;
    const pending = vendors.filter(v => v.status === VendorStatus.PENDING).length;
    return { total, approved, pending };
  }, [vendors]);

  const handleApprove = (v: Vendor) => {
    setConfirmAction({
      title: 'Approve Application',
      message: `Are you sure you want to approve ${v.name}? This will send an email and enable the account.`,
      action: async () => {
        setIsApproving(true); // Start Loader

        // 1. Password Generation: Create a random 6-character password
        const generatedPassword = Math.random().toString(36).slice(-6);

        // 2. Email First: Send email using EmailJS
        try {
            // Note: Sending parameters: business_name, email, generated_password as requested
            const response = await fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateType: 'VENDOR_APPROVAL',
                    data: {
                        business_name: v.name,
                        to_email: v.email, 
                        email: v.email,
                        generated_password: generatedPassword, // Updated to match template variable
                        to_name: v.name,
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send email');
            }

            // 3. Database Second: Wait for email success, then move record
            await onUpdateStatus(v.id, VendorStatus.APPROVED, generatedPassword);

            setNotifications(prev => [`System: Approved & Email sent to ${v.name}`, ...prev]);
            setActionSuccess({
                title: 'Vendor Approved',
                message: `Vendor approved and welcome email has been successfully sent to ${v.email}.`
            });
            setConfirmAction(null); // Close confirm modal on success

        } catch (error) {
            // 4. Error Handling: Abort if email fails
            console.error("Email failed to send:", error);
            alert('Email failed to send. Approval aborted.');
            setConfirmAction(null); // Close confirm modal on error
        } finally {
            setIsApproving(false); // Stop Loader
        }
      }
    });
  };

  const handleDecline = (v: Vendor) => {
    setConfirmAction({
      title: 'Decline Application',
      message: `Are you sure you want to decline ${v.name}? This will permanently delete the application.`,
      action: () => {
        onUpdateStatus(v.id, VendorStatus.REJECTED);
        setNotifications(prev => [`System: Declined application for ${v.name}`, ...prev]);
        setActionSuccess({
            title: 'Application Declined',
            message: `The application for ${v.name} has been declined.`
        });
        setConfirmAction(null);
      }
    });
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setEditingVendor({ ...vendor });
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingVendor({
      name: '',
      category: VendorCategory.OTHER,
      location: AVAILABLE_LOCATIONS[0],
      description: '',
      email: '',
      phone: '',
      imageUrl: 'https://images.unsplash.com/photo-1519222970733-f546218fa6d7?auto=format&fit=crop&q=80&w=800',
      imageUrls: [],
      status: VendorStatus.PENDING,
      services: [],
      rating: 4.5,
      joinedAt: new Date().toISOString().split('T')[0],
      socials: {
        instagram: '',
        facebook: '',
        tiktok: ''
      }
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editingVendor) {
      setIsProcessingImage(true);
      try {
        const compressed = await compressImage(e.target.files[0], 1200, 800, 0.6);
        setEditingVendor({ ...editingVendor, imageUrl: compressed });
      } catch (err) {
        console.error("Image processing failed", err);
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && editingVendor) {
      setIsProcessingImage(true);
      const files = Array.from(e.target.files) as File[];
      const compressedImages: string[] = [];
      
      for (const file of files) {
        try {
          const compressed = await compressImage(file, 800, 800, 0.5);
          compressedImages.push(compressed);
        } catch (err) {
          console.error("Gallery upload failed", err);
        }
      }
      
      setEditingVendor({
        ...editingVendor,
        imageUrls: [...(editingVendor.imageUrls || []), ...compressedImages].slice(0, 8)
      });
      setIsProcessingImage(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmAction({
      title: 'Delete Partner',
      message: 'Are you sure you want to delete this partner? This action cannot be undone.',
      action: () => {
        onDeleteVendor(id);
        setNotifications(prev => [`System: Deleted partner record`, ...prev]);
        setConfirmAction(null);
      }
    });
  };

  const handleSaveVendor = () => {
    if (!editingVendor?.name || !editingVendor?.email) {
      alert('Please fill in required fields (Name, Email).');
      return;
    }

    if (editingVendor.id) {
      onUpdateVendor(editingVendor as Vendor);
      setNotifications(prev => [`System: Updated ${editingVendor.name}`, ...prev]);
      setActionSuccess({
        title: 'Editing Completed',
        message: `The profile for ${editingVendor.name} has been successfully updated.`
      });
    } else {
      const newVendor: Vendor = {
        ...(editingVendor as Vendor),
        // FIX: Prefix ID with 'app-' to be consistent with application IDs
        id: `app-${Date.now()}`,
      };
      onAddVendor(newVendor);
      setNotifications(prev => [`System: New partner ${newVendor.name} added to queue`, ...prev]);
      setActionSuccess({
        title: 'Partner Added',
        message: `${newVendor.name} has been successfully added to the system.`
      });
    }
    setIsModalOpen(false);
    setEditingVendor(null);
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color.bg}`}>
          <Icon className={`w-5 h-5 ${color.text}`} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-light text-slate-900 tracking-tight">{value}</p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">{title}</p>
      </div>
    </div>
  );

  const StatusBadge = ({ status }: { status: VendorStatus }) => {
    const configs = {
      [VendorStatus.APPROVED]: { text: 'Approved', bg: 'bg-green-50', textCol: 'text-green-700', icon: CheckCircle2 },
      [VendorStatus.PENDING]: { text: 'Pending', bg: 'bg-amber-50', textCol: 'text-amber-700', icon: Clock },
      [VendorStatus.REJECTED]: { text: 'Rejected', bg: 'bg-red-50', textCol: 'text-red-700', icon: XCircle },
    };
    const config = configs[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${config.bg} ${config.textCol}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const filteredDirectory = useMemo(() => {
    return vendors.filter(v => v.status !== VendorStatus.PENDING && (
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.location.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [vendors, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-slate-900 rounded-3xl shadow-xl">
               <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl serif mb-1">{t('admin.opsTitle')}</h1>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                {t('admin.systemActive')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* New Partner button removed */}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <StatCard title={t('admin.totalPartners')} value={stats.total} icon={Users} color={{ bg: 'bg-sky-50', text: 'text-sky-600' }} />
          <StatCard title={t('admin.pendingReview')} value={stats.pending} icon={Clock} color={{ bg: 'bg-amber-50', text: 'text-amber-600' }} />
          <StatCard title={t('admin.activeListings')} value={stats.approved} icon={CheckCircle2} color={{ bg: 'bg-green-50', text: 'text-green-600' }} />
          <StatCard title={t('admin.valueGrowth')} value="94%" icon={BarChart3} color={{ bg: 'bg-purple-50', text: 'text-purple-600' }} />
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left Column: Review Queue & Directory */}
          <div className="lg:col-span-2 space-y-12">
            <section className="space-y-6">
              <h2 className="text-2xl serif px-2">{t('admin.queueTitle')}</h2>
              {vendors.filter(v => v.status === VendorStatus.PENDING).map(v => (
                <div key={v.id} className="bg-white border border-slate-200 rounded-[3rem] p-8 md:p-10 flex flex-col gap-10 shadow-sm transition-all hover:shadow-md">
                  <div className="flex flex-col md:flex-row gap-10">
                    <div className="w-full md:w-64 aspect-square flex-shrink-0">
                      <img src={v.imageUrl} className="w-full h-full object-cover rounded-2xl shadow-sm border border-slate-100" alt="" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <span className="text-[10px] uppercase font-bold text-sky-600 mb-1 block tracking-widest">{t(`categories.${v.category}`)}</span>
                              <h3 className="text-3xl serif">{v.name}</h3>
                          </div>
                          <div className="flex flex-col items-end gap-2 text-right">
                            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                                <MapPin className="w-3 h-3" /> {v.location}
                            </div>
                            {/* Social Links in Review */}
                            <div className="flex gap-3 mt-2">
                                {v.socials?.instagram && <a href={v.socials.instagram} target="_blank" rel="noopener noreferrer" title="Instagram"><Instagram className="w-4 h-4 text-pink-500" /></a>}
                                {v.socials?.facebook && <a href={v.socials.facebook} target="_blank" rel="noopener noreferrer" title="Facebook"><Facebook className="w-4 h-4 text-blue-600" /></a>}
                                {v.socials?.tiktok && <a href={v.socials.tiktok} target="_blank" rel="noopener noreferrer" title="TikTok"><Music className="w-4 h-4 text-slate-800" /></a>}
                                {v.website && <a href={v.website} target="_blank" rel="noopener noreferrer" title="Website"><Globe className="w-4 h-4 text-sky-600" /></a>}
                            </div>
                          </div>
                      </div>
                      <p className="text-slate-500 text-sm mb-6 font-light leading-relaxed line-clamp-3">{v.description}</p>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100">{v.email}</span>
                        {v.phone && <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100">{v.phone}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Portfolio Gallery Display in Review */}
                  {v.imageUrls && v.imageUrls.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest px-2">Uploaded Portfolio</h4>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                        {v.imageUrls.map((url, i) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                            <img src={url} className="w-full h-full object-cover" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Services Manifest Display in Review */}
                  <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 px-2">Service Manifest</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {v.services && v.services.length > 0 ? (
                        v.services.map(s => (
                          <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3">
                            {s.imageUrls && s.imageUrls.length > 0 && (
                              <div className="flex gap-2 overflow-x-auto pb-2">
                                {s.imageUrls.map((url, i) => (
                                  <div key={i} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                    <img src={url} className="w-full h-full object-cover" alt={s.name} />
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex-grow">
                              <div className="flex justify-between items-start mb-1">
                                <h5 className="text-xs font-semibold">{s.name}</h5>
                                <span className="text-[9px] font-bold text-sky-600">{s.price.toLocaleString()} SEK</span>
                              </div>
                              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{s.description}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-400 italic px-2">No services listed.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50">
                      <button 
                          onClick={() => handleApprove(v)} 
                          className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-sky-600 transition-all flex items-center gap-2"
                      >
                          <Send className="w-4 h-4" /> {t('admin.approveAndNotify')}
                      </button>
                      <button 
                          onClick={() => handleDecline(v)}
                          className="px-8 py-4 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
                      >
                          Decline
                      </button>
                  </div>
                </div>
              ))}
              {vendors.filter(v => v.status === VendorStatus.PENDING).length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                    <p className="text-slate-400 italic serif text-xl">Review queue is empty.</p>
                </div>
              )}
            </section>

            <section className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <h2 className="text-2xl serif">{t('admin.directoryTitle')}</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search directory..."
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase text-slate-400">Partner</th>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase text-slate-400">Region</th>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase text-slate-400">Status</th>
                      <th className="px-8 py-6 text-[10px] font-bold uppercase text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDirectory.map(vendor => (
                      <tr key={vendor.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-6">
                          <p className="font-semibold text-sm text-slate-900">{vendor.name}</p>
                          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">{vendor.category}</p>
                        </td>
                        <td className="px-8 py-6 text-sm text-slate-500 font-light">{vendor.location}</td>
                        <td className="px-8 py-6"><StatusBadge status={vendor.status} /></td>
                        <td className="px-8 py-6">
                          <div className="flex justify-end gap-2">
                            {/* Star Action: Toggle Featured */}
                            <button 
                              onClick={() => onToggleFeature(vendor.id)} 
                              className={`p-2 rounded-xl transition-all ${vendor.isFeatured ? 'text-amber-500 bg-amber-50 shadow-inner' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
                              title={vendor.isFeatured ? 'Unfeature from home page' : 'Feature on home page'}
                            >
                              <Star className={`w-4 h-4 ${vendor.isFeatured ? 'fill-amber-500' : ''}`} />
                            </button>
                            <button 
                              onClick={() => handleOpenEdit(vendor)}
                              className="p-2 text-slate-300 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                              title="Edit Partner Profile"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(vendor.id)}
                              className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Partner"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-12">
            <section className="space-y-6">
              <h2 className="text-xl serif px-2">Market Insights</h2>
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                <p className="text-slate-800 font-medium italic serif text-lg leading-relaxed">"{marketInsight}"</p>
              </div>
            </section>
            
            <section className="space-y-6">
              <h2 className="text-xl serif px-2">Admin Notifications</h2>
              <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 space-y-3">
                    {notifications.length > 0 ? (
                        notifications.map((note, i) => (
                            <div key={i} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-2 border-b border-white/5 last:border-none flex gap-2">
                                <span className="text-sky-500">→</span> {note}
                            </div>
                        ))
                    ) : (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 italic">No recent updates.</p>
                    )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* CRUD Management Modal */}
      {isModalOpen && editingVendor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-5xl max-h-[95vh] flex flex-col">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full h-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-2xl serif">{editingVendor.id ? 'Edit Partner Profile' : 'Add New Partner'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-10 space-y-12 custom-scrollbar">
                {/* Header Branding */}
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Header Branding Photo</label>
                  <div className="relative w-full aspect-[21/9] bg-slate-100 rounded-3xl overflow-hidden group border border-slate-100 shadow-inner">
                    <img src={editingVendor.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-4 bg-white rounded-full text-slate-900 shadow-2xl">
                        {isProcessingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>
                  </div>
                </div>

                {/* Basic Details */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Business Name *</label>
                    <input className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-1 focus:ring-sky-500" value={editingVendor.name} onChange={e => setEditingVendor({...editingVendor, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address *</label>
                    <input className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-1 focus:ring-sky-500" value={editingVendor.email} onChange={e => setEditingVendor({...editingVendor, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                    <input className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-1 focus:ring-sky-500" value={editingVendor.phone || ''} onChange={e => setEditingVendor({...editingVendor, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vendor Category</label>
                    <select className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 text-sm outline-none cursor-pointer" value={editingVendor.category} onChange={e => setEditingVendor({...editingVendor, category: e.target.value as VendorCategory})}>
                      {Object.values(VendorCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Primary Region</label>
                    <select className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 text-sm outline-none cursor-pointer" value={editingVendor.location} onChange={e => setEditingVendor({...editingVendor, location: e.target.value})}>
                      {AVAILABLE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Business Description</label>
                  <textarea rows={4} className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 text-sm outline-none resize-none focus:ring-1 focus:ring-sky-500" value={editingVendor.description} onChange={e => setEditingVendor({...editingVendor, description: e.target.value})} />
                </div>

                {/* SOCIAL LINKS (MANDATORY) */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 border-b border-slate-100 pb-2">Social Presence</h4>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><Instagram className="w-3 h-3" /> Instagram URL</label>
                      <input className="w-full bg-slate-100 border-none rounded-2xl px-5 py-3 text-xs outline-none" value={editingVendor.socials?.instagram || ''} onChange={e => setEditingVendor({...editingVendor, socials: {...editingVendor.socials, instagram: e.target.value}})} placeholder="https://instagram.com/..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><Facebook className="w-3 h-3" /> Facebook URL</label>
                      <input className="w-full bg-slate-100 border-none rounded-2xl px-5 py-3 text-xs outline-none" value={editingVendor.socials?.facebook || ''} onChange={e => setEditingVendor({...editingVendor, socials: {...editingVendor.socials, facebook: e.target.value}})} placeholder="https://facebook.com/..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2"><Globe className="w-3 h-3" /> Website URL</label>
                      <input className="w-full bg-slate-100 border-none rounded-2xl px-5 py-3 text-xs outline-none" value={editingVendor.website || ''} onChange={e => setEditingVendor({...editingVendor, website: e.target.value})} placeholder="https://website.com" />
                    </div>
                  </div>
                </div>

                {/* PHOTO GALLERY (MANDATORY) */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Portfolio Gallery</h4>
                    <button type="button" onClick={() => galleryInputRef.current?.click()} className="text-[10px] font-bold text-sky-600 uppercase flex items-center gap-2"><Plus className="w-3 h-3" /> Add Images</button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
                    {editingVendor.imageUrls?.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 group">
                        <img src={url} className="w-full h-full object-cover" alt="" />
                        <button onClick={() => setEditingVendor({...editingVendor, imageUrls: editingVendor.imageUrls?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <input type="file" ref={galleryInputRef} multiple className="hidden" accept="image/*" onChange={handleGalleryUpload} />
                  </div>
                </div>

                {/* SERVICES MANIFEST (MANDATORY) */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Service Manifest</h4>
                    <button onClick={() => setEditingVendor({...editingVendor, services: [...(editingVendor.services || []), { id: Date.now().toString(), name: '', description: '', price: 0 }]})} className="text-[10px] font-bold text-sky-600 uppercase flex items-center gap-2"><Plus className="w-3 h-3" /> Add Service</button>
                  </div>
                  <div className="space-y-4">
                     {editingVendor.services?.map((s, idx) => (
                       <div key={s.id} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative">
                          <div className="flex-grow grid md:grid-cols-3 gap-4">
                             <input placeholder="Service Name" className="bg-white border-none rounded-xl px-4 py-2 text-xs outline-none" value={s.name} onChange={e => {
                               const updated = [...(editingVendor.services || [])];
                               updated[idx].name = e.target.value;
                               setEditingVendor({...editingVendor, services: updated});
                             }} />
                             <input placeholder="Price SEK" type="number" className="bg-white border-none rounded-xl px-4 py-2 text-xs outline-none" value={s.price} onChange={e => {
                               const updated = [...(editingVendor.services || [])];
                               updated[idx].price = Number(e.target.value);
                               setEditingVendor({...editingVendor, services: updated});
                             }} />
                             <input placeholder="Quick description" className="bg-white border-none rounded-xl px-4 py-2 text-xs outline-none" value={s.description} onChange={e => {
                               const updated = [...(editingVendor.services || [])];
                               updated[idx].description = e.target.value;
                               setEditingVendor({...editingVendor, services: updated});
                             }} />
                          </div>
                          <button onClick={() => setEditingVendor({...editingVendor, services: editingVendor.services?.filter(serv => serv.id !== s.id)})} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                       </div>
                     ))}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                <button onClick={handleSaveVendor} disabled={isProcessingImage} className="flex-grow bg-slate-900 text-white font-bold py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-sky-600 transition-all shadow-xl disabled:opacity-50">
                  {isProcessingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editingVendor.id ? 'Save Changes' : 'Confirm & Add to Queue'}
                </button>
                <button onClick={() => setIsModalOpen(false)} className="px-10 py-5 bg-white border border-slate-200 text-slate-400 font-bold rounded-2xl text-[10px] uppercase tracking-[0.2em]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Feedback Modal */}
      {actionSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setActionSuccess(null)} />
          <div className="relative w-full max-w-sm">
             <div className="bg-white rounded-[2rem] shadow-2xl p-10 w-full text-center border border-slate-100 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-2xl serif mb-3">{actionSuccess.title}</h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed whitespace-pre-line">
                    {actionSuccess.message}
                </p>
                <button 
                    onClick={() => setActionSuccess(null)}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg"
                >
                    Okay
                </button>
             </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default AdminDashboard;
