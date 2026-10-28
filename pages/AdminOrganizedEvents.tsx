import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Clock, Plus, Edit, Trash2, Eye, Star,
  CheckCircle, AlertCircle, Sparkles, Tag, Users, ArrowRight,
  ExternalLink, Image as ImageIcon, Upload, X, Loader2, ArrowLeft,
  Shield, Filter, Search, Check, Mail, Phone, Ticket, Home, Globe, Store,
  Map, Layers
} from 'lucide-react';
import { OrganizedEvent, VendorTable } from '../types';
import { api, DEFAULT_MAP_PRESETS } from '../services/api';
import { compressImage } from '../services/safeStorage';
import { useAuth } from '../contexts/AuthContext';
import { AVAILABLE_LOCATIONS } from '../constants';
import { AdminTableMapModal } from '../components/AdminTableMapModal';

const EVENT_CATEGORIES = [
  'Bridal & Wedding Fair',
  'Festival & Culinary',
  'Networking & Gala',
  'Market & Fair',
  'Exhibition & Expo',
  'Live Concert & Music',
  'Workshop & Masterclass',
  'Corporate Showcase',
  'Other'
];

const PRESET_EVENT_IMAGES = [
  {
    name: 'Luxury Wedding & Bridal Fair',
    url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Food & Culinary Festival',
    url: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Black-Tie Gala & Networking',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Design Pop-up & Artisan Market',
    url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Live Music & Concert Stage',
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Exhibition & Conference Hall',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'
  }
];

const DEFAULT_EVENT_FORM: Partial<OrganizedEvent> = {
  title: '',
  tagline: '',
  description: '',
  category: 'Bridal & Wedding Fair',
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date().toISOString().split('T')[0],
  time: '11:00 - 18:00',
  location_name: '',
  city: 'Stockholm',
  address: '',
  image_url: PRESET_EVENT_IMAGES[0].url,
  floor_plan_image_url: DEFAULT_MAP_PRESETS[0].url,
  price: 'Free Entry',
  capacity: '500 Attendees',
  ticket_url: '',
  registration_email: 'sandy@creativeventsnordic.com',
  registration_phone: '+46 70 123 45 67',
  highlights: [
    'Verified Nordic vendor showcases',
    'Live styling and design workshops',
    'Exclusive attendee discounts & gift bags'
  ],
  organizer: 'Creative Events Nordic',
  is_featured: true,
  status: 'UPCOMING'
};

const AdminOrganizedEvents: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<OrganizedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<OrganizedEvent>>(DEFAULT_EVENT_FORM);
  const [highlightInput, setHighlightInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrganizedEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<OrganizedEvent | null>(null);

  // Map & Tables Interactive Modal State
  const [selectedEventForMapModal, setSelectedEventForMapModal] = useState<OrganizedEvent | null>(null);
  const [isUploadingMapImage, setIsUploadingMapImage] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOrganizedEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load organized events:', err);
      showNotification('error', 'Failed to load events. Using local backup.');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      ...DEFAULT_EVENT_FORM,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0]
    });
    setHighlightInput('');
    setIsFormOpen(true);
  };

  const openEditModal = (event: OrganizedEvent) => {
    setFormData({ ...event });
    setHighlightInput('');
    setIsFormOpen(true);
  };

  const handleAddHighlight = () => {
    if (!highlightInput.trim()) return;
    const current = formData.highlights || [];
    setFormData({
      ...formData,
      highlights: [...current, highlightInput.trim()]
    });
    setHighlightInput('');
  };

  const handleRemoveHighlight = (index: number) => {
    const current = [...(formData.highlights || [])];
    current.splice(index, 1);
    setFormData({ ...formData, highlights: current });
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const compressedLocal = await compressImage(file, 1600, 1200, 0.78);
      let uploadedUrl = '';
      try {
        uploadedUrl = await api.uploadEventImage(file);
      } catch (err) {
        console.warn('Storage bucket upload failed, using local compressed image:', err);
      }

      const finalUrl = (uploadedUrl && !uploadedUrl.startsWith('data:')) ? uploadedUrl : (uploadedUrl || compressedLocal);
      setFormData(prev => ({ ...prev, image_url: finalUrl }));
      showNotification('success', 'Cover photo uploaded and optimized successfully!');
    } catch (err) {
      console.error('Image upload failed:', err);
      showNotification('error', 'Could not upload image. Please enter an image URL.');
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleMapImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMapImage(true);
    try {
      const compressedLocal = await compressImage(file, 1600, 1200, 0.78);
      let uploadedUrl = '';
      try {
        uploadedUrl = await api.uploadEventImage(file);
      } catch (err) {
        console.warn('Storage bucket upload failed, using local compressed blueprint:', err);
      }

      const finalUrl = (uploadedUrl && !uploadedUrl.startsWith('data:')) ? uploadedUrl : (uploadedUrl || compressedLocal);
      setFormData(prev => ({ ...prev, floor_plan_image_url: finalUrl }));
      showNotification('success', 'Venue map blueprint uploaded and optimized successfully!');
    } catch (err) {
      console.error('Map image upload failed:', err);
      showNotification('error', 'Could not upload map image. Please enter a map image URL.');
    } finally {
      setIsUploadingMapImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveTablesFromModal = async (tables: VendorTable[], floorPlanImageUrl?: string) => {
    if (!selectedEventForMapModal) return;
    try {
      let optimizedFloorPlan = floorPlanImageUrl || selectedEventForMapModal.floor_plan_image_url;
      if (optimizedFloorPlan && optimizedFloorPlan.startsWith('data:image/') && optimizedFloorPlan.length > 150000) {
        try {
          optimizedFloorPlan = await compressImage(optimizedFloorPlan, 1600, 1200, 0.78);
        } catch {
          // ignore
        }
      }

      const updated: OrganizedEvent = {
        ...selectedEventForMapModal,
        vendor_tables: tables,
        floor_plan_image_url: optimizedFloorPlan
      };
      await api.saveOrganizedEvent(updated);

      // Sync with event market layout
      const layout = await api.getEventMarketLayout(selectedEventForMapModal.id);
      if (layout) {
        layout.map_image_url = updated.floor_plan_image_url;
        layout.floor_plan_image_url = updated.floor_plan_image_url;
        layout.slots = tables.map((t, idx) => ({
          id: t.id,
          table_number: t.table_number,
          zone: t.zone,
          tier: (t.price_sek >= 7000 ? 'premium' : t.price_sek >= 5000 ? 'culinary' : 'standard') as any,
          description: t.location_description || `${t.size || 'Table'} - ${t.zone}`,
          status: (t.status === 'BOOKED' ? 'booked' : 'available') as any,
          x: t.map_coordinates?.x ?? (15 + ((idx * 16) % 70)),
          y: t.map_coordinates?.y ?? (20 + (Math.floor(idx / 5) * 15) % 65),
          map_coordinates: t.map_coordinates || { x: 15 + ((idx * 16) % 70), y: 20 + (Math.floor(idx / 5) * 15) % 65 },
          size: t.size,
          price_sek: t.price_sek,
          power_included: t.power_included,
          booked_by_name: t.booked_by_vendor?.business_name
        }));
        await api.saveEventMarketLayout(layout);
      }

      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
      setSelectedEventForMapModal(null);
      showNotification('success', updated.floor_plan_image_url 
        ? `Floorplan blueprint & ${tables.length} tables saved for "${updated.title}"!`
        : `Smart stall directory (${tables.length} tables) saved for "${updated.title}"! (No map)`
      );
    } catch (err: any) {
      console.error('Failed to save tables from modal:', err);
      showNotification('error', 'Failed to save tables and floor plan.');
    }
  };

  const handleRemoveMapOptionFromEvent = async (event: OrganizedEvent) => {
    try {
      const updated: OrganizedEvent = {
        ...event,
        floor_plan_image_url: ''
      };
      await api.saveOrganizedEvent(updated);
      const layout = await api.getEventMarketLayout(event.id);
      if (layout) {
        layout.map_image_url = '';
        layout.floor_plan_image_url = '';
        await api.saveEventMarketLayout(layout);
      }
      setEvents(prev => prev.map(e => e.id === event.id ? updated : e));
      showNotification('success', `Map option removed from "${event.title}". Event now operates in Numbered Stall Directory mode.`);
    } catch (err) {
      console.error('Failed to remove map option:', err);
      showNotification('error', 'Failed to remove map option.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      showNotification('error', 'Please enter an event title.');
      return;
    }
    if (!formData.start_date) {
      showNotification('error', 'Please specify a start date.');
      return;
    }
    if (!formData.location_name?.trim()) {
      showNotification('error', 'Please enter the venue / location name.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await api.saveOrganizedEvent(formData);
      showNotification('success', `Event "${saved.title}" saved successfully!`);
      setIsFormOpen(false);
      await loadEvents();
    } catch (err: any) {
      console.error('Failed to save event:', err);
      showNotification('error', err?.message || 'Failed to save event.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteOrganizedEvent(deleteTarget.id);
      showNotification('success', `Event "${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      await loadEvents();
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      showNotification('error', 'Could not delete event.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleFeatured = async (event: OrganizedEvent) => {
    try {
      const updated = { ...event, is_featured: !event.is_featured };
      await api.saveOrganizedEvent(updated);
      setEvents(prev => prev.map(e => e.id === event.id ? updated : e));
      showNotification('success', `Featured state updated for "${event.title}"`);
    } catch (err) {
      console.error('Failed to toggle featured:', err);
      showNotification('error', 'Failed to update featured status.');
    }
  };

  const handleStatusChange = async (event: OrganizedEvent, newStatus: OrganizedEvent['status']) => {
    try {
      const updated = { ...event, status: newStatus };
      await api.saveOrganizedEvent(updated);
      setEvents(prev => prev.map(e => e.id === event.id ? updated : e));
      showNotification('success', `Event marked as ${newStatus}`);
    } catch (err) {
      console.error('Failed to change status:', err);
      showNotification('error', 'Failed to update status.');
    }
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.tagline && e.tagline.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || e.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [events, searchTerm, selectedCategory, selectedStatus]);

  // Stats
  const stats = useMemo(() => {
    const total = events.length;
    const upcoming = events.filter(e => e.status === 'UPCOMING').length;
    const featured = events.filter(e => e.is_featured).length;
    const cities = new Set(events.map(e => e.city)).size;
    return { total, upcoming, featured, cities };
  }, [events]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Top Header ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 transition-colors mr-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
              </Link>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800">
                Official Events
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Organized Events Management
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl">
              Create, curate, and publish major expos, fairs, and celebrations hosted directly by Creative Events Nordic. Events are showcased directly on the Home page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/bookings"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              <Store className="w-4 h-4" /> Vendor Bookings
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Home className="w-4 h-4 text-slate-500" /> View Home Page
            </Link>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-sky-600/25 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add New Event
            </button>
          </div>
        </div>

        {/* ── Notification Banner ───────────────────────────────────────────── */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl flex items-center justify-between text-sm font-semibold shadow-md ${
                notification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                )}
                <span>{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats Overview ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Events</p>
              <p className="text-2xl font-black text-slate-900">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upcoming</p>
              <p className="text-2xl font-black text-slate-900">{stats.upcoming}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Featured</p>
              <p className="text-2xl font-black text-slate-900">{stats.featured}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Cities</p>
              <p className="text-2xl font-black text-slate-900">{stats.cities}</p>
            </div>
          </div>
        </div>

        {/* ── Toolbar & Filters ─────────────────────────────────────────────── */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by event title, city, or venue..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-400 px-2 font-medium">Category:</span>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-transparent font-bold text-slate-700 outline-none pr-2 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {EVENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-400 px-2 font-medium">Status:</span>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-transparent font-bold text-slate-700 outline-none pr-2 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="SOLD_OUT">Sold Out</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Events Grid / List ────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 flex flex-col items-center justify-center gap-4 shadow-sm">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
            <p className="text-sm font-bold text-slate-500">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No events found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {searchTerm || selectedCategory !== 'ALL' || selectedStatus !== 'ALL'
                ? 'Try adjusting your search criteria or filters.'
                : 'No organized events published yet. Click "Add New Event" to publish your first showcase.'}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> Add Event Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => {
              const statusColors: Record<string, { bg: string; text: string }> = {
                UPCOMING: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Upcoming' },
                ONGOING: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Ongoing' },
                COMPLETED: { bg: 'bg-slate-100 text-slate-600 border-slate-200', text: 'Completed' },
                SOLD_OUT: { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Sold Out' }
              };
              const statusBadge = statusColors[event.status] || statusColors.UPCOMING;

              return (
                <div
                  key={event.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Image banner */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Top badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-black/60 text-white backdrop-blur-md">
                        {event.category}
                      </span>
                      <button
                        onClick={() => handleToggleFeatured(event)}
                        title={event.is_featured ? 'Remove from Featured on Home' : 'Feature on Home'}
                        className={`p-1.5 rounded-lg text-xs font-bold backdrop-blur-md transition-all flex items-center gap-1 ${
                          event.is_featured
                            ? 'bg-amber-400 text-amber-950 shadow-md'
                            : 'bg-black/40 text-white hover:bg-black/60'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${event.is_featured ? 'fill-amber-950' : ''}`} />
                        <span className="text-[10px] uppercase font-black">{event.is_featured ? 'Featured' : 'Feature'}</span>
                      </button>
                    </div>

                    {/* Bottom date and status in banner */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 backdrop-blur-md">
                          {event.start_date}
                        </span>
                        {event.time && (
                          <span className="text-[11px] opacity-80 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {event.time}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${statusBadge.bg}`}>
                        {statusBadge.text}
                      </span>
                    </div>
                  </div>

                  {/* Body info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-sky-600 font-bold">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{event.location_name}, {event.city}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug line-clamp-2">
                        {event.title}
                      </h3>
                      {event.tagline && (
                        <p className="text-xs text-slate-500 font-medium line-clamp-2">
                          {event.tagline}
                        </p>
                      )}
                    </div>

                    {/* Price and capacity badges */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {event.price || 'Free Entry'}
                      </span>
                      {event.capacity && (
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {event.capacity}
                        </span>
                      )}
                    </div>

                    {/* Highlights tags */}
                    {event.highlights && event.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {event.highlights.slice(0, 2).map((h, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md font-medium truncate max-w-[180px]"
                          >
                            ✓ {h}
                          </span>
                        ))}
                        {event.highlights.length > 2 && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-medium">
                            +{event.highlights.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Map Image Status Indicator */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                      {event.floor_plan_image_url ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedEventForMapModal(event)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition-all shadow-sm"
                            title="Click to view or edit floorplan layout map and tables"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Blueprint Attached</span>
                            <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.2 rounded-md">
                              {event.vendor_tables?.length || 24} Stalls
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveMapOptionFromEvent(event)}
                            className="px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition-all text-[10px]"
                            title="Remove map option from this event (use stall directory only)"
                          >
                            Remove Map
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedEventForMapModal(event)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold transition-all shadow-sm"
                          title="Manage numbered stall booths and pricing (no map needed)"
                        >
                          <Store className="w-3.5 h-3.5 text-amber-600" />
                          <span>Stalls Directory Only</span>
                          <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded-md font-mono">
                            {event.vendor_tables?.length || 0} Stalls
                          </span>
                        </button>
                      )}
                      <span className="text-slate-400 font-mono text-[10px]">
                        {event.vendor_tables ? `${event.vendor_tables.filter(t => t.status === 'AVAILABLE').length} Open` : 'Direct Select'}
                      </span>
                    </div>

                    {/* Actions toolbar */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreviewEvent(event)}
                          className="p-2 rounded-xl text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="Quick Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedEventForMapModal(event)}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                          title="Add / Edit Map Image & Position Tables for Vendors"
                        >
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Map & Stalls</span>
                        </button>
                        <Link
                          to={`/admin/bookings?view=layout&eventId=${event.id}`}
                          className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                          title="Configure Market Floorplan & Table Numbers"
                        >
                          <Map className="w-3.5 h-3.5 text-sky-600" />
                          <span>Floorplan</span>
                        </Link>
                        <Link
                          to={`/admin/bookings?eventId=${event.id}`}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                          title="Manage Vendor Bookings for this Event"
                        >
                          <Store className="w-3.5 h-3.5 text-amber-700" />
                          <span>Bookings</span>
                        </Link>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          value={event.status}
                          onChange={e => handleStatusChange(event, e.target.value as OrganizedEvent['status'])}
                          className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 outline-none cursor-pointer"
                        >
                          <option value="UPCOMING">Upcoming</option>
                          <option value="ONGOING">Ongoing</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="SOLD_OUT">Sold Out</option>
                        </select>

                        <button
                          onClick={() => openEditModal(event)}
                          className="p-2 rounded-xl text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="Edit Event"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(event)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CREATE / EDIT MODAL ───────────────────────────────────────────── */}
        <AnimatePresence>
          {isFormOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-y-auto">
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={() => !isSaving && setIsFormOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-3xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 z-10"
              >
                <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-5 border-b border-slate-100 flex items-center justify-between z-20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        {formData.id ? 'Edit Organized Event' : 'Create New Organized Event'}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Enter details to publish on the Creative Events showcase and Home page.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    disabled={isSaving}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">

                  {/* 1. Title & Tagline */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title || ''}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Nordic Grand Wedding & Bridal Showcase 2026"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Tagline / Short Summary
                      </label>
                      <input
                        type="text"
                        value={formData.tagline || ''}
                        onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                        placeholder="e.g. Sweden's premier gathering of luxury bridal designers, florist masters, and caterers."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* 2. Category, Status, Featured */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Category
                      </label>
                      <select
                        value={formData.category || 'Bridal & Wedding Fair'}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold bg-white"
                      >
                        {EVENT_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Status
                      </label>
                      <select
                        value={formData.status || 'UPCOMING'}
                        onChange={e => setFormData({ ...formData, status: e.target.value as OrganizedEvent['status'] })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold bg-white"
                      >
                        <option value="UPCOMING">Upcoming</option>
                        <option value="ONGOING">Ongoing</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="SOLD_OUT">Sold Out</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!formData.is_featured}
                          onChange={e => setFormData({ ...formData, is_featured: e.target.checked })}
                          className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-xs font-bold text-slate-800">Feature on Home Page</span>
                      </label>
                    </div>
                  </div>

                  {/* 3. Dates & Timing */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.start_date || ''}
                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={formData.end_date || formData.start_date || ''}
                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Daily Time
                      </label>
                      <input
                        type="text"
                        value={formData.time || ''}
                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                        placeholder="e.g. 11:00 - 18:00"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* 4. Location Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city || 'Stockholm'}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Stockholm"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Venue / Location Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.location_name || ''}
                        onChange={e => setFormData({ ...formData, location_name: e.target.value })}
                        placeholder="e.g. Münchenbryggeriet Event Hall"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={formData.address || ''}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="e.g. Torkel Knutssonsgatan 2, 118 25 Stockholm"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* 5. Cover Image & Presets */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Cover Image URL or File Upload
                    </label>

                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={formData.image_url || ''}
                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                      <label className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                        {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-sky-600" /> : <Upload className="w-4 h-4 text-sky-600" />}
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileUpload}
                          disabled={isUploadingImage}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Preview image */}
                    {formData.image_url && (
                      <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
                        <img
                          src={formData.image_url}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Quick presets */}
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Quick Preset Photos
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {PRESET_EVENT_IMAGES.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormData({ ...formData, image_url: preset.url })}
                            className={`group relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                              formData.image_url === preset.url ? 'border-sky-600 ring-2 ring-sky-500/30' : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                            title={preset.name}
                          >
                            <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 text-center">
                              <span className="text-[9px] text-white font-bold leading-tight">{preset.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 5.1 Event Floorplan & Layout Map Image (for Vendor Table Selection) */}
                  <div className="space-y-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/25">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Map className="w-4 h-4 text-amber-600" />
                          Event Floorplan & Layout Map Image
                        </label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Upload the venue blueprint or arena floorplan image. Vendors will inspect this layout to select their preferred table / stall number.
                        </p>
                      </div>

                      {formData.id && (
                        <button
                          type="button"
                          onClick={() => {
                            const ev = events.find(e => e.id === formData.id) || (formData as OrganizedEvent);
                            setSelectedEventForMapModal(ev);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all shrink-0"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          Open Map & Table Editor
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={formData.floor_plan_image_url || ''}
                        onChange={e => setFormData({ ...formData, floor_plan_image_url: e.target.value })}
                        placeholder="https://images.unsplash.com/... or paste floorplan image URL"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                      />
                      <label className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm shrink-0">
                        {isUploadingMapImage ? <Loader2 className="w-4 h-4 animate-spin text-amber-700" /> : <Upload className="w-4 h-4 text-amber-700" />}
                        <span>Upload Blueprint</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMapImageFileUpload}
                          disabled={isUploadingMapImage}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Preview map image */}
                    {formData.floor_plan_image_url && (
                      <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden border border-amber-300 shadow-md bg-slate-950 group">
                        <img
                          src={formData.floor_plan_image_url}
                          alt="Venue Floorplan Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[0.5px]" />
                        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/20">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          Venue Map Image Attached • Vendors can select tables on this layout
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, floor_plan_image_url: '' })}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 text-white hover:bg-rose-600 transition-colors"
                          title="Remove map image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Quick map presets */}
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Layout Blueprint Presets
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {DEFAULT_MAP_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormData({ ...formData, floor_plan_image_url: preset.url })}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                              formData.floor_plan_image_url === preset.url
                                ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <img src={preset.url} alt={preset.name} className="w-12 h-10 object-cover rounded-lg shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{preset.name}</p>
                              <p className="text-[10px] text-slate-400">Click to use layout</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 6. Pricing, Capacity & Ticketing */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Price / Entry Fee
                      </label>
                      <input
                        type="text"
                        value={formData.price || ''}
                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                        placeholder="e.g. Free Entry or 150 SEK"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Attendee Capacity
                      </label>
                      <input
                        type="text"
                        value={formData.capacity || ''}
                        onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                        placeholder="e.g. 600 Attendees"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        External Ticket Link
                      </label>
                      <input
                        type="url"
                        value={formData.ticket_url || ''}
                        onChange={e => setFormData({ ...formData, ticket_url: e.target.value })}
                        placeholder="https://billetto.se/e/..."
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* 7. Contact & RSVP info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Registration / RSVP Email
                      </label>
                      <input
                        type="email"
                        value={formData.registration_email || ''}
                        onChange={e => setFormData({ ...formData, registration_email: e.target.value })}
                        placeholder="sandy@creativeventsnordic.com"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        value={formData.registration_phone || ''}
                        onChange={e => setFormData({ ...formData, registration_phone: e.target.value })}
                        placeholder="+46 70 123 45 67"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* 8. Highlights List */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Event Highlights / Features (Key Bullets)
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={highlightInput}
                        onChange={e => setHighlightInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddHighlight();
                          }
                        }}
                        placeholder="e.g. Over 50 curated Nordic wedding specialists"
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddHighlight}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                      >
                        Add Bullet
                      </button>
                    </div>

                    {formData.highlights && formData.highlights.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {formData.highlights.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                          >
                            <span className="text-slate-700 font-medium flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              {item}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveHighlight(idx)}
                              className="text-slate-400 hover:text-rose-500 transition-colors ml-2"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 9. Full Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Full Description & Program Details
                    </label>
                    <textarea
                      rows={5}
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed overview of what visitors will experience, runway schedule, masterclasses, and perks..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setIsFormOpen(false)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-sky-600/25 transition-all"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Event...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{formData.id ? 'Save Changes' : 'Publish Event'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────────────── */}
        <AnimatePresence>
          {deleteTarget && (
            <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => !isDeleting && setDeleteTarget(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-4 z-10"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Delete Organized Event?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to remove <span className="font-bold text-slate-800">"{deleteTarget.title}"</span>? This will unpublish the event from the Home page and marketplace.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    disabled={isDeleting}
                    onClick={() => setDeleteTarget(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-600/25 transition-all"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── PREVIEW MODAL ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {previewEvent && (
            <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 overflow-y-auto">
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setPreviewEvent(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-3xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 z-10 overflow-hidden"
              >
                {/* Header image */}
                <div className="relative aspect-[16/9] w-full">
                  <img
                    src={previewEvent.image_url}
                    alt={previewEvent.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <button
                    onClick={() => setPreviewEvent(null)}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white hover:bg-black/80 flex items-center justify-center backdrop-blur-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-4 left-6 right-6 text-white space-y-1">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-500 text-white">
                      {previewEvent.category}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {previewEvent.title}
                    </h2>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="flex items-center gap-1.5 text-sky-600">
                      <Calendar className="w-4 h-4" /> {previewEvent.start_date} {previewEvent.end_date && previewEvent.end_date !== previewEvent.start_date ? `to ${previewEvent.end_date}` : ''}
                    </span>
                    {previewEvent.time && (
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-4 h-4" /> {previewEvent.time}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="w-4 h-4 text-sky-600" /> {previewEvent.location_name}, {previewEvent.city}
                    </span>
                  </div>

                  {previewEvent.tagline && (
                    <p className="text-sm font-semibold text-slate-700 italic border-l-4 border-sky-500 pl-3">
                      "{previewEvent.tagline}"
                    </p>
                  )}

                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {previewEvent.description}
                  </p>

                  {previewEvent.highlights && previewEvent.highlights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Event Highlights</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {previewEvent.highlights.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admission</p>
                      <p className="text-base font-black text-slate-900">{previewEvent.price || 'Free Entry'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setPreviewEvent(null);
                          openEditModal(previewEvent);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                      >
                        Edit This Event
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── INTERACTIVE TABLE & MAP BLUEPRINT MODAL ──────────────────────── */}
        {selectedEventForMapModal && (
          <AdminTableMapModal
            isOpen={true}
            onClose={() => setSelectedEventForMapModal(null)}
            event={selectedEventForMapModal}
            onSaveTables={handleSaveTablesFromModal}
          />
        )}

      </div>
    </div>
  );
};

export default AdminOrganizedEvents;
