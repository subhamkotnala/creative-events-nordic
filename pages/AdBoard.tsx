import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, X, Loader2, MessageSquare, MapPin,
  Calendar, DollarSign, Tag, ChevronRight, ArrowLeft,
  RefreshCw, Lock, Unlock, Eye, Send, Clock, CheckCircle2,
  SlidersHorizontal, Megaphone, Trash2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ad, AdReply, VendorCategory } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import AdReplyChat from '../components/AdReplyChat';

// All category values from the VendorCategory enum
const CATEGORIES = Object.values(VendorCategory);

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatBudget(budget?: number) {
  if (!budget) return null;
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(budget);
}

/* ─── Post Ad Modal (USER only) ─────────────────────────────────────────── */
interface PostAdModalProps {
  onClose: () => void;
  onPosted: (ad: Ad) => void;
}

const PostAdModal: React.FC<PostAdModalProps> = ({ onClose, onPosted }) => {
  const { user, updateUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [userName, setUserName] = useState(user?.name && !user.name.includes('@') ? user.name : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimizeDescription = async () => {
    if (!title.trim()) {
      setError('Please Enter a Request Title first so AI can use it to optimize.');
      return;
    }
    setError('');
    setIsOptimizing(true);
    try {
      const optimized = await api.optimizeDescription(title.trim());
      setDescription(optimized);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to optimize description with AI. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  React.useEffect(() => {
    if (user?.name && !user.name.includes('@') && !userName) {
      setUserName(user.name);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !userName.trim()) {
      setError('Title, description and user name are required.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      if (user && userName.trim() && userName.trim() !== user.name) {
        await updateUser({
          ...user,
          name: userName.trim()
        });
      }
      const ad = await api.createAd({
        title: title.trim(),
        description: description.trim(),
        category,
        budget: budget ? parseFloat(budget) : undefined,
        location: location.trim() || undefined,
        event_date: eventDate || undefined,
      });
      onPosted({ ...ad, user_name: userName.trim() });
    } catch (err: any) {
      setError(err?.message || 'Failed to post request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Modal header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-slate-50">
          <div>
            <h2 className="text-2xl font-light text-slate-900">Post a Request</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Vendors will reply privately to your request</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* User Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your User Name *</label>
            <input
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all font-semibold text-slate-800"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Request Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Looking for a wedding photographer in Stockholm"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description *</label>
              <button
                type="button"
                onClick={handleOptimizeDescription}
                disabled={isOptimizing || !title.trim()}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  title.trim() 
                    ? 'hover:bg-gradient-to-r hover:from-sky-500 hover:to-sky-600 hover:text-white hover:border-sky-500 text-sky-600 border-sky-100 bg-sky-50/50 shadow-sm' 
                    : 'text-slate-400 border-slate-100 bg-slate-50 cursor-not-allowed'
                }`}
                title={title.trim() ? "Generate high-quality details from your title using AI" : "Enter a title first to use AI"}
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                    <span>Optimizing Details...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Optimize with AI</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what you're looking for, your event details, preferences, etc."
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all resize-none font-medium text-slate-700"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as VendorCategory)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {/* Budget */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Budget (SEK)</label>
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="e.g. 1500"
                min="0"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</label>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Stockholm"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
              />
            </div>

            {/* Event Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Event Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
              />
            </div>
          </div>
        </form>

        <div className="px-8 py-6 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-sky-600 text-white font-bold py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-sky-500 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Post Request</>}
          </button>
          <button onClick={onClose} className="px-8 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ─── Ad Detail / Reply Panel ────────────────────────────────────────────── */
interface AdDetailPanelProps {
  ad: Ad;
  currentUserId: string;
  currentUserRole: 'USER' | 'VENDOR' | 'ADMIN';
  currentUserName: string;
  onClose: () => void;
  onStatusChange?: (newStatus: 'OPEN' | 'CLOSED') => void;
  onDeleteAd?: () => void;
}

const AdDetailPanel: React.FC<AdDetailPanelProps> = ({
  ad,
  currentUserId,
  currentUserRole,
  currentUserName,
  onClose,
  onStatusChange,
  onDeleteAd,
}) => {
  const isOwner = ad.user_id === currentUserId;
  const isVendor = currentUserRole === 'VENDOR';
  const isAdmin = currentUserRole === 'ADMIN';

  // For ad owner (USER): list of vendor threads
  const [vendorThreads, setVendorThreads] = useState<{ sender_id: string; sender_name: string }[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [replies, setReplies] = useState<AdReply[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleAdStatus = async () => {
    setIsUpdatingStatus(true);
    try {
      const newStatus = ad.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      await api.updateAdStatus(ad.id, newStatus);
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    } catch (err) {
      console.error('Failed to update ad status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteAd = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAd(ad.id);
      if (onDeleteAd) {
        onDeleteAd();
      }
    } catch (err) {
      console.error('Failed to delete ad:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!isOwner && !isAdmin) return;
    setIsLoadingVendors(true);
    api.getAdReplyVendors(ad.id).then(vendors => {
      setVendorThreads(vendors);
      setIsLoadingVendors(false);
    });
  }, [ad.id, isOwner, isAdmin]);

  // Track reply counts
  useEffect(() => {
    api.getAdReplies(ad.id).then(setReplies);
  }, [ad.id]);

  const replyCountByVendor = (vendorId: string) =>
    replies.filter(r => r.sender_id === vendorId).length;

  const unreadCountByVendor = (vendorId: string) =>
    replies.filter(r => r.sender_id === vendorId && r.sender_role === 'VENDOR' && !r.is_read).length;

  return (
    <div className="fixed inset-0 z-[90] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative ml-auto w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-sky-50/60 to-slate-50">
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all mt-0.5 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-100 text-sky-700 text-[9px] font-bold uppercase tracking-widest rounded-full">
                  <Tag className="w-2.5 h-2.5" />{ad.category}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full ${
                  ad.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {ad.status === 'OPEN' ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                  {ad.status}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug break-words">{ad.title}</h3>
              <p className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                <span>Posted by <span className="font-semibold text-slate-600">{ad.user_name}</span></span>
                {isAdmin && ad.user_email && (
                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase font-mono border border-amber-100/50">
                    {ad.user_email}
                  </span>
                )}
                <span>· {timeAgo(ad.created_at)}</span>
              </p>
            </div>
          </div>

          {(isOwner || isAdmin) && (
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0 w-full sm:w-auto justify-start sm:justify-end pl-11 sm:pl-0 mt-2 sm:mt-0 flex-wrap">
              <button
                onClick={toggleAdStatus}
                disabled={isUpdatingStatus || isDeleting}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border flex items-center gap-1.5 ${
                  ad.status === 'OPEN'
                    ? 'border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50'
                    : 'border-green-200 text-green-600 bg-green-50/50 hover:bg-green-50'
                } disabled:opacity-50 shadow-sm`}
              >
                {isUpdatingStatus ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : ad.status === 'OPEN' ? (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Close Ad
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" /> Reopen Ad
                  </>
                )}
              </button>

              {showDeleteConfirm ? (
                <div className="flex items-center gap-1.5 border border-red-200 bg-red-50/50 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider">Delete?</span>
                  <button
                    onClick={handleDeleteAd}
                    disabled={isDeleting}
                    className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isUpdatingStatus || isDeleting}
                  className="px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Ad
                </button>
              )}
            </div>
          )}
        </div>

        {/* Ad details */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <p className="text-sm text-slate-600 leading-relaxed">{ad.description}</p>
          <div className="flex flex-wrap gap-4 mt-3">
            {ad.budget && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                Budget: <span className="font-semibold">{formatBudget(ad.budget)}</span>
              </span>
            )}
            {ad.location && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-sky-500" />
                {ad.location}
              </span>
            )}
            {ad.event_date && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-sky-500" />
                {new Date(ad.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Reply area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* VENDOR: single reply thread */}
          {isVendor && !isOwner && (
            <div className="flex-1 overflow-hidden">
              <div className="px-6 py-3 border-b border-slate-100 bg-white flex-shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Your private reply to this request
                </p>
              </div>
              <div className="flex-1" style={{ height: 'calc(100% - 48px)' }}>
                <AdReplyChat
                  adId={ad.id}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  displayName={currentUserName}
                  filterSenderId={currentUserId}
                  readOnly={ad.status === 'CLOSED'}
                />
              </div>
            </div>
          )}

          {/* USER (owner) or ADMIN: vendor thread list → or selected thread */}
          {(isOwner || isAdmin) && (
            <>
              {selectedVendorId ? (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => setSelectedVendorId(null)}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> All Replies
                    </button>
                    <span className="text-slate-300">|</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
                      {vendorThreads.find(v => v.sender_id === selectedVendorId)?.sender_name || 'Vendor'}
                    </span>
                  </div>
                  <div className="flex-1" style={{ minHeight: 0 }}>
                    <AdReplyChat
                      adId={ad.id}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                      displayName={vendorThreads.find(v => v.sender_id === selectedVendorId)?.sender_name || 'Vendor'}
                      filterSenderId={selectedVendorId}
                      readOnly={ad.status === 'CLOSED' || isAdmin}
                      isAdmin={isAdmin}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <div className="px-6 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                      Vendor Replies ({vendorThreads.length})
                    </p>
                    {isLoadingVendors ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                      </div>
                    ) : vendorThreads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mb-3">
                          <MessageSquare className="w-6 h-6 text-sky-300" />
                        </div>
                        <p className="text-sm text-slate-400 font-medium">No vendor replies yet</p>
                        <p className="text-xs text-slate-300 mt-1">Vendors will reply privately to your request</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {vendorThreads.map(vendor => {
                          const vUnread = unreadCountByVendor(vendor.sender_id);
                          return (
                            <button
                              key={vendor.sender_id}
                              onClick={() => setSelectedVendorId(vendor.sender_id)}
                              className="w-full flex items-center gap-3 px-4 py-4 bg-slate-50 hover:bg-sky-50 rounded-2xl border border-slate-100 hover:border-sky-200 transition-all group text-left"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                                {vendor.sender_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-sky-700 transition-colors flex items-center justify-between">
                                  <span>{vendor.sender_name}</span>
                                  {vUnread > 0 && (
                                    <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                                      {vUnread} new
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                                  {replyCountByVendor(vendor.sender_id)} message{replyCountByVendor(vendor.sender_id) !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Guest / non-owner USER: read-only ad info, no replies */}
          {!isVendor && !isOwner && !isAdmin && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
              <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center mb-4">
                <Eye className="w-7 h-7 text-sky-300" />
              </div>
              <h4 className="text-lg font-semibold text-slate-700 mb-2">Viewing Request</h4>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                Only vendors can send private replies to this request. If you're a vendor,{' '}
                <span className="text-sky-600 font-medium">sign in with your vendor account</span>.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

/* ─── Ad Card ────────────────────────────────────────────────────────────── */
interface AdCardProps {
  ad: Ad;
  onClick: () => void;
  currentUserId?: string;
  unreadCount?: number;
}

const AdCard: React.FC<AdCardProps> = ({ ad, onClick, currentUserId, unreadCount = 0 }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isOwner = currentUserId && ad.user_id === currentUserId;
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full text-left bg-white rounded-[2rem] border border-slate-150/70 shadow-[0_4px_24px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)] hover:border-sky-300 transition-all duration-300 group p-6 md:p-7 flex flex-col gap-4 relative overflow-hidden"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-sky-50 text-sky-700 text-[10px] font-semibold uppercase tracking-wider rounded-xl border border-sky-100/50">
            <Tag className="w-3 h-3 text-sky-500" />
            {ad.category}
          </span>
          <span className={`inline-flex items-center gap-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-xl border ${
            ad.status === 'OPEN' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' 
              : 'bg-slate-50 text-slate-500 border-slate-100'
          }`}>
            {ad.status === 'OPEN' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-slate-400" />}
            {ad.status}
          </span>
          {isOwner && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-semibold uppercase tracking-wider rounded-xl border border-amber-100/50">
              Your Post
            </span>
          )}
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl border border-red-500">
              <MessageSquare className="w-3 h-3 text-white" />
              {unreadCount} New
            </span>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h3 className="text-base md:text-lg font-bold text-slate-800 group-hover:text-sky-700 transition-colors leading-snug line-clamp-2">
          {ad.title}
        </h3>
        <p className="text-xs md:text-sm text-slate-400 line-clamp-2 leading-relaxed font-light">{ad.description}</p>
      </div>

      {/* Meta / Badges Row */}
      <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
        {ad.budget && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-lg text-emerald-700 font-bold text-[11px] tracking-wide border border-emerald-100/60 shadow-sm shadow-emerald-50/50">
            {formatBudget(ad.budget)}
          </div>
        )}
        {ad.location && (
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-500 font-medium">
            <MapPin className="w-3 h-3 text-slate-400" />
            {ad.location}
          </div>
        )}
        {ad.event_date && (
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-500 font-medium">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>
              {new Date(ad.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100/80 pt-4 mt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-400 to-slate-600 flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm ring-2 ring-white">
            {(ad.user_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-600 font-bold truncate max-w-[150px]">{ad.user_name || 'User'}</span>
            {isAdmin && ad.user_email && (
              <span className="text-[10px] font-semibold text-amber-700 font-mono">{ad.user_email}</span>
            )}
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-full">
          <Clock className="w-3 h-3 text-slate-400" />
          {timeAgo(ad.created_at)}
        </span>
      </div>
    </motion.button>
  );
};

/* ─── Main AdBoard Page ──────────────────────────────────────────────────── */
const AdBoard: React.FC = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const loadAds = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await api.getAds();
      setAds(data);

      if (user) {
        const counts = await api.getUnreadAdReplies();
        setUnreadCounts(counts);
      } else {
        setUnreadCounts({});
      }
    } catch (err) {
      console.error('Failed to load ads:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  // Realtime refresh when new ads are inserted
  useEffect(() => {
    const channel = supabase
      .channel('ads-board-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ads' }, () => {
        loadAds(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAds]);

  // Realtime update on new replies or seen messages
  useEffect(() => {
    if (!user) return;
    const updateCounts = async () => {
      try {
        const counts = await api.getUnreadAdReplies();
        setUnreadCounts(counts);
      } catch (err) {
        console.error('Failed to update unread counts:', err);
      }
    };

    const channel = supabase
      .channel('ad-replies-board-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_replies' }, () => {
        updateCounts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filteredAds = ads.filter(ad => {
    const matchSearch =
      !searchTerm ||
      ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ad.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !selectedCategory || ad.category === selectedCategory;
    const matchStatus = statusFilter === 'ALL' || ad.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const handlePosted = (ad: Ad) => {
    setAds(prev => [{ ...ad, user_name: user?.name || 'You' }, ...prev]);
    setShowPostModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/40 via-slate-50 to-slate-50">
      {/* Hero Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-sky-600 rounded-2xl shadow-lg shadow-sky-200">
                  <Megaphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-500">Public Board</p>
                  <h1 className="text-3xl font-light text-slate-900 tracking-tight">Ad Requests</h1>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
                Need help planning an event? Tell us what you're looking for and let vendors reach out.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => loadAds(true)}
                disabled={isRefreshing}
                className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              {user?.role === 'USER' && (
                <button
                  onClick={() => setShowPostModal(true)}
                  className="flex items-center gap-2 bg-sky-600 text-white px-6 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-sky-500 transition-all shadow-lg shadow-sky-200"
                >
                  <Plus className="w-4 h-4" /> Post a Request
                </button>
              )}
              {!user && (
                <p className="text-[11px] text-slate-400 font-medium">
                  <a href="#/login" className="text-sky-600 hover:underline font-semibold">Sign in</a> to post a request
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 mb-8 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search requests..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
            />
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Status toggle */}
          <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
            {(['ALL', 'OPEN', 'CLOSED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  statusFilter === s
                    ? 'bg-white shadow-sm text-sky-700'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Clear */}
          {(searchTerm || selectedCategory || statusFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory(''); setStatusFilter('ALL'); }}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-5 px-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {isLoading ? 'Loading...' : `${filteredAds.length} request${filteredAds.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Loading requests...</p>
            </div>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center mb-5">
              <Megaphone className="w-9 h-9 text-sky-200" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              {searchTerm || selectedCategory || statusFilter !== 'ALL' ? 'No matching requests' : 'No requests yet'}
            </h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              {user?.role === 'USER'
                ? 'Be the first to post a request and get replies from vendors!'
                : 'Check back soon or adjust your filters.'}
            </p>
            {user?.role === 'USER' && (
              <button
                onClick={() => setShowPostModal(true)}
                className="mt-6 flex items-center gap-2 bg-sky-600 text-white px-6 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-sky-500 transition-all shadow-lg shadow-sky-200"
              >
                <Plus className="w-4 h-4" /> Post a Request
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAds.map(ad => (
              <AdCard
                key={ad.id}
                ad={ad}
                onClick={() => setSelectedAd(ad)}
                currentUserId={user?.id}
                unreadCount={unreadCounts[ad.id] || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Post Ad Modal */}
      <AnimatePresence>
        {showPostModal && (
          <PostAdModal
            onClose={() => setShowPostModal(false)}
            onPosted={handlePosted}
          />
        )}
      </AnimatePresence>

      {/* Ad Detail / Reply Panel */}
      <AnimatePresence>
        {selectedAd && (
          <AdDetailPanel
            ad={selectedAd}
            currentUserId={user?.id || ''}
            currentUserRole={user?.role || 'USER'}
            currentUserName={user?.name || 'You'}
            onClose={() => setSelectedAd(null)}
            onStatusChange={(newStatus) => {
              setSelectedAd(prev => prev ? { ...prev, status: newStatus } : null);
              loadAds(true);
            }}
            onDeleteAd={() => {
              setSelectedAd(null);
              loadAds(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdBoard;
