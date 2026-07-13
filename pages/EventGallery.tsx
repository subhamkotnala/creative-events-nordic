import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Upload, Trash2, Loader2, ImageIcon, ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GalleryPhoto } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/* ─── Lightbox ────────────────────────────────────────────────────────────── */
interface LightboxProps {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}
const Lightbox: React.FC<LightboxProps> = ({ photos, index, onClose, onPrev, onNext }) => {
  const photo = photos[index];
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      <button onClick={onClose} className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
        <X className="w-5 h-5 text-white" />
      </button>
      <button onClick={onPrev} className="absolute left-4 z-10 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button onClick={onNext} className="absolute right-4 z-10 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
      <AnimatePresence mode="wait">
        <motion.div
          key={photo.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 max-w-5xl w-full mx-4"
        >
          <img
            src={photo.url}
            alt={photo.caption || 'Event photo'}
            className="w-full max-h-[80vh] object-contain rounded-2xl"
            referrerPolicy="no-referrer"
          />
          {(photo.caption || photo.location) && (
            <div className="mt-3 text-center">
              {photo.caption && <p className="text-white font-semibold text-base">{photo.caption}</p>}
              {photo.location && (
                <p className="text-white/60 text-sm flex items-center justify-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" /> {photo.location}
                </p>
              )}
            </div>
          )}
          <p className="text-white/40 text-xs text-center mt-2">{index + 1} / {photos.length}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* ─── Upload Modal (Admin only) ───────────────────────────────────────────── */
interface UploadModalProps {
  onClose: () => void;
  onUploaded: (photo: GalleryPhoto) => void;
}
const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploaded }) => {
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUploading(true);
    try {
      let finalUrl = '';
      if (mode === 'file') {
        if (!file) { setError('Please select a file.'); setIsUploading(false); return; }
        finalUrl = await api.uploadGalleryFile(file);
      } else {
        if (!urlInput.trim()) { setError('Please enter an image URL.'); setIsUploading(false); return; }
        finalUrl = urlInput.trim();
      }
      const photo = await api.addGalleryPhoto({ url: finalUrl, caption: caption || undefined, location: location || undefined });
      onUploaded(photo);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-sky-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Gallery Photo</h2>
            <p className="text-xs text-slate-400 mt-0.5">Upload a file or paste an image URL</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            {(['file', 'url'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="flex-1 py-2.5 text-sm font-semibold transition-all"
                style={{
                  background: mode === m ? '#0284c7' : '#f8fafc',
                  color: mode === m ? '#ffffff' : '#64748b',
                }}
              >
                {m === 'file' ? '📁 Upload File' : '🔗 Paste URL'}
              </button>
            ))}
          </div>

          {mode === 'file' ? (
            <div
              className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-sky-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8 text-sky-500" />
                  <p className="text-sm font-semibold text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-slate-300" />
                  <p className="text-sm text-slate-500">Click to select an image</p>
                  <p className="text-xs text-slate-400">JPG, PNG, WEBP up to 10MB</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Image URL</label>
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Caption</label>
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="e.g. Wedding Reception"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Stockholm"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', boxShadow: '0 4px 16px rgba(2,132,199,0.35)' }}
          >
            {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Add to Gallery</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

/* ─── Main EventGallery Page ──────────────────────────────────────────────── */
const PHOTOS_PER_PAGE = 12;

const EventGallery: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PHOTOS_PER_PAGE);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const loadPhotos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getGalleryPhotos();
      setPhotos(data);
    } catch (err) {
      console.error('Failed to load gallery photos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const handleDelete = async (id: string) => {
    setDeleteError('');
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await api.deleteGalleryPhoto(id);
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      console.error('Failed to delete:', err);
      setDeleteError(err?.message || 'Delete failed. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const visiblePhotos = photos.slice(0, visibleCount);
  const hasMore = visibleCount < photos.length;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-16 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse at center, #0284c7 0%, transparent 70%)' }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-block px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-sky-300 border border-sky-500/30 bg-sky-500/10 mb-6">
            Our Events
          </span>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            A Glimpse Into Unforgettable<br />
            <span style={{ color: '#38bdf8' }}>Celebrations</span>
          </h1>
          <p className="text-white/60 text-base font-light leading-relaxed">
            Real moments, real emotions — captured at events planned through Creative Events.
          </p>
        </div>
      </section>

      {/* ── Admin toolbar ───────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="bg-sky-50 border-b border-sky-100 px-5 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-sky-700">
              Admin Mode — {photos.length} photo{photos.length !== 1 ? 's' : ''} in gallery
            </p>
            <button
              id="upload-gallery-photo-btn"
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', boxShadow: '0 2px 12px rgba(2,132,199,0.3)' }}
            >
              <Plus className="w-4 h-4" /> Upload Photo
            </button>
          </div>
        </div>
      )}

      {/* ── Gallery Grid ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Loading gallery...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mb-5">
              <ImageIcon className="w-7 h-7 text-sky-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>No photos yet</h3>
            <p className="text-slate-400 text-sm mb-6">
              {isAdmin ? 'Click "Upload Photo" above to add the first photo.' : 'Check back soon — photos are coming!'}
            </p>
          </div>
        ) : (
          <>
            {isAdmin && deleteError && (
              <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center justify-between gap-3">
                <span>{deleteError}</span>
                <button onClick={() => setDeleteError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
              </div>
            )}
            {/* Masonry-style 3-column grid */}
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {visiblePhotos.map((photo, idx) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: (idx % 6) * 0.06 }}
                  className="relative break-inside-avoid group rounded-2xl overflow-hidden cursor-pointer"
                  style={{ border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                  onClick={() => setLightboxIndex(idx)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Event photo'}
                    referrerPolicy="no-referrer"
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ display: 'block' }}
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100">
                    {photo.caption && (
                      <p className="text-white font-bold text-sm leading-snug">{photo.caption}</p>
                    )}
                    {photo.location && (
                      <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {photo.location}
                      </p>
                    )}
                  </div>

                  {/* Admin delete button — always visible, no hover required */}
                  {isAdmin && (
                    <div className="absolute top-2 right-2 z-10" onClick={e => e.stopPropagation()}>
                      {confirmDeleteId === photo.id ? (
                        /* Inline confirm row */
                        <div className="flex items-center gap-1 px-2 py-1 rounded-xl" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)' }}>
                          <span className="text-[10px] font-bold text-white">Delete?</span>
                          <button
                            onClick={() => handleDelete(photo.id)}
                            disabled={deletingId === photo.id}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {deletingId === photo.id ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/20 text-white hover:bg-white/30 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(photo.id)}
                          disabled={deletingId === photo.id}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                          style={{ background: 'rgba(239,68,68,0.92)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                          title="Delete photo"
                        >
                          {deletingId === photo.id
                            ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5 text-white" />
                          }
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  id="load-more-gallery-btn"
                  onClick={() => setVisibleCount(prev => prev + PHOTOS_PER_PAGE)}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:shadow-md active:scale-95"
                  style={{ border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151' }}
                >
                  Load More Photos <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            photos={visiblePhotos}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex(i => (i! - 1 + visiblePhotos.length) % visiblePhotos.length)}
            onNext={() => setLightboxIndex(i => (i! + 1) % visiblePhotos.length)}
          />
        )}
      </AnimatePresence>

      {/* ── Upload Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onUploaded={photo => setPhotos(prev => [photo, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventGallery;
