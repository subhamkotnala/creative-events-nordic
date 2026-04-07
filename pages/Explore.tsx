
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Vendor, VendorCategory } from '../types';
import { AVAILABLE_LOCATIONS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { Search, MapPin, Star } from 'lucide-react';

interface ExploreProps {
  vendors: Vendor[];
}

const Explore: React.FC<ExploreProps> = ({ vendors }) => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState<string>(searchParams.get('category') || 'All');
  const [location, setLocation] = useState<string>(searchParams.get('location') || 'All');
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState<number>(0);

  // Update state if URL parameters change
  useEffect(() => {
    const cat = searchParams.get('category');
    const loc = searchParams.get('location');
    if (cat) setCategory(cat);
    if (loc) setLocation(loc);
  }, [searchParams]);

  const filteredVendors = vendors.filter(v => {
    const matchesCat = category === 'All' || v.category === category;
    const matchesLoc = location === 'All' || v.location === location;
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
                         v.description.toLowerCase().includes(search.toLowerCase());
    const matchesRating = v.rating >= minRating;
    return matchesCat && matchesLoc && matchesSearch && matchesRating;
  });

  const categories = ['All', ...Object.values(VendorCategory)];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl serif mb-4">{t('explore.title')}</h1>
        <p className="text-slate-500">{t('explore.sub')}</p>
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
        
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            className="flex-grow md:flex-none bg-slate-100 border-none rounded-xl px-6 py-3 text-sm font-medium focus:ring-1 focus:ring-sky-500 outline-none cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c === 'All' ? t('search.all') : t(`categories.${c}`)}</option>)}
          </select>

          <select 
            className="flex-grow md:flex-none bg-slate-100 border-none rounded-xl px-6 py-3 text-sm font-medium focus:ring-1 focus:ring-sky-500 outline-none cursor-pointer"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="All">{t('search.allLocations')}</option>
            {AVAILABLE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          
          <select 
            className="flex-grow md:flex-none bg-slate-100 border-none rounded-xl px-6 py-3 text-sm font-medium focus:ring-1 focus:ring-sky-500 outline-none cursor-pointer"
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
          filteredVendors.map(vendor => (
            <Link key={vendor.id} to={`/vendors/${vendor.id}`} className="group">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl mb-6 bg-slate-200">
                <img 
                  src={vendor.imageUrl} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  alt={vendor.name}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t(`categories.${vendor.category}`)}</span>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1 font-bold text-amber-500">
                      <Star className="w-3 h-3" fill="currentColor" />
                      <span>{vendor.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {vendor.location}
                    </div>
                  </div>
                </div>
                <h3 className="text-xl serif group-hover:text-sky-600 transition-colors">{vendor.name}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 font-light leading-relaxed">
                  {vendor.description}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-24 text-center">
            <p className="text-slate-400 serif text-2xl italic">No vendors found matching your criteria in Sweden.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
