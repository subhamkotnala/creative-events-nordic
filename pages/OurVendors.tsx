import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Vendor, VendorCategory, VendorStatus } from '../types';
import { AVAILABLE_LOCATIONS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { Search, MapPin, Star, ArrowLeft } from 'lucide-react';

interface OurVendorsProps {
  vendors: Vendor[];
}

const OurVendors: React.FC<OurVendorsProps> = ({ vendors }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routerLocation = useLocation();
  const [category, setCategory] = useState<string>(searchParams.get('category') || 'All');
  const [location, setLocation] = useState<string>(searchParams.get('location') || 'All');
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState<number>(0);

  useEffect(() => {
    const cat = searchParams.get('category');
    const loc = searchParams.get('location');
    if (cat) setCategory(cat);
    if (loc) setLocation(loc);
  }, [searchParams]);

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
                            (s.packages?.some(p => (p.name?.toLowerCase() || '').includes(search.toLowerCase()) || (p.description?.toLowerCase() || '').includes(search.toLowerCase())) || false)
                          )) ||
                          (v.applicationStory?.toLowerCase() || '').includes(search.toLowerCase());
                          
    const matchesRating = v.rating >= minRating;
    
    return matchesCat && matchesLoc && matchesSearch && matchesRating && v.status === VendorStatus.APPROVED;
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
        <h1 className="text-4xl serif mb-4">Our Vendors</h1>
        <p className="text-slate-500">Discover all verified partners in the Creative Events network.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-6 mb-12 items-center bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search vendors..." 
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
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredVendors.length > 0 ? (
          filteredVendors.map(vendor => {
            let activeService = vendor.services?.find(s => {
              const catMatch = category === 'All' || s.category === category;
              const locMatch = location === 'All' || s.location === location;
              const searchMatch = !search || 
                                 (s.description?.toLowerCase() || '').includes(search.toLowerCase()) ||
                                 (s.category?.toLowerCase() || '').includes(search.toLowerCase()) ||
                                 (s.packages?.some(p => (p.name?.toLowerCase() || '').includes(search.toLowerCase())) || false);

              return catMatch && locMatch && searchMatch;
            });

            if (!activeService) activeService = vendor.services?.[0];

            return (
            <Link key={vendor.id} to={`/vendors/${vendor.id}`} state={{ history: [routerLocation.pathname + routerLocation.search] }} className="group">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl mb-6 bg-slate-200">
                <img 
                  src={activeService?.imageUrl || vendor.applicationImageUrl || vendor.services?.[0]?.imageUrl} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  alt={vendor.name}
                />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {Array.from(new Set(vendor.services?.map(s => s.category) || [])).map(cat => (
                    <span key={cat} className="text-[9px] uppercase tracking-widest text-sky-700 bg-sky-50 px-2 py-1 rounded-md font-bold">
                      {t(`categories.${cat}`)}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-start">
                  <h3 className="text-xl serif group-hover:text-sky-600 transition-colors">{vendor.name}</h3>
                  <div className="flex items-center gap-1 font-bold text-amber-500 text-[10px]">
                    <Star className="w-3 h-3" fill="currentColor" />
                    <span>{vendor.rating.toFixed(1)}</span>
                  </div>
                </div>
                <p className="text-slate-500 text-sm line-clamp-2 font-light leading-relaxed">
                  {activeService?.description || vendor.applicationStory || vendor.services?.[0]?.description}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <MapPin className="w-3 h-3" /> {vendor.applicationLocation || activeService?.location || vendor.services?.[0]?.location}
                </div>
              </div>
            </Link>
          )})
        ) : (
          <div className="col-span-full py-24 text-center">
            <p className="text-slate-400 serif text-2xl italic">No vendors found matching your criteria in Sweden.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OurVendors;
