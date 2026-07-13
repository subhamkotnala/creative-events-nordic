
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { Vendor, VendorService, VendorCategory, VendorStatus } from '../types';
import { AVAILABLE_LOCATIONS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Search, MapPin, Star, BadgeCheck, ChevronRight, ChevronDown,
  Heart, MoreHorizontal, Camera, Utensils, Headphones, Flower2, Mic2,
  Crown
} from 'lucide-react';
import emailjs from '@emailjs/browser';

interface ExploreProps {
  vendors: Vendor[];
}

interface FlattenedService {
  vendor: Vendor;
  service: VendorService;
}

// Top categories
const TOP_CATEGORIES = [
  { label: 'All', icon: MoreHorizontal, cat: 'All' },
  { label: 'Venues', icon: MapPin, cat: 'Venues' },
  { label: 'Catering', icon: Utensils, cat: 'Catering' },
  { label: 'Photography', icon: Camera, cat: 'Photography' },
  { label: 'DJs', icon: Headphones, cat: 'Music' },
  { label: 'Decor & Styling', icon: Flower2, cat: 'Decor' },
  { label: 'Entertainment', icon: Mic2, cat: 'Kids Entertainment' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const SERVICES_PER_PAGE = 12;

// Get badge for a service/vendor
const getServiceBadge = (vendor: Vendor, idx: number): { label: string; color: string; bg: string } | null => {
  if (vendor.verified || vendor.rating >= 4.8) return { label: 'TOP RATED', color: '#fbbf24', bg: 'rgba(251,191,36,0.18)' };
  if (vendor.isFeatured) return { label: 'POPULAR', color: '#f97316', bg: 'rgba(249,115,22,0.18)' };
  return null;
};

// Deterministic review count from vendor id
const getReviewCount = (vendor: Vendor): number => {
  const seed = vendor.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return 20 + (seed % 180);
};

// Get lowest package price
const getLowestPrice = (service: VendorService): number | null => {
  if (!service.packages || service.packages.length === 0) return null;
  const prices = service.packages.map(p => p.price).filter(p => p > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
};

const Explore: React.FC<ExploreProps> = ({ vendors }) => {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const routerLocation = useLocation();

  const [category, setCategory] = useState<string>(searchParams.get('category') || 'All');
  const [location, setLocation] = useState<string>(searchParams.get('location') || 'All');
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState<number>(0);
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [sortBy, setSortBy] = useState('popular');
  const [visibleCount, setVisibleCount] = useState(SERVICES_PER_PAGE);
  const [likedServices, setLikedServices] = useState<Set<string>>(new Set());

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [contactForm, setContactForm] = useState({
    vision: '',
    email: '',
    phone: '',
    capacity: '',
    eventDate: '',
    category: ''
  });

  // Pre-populate category when filter category changes
  useEffect(() => {
    if (category !== 'All') {
      setContactForm(prev => ({ ...prev, category }));
    } else {
      setContactForm(prev => ({ ...prev, category: '' }));
    }
  }, [category]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_fcxafes",
        import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID || "template_cqrzyss",
        {
          message: contactForm.vision,
          user_email: contactForm.email,
          user_phone: contactForm.phone || 'Not provided',
          user_capacity: contactForm.capacity || 'Not provided',
          event_date: contactForm.eventDate || 'Not provided',
          category: contactForm.category || 'Not specified'
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "xaAogphDl0s4ydiOa"
      );
      setFormSubmitted(true);
      setContactForm({ vision: '', email: '', phone: '', capacity: '', eventDate: '', category: category !== 'All' ? category : '' });
      setTimeout(() => setFormSubmitted(false), 5000);
    } catch (error) {
      console.error("Failed to send contact form:", error);
      alert("Could not send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    const cat = searchParams.get('category');
    const loc = searchParams.get('location');
    const cap = searchParams.get('minCapacity');
    if (cat) setCategory(cat);
    if (loc) setLocation(loc);
    if (cap) setMinCapacity(Number(cap));
  }, [searchParams]);

  // Reset visible count when filters/sort change
  useEffect(() => {
    setVisibleCount(SERVICES_PER_PAGE);
  }, [category, location, search, minRating, minCapacity, sortBy]);

  const toggleLike = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedServices(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Flatten the services so they act as individual items in the marketplace
  const allServices: FlattenedService[] = vendors
    .filter(v => v.status === VendorStatus.APPROVED && v.services && v.services.length > 0)
    .flatMap(v => v.services.map(s => ({ vendor: v, service: s })));

  const filteredServices = allServices.filter(({ vendor, service }) => {
    const matchesCat = category === 'All' || service.category === category;
    const matchesLoc = location === 'All' || service.location === location || vendor.applicationLocation === location;
    const matchesSearch = !search ||
      (service.description?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (service.category?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (service.packages?.some(p =>
        (p.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (p.description?.toLowerCase() || '').includes(search.toLowerCase())
      ) || false) ||
      (vendor.name?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesRating = vendor.rating >= minRating;
    const matchesCapacity = minCapacity === 0 ||
      (service.count !== undefined && service.count >= minCapacity) ||
      (service.packages?.some(p => p.capacity !== undefined && p.capacity >= minCapacity) || false);
    return matchesCat && matchesLoc && matchesSearch && matchesRating && matchesCapacity;
  });

  // Sort
  const sortedServices = [...filteredServices].sort((a, b) => {
    if (sortBy === 'rating') return (b.vendor.rating || 0) - (a.vendor.rating || 0);
    if (sortBy === 'price_asc') {
      const pa = getLowestPrice(a.service) ?? Infinity;
      const pb = getLowestPrice(b.service) ?? Infinity;
      return pa - pb;
    }
    if (sortBy === 'price_desc') {
      const pa = getLowestPrice(a.service) ?? 0;
      const pb = getLowestPrice(b.service) ?? 0;
      return pb - pa;
    }
    // popular: featured vendors first, then by rating
    if (a.vendor.isFeatured && !b.vendor.isFeatured) return -1;
    if (!a.vendor.isFeatured && b.vendor.isFeatured) return 1;
    return (b.vendor.rating || 0) - (a.vendor.rating || 0);
  });

  const visibleServices = sortedServices.slice(0, visibleCount);
  const hasMore = visibleCount < sortedServices.length;
  const categories = ['All', ...Object.values(VendorCategory)];

  return (
    <div className="w-full bg-white overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════════════
          HERO — light split layout, text left, full background image right
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="w-full relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 60%, #bae6fd 100%)', minHeight: '280px' }}
      >
        {/* Background image — covers right half absolutely */}
        <div
          className="absolute inset-y-0 right-0 hidden lg:block"
          style={{ width: '52%', zIndex: 0 }}
        >
          <img
            src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=85&w=900"
            alt="Event decoration"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
          />
          {/* Fade from left (blends into hero bg) */}
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(224,242,254,1) 0%, rgba(224,242,254,0.7) 18%, rgba(224,242,254,0.2) 40%, transparent 65%)',
            }}
          />
          {/* Subtle bottom fade */}
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, transparent 50%, rgba(224,242,254,0.4) 100%)',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-0">
          <div className="flex flex-col lg:flex-row lg:items-end">

            {/* LEFT — headline */}
            <div className="flex-1 pb-12 lg:pb-16 max-w-xl">
              <h1
                className="text-4xl sm:text-5xl font-bold text-slate-900 leading-[1.1] mb-4"
                style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '-0.02em' }}
              >
                {language === 'sv' ? (
                  <>Hitta allt för<br />ditt nästa event<span style={{ color: '#0284c7' }}></span></>
                ) : (
                  <>Find Everything For<br />Your Next Event<span style={{ color: '#0284c7' }}></span></>
                )}
              </h1>
              <p className="text-slate-500 text-base font-light leading-relaxed">
                {language === 'sv' ? (
                  <>Bläddra bland tjänster, jämför alternativ och få kontakt<br className="hidden sm:block" />med pålitliga proffs i Norden.</>
                ) : (
                  <>Browse services, compare options, and connect<br className="hidden sm:block" />with trusted professionals across Nordic.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Search bar — sits at the bottom overlapping the hero (placed outside section to avoid overflow-hidden clipping) */}
      <div
        className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 -mt-6"
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-2 items-stretch p-3 rounded-2xl"
          style={{
            background: '#ffffff',
            boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
            border: '1px solid #e8ecf0',
          }}
        >
          {/* Search */}
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-auto lg:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={language === 'sv' ? 'Sök tjänster, paket...' : 'Search services, packages...'}
              className="w-full pl-11 pr-4 py-[11px] text-sm rounded-xl outline-none text-slate-700 placeholder-slate-400"
              style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Category */}
          <div className="relative w-full lg:w-40 xl:w-44 lg:flex-shrink-0">
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
          <div className="relative w-full lg:w-36 xl:w-40 lg:flex-shrink-0">
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
          <div className="relative w-full lg:w-32 xl:w-36 lg:flex-shrink-0">
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
          {/* Capacity */}
          <div className="relative w-full lg:w-36 xl:w-40 lg:flex-shrink-0">
            <select
              className="w-full appearance-none pl-4 pr-8 py-[11px] text-sm rounded-xl outline-none text-slate-700 cursor-pointer"
              style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}
              value={minCapacity}
              onChange={e => setMinCapacity(Number(e.target.value))}
            >
              <option value={0}>{language === 'sv' ? 'Alla storlekar' : 'Any Capacity'}</option>
              <option value={20}>20+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
              <option value={50}>50+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
              <option value={100}>100+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
              <option value={200}>200+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
              <option value={500}>500+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          </div>
          {/* Search button */}
          <button
            id="explore-search-btn"
            className="w-full lg:w-auto sm:col-span-2 lg:col-span-auto flex items-center justify-center gap-2 px-6 py-[11px] rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 lg:flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 2px 12px rgba(2,132,199,0.35)' }}
          >
            <Search className="w-4 h-4" /> {language === 'sv' ? 'Sök' : 'Search'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TOP CATEGORIES
      ══════════════════════════════════════════════════════════════ */}
      <section className="pt-14 pb-8 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {language === 'sv' ? 'Toppkategorier' : 'Top Categories'}
            </h2>
            <button
              onClick={() => setCategory('All')}
              className="flex items-center gap-1 text-sm font-semibold transition-colors"
              style={{ color: '#0284c7' }}
            >
              {language === 'sv' ? 'Visa alla kategorier' : 'View all categories'} <ChevronRight className="w-4 h-4" />
            </button>
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
                    {language === 'sv' ? (
                      cat.cat === 'All' ? 'Alla' :
                      cat.cat === 'Venues' ? 'Lokaler' :
                      cat.cat === 'Catering' ? 'Catering' :
                      cat.cat === 'Photography' ? 'Foto' :
                      cat.cat === 'Music' ? 'DJs' :
                      cat.cat === 'Decor' ? 'Dekor' :
                      cat.cat === 'Kids Entertainment' ? 'Underhållning' : cat.label
                    ) : cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SERVICES GRID
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">

          {/* Grid header */}
          <div className="mb-7">
            <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {language === 'sv' ? 'Populära tjänster' : 'Popular Services'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {language === 'sv' ? 'Upptäck de mest populära tjänsterna för ditt event' : 'Discover top-rated services for your event'}
            </p>
          </div>

          {/* Grid */}
          {visibleServices.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {visibleServices.map(({ vendor, service }) => {
                  const imageUrl = service.imageUrl || service.imageUrls?.[0] || vendor.applicationImageUrl || vendor.services?.[0]?.imageUrl;
                  const serviceKey = `${vendor.id}-${service.id}`;
                  const lowestPrice = getLowestPrice(service);
                  const serviceName = (service.packages && service.packages.length > 0 && service.packages[0].name)
                    ? service.packages[0].name
                    : service.category;
                  const displayLocation = service.location || vendor.applicationLocation || '';

                  return (
                    <Link
                      key={serviceKey}
                      to={`/services/${vendor.id}/${service.id}`}
                      state={{ history: [routerLocation.pathname + routerLocation.search] }}
                      className="group block focus:outline-none"
                    >
                      <div
                        className="rounded-2xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] bg-white border border-slate-100"
                        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
                      >
                        {/* Image */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-750 group-hover:scale-105"
                              alt={serviceName}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100">
                              <Crown className="w-10 h-10 text-sky-300" />
                            </div>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="p-5 flex flex-col justify-between">
                          <div>
                            {/* Category */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-extrabold tracking-wider text-sky-600 uppercase">
                                {service.category}
                              </span>
                            </div>

                            {/* Service name */}
                            <h3
                              className="text-base font-bold text-slate-900 leading-snug group-hover:text-sky-700 transition-colors line-clamp-1 mb-1"
                              style={{ fontFamily: "'Montserrat', sans-serif" }}
                            >
                              {serviceName}
                            </h3>

                            {/* Vendor name */}
                            <p className="text-xs text-slate-400 font-medium line-clamp-1 mb-4">
                              by {vendor.name}
                            </p>
                          </div>

                          {/* Bottom Row - Location & Price with a divider */}
                          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                            {/* Location */}
                            <div className="flex items-center gap-1 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="text-xs text-slate-500 font-medium line-clamp-1">{displayLocation}</span>
                              {vendor.verified && (
                                <BadgeCheck className="w-4 h-4 text-emerald-500 ml-0.5 flex-shrink-0" fill="rgba(16,185,129,0.12)" />
                              )}
                            </div>

                            {/* Price */}
                            <div className="flex-shrink-0 text-right">
                              {lowestPrice && lowestPrice > 0 ? (
                                <span className="text-xs sm:text-[13px] font-extrabold text-sky-700 leading-none">
                                  SEK {lowestPrice.toLocaleString('sv-SE')}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                                  Contact Us
                                </span>
                              )}
                            </div>
                          </div>
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
                    id="load-more-services-btn"
                    onClick={() => setVisibleCount(prev => prev + SERVICES_PER_PAGE)}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 hover:shadow-md active:scale-95"
                    style={{ border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151' }}
                  >
                    {language === 'sv' ? 'Visa fler tjänster' : 'Load More Services'} <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ── Empty state: show the contact form ─────────────── */
            <div className="py-16 text-center max-w-2xl mx-auto">
              <div className="mb-10 space-y-3">
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {language === 'sv' ? 'Hittar du inte den perfekta matchningen?' : "Can't find the perfect match?"}
                </h2>
                <p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed">
                  {language === 'sv'
                    ? 'Berätta vad du behöver så hjälper vi dig att komma i kontakt med rätt eventleverantör.'
                    : "Tell us what you need and we'll help connect you with the right event professional."}
                </p>
              </div>

              <div
                className="bg-white p-8 sm:p-10 rounded-3xl text-left"
                style={{ border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
              >
                <h3 className="text-xl font-bold text-slate-900 mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {t('home.contactTitle')}
                </h3>

                {formSubmitted ? (
                  <div className="py-10 text-center">
                    <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                      <Star className="w-7 h-7 text-green-500" fill="currentColor" />
                    </div>
                    <p className="text-slate-900 font-semibold text-lg">{t('home.successTitle')}</p>
                    <p className="text-slate-400 text-xs mt-3 uppercase tracking-widest font-bold">{t('home.successBadge')}</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('home.visionLabel')}</label>
                        <input
                          type="text" required
                          value={contactForm.vision}
                          onChange={e => setContactForm({ ...contactForm, vision: e.target.value })}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                          onFocus={e => (e.target.style.borderColor = '#0284c7')}
                          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                          placeholder={t('home.visionPlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('home.emailLabel')}</label>
                        <input
                          type="email" required
                          value={contactForm.email}
                          onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                          onFocus={e => (e.target.style.borderColor = '#0284c7')}
                          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                          placeholder="your@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{language === 'sv' ? 'Telefonnummer' : 'Phone Number'}</label>
                        <input
                          type="tel" required
                          value={contactForm.phone}
                          onChange={e => setContactForm({ ...contactForm, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '') })}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                          onFocus={e => (e.target.style.borderColor = '#0284c7')}
                          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                          placeholder="+46 70 123 45 67"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{language === 'sv' ? 'Antal gäster' : 'Guest Capacity'}</label>
                        <input
                          type="number" required
                          value={contactForm.capacity}
                          onChange={e => setContactForm({ ...contactForm, capacity: e.target.value })}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                          onFocus={e => (e.target.style.borderColor = '#0284c7')}
                          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                          placeholder="e.g. 150"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{language === 'sv' ? 'Kategori' : 'Category'}</label>
                        <select
                          required
                          value={contactForm.category}
                          onChange={e => setContactForm({ ...contactForm, category: e.target.value })}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all cursor-pointer"
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: contactForm.category ? '#1e293b' : '#94a3b8' }}
                          onFocus={e => (e.target.style.borderColor = '#0284c7')}
                          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                        >
                          <option value="" disabled>{language === 'sv' ? 'Välj kategori...' : 'Select a category...'}</option>
                          {Object.values(VendorCategory).map(cat => (
                            <option key={cat} value={cat} style={{ color: '#1e293b' }}>{t(`categories.${cat}`) || cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{language === 'sv' ? 'Evenemangsdatum' : 'Event Date'}</label>
                        <input
                          type="date" required
                          value={contactForm.eventDate}
                          onChange={e => setContactForm({ ...contactForm, eventDate: e.target.value })}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: contactForm.eventDate ? '#1e293b' : '#94a3b8' }}
                          onFocus={e => (e.target.style.borderColor = '#0284c7')}
                          onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSending}
                      className="w-full py-4 rounded-2xl text-sm font-bold uppercase tracking-[0.2em] text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 4px 20px rgba(2,132,199,0.35)' }}
                    >
                      {isSending ? 'Sending...' : t('home.sendRequest')}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Explore;
