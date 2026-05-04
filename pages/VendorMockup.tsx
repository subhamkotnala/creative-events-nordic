
import React from 'react';
import { Link } from 'react-router-dom';
import { Vendor, VendorCategory, VendorStatus } from '../types';
import { MapPin, Mail, Calendar, ArrowLeft, Eye } from 'lucide-react';

// Mock data for the preview page
const mockVendor: Vendor = {
  id: 'mock-1',
  userId: 'mock-user-123',
  name: 'Your Business Name',
  status: VendorStatus.APPROVED,
  services: [
    {
      id: 'vs1',
      category: VendorCategory.PHOTOGRAPHY,
      location: 'Stockholm',
      description: 'Award-winning photography studio specializing in cinematic event coverage and high-fashion portraiture with a focus on natural light.',
      imageUrl: 'https://images.unsplash.com/photo-1512295767273-ac109ac31f33?auto=format&fit=crop&q=80&w=800',
      imageUrls: [],
      packages: [
        { id: 's1', name: 'Value Package', description: 'Our all-inclusive package covering the full event day, delivering a complete gallery of stunning, edited images.', price: 45000 },
        { id: 's2', name: 'Standard Session', description: 'A 4-hour session perfect for smaller gatherings or specific parts of your event, like portraits or ceremonies.', price: 20000 },
        { id: 's3', name: 'Essential Special', description: 'An intimate package designed for couples, capturing the magic of your special day with a personal touch.', price: 15000 },
        { id: 's4', name: 'Add-on: Drone Footage', description: 'Aerial shots of your venue and event, adding a breathtaking perspective to your collection.', price: 8000 }
      ]
    }
  ],
  email: 'your.email@example.com',
  joinedAt: new Date().getFullYear().toString(),
  rating: 4.9,
};


const VendorMockup: React.FC = () => {
  const vendor = mockVendor;

  return (
    <div className="pb-24 bg-slate-50">
      {/* Preview Banner */}
      <div className="bg-amber-100 text-amber-800 text-center p-4 text-sm flex items-center justify-center gap-2">
        <Eye className="w-4 h-4" />
        This is a preview of how your profile will appear to savvy clients.
      </div>

      {/* Header Image */}
      <div className="h-[60vh] w-full relative overflow-hidden bg-slate-200">
        <img src={vendor.applicationImageUrl || vendor.services?.[0]?.imageUrl} className="w-full h-full object-cover" alt={vendor.name} />
        <div className="absolute inset-0 bg-black/10"></div>
        <Link to="/vendor-dashboard" className="absolute top-8 left-8 bg-white/90 backdrop-blur p-3 rounded-full hover:bg-white transition-colors" title="Back to Dashboard">
          <ArrowLeft className="w-5 h-5 text-slate-900" />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-32 relative z-10">
        <div className="grid lg:grid-cols-3 gap-12">
           {/* Main Info */}
          <div className="lg:col-span-2 space-y-12">
            <div className="bg-white p-12 border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/50">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold mb-3 block">{(vendor.services && vendor.services.length > 0 ? vendor.services[0].category : 'New Partner')}</span>
                  <h1 className="text-5xl serif mb-4">{vendor.name}</h1>
                  <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 font-light">
                    <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {vendor.applicationLocation || vendor.services?.[0]?.location}</span>
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Member since {vendor.joinedAt}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl serif">Our Story</h2>
                <p className="text-slate-600 text-lg leading-relaxed font-light">
                  {vendor.applicationStory || vendor.services?.[0]?.description}
                </p>
              </div>

              {/* Photo Gallery Grid (if it were real) */}
              {(vendor.applicationGalleryUrls || vendor.services?.[0]?.imageUrls) && (vendor.applicationGalleryUrls?.length || 0 > 0 || vendor.services?.[0]?.imageUrls?.length || 0 > 0) && (
                <div className="mt-16 space-y-6">
                  <h2 className="text-2xl serif text-slate-800">Portfolio Highlights</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(vendor.applicationGalleryUrls || vendor.services?.[0]?.imageUrls)?.map((url, i) => (
                      <div key={i} className="aspect-square rounded-3xl overflow-hidden bg-slate-100">
                        <img src={url} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" alt={`Portfolio ${i+1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Services */}
            <div className="space-y-8">
              <h2 className="text-3xl serif px-4">Services & Packages</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {vendor.services.map(service => (
                  <div key={service.id} className="bg-white p-8 border border-slate-200 rounded-3xl group hover:border-sky-500 transition-colors shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium">{service.category}</h3>
                      <p className="text-sm font-bold font-mono tracking-tighter bg-slate-100 px-3 py-1 rounded-full">{service.location}</p>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6 font-light">
                      {service.description}
                    </p>
                    {service.packages && service.packages.length > 0 && (
                      <div className="space-y-3 mb-6">
                         {service.packages.map(pkg => (
                            <div key={pkg.id} className="bg-slate-50 p-3 rounded-xl flex justify-between items-center text-sm">
                              <div>
                                <div className="font-semibold">{pkg.name}</div>
                                <div className="text-[10px] text-slate-500">{pkg.description}</div>
                              </div>
                              <div className="font-bold text-sky-600 pl-4">{pkg.price.toLocaleString()} SEK</div>
                            </div>
                         ))}
                      </div>
                    )}
                    <button disabled className="w-full py-3 border border-slate-200 rounded-xl text-xs uppercase tracking-widest font-bold bg-slate-100 text-slate-400 cursor-not-allowed">
                      Inquire Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
             <div className="bg-slate-800 p-8 rounded-[2.5rem] text-white space-y-6 sticky top-24">
                <h3 className="text-2xl serif">Ready to book?</h3>
                <p className="text-slate-400 text-sm font-light leading-relaxed">
                  Clients can connect with {vendor.name} to discuss their budget requirements and availability.
                </p>
                <div className="space-y-3 pt-4">
                   <button disabled className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest cursor-not-allowed">
                    Send Inquiry
                   </button>
                   <button disabled className="w-full border border-white/20 text-white/50 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest cursor-not-allowed">
                    View Website
                   </button>
                </div>
                <div className="pt-6 border-t border-white/10">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">You might also like</p>
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden">
                          <img src={`https://picsum.photos/seed/other${i}/100/100`} className="w-full h-full object-cover opacity-60" alt="" />
                        </div>
                        <p className="text-xs font-medium text-slate-300">Another Value Partner</p>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorMockup;