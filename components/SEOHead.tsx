import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Vendor } from '../types';

interface SEOHeadProps {
  vendors?: Vendor[];
}

interface PageMetaConfig {
  title: string;
  description: string;
  keywords?: string;
  ogType?: 'website' | 'article' | 'profile' | 'product';
  image?: string;
  noIndex?: boolean;
  schema?: Record<string, any>;
}

const DEFAULT_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://creativeevents.se';
const DEFAULT_IMAGE = `${DEFAULT_ORIGIN}/logo.png`;

function setMetaTag(attributeName: 'name' | 'property', attributeValue: string, content: string) {
  if (typeof document === 'undefined') return;
  let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
  if (typeof document === 'undefined') return;
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function setJsonLdScript(schema: Record<string, any>) {
  if (typeof document === 'undefined') return;
  let script = document.getElementById('seo-dynamic-json-ld') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'seo-dynamic-json-ld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema, null, 2);
}

function truncate(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3).trim() + '...';
}

export const SEOHead: React.FC<SEOHeadProps> = ({ vendors = [] }) => {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname;
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${window.location.pathname}${window.location.hash || ''}`;

    let config: PageMetaConfig = {
      title: 'Creative Events | Sweden Premier Event Vendor Marketplace',
      description: "Connect with verified wedding, party, and corporate event vendors across Sweden. Explore photographers, caterers, florists, and venues.",
      keywords: 'event vendors sweden, wedding marketplace sweden, party planning stockholm, catering gothenburg, event venues malmo',
      ogType: 'website',
      image: DEFAULT_IMAGE,
      noIndex: false,
    };

    // 1. Home
    if (pathname === '/' || pathname === '') {
      config = {
        title: 'Creative Events | Sweden Event Marketplace',
        description: "Connect with verified wedding, party, and corporate event vendors across Sweden. Explore top photographers, caterers, florists, and venues.",
        keywords: 'event marketplace sweden, wedding vendors stockholm, party caterers, event venues gothenburg, corporate events malmo',
        ogType: 'website',
        image: DEFAULT_IMAGE,
        schema: {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Creative Events Marketplace',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'All',
          url: canonicalUrl,
          description: "Connect with verified wedding, party, and corporate event vendors across Sweden.",
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'SEK'
          }
        }
      };
    }
    // 2. Explore / Search
    else if (pathname === '/explore') {
      config = {
        title: 'Explore Event Services & Top Vendors | Creative Events',
        description: "Browse curated catering, photography, venues, entertainment, and decor services across Sweden with verified reviews and direct transparent pricing.",
        keywords: 'event services sweden, wedding catering packages, event photography prices, venue hire stockholm',
        ogType: 'website',
        image: DEFAULT_IMAGE,
        schema: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Explore Event Services in Sweden',
          url: canonicalUrl,
          description: "Browse curated catering, photography, venues, entertainment, and decor services across Sweden."
        }
      };
    }
    // 3. Our Vendors directory
    else if (pathname === '/vendors') {
      config = {
        title: 'Browse Verified Event Vendors in Sweden | Creative Events',
        description: "Find trusted local vendors for weddings, private parties, and corporate galas across Stockholm, Gothenburg, Malmö, and all Swedish regions.",
        keywords: 'swedish event vendors, verified wedding suppliers, local caterers, event DJs, photographers directory',
        ogType: 'website',
        image: DEFAULT_IMAGE,
        schema: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Verified Swedish Event Vendors Directory',
          url: canonicalUrl,
          description: "Directory of verified local event professionals across Sweden.",
          itemListElement: vendors.slice(0, 10).map((v, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: v.name,
            url: `${origin}/#/vendors/${v.id}`
          }))
        }
      };
    }
    // 4. Events & Expos Gallery
    else if (pathname === '/events') {
      config = {
        title: 'Upcoming Event Fairs & Showcases | Creative Events',
        description: "Discover premier bridal expos, food festivals, and creative pop-up fairs organized across Sweden. Reserve tickets and explore showcases.",
        keywords: 'event fairs sweden, bridal showcase stockholm, food festival, wedding expo nordic, pop up fair malmo',
        ogType: 'website',
        image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
        schema: {
          '@context': 'https://schema.org',
          '@type': 'EventSeries',
          name: 'Creative Events Showcases & Expos',
          url: canonicalUrl,
          description: "Discover premier bridal expos, food festivals, and creative pop-up fairs organized across Sweden."
        }
      };
    }
    // 5. Ad Request Board
    else if (pathname === '/ad-board') {
      config = {
        title: 'Event Request Board & Custom Quotes | Creative Events',
        description: "Post your event requirements and receive tailored offers and competitive proposals from verified Nordic event professionals.",
        keywords: 'post event request, hire event vendor, event quotes sweden, wedding planning bids, supplier offers',
        ogType: 'website',
        image: DEFAULT_IMAGE,
        schema: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Event Request Board',
          url: canonicalUrl,
          description: "Community request board where clients post event needs and receive custom proposals from verified vendors."
        }
      };
    }
    // 6. Join Marketplace
    else if (pathname === '/join') {
      config = {
        title: 'Join Creative Events Marketplace | Grow Your Business',
        description: "List your event services, showcase packages to clients across Sweden, and receive direct inquiries with zero hidden commissions.",
        keywords: 'join event marketplace, register as event vendor, wedding vendor signup, list photography catering venue sweden',
        ogType: 'website',
        image: DEFAULT_IMAGE,
        schema: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Join Creative Events Marketplace',
          url: canonicalUrl,
          description: "Apply to become a verified vendor on Creative Events marketplace and connect with thousands of event planners."
        }
      };
    }
    // 7. Dynamic Vendor Detail: /vendors/:id
    else if (pathname.startsWith('/vendors/')) {
      const vendorId = pathname.replace('/vendors/', '');
      const vendor = vendors.find(v => v.id === vendorId);
      if (vendor) {
        const primaryService = vendor.services?.[0];
        const locationName = primaryService?.location || 'Sweden';
        const vendorCategory = primaryService?.category || 'Event Professional';
        const rawDesc = primaryService?.description || `Book ${vendor.name} for weddings, parties, and corporate events across Sweden.`;
        const imageUrl = primaryService?.imageUrl || primaryService?.imageUrls?.[0] || DEFAULT_IMAGE;

        config = {
          title: truncate(`${vendor.name} – ${vendorCategory} in ${locationName} | Creative Events`, 60),
          description: truncate(rawDesc, 155),
          keywords: `${vendor.name}, ${vendorCategory}, ${locationName} event vendor, Swedish wedding professional`,
          ogType: 'profile',
          image: imageUrl,
          schema: {
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: vendor.name,
            description: truncate(rawDesc, 200),
            image: imageUrl,
            url: canonicalUrl,
            email: vendor.email,
            address: {
              '@type': 'PostalAddress',
              addressLocality: locationName,
              addressCountry: 'SE'
            },
            ...(vendor.rating ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: vendor.rating,
                bestRating: '5',
                worstRating: '1',
                ratingCount: 15
              }
            } : {})
          }
        };
      } else {
        config = {
          title: 'Event Vendor Profile | Creative Events',
          description: "View vendor portfolio, service packages, customer reviews, and contact details on Creative Events Sweden.",
          ogType: 'profile',
          image: DEFAULT_IMAGE
        };
      }
    }
    // 8. Dynamic Service Detail: /services/:vendorId/:serviceId
    else if (pathname.startsWith('/services/')) {
      const parts = pathname.replace('/services/', '').split('/');
      const vendorId = parts[0];
      const serviceId = parts[1];
      const vendor = vendors.find(v => v.id === vendorId);
      const service = vendor?.services?.find(s => s.id === serviceId);

      if (service && vendor) {
        const primaryPkg = service.packages?.[0];
        const pkgName = primaryPkg?.name || service.category;
        const rawDesc = service.description || `Explore ${service.category} packages by ${vendor.name} on Creative Events Sweden.`;
        const imageUrl = service.imageUrl || primaryPkg?.imageUrls?.[0] || DEFAULT_IMAGE;

        config = {
          title: truncate(`${pkgName} by ${vendor.name} | Creative Events`, 60),
          description: truncate(rawDesc, 155),
          keywords: `${vendor.name}, ${service.category}, ${service.location}, ${pkgName}`,
          ogType: 'product',
          image: imageUrl,
          schema: {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: pkgName,
            provider: {
              '@type': 'LocalBusiness',
              name: vendor.name
            },
            description: truncate(rawDesc, 200),
            image: imageUrl,
            url: canonicalUrl,
            areaServed: service.location,
            ...(primaryPkg ? {
              offers: {
                '@type': 'Offer',
                price: primaryPkg.price,
                priceCurrency: 'SEK'
              }
            } : {})
          }
        };
      } else {
        config = {
          title: 'Event Service Details | Creative Events',
          description: "Browse detailed service packages, pricing, inclusions, and book directly on Creative Events.",
          ogType: 'product',
          image: DEFAULT_IMAGE
        };
      }
    }
    // 9. Login
    else if (pathname === '/login') {
      config = {
        title: 'Sign In to Your Account | Creative Events',
        description: "Access your Creative Events vendor dashboard or user account to manage inquiries, event bookings, and messages.",
        noIndex: true
      };
    }
    // 10. Private / Management Portals
    else if (pathname === '/dashboard') {
      config = {
        title: 'Vendor Dashboard | Creative Events',
        description: "Manage your business profile, service listings, packages, and direct customer bookings.",
        noIndex: true
      };
    }
    else if (pathname === '/profile') {
      config = {
        title: 'Edit Vendor Profile | Creative Events',
        description: "Update your business credentials, bio, gallery photos, and contact information.",
        noIndex: true
      };
    }
    else if (pathname === '/vendor-inbox') {
      config = {
        title: 'Vendor Inbox & Messages | Creative Events',
        description: "Communicate directly with event clients and prospective bookings in real time.",
        noIndex: true
      };
    }
    else if (pathname === '/admin' || pathname === '/vendor-review' || pathname === '/admin/events') {
      config = {
        title: 'Admin Organized Events | Creative Events',
        description: "Curate and manage organized events and showcases hosted by Creative Events.",
        noIndex: true
      };
    }
    else if (pathname === '/change-password' || pathname === '/reset-password') {
      config = {
        title: 'Account Security & Password | Creative Events',
        description: "Securely reset or update your Creative Events account password.",
        noIndex: true
      };
    }
    else if (pathname.startsWith('/register/')) {
      config = {
        title: 'Vendor Registration | Creative Events',
        description: "Complete your vendor registration and join Sweden's event marketplace.",
        noIndex: true
      };
    }

    // Apply document title
    document.title = config.title;

    // Apply primary meta tags
    setMetaTag('name', 'description', config.description);
    if (config.keywords) {
      setMetaTag('name', 'keywords', config.keywords);
    }
    setMetaTag('name', 'robots', config.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');

    // Apply canonical link
    setLinkTag('canonical', canonicalUrl);

    // Apply OpenGraph tags
    setMetaTag('property', 'og:title', config.title);
    setMetaTag('property', 'og:description', config.description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', config.ogType || 'website');
    setMetaTag('property', 'og:image', config.image || DEFAULT_IMAGE);
    setMetaTag('property', 'og:site_name', 'Creative Events');

    // Apply Twitter Card tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', config.title);
    setMetaTag('name', 'twitter:description', config.description);
    setMetaTag('name', 'twitter:image', config.image || DEFAULT_IMAGE);

    // Apply Schema.org JSON-LD
    const fallbackSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Creative Events',
      url: origin,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${origin}/#/explore?search={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    };

    setJsonLdScript(config.schema || fallbackSchema);
  }, [location.pathname, location.search, vendors]);

  return null;
};
