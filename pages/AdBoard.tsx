import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, X, Loader2, MessageSquare, MapPin,
  Calendar, Tag, ChevronRight, ArrowLeft,
  RefreshCw, Lock, Unlock, Eye, Send, Clock, CheckCircle2,
  SlidersHorizontal, Megaphone, Trash2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ad, AdReply, VendorCategory } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../supabaseClient';
import AdReplyChat from '../components/AdReplyChat';

// All category values from the VendorCategory enum
const CATEGORIES = Object.values(VendorCategory);

function timeAgo(dateStr: string, t: (key: string) => string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return t('adBoard.timeAgoJustNow');
  if (diff < 3600) return `${Math.floor(diff / 60)}${t('adBoard.timeAgoM')}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t('adBoard.timeAgoH')}`;
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
  const { t } = useLanguage();
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
      setError(t('adBoard.errorOptimize'));
      return;
    }
    setError('');
    setIsOptimizing(true);
    try {
      const optimized = await api.optimizeDescription(title.trim());
      setDescription(optimized);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (t('adBoard.optimizingDetails') + ' Failed.'));
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
      setError(t('adBoard.errorRequired'));
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
            <h2 className="text-2xl font-light text-slate-900">{t('adBoard.postRequest')}</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">{t('adBoard.modalSubtitle')}</p>
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
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('adBoard.modalUserName')}</label>
            <input
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all font-semibold text-slate-800"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('adBoard.modalTitleLabel')}</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('adBoard.modalTitlePlaceholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('adBoard.modalDescriptionLabel')}</label>
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
                    <span>{t('adBoard.optimizingDetails')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('adBoard.optimizeWithAI')}</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('adBoard.modalDescriptionPlaceholder')}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all resize-none font-medium text-slate-700"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('adBoard.categoryLabel')}</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as VendorCategory)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all cursor-pointer"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{t('categories.' + c)}</option>)}
            </select>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {/* Budget */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('adBoard.budgetElement')}</label>
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('adBoard.location')}</label>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Stockholm"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
              />
            </div>

            {/* Event Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('adBoard.eventDate')}</label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all cursor-pointer"
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
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> {t('adBoard.modalPostBtn')}</>}
          </button>
          <button onClick={onClose} className="px-8 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all">
            {t('adBoard.cancelBtn')}
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
  const { t, language } = useLanguage();
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
                <span>{t('adBoard.postedBy')} <span className="font-semibold text-slate-600">{ad.user_name}</span></span>
                {isAdmin && ad.user_email && (
                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase font-mono border border-amber-100/50">
                    {ad.user_email}
                  </span>
                )}
                <span>· {timeAgo(ad.created_at, t)}</span>
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
                    <Lock className="w-3.5 h-3.5" /> {t('adBoard.closeAd')}
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" /> {t('adBoard.reopenAd')}
                  </>
                )}
              </button>

              {showDeleteConfirm ? (
                <div className="flex items-center gap-1.5 border border-red-200 bg-red-50/50 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider">{t('adBoard.deleteConfirm')}</span>
                  <button
                    onClick={handleDeleteAd}
                    disabled={isDeleting}
                    className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : t('adBoard.yes')}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    {t('adBoard.no')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isUpdatingStatus || isDeleting}
                  className="px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t('adBoard.deleteAd')}
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
                {t('adBoard.budget')}: <span className="font-semibold">{formatBudget(ad.budget)}</span>
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
                {new Date(ad.event_date).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
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
                  {t('adBoard.privateReply')}
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
                      <ArrowLeft className="w-3.5 h-3.5" /> {t('adBoard.allReplies')}
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
                      {t('adBoard.vendorReplies')} ({vendorThreads.length})
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
                        <p className="text-sm text-slate-400 font-medium">{t('adBoard.noRepliesYet')}</p>
                        <p className="text-xs text-slate-300 mt-1">{t('adBoard.vendorsReplyPrivately')}</p>
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
                                       {vUnread} {t('adBoard.newBadge')}
                                     </span>
                                   )}
                                 </p>
                                 <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                                   {replyCountByVendor(vendor.sender_id)} {replyCountByVendor(vendor.sender_id) === 1 ? t('adBoard.messagesCount') : t('adBoard.messagesCountPlural')}
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
              <h4 className="text-lg font-semibold text-slate-700 mb-2">{t('adBoard.viewingRequest')}</h4>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                {t('adBoard.onlyVendorsReply')}
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
  const { t } = useLanguage();
  const isAdmin = user?.role === 'ADMIN';
  const isOwner = currentUserId && ad.user_id === currentUserId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full bg-white rounded-2xl flex flex-col gap-0 relative overflow-hidden group"
      style={{ border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* Card body — clickable area */}
      <button onClick={onClick} className="text-left flex flex-col gap-3.5 p-5 flex-1 focus:outline-none">
        {/* Top badge row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {/* Category badge — violet */}
            <span
              className="inline-flex items-center gap-1 px-2.5 py-[5px] text-[10px] font-bold uppercase tracking-wider rounded-lg"
              style={{ background: '#ede9fe', color: '#6D28D9' }}
            >
              <Tag className="w-2.5 h-2.5" />
              {ad.category}
            </span>
            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-[5px] text-[10px] font-bold uppercase tracking-wider rounded-lg ${
                ad.status === 'OPEN'
                  ? 'text-emerald-700'
                  : 'text-slate-500'
              }`}
              style={{ background: ad.status === 'OPEN' ? '#d1fae5' : '#f1f5f9' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: ad.status === 'OPEN' ? '#10b981' : '#94a3b8' }}
              />
              {ad.status}
            </span>
            {isOwner && (
              <span className="inline-flex items-center gap-1 px-2.5 py-[5px] bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                {t('adBoard.yourPost')}
              </span>
            )}
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-[5px] bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg">
                <MessageSquare className="w-2.5 h-2.5" /> {unreadCount} {t('adBoard.newBadge')}
              </span>
            )}
          </div>
        </div>

        {/* Title + description */}
        <div className="space-y-1.5">
          <h3
            className="text-[15px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {ad.title}
          </h3>
          <p className="text-[13px] text-slate-400 line-clamp-2 leading-relaxed font-light">{ad.description}</p>
        </div>

        {/* Meta row: budget • location • date */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {ad.budget && (
            <span className="text-[13px] font-bold" style={{ color: '#0284c7' }}>
              {formatBudget(ad.budget)}
            </span>
          )}
          {ad.location && (
            <span className="flex items-center gap-1 text-[12px] text-slate-400 font-medium">
              <MapPin className="w-3 h-3" style={{ color: '#0ea5e9' }} />
              {ad.location}
            </span>
          )}
          {ad.event_date && (
            <span className="flex items-center gap-1 text-[12px] text-slate-400 font-medium">
              <Calendar className="w-3 h-3" style={{ color: '#0ea5e9' }} />
              {new Date(ad.event_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      </button>

      {/* Footer — always visible */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderTop: '1px solid #f1f5f9' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}
          >
            {(ad.user_name || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="text-[12px] text-slate-600 font-semibold truncate max-w-[130px]">{ad.user_name || 'User'}</span>
          {isAdmin && ad.user_email && (
            <span className="text-[10px] font-semibold text-amber-700 font-mono">{ad.user_email}</span>
          )}
        </div>
        <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
          <Clock className="w-3 h-3" />
          {timeAgo(ad.created_at, t)}
        </span>
      </div>
    </motion.div>
  );
};

/* ─── Main AdBoard Page ──────────────────────────────────────────────────── */
const AdBoard: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
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

  const [visibleAdCount, setVisibleAdCount] = React.useState(9);
  const visibleAds = filteredAds.slice(0, visibleAdCount);
  const hasMoreAds = visibleAdCount < filteredAds.length;

  return (
    <div className="w-full bg-white overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 60%, #bae6fd 100%)', minHeight: '220px' }}>
        {/* Background image — right half */}
        <div className="absolute inset-y-0 right-0 hidden lg:block" style={{ width: '52%', zIndex: 0 }}>
          <img
            src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=85&w=900"
            alt="Event decoration"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(224,242,254,1) 0%, rgba(224,242,254,0.7) 18%, rgba(224,242,254,0.2) 40%, transparent 65%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(224,242,254,0.4) 100%)' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-10 pb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

            {/* LEFT — title */}
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 4px 16px rgba(2,132,199,0.35)' }}>
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#0ea5e9' }}>{t('adBoard.publicBoard')}</p>
              </div>
              <h1
                className="text-4xl sm:text-5xl font-bold text-slate-900 leading-[1.1] mb-3"
                style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '-0.02em' }}
              >
                {t('adBoard.title')}
              </h1>
              <p className="text-slate-500 text-base font-light leading-relaxed max-w-md">
                {t('adBoard.subtitle')}
              </p>
            </div>

            {/* RIGHT — sign-in prompt card OR post button */}
            {!user ? (
              <div
                className="flex-shrink-0 w-full sm:w-auto lg:max-w-xs p-3.5 rounded-xl flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.8)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f0f9ff' }}>
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" style={{ color: '#0ea5e9' }} />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-800">{t('adBoard.haveAccount')}</p>
                  <p className="text-slate-500 font-medium">
                    <a href="#/login" className="font-bold hover:text-sky-600 transition-colors" style={{ color: '#0284c7' }}>
                      {language === 'sv' ? 'Logga in' : 'Sign in'}
                    </a>{' '}
                    {language === 'sv' ? 'för att skapa en förfrågan' : 'to post a request'}
                  </p>
                </div>
              </div>
            ) : user.role === 'USER' ? (
              <button
                onClick={() => setShowPostModal(true)}
                className="flex-shrink-0 flex items-center gap-2 px-7 py-4 rounded-2xl text-sm font-bold text-white transition-all hover:brightness-110 hover:scale-[1.03] active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 6px 24px rgba(2,132,199,0.4)' }}
              >
                <Plus className="w-4 h-4" /> {t('adBoard.postRequest')}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-8">

        {/* ── Filter bar ─────────────────────────────────────────────── */}
        <div
          className="flex flex-col sm:flex-row gap-3 items-stretch mb-7 p-3 rounded-2xl"
          style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          {/* Search */}
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('adBoard.searchPlaceholder')}
              className="w-full pl-11 pr-4 py-[11px] text-sm rounded-xl outline-none text-slate-700 placeholder-slate-400"
              style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}
            />
          </div>

          {/* Category dropdown */}
          <div className="relative sm:w-44 flex-shrink-0">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full appearance-none pl-4 pr-8 py-[11px] text-sm rounded-xl outline-none text-slate-700 cursor-pointer"
              style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}
            >
              <option value="">{t('adBoard.allCategories')}</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{t('categories.' + c)}</option>)}
            </select>
            <ChevronRight className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90" />
          </div>

          {/* Budget / any budget placeholder */}
          <div className="relative sm:w-36 flex-shrink-0">
            <select
              className="w-full appearance-none pl-4 pr-8 py-[11px] text-sm rounded-xl outline-none text-slate-700 cursor-pointer"
              style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}
              defaultValue=""
            >
              <option value="">{t('adBoard.anyBudget')}</option>
              <option value="5000">{t('adBoard.budgetUpTo').replace('{amount}', '5 000')}</option>
              <option value="10000">{t('adBoard.budgetUpTo').replace('{amount}', '10 000')}</option>
              <option value="25000">{t('adBoard.budgetUpTo').replace('{amount}', '25 000')}</option>
              <option value="50000">{t('adBoard.budgetUpTo').replace('{amount}', '50 000')}</option>
            </select>
            <ChevronRight className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90" />
          </div>

          {/* All / Open / Closed tabs */}
          <div className="flex rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1px solid #e8ecf0', background: '#f8fafc' }}>
            {(['ALL', 'OPEN', 'CLOSED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-4 py-[11px] text-[11px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: statusFilter === s ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : 'transparent',
                  color: statusFilter === s ? '#ffffff' : '#94a3b8',
                }}
              >
                {s === 'ALL' ? (language === 'sv' ? 'Alla' : 'All') :
                 s === 'OPEN' ? (language === 'sv' ? 'Öppna' : 'Open') :
                 (language === 'sv' ? 'Stängda' : 'Closed')}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => loadAds(true)}
            disabled={isRefreshing}
            className="flex-shrink-0 w-10 h-10 self-center rounded-xl flex items-center justify-center transition-all hover:bg-sky-50"
            style={{ border: '1px solid #e8ecf0', background: '#f8fafc', color: '#0ea5e9' }}
            title={language === 'sv' ? 'Uppdatera' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Clear button */}
          {(searchTerm || selectedCategory || statusFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory(''); setStatusFilter('ALL'); }}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
            >
              <X className="w-3 h-3" /> {language === 'sv' ? 'Rensa' : 'Clear'}
            </button>
          )}
        </div>

        {/* Results count */}
        <p className="text-[12px] font-bold text-slate-500 mb-6">
          {isLoading ? t('adBoard.loading') :
           language === 'sv'
             ? `${filteredAds.length} annonsförfrågningar`
             : `${filteredAds.length} Ad Request${filteredAds.length !== 1 ? 's' : ''}`}
        </p>

        {/* ── Grid ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0ea5e9' }} />
              <p className="text-sm text-slate-400 font-medium">{t('adBoard.loadingRequests')}</p>
            </div>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: '#f0f9ff' }}>
              <Megaphone className="w-7 h-7" style={{ color: '#0ea5e9' }} />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              {searchTerm || selectedCategory || statusFilter !== 'ALL' ? t('adBoard.noMatchingRequests') : t('adBoard.noRequestsYet')}
            </h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
              {user?.role === 'USER'
                ? t('adBoard.beFirst')
                : t('adBoard.checkBackSoon')}
            </p>
            {user?.role === 'USER' && (
              <button
                onClick={() => setShowPostModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 4px 16px rgba(2,132,199,0.35)' }}
              >
                <Plus className="w-4 h-4" /> {t('adBoard.postRequest')}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleAds.map(ad => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  onClick={() => setSelectedAd(ad)}
                  currentUserId={user?.id}
                  unreadCount={unreadCounts[ad.id] || 0}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMoreAds && (
              <div className="mt-10 flex justify-center">
                <button
                  id="load-more-ads-btn"
                  onClick={() => setVisibleAdCount(prev => prev + 9)}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 hover:shadow-md active:scale-95"
                  style={{ border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151' }}
                >
                  {t('adBoard.loadMore')}
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              </div>
            )}
          </>
        )}

        {/* ── CTA Banner ─────────────────────────────────────────────── */}
        {(!user || user.role === 'USER') && (
          <div
            className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-5 px-7 py-5 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #0369a1 50%, #0284c7 100%)',
              boxShadow: '0 8px 32px rgba(2,132,199,0.35)',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-base" style={{ fontFamily: "'Montserrat', sans-serif" }}>{t('adBoard.cantFind')}</p>
                <p className="text-white/65 text-sm font-light">{t('adBoard.ctaSubtitle')}</p>
              </div>
            </div>
            {user?.role === 'USER' ? (
              <button
                id="cta-post-request-btn"
                onClick={() => setShowPostModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-[1.03] active:scale-95 flex-shrink-0 whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 4px 16px rgba(2,132,199,0.4)' }}
              >
                {t('adBoard.postRequest')} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <a
                href="#/login"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-[1.03] active:scale-95 flex-shrink-0 whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 4px 16px rgba(2,132,199,0.4)' }}
              >
                {t('adBoard.signInToPostBtn')} <ChevronRight className="w-4 h-4" />
              </a>
            )}
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
