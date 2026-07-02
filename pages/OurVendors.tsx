import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { Vendor, VendorCategory, VendorStatus } from '../types';
import { AVAILABLE_LOCATIONS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, MapPin, Star, BadgeCheck, ChevronRight, ChevronDown,
  Shield, Lock, Tag, Zap, Heart, MoreHorizontal,
  Camera, Utensils, Headphones, Flower2, Mic2, Crown
} from 'lucide-react';

interface OurVendorsProps {
  vendors: Vendor[];
}

// Top categories (same as JoinMarketplace for consistency)
const TOP_CATEGORIES = [
  { label: 'All', icon: MoreHorizontal, cat: 'All', tKey: 'search.all' },
  { label: 'Venues', icon: MapPin, cat: 'Venues', tKey: 'categories.Venues' },
  { label: 'Catering', icon: Utensils, cat: 'Catering', tKey: 'categories.Catering' },
  { label: 'Photography', icon: Camera, cat: 'Photography', tKey: 'categories.Photography' },
  { label: 'DJs', icon: Headphones, cat: 'Music', tKey: 'categories.Music' },
  { label: 'Decor & Styling', icon: Flower2, cat: 'Decor', tKey: 'categories.Decor' },
  { label: 'Entertainment', icon: Mic2, cat: 'Kids Entertainment', tKey: 'categories.Kids Entertainment' },
];

// Trust badges
const TRUST_BADGES = [
  { icon: Shield, label: 'Verified Vendors', desc: 'Every vendor is verified for your trust.', tLabel: 'ourVendorsPage.badgeVerified', tDesc: 'ourVendorsPage.badgeVerifiedDesc' },
  { icon: Lock, label: 'Secure Platform', desc: 'Bank-level security you can trust.', tLabel: 'ourVendorsPage.badgeSecure', tDesc: 'ourVendorsPage.badgeSecureDesc' },
  { icon: Zap, label: 'Quality Leads', desc: 'Connect with clients who are ready to book.', tLabel: 'ourVendorsPage.badgeLeads', tDesc: 'ourVendorsPage.badgeLeadsDesc' },
];

// Sort options
const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'name', label: 'Name (A–Z)' },
];

const VENDORS_PER_PAGE = 12;

const OurVendors: React.FC<OurVendorsProps> = ({ vendors }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const routerLocation = useLocation();

  const [category, setCategory] = useState<string>(searchParams.get('category') || 'All');
  const [location, setLocation] = useState<string>(searchParams.get('location') || 'All');
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState('popular');
  const [visibleCount, setVisibleCount] = useState(VENDORS_PER_PAGE);
  const [likedVendors, setLikedVendors] = useState<Set<string>>(new Set());

  useEffect(() => {
    const cat = searchParams.get('category');
    const loc = searchParams.get('location');
    if (cat) setCategory(cat);
    if (loc) setLocation(loc);
  }, [searchParams]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(VENDORS_PER_PAGE);
  }, [category, location, search, minRating, sortBy]);

  const toggleLike = (e: React.MouseEvent, vendorId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedVendors(prev => {
      const next = new Set(prev);
      next.has(vendorId) ? next.delete(vendorId) : next.add(vendorId);
      return next;
    });
  };

  const filteredVendors = vendors.filter(v => {
    const hasServices = v.services && v.services.length > 0;
    const matchesCat = category === 'All' ||
      (hasServices && v.services.some(s => s.category === category));
    const matchesLoc = location === 'All' ||
      v.applicationLocation === location ||
      (hasServices && v.services.some(s => s.location === location));
    const matchesSearch = (v.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (hasServices && v.services.some(s =>
        (s.description?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (s.category?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (s.packages?.some(p =>
          (p.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
          (p.description?.toLowerCase() || '').includes(search.toLowerCase())
        ) || false)
      )) ||
      (v.applicationStory?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesRating = v.rating >= minRating;
    return matchesCat && matchesLoc && matchesSearch && matchesRating && v.status === VendorStatus.APPROVED;
  });

  // Sort vendors
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    // popular: featured first, then by rating
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return (b.rating || 0) - (a.rating || 0);
  });

  const visibleVendors = sortedVendors.slice(0, visibleCount);
  const hasMore = visibleCount < sortedVendors.length;

  const categories = ['All', ...Object.values(VendorCategory)];

  // Get badge for vendor
  const getVendorBadge = (vendor: Vendor, idx: number): { label: string; color: string; bg: string } | null => {
    if (vendor.isFeatured) return { label: 'POPULAR', color: '#f97316', bg: 'rgba(249,115,22,0.18)' };
    return null;
  };

  // Get simulated review count (deterministic based on vendor id/name)
  const getReviewCount = (vendor: Vendor): number => {
    const seed = vendor.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return 20 + (seed % 180);
  };

  return (
    <div className="w-full bg-white overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════════════
          HERO — dark full-bleed with background image + search bar
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden" style={{ background: '#0d0d14' }}>

        {/* Background photo */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1510076857177-7470076d4098?auto=format&fit=crop&q=80&w=1800')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
            opacity: 0.38,
          }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(13,13,20,0.72) 0%, rgba(13,13,20,0.55) 50%, rgba(13,13,20,0.90) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-10">

          {/* Headline */}
          <div className="max-w-2xl mb-6">
            <h1
              className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-white leading-[1.15] mb-2"
              style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '-0.02em' }}
            >
              {t('ourVendorsPage.titleLine1')}<br />
              {t('ourVendorsPage.titleLine2')}<span style={{ color: '#0284c7' }}>.</span>
            </h1>
            <p className="text-white/60 text-sm sm:text-base font-light leading-relaxed">
              {t('ourVendorsPage.sub')}
            </p>
          </div>

          {/* Search bar */}
          <div
            className="flex flex-col sm:flex-row gap-3 items-stretch p-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}
          >
            {/* Search input */}
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('ourVendorsPage.searchPlaceholder')}
                className="w-full pl-11 pr-4 py-[11px] text-sm rounded-xl outline-none text-slate-700 placeholder-slate-400"
                style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Category */}
            <div className="relative sm:w-44 flex-shrink-0">
              <select
                className="w-full appearance-none pl-4 pr-8 py-[11px] text-sm rounded-xl outline-none text-slate-700 cursor-pointer"
                style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'All' ? t('search.all') : t(`categories.${c}`)}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>
            {/* Location */}
            <div className="relative sm:w-44 flex-shrink-0">
              <select
                className="w-full appearance-none pl-4 pr-8 py-[11px] text-sm rounded-xl outline-none text-slate-700 cursor-pointer"
                style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}
                value={location}
                onChange={e => setLocation(e.target.value)}
              >
                <option value="All">{t('search.allLocations')}</option>
                {AVAILABLE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>
            {/* Rating */}
            <div className="relative sm:w-36 flex-shrink-0">
              <select
                className="w-full appearance-none pl-4 pr-8 py-[11px] text-sm rounded-xl outline-none text-slate-700 cursor-pointer"
                style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}
                value={minRating}
                onChange={e => setMinRating(Number(e.target.value))}
              >
                <option value={0}>{t('search.anyRating')}</option>
                <option value={4}>{t('search.fourPlus')}</option>
                <option value={4.5}>{t('search.fourHalfPlus')}</option>
                <option value={4.8}>4.8+ Stars</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>
            {/* Search button */}
            <button
              id="vendors-search-btn"
              className="flex items-center justify-center gap-2 px-6 py-[11px] rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 2px 12px rgba(2,132,199,0.35)' }}
            >
              <Search className="w-4 h-4" /> {t('ourVendorsPage.searchButton')}
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TOP CATEGORIES
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-8 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {t('ourVendorsPage.topCategories')}
            </h2>
            <Link
              to="/explore"
              className="flex items-center gap-1 text-sm font-semibold transition-colors text-sky-600 hover:text-sky-700"
            >
              {t('ourVendorsPage.viewAllCategories')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
            {TOP_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.cat || (cat.cat === 'All' && category === 'All');
              return (
                <button
                  key={cat.label}
                  onClick={() => setCategory(cat.cat)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 focus:outline-none hover:shadow-sm"
                  style={{
                    border: isActive ? '1.5px solid #0284c7' : '1.5px solid #e8ecf0',
                    background: isActive ? 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)' : '#ffffff',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: isActive ? '#e0f2fe' : '#f8fafc' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: isActive ? '#0284c7' : '#0ea5e9' }} />
                  </div>
                  <span
                    className="text-[11px] font-semibold text-center leading-tight"
                    style={{ color: isActive ? '#0284c7' : '#4b5563' }}
                  >
                    {t(cat.tKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          VENDOR GRID
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">

          {/* Grid header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
            <div>
              <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {t('ourVendorsPage.title')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {t('ourVendorsPage.showing')
                  .replace('{current}', String(Math.min(visibleCount, sortedVendors.length)))
                  .replace('{total}', String(sortedVendors.length))}
              </p>
            </div>
          </div>

          {/* Grid */}
          {visibleVendors.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {visibleVendors.map((vendor, idx) => {
                  const activeService = vendor.services?.find(s => {
                    const catMatch = category === 'All' || s.category === category;
                    const locMatch = location === 'All' || s.location === location;
                    return catMatch && locMatch;
                  }) || vendor.services?.[0];

                  const imageUrl = activeService?.imageUrl || vendor.applicationImageUrl || vendor.services?.[0]?.imageUrl;
                  const badge = getVendorBadge(vendor, idx);
                  const displayCategory = activeService?.category || vendor.services?.[0]?.category || '';
                  const displayDescription = activeService?.description || vendor.applicationStory || '';

                  // Get distinct locations from services that have packages
                  const servicesWithPackages = vendor.services?.filter(s => s.packages && s.packages.length > 0) || [];
                  const packageLocations = Array.from(new Set(servicesWithPackages.map(s => s.location).filter(Boolean)));
                  const displayLocationText = packageLocations.length > 0
                    ? packageLocations.join(', ')
                    : (vendor.applicationLocation || vendor.services?.[0]?.location || '');

                  return (
                    <Link
                      key={vendor.id}
                      to={`/vendors/${vendor.id}`}
                      state={{ history: [routerLocation.pathname + routerLocation.search] }}
                      className="group block focus:outline-none"
                    >
                      <div className="flex flex-col h-full bg-white transition-all duration-200">
                        {/* Image */}
                        <div className="relative aspect-[3/2] overflow-hidden bg-slate-100 rounded-3xl mb-3">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              alt={vendor.name}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100">
                              <Crown className="w-10 h-10 text-sky-300" />
                            </div>
                          )}

                          {/* Badge top-left */}
                          {badge && (
                            <div
                              className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg"
                              style={{ background: badge.bg, backdropFilter: 'blur(8px)' }}
                            >
                              <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: badge.color }}>
                                🔥 {badge.label}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="flex-1 flex flex-col px-1">
                          {/* Category Badge Wrapper to align names perfectly */}
                          <div className="h-7 mb-2 flex items-center">
                            {displayCategory ? (
                              <span className="inline-block bg-sky-50 text-sky-600 text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase">
                                {displayCategory}
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-extrabold px-2.5 py-1 select-none opacity-0">
                                Placeholder
                              </span>
                            )}
                          </div>

                          {/* Name + Rating star replaced by verification badge */}
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <h3
                              className="text-lg font-bold text-slate-900 leading-snug group-hover:text-sky-600 transition-colors line-clamp-1"
                              style={{ fontFamily: "'Montserrat', sans-serif" }}
                            >
                              {vendor.name}
                            </h3>
                            {vendor.verified && (
                              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider flex-shrink-0 mt-0.5 border border-emerald-100/50" title="Verified Vendor">
                                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/10 stroke-[2.5]" />
                                <span>{language === 'sv' ? 'Verifierad' : 'Verified'}</span>
                              </div>
                            )}
                          </div>

                          {/* Location with Pin icon */}
                          {displayLocationText && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-auto font-medium">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="line-clamp-1">{displayLocationText}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    id="load-more-vendors-btn"
                    onClick={() => setVisibleCount(prev => prev + VENDORS_PER_PAGE)}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 hover:shadow-md active:scale-95"
                    style={{ border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151' }}
                  >
                    {t('ourVendorsPage.loadMore')} <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-24 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#f0f9ff' }}>
                <Search className="w-7 h-7" style={{ color: '#0284c7' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {t('ourVendorsPage.noVendorsTitle')}
              </h3>
              <p className="text-slate-400 text-sm mb-6">{t('ourVendorsPage.noVendorsSub')}</p>
              <button
                onClick={() => { setCategory('All'); setLocation('All'); setSearch(''); setMinRating(0); }}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}
              >
                {t('ourVendorsPage.clearFilters')}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CTA BANNER — Are you a vendor?
      ══════════════════════════════════════════════════════════════ */}
      {!user && (
        <section className="py-6 px-5 sm:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-5 px-7 py-5 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #0284c7 50%, #0369a1 100%)',
                boxShadow: '0 8px 32px rgba(2,132,199,0.35)',
              }}
            >
              {/* Icon + text */}
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-base" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {t('ourVendorsPage.ctaTitle')}
                  </p>
                  <p className="text-white/65 text-sm font-light">
                    {t('ourVendorsPage.ctaSub')}
                  </p>
                </div>
              </div>
              {/* CTA button */}
              <Link
                to="/join"
                id="become-vendor-banner-btn"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-slate-900 transition-all duration-200 hover:scale-[1.03] active:scale-95 flex-shrink-0 whitespace-nowrap"
                style={{ background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
              >
                {t('ourVendorsPage.ctaButton')} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TRUST BADGES
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-10 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {TRUST_BADGES.map((badge) => {
              const Icon = badge.icon;
              return (
                <div key={badge.label} className="flex flex-col items-center gap-3 text-center">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ border: '1.5px solid #e0f2fe', background: '#f0f9ff' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: '#0284c7' }} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{t(badge.tLabel)}</p>
                    <p className="text-slate-400 text-xs mt-0.5 leading-snug max-w-[240px] mx-auto">{t(badge.tDesc)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default OurVendors;
