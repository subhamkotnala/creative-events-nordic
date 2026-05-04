
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Vendor, VendorService, VendorCategory, VendorStatus } from '../types';
import { AVAILABLE_LOCATIONS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { Search, MapPin, Star, Building2, Users, ArrowLeft } from 'lucide-react';

interface ExploreProps {
  vendors: Vendor[];
}

interface FlattenedService {
  vendor: Vendor;
  service: VendorService;
}

const Explore: React.FC<ExploreProps> = ({ vendors }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routerLocation = useLocation();
  const [category, setCategory] = useState<string>(searchParams.get('category') || 'All');
  const [location, setLocation] = useState<string>(searchParams.get('location') || 'All');
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState<number>(0);
  const [minCapacity, setMinCapacity] = useState<number>(0);

  useEffect(() => {
    const cat = searchParams.get('category');
    const loc = searchParams.get('location');
    const cap = searchParams.get('minCapacity');
    if (cat) setCategory(cat);
    if (loc) setLocation(loc);
    if (cap) setMinCapacity(Number(cap));
  }, [searchParams]);

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
                          (service.packages?.some(p => (p.name?.toLowerCase() || '').includes(search.toLowerCase()) || (p.description?.toLowerCase() || '').includes(search.toLowerCase())) || false) ||
                          (vendor.name?.toLowerCase() || '').includes(search.toLowerCase());
                          
    const matchesRating = vendor.rating >= minRating;

    const matchesCapacity = minCapacity === 0 || 
                            (service.count !== undefined && service.count >= minCapacity) ||
                            (service.packages?.some(p => p.capacity !== undefined && p.capacity >= minCapacity) || false);
    
    return matchesCat && matchesLoc && matchesSearch && matchesRating && matchesCapacity;
  });

  const categories = ['All', ...Object.values(VendorCategory)];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <button 
        onClick={() => {
          if (window.history.length > 2) {
            navigate(-1);
          } else {
            navigate('/');
          }
        }} 
        className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-md hover:scale-110 transition-transform mb-8 inline-block border border-slate-100"
      >
        <ArrowLeft className="w-5 h-5 text-slate-900" />
      </button>

      <div className="mb-12">
        <h1 className="text-4xl serif mb-4">{t('explore.title')}</h1>
        <p className="text-slate-500">Discover packages and services from our verified partners.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-6 mb-12 items-center bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search services..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-1 focus:ring-sky-500 outline-none font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <select 
            className="w-full sm:w-auto flex-grow md:flex-none bg-slate-100 border-none rounded-xl px-6 py-3 text-sm font-medium focus:ring-1 focus:ring-sky-500 outline-none cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c === 'All' ? t('search.all') : t(`categories.${c}`)}</option>)}
          </select>

          <select 
            className="w-full sm:w-auto flex-grow md:flex-none bg-slate-100 border-none rounded-xl px-6 py-3 text-sm font-medium focus:ring-1 focus:ring-sky-500 outline-none cursor-pointer"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="All">{t('search.allLocations')}</option>
            {AVAILABLE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          
          <select 
            className="w-full sm:w-auto flex-grow md:flex-none bg-slate-100 border-none rounded-xl px-6 py-3 text-sm font-medium focus:ring-1 focus:ring-sky-500 outline-none cursor-pointer"
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
          >
            <option value={0}>{t('search.anyRating')}</option>
            <option value={4}>{t('search.fourPlus')}</option>
            <option value={4.5}>{t('search.fourHalfPlus')}</option>
            <option value={4.8}>4.8+ Stars</option>
          </select>

          <select 
            className="w-full sm:w-auto flex-grow md:flex-none bg-slate-100 border-none rounded-xl px-6 py-3 text-sm font-medium focus:ring-1 focus:ring-sky-500 outline-none cursor-pointer"
            value={minCapacity}
            onChange={(e) => setMinCapacity(Number(e.target.value))}
          >
            <option value={0}>{language === 'sv' ? 'Alla storlekar' : 'Any Capacity'}</option>
            <option value={20}>20+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
            <option value={50}>50+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
            <option value={100}>100+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
            <option value={200}>200+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
            <option value={500}>500+ {language === 'sv' ? 'Gäster' : 'Guests'}</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredServices.length > 0 ? (
          filteredServices.map(({ vendor, service }) => (
            <Link key={`${vendor.id}-${service.id}`} to={`/services/${vendor.id}/${service.id}`} state={{ history: [routerLocation.pathname + routerLocation.search] }} className="group">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl mb-6 bg-slate-200">
                <img 
                  src={service.imageUrl || service.imageUrls?.[0] || vendor.applicationImageUrl || vendor.services?.[0]?.imageUrl} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  alt={service.category}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-xl serif group-hover:text-sky-600 transition-colors leading-tight">{t(`categories.${service.category}`)}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-widest shrink-0 mt-1.5">
                    <MapPin className="w-3 h-3" /> {service.location || vendor.applicationLocation}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-slate-400 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" />
                    <span>by {vendor.name}</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="w-3 h-3" fill="currentColor" />
                    <span>{vendor.rating.toFixed(1)}</span>
                  </div>
                  {service.count !== undefined && service.count > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{service.count}</span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-slate-500 text-sm line-clamp-2 font-light leading-relaxed">
                  {service.description}
                </p>
                {service.packages && service.packages.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-md">
                      {service.packages.length} Packages available
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-24 text-center">
            <p className="text-slate-400 serif text-2xl italic">No services found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
