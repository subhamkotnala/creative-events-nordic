
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Vendor, VendorStatus, VendorCategory, VendorService } from '../types';
import { analyzeVendorApplication, getMarketInsights } from '../services/geminiService';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import emailjs from '@emailjs/browser';
import { AVAILABLE_LOCATIONS } from '../constants';
import { Link } from 'react-router-dom';
import { 
  Check, X, Eye, Clock, Users, CheckCircle2, XCircle, Search, 
  TrendingUp, MoreVertical, MapPin, Mail, Calendar, 
  ArrowUpRight, Download, ChevronRight, Activity, Sparkles, Shield,
  Zap, BarChart3, History, Terminal, Star, Send, Globe, Instagram, Music, Facebook, Tag, Image as ImageIcon,
  Edit, Trash2, PlusCircle, Save, UploadCloud, Camera, Loader2, ExternalLink, Plus, AlertCircle
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
  onUpdateStatus: (id: string, status: VendorStatus) => Promise<any>;
  onToggleFeature: (id: string) => void;
  onDeleteVendor: (auth_id: string, id: string) => void;
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
  const [activeGallery, setActiveGallery] = useState<{ images: string[]; initialIndex: number } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

        // 2. Email First: Send email using EmailJS
        try {
            // Note: Sending parameters: business_name, email as requested
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    business_name: v.name,
                    to_email: v.email, 
                    email: v.email,
                    to_name: v.name,
                },
                EMAILJS_PUBLIC_KEY
            );

            // 3. Database Second: Wait for email success, then move record
            await onUpdateStatus(v.id, VendorStatus.APPROVED);

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
      email: '',
      phone: '',
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
    // Admin image upload disabled. Vendors manage this in their own dashboard
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Admin gallery upload disabled. Vendors manage this in their own dashboard
  };

  const handleDelete = (vendor: Vendor) => {
    setConfirmAction({
      title: 'Delete Partner',
      message: `Are you sure you want to delete ${vendor.name}? This will delete the user from system i.e., he cannot login anymore and cannot be undone.`,
      action: async () => {
        try {
            await onDeleteVendor(vendor.auth_id || vendor.id, vendor.id);
            setNotifications(prev => [`System: Deleted partner record: ${vendor.name}`, ...prev]);
            setConfirmAction(null);
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Delete failed: " + (err instanceof Error ? err.message : String(err)));
        }
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
      [VendorStatus.NOT_VERIFIED]: { text: 'Not Verified', bg: 'bg-slate-50', textCol: 'text-slate-700', icon: AlertCircle },
      [VendorStatus.VERIFIED]: { text: 'Verified', bg: 'bg-blue-50', textCol: 'text-blue-700', icon: CheckCircle2 },
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
    return vendors.filter(v => (
      (v.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (v.services?.some(s => (s.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())) || false) ||
      (v.services?.some(s => (s.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())) || false)
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
                          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">{vendor.services?.[0]?.category || 'Partner'}</p>
                        </td>
                        <td className="px-8 py-6 text-sm text-slate-500 font-light">{vendor.applicationLocation || vendor.services?.[0]?.location}</td>
                        <td className="px-8 py-6"><StatusBadge status={vendor.status} /></td>
                        <td className="px-8 py-6">
                          <div className="flex justify-end gap-2">
                            {/* Star Action: Toggle Featured */}
                            {vendor.status === VendorStatus.APPROVED && (
                              <button 
                                onClick={() => onToggleFeature(vendor.id)} 
                                className={`p-2 rounded-xl transition-all ${vendor.isFeatured ? 'text-amber-500 bg-amber-50 shadow-inner' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
                                title={vendor.isFeatured ? 'Unfeature from home page' : 'Feature on home page'}
                              >
                                <Star className={`w-4 h-4 ${vendor.isFeatured ? 'fill-amber-500' : ''}`} />
                              </button>
                            )}
                            {vendor.status === VendorStatus.APPROVED && (
                              <Link 
                                to={`/vendors/${vendor.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-300 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                                title="View Public Profile"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            )}

                            {(vendor.status === VendorStatus.VERIFIED || vendor.status === VendorStatus.PENDING) && (
                              <button 
                                onClick={() => handleApprove(vendor)}
                                className="p-2 text-slate-300 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                                title="Approve Application"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {vendor.status === VendorStatus.NOT_VERIFIED && (
                              <button 
                                disabled
                                className="p-2 text-slate-200 cursor-not-allowed"
                                title="Awaiting Email Verification"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {(vendor.status === VendorStatus.VERIFIED || vendor.status === VendorStatus.PENDING || vendor.status === VendorStatus.NOT_VERIFIED) && (
                              <button 
                                onClick={() => handleDecline(vendor)}
                                className="p-2 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                title="Decline Application"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                            <button 
                              onClick={() => handleOpenEdit(vendor)}
                              className="p-2 text-slate-300 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                              title="Edit Partner Profile"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(vendor)}
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
                            <div key={`${note}-${i}`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-2 border-b border-white/5 last:border-none flex gap-2">
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Header Branding Photo (Managed by Vendor)</label>
                  <div className="relative w-full aspect-[21/9] bg-slate-100 rounded-3xl overflow-hidden group border border-slate-100 shadow-inner">
                    <img src={editingVendor.services?.[0]?.imageUrl} className="w-full h-full object-cover" alt="" />
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
                    <input type="tel" className="w-full bg-slate-100 border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-1 focus:ring-sky-500" value={editingVendor.phone || ''} onChange={e => setEditingVendor({...editingVendor, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '')})} />
                  </div>
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

                {/* PHOTO GALLERY (MANAGED BY VENDOR) */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Portfolio Gallery (Managed by Vendor)</h4>
                    <span className="text-[9px] text-slate-300 italic">Click to expand</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
                    {(editingVendor.applicationGalleryUrls || editingVendor.services?.[0]?.imageUrls)?.map((url, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          setActiveGallery({ images: (editingVendor.applicationGalleryUrls || editingVendor.services?.[0]?.imageUrls) || [], initialIndex: i });
                          setCurrentImageIndex(i);
                        }}
                        className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 group cursor-pointer hover:ring-2 hover:ring-sky-500/30 transition-all"
                      >
                        <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* SERVICES MANIFEST (READ ONLY IN ADMIN) */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Service Offerings</h4>
                  </div>
                  {editingVendor.services && editingVendor.services.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {editingVendor.services.map((s, idx) => (
                        <div key={s.id || idx} className="flex flex-col gap-2 p-5 bg-slate-50 rounded-3xl border border-slate-100 relative">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600">{s.category}</span>
                              <span className="text-[10px] font-bold text-slate-400">{s.location}</span>
                            </div>
                            {s.imageUrls && s.imageUrls.length > 0 && (
                              <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                                {s.imageUrls.map((url, i) => (
                                  <div 
                                    key={url} 
                                    onClick={() => {
                                      setActiveGallery({ images: s.imageUrls || [], initialIndex: i });
                                      setCurrentImageIndex(i);
                                    }}
                                    className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer shadow-sm"
                                  >
                                    <img src={url} className="w-full h-full object-cover" alt="" />
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-3">{s.description}</p>
                            {s.packages && s.packages.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {s.packages.map(pkg => (
                                  <div key={pkg.id} className="bg-white px-3 py-2 rounded-xl flex justify-between items-center border border-slate-100 shadow-sm">
                                    <span className="text-[9px] font-bold text-slate-600">{pkg.name}</span>
                                    <span className="text-[9px] font-bold text-sky-600">{pkg.price} SEK</span>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">No categories added yet.</p>
                    </div>
                  )}
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

      {/* Gallery Modal */}
      {activeGallery && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <button 
            onClick={() => setActiveGallery(null)} 
            className="absolute top-6 right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-20"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative w-full max-w-6xl flex items-center justify-center h-full">
            {activeGallery.images.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : activeGallery.images.length - 1));
                }}
                className="absolute left-0 p-4 text-white/50 hover:text-white transition-all z-20"
              >
                <ChevronRight className="w-10 h-10 rotate-180" />
              </button>
            )}
            
            <img 
              src={activeGallery.images[currentImageIndex]} 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-500"
              alt="Gallery Preview"
            />

            {activeGallery.images.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev < activeGallery.images.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-0 p-4 text-white/50 hover:text-white transition-all z-20"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            )}
          </div>
          
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 overflow-x-auto px-4 z-20">
            {activeGallery.images.map((img) => (
              <button 
                key={img}
                onClick={() => setCurrentImageIndex(activeGallery.images.indexOf(img))}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${activeGallery.images.indexOf(img) === currentImageIndex ? 'border-sky-500 opacity-100 scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
              >
                <img src={img} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
