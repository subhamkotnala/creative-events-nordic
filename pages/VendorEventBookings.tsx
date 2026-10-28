import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Clock, CheckCircle2, AlertCircle, Sparkles, Tag,
  Users, ArrowRight, Check, Zap, Info, Shield, ShoppingBag,
  ExternalLink, Printer, Search, Filter, HelpCircle, Phone, Mail,
  ChevronRight, Building2, Store, FileText, ArrowLeft, Loader2,
  DollarSign, RefreshCw, X, CreditCard, Smartphone, QrCode,
  LayoutGrid, Layers, Map, Receipt, CheckCircle, Lock, Award,
  Image as ImageIcon, ZoomIn, ZoomOut, Maximize2, SlidersHorizontal, Sliders, List, RotateCcw
} from 'lucide-react';
import { 
  OrganizedEvent, BoothPackage, VendorEventBooking, EventBookingStatus, 
  BookingPaymentStatus, VendorCategory, EventTableSlot, EventMarketLayout 
} from '../types';
import { api, DEFAULT_BOOTH_PACKAGES, DEFAULT_EVENT_SLOTS } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export const VendorEventBookings: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // URL query param for pre-selecting an event
  const queryParams = new URLSearchParams(location.search);
  const initialEventId = queryParams.get('eventId') || '';

  // Data states
  const [events, setEvents] = useState<OrganizedEvent[]>([]);
  const [boothPackages, setBoothPackages] = useState<BoothPackage[]>(DEFAULT_BOOTH_PACKAGES);
  const [allBookings, setAllBookings] = useState<VendorEventBooking[]>([]);
  const [marketLayout, setMarketLayout] = useState<EventMarketLayout | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active view tab: 'book' or 'my-bookings'
  const [activeTab, setActiveTab] = useState<'book' | 'my-bookings'>('book');

  // Booking Form State
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('booth-standard');
  const [selectedTableSlot, setSelectedTableSlot] = useState<EventTableSlot | null>(null);
  const [tableFilterZone, setTableFilterZone] = useState<string>('ALL');

  // Interactive Map & Layout State
  const [layoutViewMode, setLayoutViewMode] = useState<'MAP' | 'GRID'>('MAP');
  const [tableDisplayMode, setTableDisplayMode] = useState<'LIST' | 'TILES'>('LIST');
  const [tableSortOrder, setTableSortOrder] = useState<'number' | 'price_asc' | 'price_desc'>('number');
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; initialX: number; initialY: number }>({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const [mapFitMode, setMapFitMode] = useState<'contain' | 'cover'>('contain'); // Default to contain so entire map is seen in full!
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [isFullscreenMapOpen, setIsFullscreenMapOpen] = useState(false);
  const [showMapOption, setShowMapOption] = useState<boolean>(true);
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [onlyShowAvailable, setOnlyShowAvailable] = useState(false);

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(3.5, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(0.5, Math.round((prev - 0.25) * 100) / 100));
  };

  const handleResetZoom = () => {
    setMapZoom(1);
    setMapPan({ x: 0, y: 0 });
  };

  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<string>('Venues');
  const [website, setWebsite] = useState('');
  const [socials, setSocials] = useState('');
  const [companyVat, setCompanyVat] = useState('');

  const [powerNeeded, setPowerNeeded] = useState(true);
  const [powerType, setPowerType] = useState<'standard_230v' | 'high_load_400v' | 'none'>('standard_230v');
  const [tablesCount, setTablesCount] = useState<number>(1);
  const [chairsCount, setChairsCount] = useState<number>(2);
  const [staffCount, setStaffCount] = useState<number>(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [showcasePitch, setShowcasePitch] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Direct Payment State
  const [paymentMethod, setPaymentMethod] = useState<'swish' | 'card' | 'klarna'>('swish');
  const [swishPhone, setSwishPhone] = useState('+46 70 812 34 56');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8921');
  const [cardExpiry, setCardExpiry] = useState('09/28');
  const [cardCvc, setCardCvc] = useState('834');
  const [cardHolder, setCardHolder] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Submission state
  const [submitSuccess, setSubmitSuccess] = useState<VendorEventBooking | null>(null);
  const [submitError, setSubmitError] = useState('');

  // Selected booking for detailed voucher / invoice modal
  const [viewingBooking, setViewingBooking] = useState<VendorEventBooking | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<VendorEventBooking | null>(null);

  // Search/Filter for events
  const [eventSearch, setEventSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');

  useEffect(() => {
    loadInitialData();
  }, []);

  // When selected event changes, load its market layout
  useEffect(() => {
    if (selectedEventId) {
      loadMarketLayout(selectedEventId);
    }
  }, [selectedEventId]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [eventsData, bookingsData, packagesData] = await Promise.all([
        api.getOrganizedEvents(),
        api.getVendorEventBookings(),
        api.getBoothPackages()
      ]);
      setEvents(eventsData);
      setAllBookings(bookingsData);
      setBoothPackages(packagesData);

      let targetEventId = initialEventId;
      if (!targetEventId || !eventsData.some(e => e.id === targetEventId)) {
        targetEventId = eventsData.length > 0 ? eventsData[0].id : '';
      }
      setSelectedEventId(targetEventId);

      // Pre-fill user/vendor profile if logged in
      if (user) {
        if (user.name) {
          setContactName(user.name);
          setCardHolder(user.name);
        }
        if (user.email) setEmail(user.email);
        
        const vendorList = await api.getVendors().catch(() => []);
        const matchingVendor = vendorList.find(v => v.userId === user.id || v.email === user.email);
        if (matchingVendor) {
          setBusinessName(matchingVendor.name || '');
          if (matchingVendor.phone) {
            setPhone(matchingVendor.phone);
            setSwishPhone(matchingVendor.phone);
          }
          if (matchingVendor.website) setWebsite(matchingVendor.website);
          if (matchingVendor.services && matchingVendor.services.length > 0) {
            setCategory(matchingVendor.services[0].category || 'Venues');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load initial event booking data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMarketLayout = async (eventId: string) => {
    try {
      const layout = await api.getEventMarketLayout(eventId);
      setMarketLayout(layout);

      // Pre-select first available slot if none selected or if previous slot isn't in new layout
      const available = layout.slots.find(s => s.status === 'available');
      if (available) {
        setSelectedTableSlot(available);
      } else {
        setSelectedTableSlot(null);
      }
    } catch (err) {
      console.error('Failed to load event layout:', err);
    }
  };

  // The active selected event object
  const selectedEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId) || events[0] || null;
  }, [events, selectedEventId]);

  // The active selected package object
  const selectedPackage = useMemo(() => {
    return boothPackages.find(p => p.id === selectedPackageId) || boothPackages[0];
  }, [boothPackages, selectedPackageId]);

  // Filtered upcoming events list
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesSearch = 
        e.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
        e.city.toLowerCase().includes(eventSearch.toLowerCase()) ||
        e.location_name.toLowerCase().includes(eventSearch.toLowerCase());
      const matchesCity = selectedCity === 'ALL' || e.city.toLowerCase() === selectedCity.toLowerCase();
      return matchesSearch && matchesCity;
    });
  }, [events, eventSearch, selectedCity]);

  // Filter bookings belonging to this user or email
  const userBookings = useMemo(() => {
    if (!user) return [];
    return allBookings.filter(b => 
      (b.user_id && b.user_id === user.id) || 
      (b.email && b.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [allBookings, user]);

  // Unified active table slots from selectedEvent.vendor_tables (configured by admin) or marketLayout.slots
  const activeTableSlots = useMemo<EventTableSlot[]>(() => {
    if (selectedEvent?.vendor_tables && selectedEvent.vendor_tables.length > 0) {
      return selectedEvent.vendor_tables.map((t, idx) => ({
        id: t.id,
        table_number: t.table_number,
        zone: t.zone,
        tier: (t.price_sek >= 7000 ? 'premium' : t.price_sek >= 5000 ? 'culinary' : 'standard') as any,
        description: t.location_description || `${t.size || 'Table'} • ${t.zone}`,
        status: (t.status === 'BOOKED' ? 'booked' : 'available') as any,
        x: t.map_coordinates?.x ?? (15 + ((idx * 16) % 70)),
        y: t.map_coordinates?.y ?? (20 + (Math.floor(idx / 5) * 15) % 65),
        map_coordinates: t.map_coordinates || { x: 15 + ((idx * 16) % 70), y: 20 + (Math.floor(idx / 5) * 15) % 65 },
        size: t.size || '2.0m x 1.2m Standard Table',
        price_sek: t.price_sek,
        power_included: t.power_included,
        booked_by_name: t.booked_by_vendor?.business_name
      }));
    }

    if (marketLayout && marketLayout.slots && marketLayout.slots.length > 0) {
      return marketLayout.slots;
    }

    return DEFAULT_EVENT_SLOTS;
  }, [selectedEvent, marketLayout]);

  // Filtered slots on the layout map and directory list
  const displaySlots = useMemo(() => {
    return activeTableSlots.filter(s => {
      if (tableFilterZone !== 'ALL' && !s.zone.toLowerCase().includes(tableFilterZone.toLowerCase())) return false;
      if (onlyShowAvailable && s.status !== 'available') return false;
      if (tableSearchTerm.trim()) {
        const q = tableSearchTerm.toLowerCase();
        return (
          s.table_number.toLowerCase().includes(q) ||
          s.zone.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeTableSlots, tableFilterZone, onlyShowAvailable, tableSearchTerm]);

  // Distinct zones extracted from tables for filtering
  const distinctZones = useMemo(() => {
    const set = new Set<string>();
    activeTableSlots.forEach(s => {
      const clean = s.zone.split(' - ')[0].trim();
      if (clean) set.add(clean);
    });
    return ['ALL', ...Array.from(set)];
  }, [activeTableSlots]);

  // Sorted slots for the list
  const sortedDisplaySlots = useMemo(() => {
    const list = [...displaySlots];
    if (tableSortOrder === 'price_asc') {
      return list.sort((a, b) => (a.price_sek || 0) - (b.price_sek || 0));
    }
    if (tableSortOrder === 'price_desc') {
      return list.sort((a, b) => (b.price_sek || 0) - (a.price_sek || 0));
    }
    // Natural number sort (e.g. Table 1, Table 2, Table 10)
    return list.sort((a, b) => {
      const numA = parseInt(a.table_number.replace(/\D/g, ''), 10);
      const numB = parseInt(b.table_number.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.table_number.localeCompare(b.table_number);
    });
  }, [displaySlots, tableSortOrder]);

  // Price & VAT calculation (supports custom table price from admin layout or package price)
  const calculation = useMemo(() => {
    const grossPrice = selectedTableSlot?.price_sek || selectedPackage?.price || 4500;
    const netSubtotal = Math.round(grossPrice * 0.8);
    const vatMoms = grossPrice - netSubtotal; // 25% Swedish Moms included in gross
    return { grossPrice, netSubtotal, vatMoms };
  }, [selectedPackage, selectedTableSlot]);

  // Table selection handler
  const handleSelectTable = (slot: EventTableSlot) => {
    if (slot.status !== 'available') return;
    setSelectedTableSlot(slot);

    // If the slot has a specific tier, recommend that package
    const matchingPackage = boothPackages.find(p => p.tier === slot.tier);
    if (matchingPackage) {
      setSelectedPackageId(matchingPackage.id);
    }
  };

  // Handle Complete Direct Payment & Booking
  const handleDirectPaymentAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!selectedEvent) {
      setSubmitError('Please choose an event for your booth reservation.');
      return;
    }
    if (!selectedTableSlot) {
      setSubmitError('Please select your preferred table / stall number from the market layout.');
      return;
    }
    if (!businessName.trim() || !contactName.trim() || !email.trim() || !phone.trim()) {
      setSubmitError('Please complete all required business and contact fields.');
      return;
    }
    if (!agreedToTerms) {
      setSubmitError('Please accept the Nordic Exhibitor terms and venue safety conditions.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Simulate direct payment processing (Swish or 3DS Card)
      await new Promise(resolve => setTimeout(resolve, 1400));

      const transactionId = paymentMethod === 'swish'
        ? `SWISH-${Math.floor(100000 + Math.random() * 900000)}`
        : `CARD-${Math.floor(100000 + Math.random() * 900000)}`;

      const newBooking = await api.saveVendorEventBooking({
        event_id: selectedEvent.id,
        event_title: selectedEvent.title,
        event_date: selectedEvent.start_date,
        event_city: selectedEvent.city,
        event_location: selectedEvent.location_name,

        vendor_id: user?.role === 'VENDOR' ? user.id : undefined,
        user_id: user?.id,
        business_name: businessName.trim(),
        contact_name: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        category,
        website: website.trim(),
        socials: socials.trim(),
        payer_company_vat: companyVat.trim(),

        booth_package_id: selectedPackage.id,
        booth_package_name: selectedPackage.name,
        price: selectedPackage.price,
        currency: selectedPackage.currency,
        selected_table_id: selectedTableSlot.id,
        selected_table_number: selectedTableSlot.table_number,
        assigned_booth: selectedTableSlot.table_number,

        power_needed: powerNeeded,
        power_type: powerNeeded ? powerType : 'none',
        tables_count: tablesCount,
        chairs_count: chairsCount,
        staff_count: staffCount,
        special_requests: specialRequests.trim(),
        showcase_pitch: showcasePitch.trim(),

        // Direct payment settlement
        payment_method: paymentMethod,
        payment_status: 'PAID_IN_FULL',
        payment_transaction_id: transactionId,
        payment_date: new Date().toISOString(),
        subtotal: calculation.netSubtotal,
        vat_amount: calculation.vatMoms,

        status: 'CONFIRMED',
        admin_notes: `Direct payment verified via ${paymentMethod.toUpperCase()} (${transactionId}). Table ${selectedTableSlot.table_number} confirmed.`
      });

      // Update state and refresh floorplan
      setAllBookings(prev => [newBooking, ...prev]);
      setSubmitSuccess(newBooking);
      loadMarketLayout(selectedEvent.id);
    } catch (err: any) {
      console.error('Failed to process payment and submit booking:', err);
      setSubmitError(err.message || 'Payment processing failed. Please check your payment details.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getStatusBadge = (status: EventBookingStatus, paymentStatus?: BookingPaymentStatus) => {
    if (paymentStatus === 'PAID_IN_FULL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confirmed & Paid
        </span>
      );
    }
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confirmed
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
            <Check className="w-3.5 h-3.5 text-sky-600" /> Approved
          </span>
        );
      case 'WAITLIST':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            <Clock className="w-3.5 h-3.5 text-purple-600" /> Waitlist
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
            <X className="w-3.5 h-3.5 text-red-600" /> Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-sky-600 animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest font-bold text-slate-400">
          Loading event booking & market layout portal...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 text-slate-800">
      {/* Hero Banner Header */}
      <section className="relative bg-slate-900 text-white overflow-hidden py-14 sm:py-18 border-b border-slate-800">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-xs font-bold uppercase tracking-widest mb-3">
                <Store className="w-3.5 h-3.5 text-sky-400" />
                Live Exhibitor Booking & Direct Payment
              </div>
              <h1 className="font-brand text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-white leading-tight">
                Event Stall & <span className="text-sky-400">Table Reservation</span>
              </h1>
              <p className="mt-3 text-slate-300 text-xs sm:text-sm leading-relaxed font-light">
                Select your upcoming Nordic event, pick your preferred exhibitor table directly on the interactive floorplan, configure your electrical requirements, and confirm instantly with Swish or Card.
              </p>
            </div>

            {/* Quick Action Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700 flex items-center shadow-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab('book')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'book'
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Map className="w-4 h-4" /> Floorplan & Booking
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('my-bookings')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'my-bookings'
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>My Bookings</span>
                  {userBookings.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-sky-400/20 text-sky-300 text-[10px] font-extrabold flex items-center justify-center">
                      {userBookings.length}
                    </span>
                  )}
                </button>
              </div>

              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin/bookings"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md"
                >
                  <Shield className="w-4 h-4" />
                  Administer Stalls & Layout
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <AnimatePresence mode="wait">
          {/* TAB 1: BOOKING & FLOORPLAN TABLE PICKER */}
          {activeTab === 'book' && (
            <motion.div
              key="book-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-12"
            >
              {/* Payment Success Alert Card */}
              {submitSuccess && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-top-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-widest mb-1">
                          Payment Confirmed • Table Locked
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                          {submitSuccess.selected_table_number || submitSuccess.assigned_booth} Reserved & Paid in Full!
                        </h3>
                        <p className="text-slate-600 text-sm mt-1">
                          Booking Ref: <strong className="font-mono text-slate-900 bg-emerald-100 px-2 py-0.5 rounded">{submitSuccess.booking_ref}</strong> • Transaction: <span className="font-mono text-slate-700">{submitSuccess.payment_transaction_id}</span>
                        </p>
                        <p className="text-slate-500 text-xs mt-2">
                          Your reservation has been confirmed in the market layout for <strong>{submitSuccess.event_title}</strong>. A receipt and official VAT Tax Invoice have been generated.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewingInvoice(submitSuccess)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold uppercase tracking-wider transition-all shadow-md"
                      >
                        <Receipt className="w-4 h-4" /> Tax Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingBooking(submitSuccess)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold uppercase tracking-wider transition-all shadow-md"
                      >
                        <Printer className="w-4 h-4" /> Exhibitor Pass
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: CHOOSE UPCOMING EVENT */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-600 mb-1">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-mono text-[11px] font-bold">1</span>
                      Select Showcase
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Choose an Upcoming Event</h2>
                    <p className="text-slate-500 text-xs sm:text-sm">
                      Select which fair or showcase you wish to exhibit at.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search event title or city..."
                        value={eventSearch}
                        onChange={e => setEventSearch(e.target.value)}
                        className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <select
                      value={selectedCity}
                      onChange={e => setSelectedCity(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="ALL">All Cities</option>
                      <option value="Stockholm">Stockholm</option>
                      <option value="Gothenburg">Gothenburg</option>
                      <option value="Malmö">Malmö</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredEvents.map(event => {
                    const isSelected = selectedEventId === event.id;
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEventId(event.id)}
                        className={`group cursor-pointer rounded-2xl border-2 transition-all p-4 relative overflow-hidden bg-white flex flex-col justify-between ${
                          isSelected
                            ? 'border-sky-600 shadow-lg ring-2 ring-sky-500/20'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-sm">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div>
                          <div className="relative h-32 rounded-xl overflow-hidden mb-3 bg-slate-100">
                            <img
                              src={event.image_url}
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider">
                              {event.category}
                            </div>
                          </div>

                          <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">
                            {event.title}
                          </h3>

                          <div className="mt-2 space-y-1 text-slate-500 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{event.start_date}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{event.city} • {event.location_name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Floorplan Active
                          </span>
                          <span className={`text-xs font-bold ${isSelected ? 'text-sky-600' : 'text-slate-700'}`}>
                            {isSelected ? 'Selected' : 'Select Event'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: CHOOSE BOOTH PACKAGE */}
              <div>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-600 mb-1">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-mono text-[11px] font-bold">2</span>
                      Choose Booth Package
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Select Exhibitor Booth Package</h2>
                    <p className="text-slate-500 text-xs sm:text-sm">
                      Transparent pricing with booth construction, furniture, pass badges, and directory promotion.
                    </p>
                  </div>

                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin/bookings"
                      className="text-xs text-sky-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" /> Customize Packages in Admin
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {boothPackages.map(pkg => {
                    const isSelected = selectedPackageId === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`cursor-pointer rounded-2xl border-2 transition-all p-5 relative flex flex-col justify-between bg-white ${
                          isSelected
                            ? 'border-sky-600 shadow-xl ring-4 ring-sky-500/10'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        {pkg.badge && (
                          <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                            {pkg.badge}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {pkg.dimensions}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>

                          <h3 className="font-bold text-slate-900 text-base leading-tight">
                            {pkg.name}
                          </h3>

                          <div className="mt-3 flex items-baseline gap-1">
                            <span className="text-2xl font-extrabold text-slate-900 font-mono">
                              {pkg.price.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-slate-500">{pkg.currency}</span>
                          </div>

                          <p className="mt-2 text-slate-500 text-xs leading-relaxed">
                            {pkg.description}
                          </p>

                          <ul className="mt-4 space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                            {pkg.features.slice(0, 3).map((f, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-5 pt-3">
                          <button
                            type="button"
                            className={`w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                              isSelected
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Choose Package'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: NUMBERED TABLES DIRECTORY & OPTIONAL FLOORPLAN REFERENCE */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-600 mb-1">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-mono text-[11px] font-bold">3</span>
                      <span>Table & Stall Selection</span>
                      {(selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                          <ImageIcon className="w-3 h-3 text-emerald-600" />
                          <span>Venue Blueprint Reference Available</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          <Store className="w-3 h-3 text-amber-600" />
                          <span>Numbered Stall Directory Mode (No Map Needed)</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Choose Your Table / Stall Number</h2>
                    <p className="text-slate-500 text-xs sm:text-sm">
                      Select your desired stall number directly from the directory below without fragile pin coordinates.
                      {(selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url) && showMapOption && " You can also consult the venue layout blueprint for hall orientation."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      {sortedDisplaySlots.filter(s => s.status === 'available').length} of {activeTableSlots.length} Stalls Open
                    </span>

                    {(selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url) && (
                      <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setShowMapOption(false)}
                          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                            !showMapOption
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Display full-width table directory only"
                        >
                          <Store className="w-3.5 h-3.5 text-amber-600" />
                          <span>Directory Only</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowMapOption(true)}
                          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                            showMapOption
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Show blueprint guide alongside table list"
                        >
                          <Map className="w-3.5 h-3.5 text-sky-600" />
                          <span>With Blueprint</span>
                        </button>
                      </div>
                    )}

                    {(selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url) && showMapOption && (
                      <button
                        type="button"
                        onClick={() => setShowMapOption(false)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                        title="Remove map reference view to display only tables"
                      >
                        <X className="w-3.5 h-3.5 text-rose-500" />
                        <span>Remove Map View</span>
                      </button>
                    )}

                    {(selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url) && showMapOption && (
                      <button
                        type="button"
                        onClick={() => setIsFullscreenMapOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        title="Open Fullscreen Blueprint"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Expand Blueprint</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* If map is hidden or unavailable, show a top selection summary banner when a table is chosen */}
                {(!showMapOption || !(selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url)) && selectedTableSlot && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50 via-sky-100/70 to-emerald-50 border-2 border-sky-400 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                        {selectedTableSlot.table_number.replace(/^Table\s*/i, '')}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-200/80 px-2 py-0.5 rounded-md inline-block">
                          ✓ Chosen Table
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-base mt-0.5">
                          {selectedTableSlot.table_number} • <span className="font-semibold text-slate-600 text-sm">{selectedTableSlot.zone}</span>
                        </h4>
                        <p className="text-slate-500 text-xs">
                          {selectedTableSlot.size || 'Standard Table'} {selectedTableSlot.power_included && '• ⚡ 230V Included'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900 font-mono block">
                          {selectedTableSlot.price_sek ? `${selectedTableSlot.price_sek.toLocaleString()} SEK` : 'Included'}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700">Ready to Book</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const detailsElem = document.getElementById('exhibitor-details-section');
                          if (detailsElem) detailsElem.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <span>Next: Details & Payment</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Responsive Layout: Clean Blueprint Reference (Left) + Table Directory (Right or Full) */}
                <div className={`grid grid-cols-1 ${showMapOption && (selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url) ? 'lg:grid-cols-12' : 'grid-cols-1'} gap-6 items-start`}>
                  
                  {/* LEFT: CLEAN BLUEPRINT REFERENCE CARD & CURRENT SELECTION SUMMARY (NO FRAGILE PINS) */}
                  {showMapOption && (selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url) && (
                    <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
                      {/* Blueprint Container */}
                      <div className="bg-slate-950 rounded-3xl p-4 sm:p-5 border border-slate-800 text-white shadow-xl flex flex-col">
                        <div className="flex flex-col gap-2 pb-3 border-b border-slate-800 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Map className="w-4 h-4 text-amber-400" />
                              <span className="font-bold text-slate-200">Venue Blueprint Reference</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setShowMapOption(false)}
                                className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 text-[11px] font-bold border border-slate-800 flex items-center gap-1 transition-all"
                                title="Remove map view"
                              >
                                <X className="w-3 h-3" />
                                <span>Remove Map</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setIsFullscreenMapOpen(true)}
                                className="px-2.5 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                title="Open Fullscreen Blueprint"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Expand</span>
                              </button>
                            </div>
                          </div>

                          {/* Prominent Zoom & View Controls Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={handleZoomOut}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow-sm active:scale-95 transition-all"
                                title="Zoom Out (-)"
                              >
                                <ZoomOut className="w-4 h-4 text-sky-400" />
                                <span>Zoom Out</span>
                              </button>

                              <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs font-black min-w-[50px] text-center shadow-inner">
                                {Math.round(mapZoom * 100)}%
                              </span>

                              <button
                                type="button"
                                onClick={handleZoomIn}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow-sm active:scale-95 transition-all"
                                title="Zoom In (+)"
                              >
                                <ZoomIn className="w-4 h-4 text-emerald-400" />
                                <span>Zoom In</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={handleResetZoom}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-700 flex items-center gap-1 active:scale-95 transition-all"
                                title="Reset zoom to see full map"
                              >
                                <RotateCcw className="w-3 h-3 text-slate-400" />
                                <span>Fit Full</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setMapFitMode(m => m === 'contain' ? 'cover' : 'contain')}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-700 active:scale-95 transition-all"
                                title="Toggle Fit to Container vs Fill Frame"
                              >
                                {mapFitMode === 'contain' ? 'Fit View' : 'Fill View'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Small Map Viewport (object-contain so 100% of blueprint is visible cleanly with NO PINS) */}
                        <div
                          onMouseDown={(e) => {
                            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
                            setIsPanning(true);
                            setPanStart({ x: e.clientX, y: e.clientY, initialX: mapPan.x, initialY: mapPan.y });
                          }}
                          onMouseMove={(e) => {
                            if (isPanning) {
                              const dx = e.clientX - panStart.x;
                              const dy = e.clientY - panStart.y;
                              setMapPan({ x: panStart.initialX + dx, y: panStart.initialY + dy });
                            }
                          }}
                          onMouseUp={() => setIsPanning(false)}
                          onMouseLeave={() => setIsPanning(false)}
                          onTouchStart={(e) => {
                            if (e.touches.length === 1) {
                              const t = e.touches[0];
                              setIsPanning(true);
                              setPanStart({ x: t.clientX, y: t.clientY, initialX: mapPan.x, initialY: mapPan.y });
                            }
                          }}
                          onTouchMove={(e) => {
                            if (e.touches.length === 1) {
                              const t = e.touches[0];
                              const dx = t.clientX - panStart.x;
                              const dy = t.clientY - panStart.y;
                              setMapPan({ x: panStart.initialX + dx, y: panStart.initialY + dy });
                            }
                          }}
                          onTouchEnd={() => setIsPanning(false)}
                          className={`relative w-full h-[320px] sm:h-[360px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 mt-3 flex items-center justify-center shadow-inner group select-none ${
                            isPanning ? 'cursor-grabbing' : mapZoom > 1 ? 'cursor-grab' : 'cursor-default'
                          }`}
                        >
                          {/* Top Indicator Badge */}
                          <div className="absolute top-2.5 left-3 z-30 px-2.5 py-1 rounded-xl bg-slate-950/85 text-[10px] font-bold text-slate-300 border border-slate-800 backdrop-blur-sm pointer-events-none flex items-center gap-1.5 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span>Architectural Blueprint Reference {mapZoom > 1 && '• Drag to Pan'}</span>
                          </div>

                          {/* Blueprint Image (CONTAINED so never cut off, NO FRAGILE PINS) */}
                          <div
                            className="absolute inset-0 flex items-center justify-center transition-transform duration-100"
                            style={{
                              transform: `scale(${mapZoom}) translate(${mapPan.x / mapZoom}px, ${mapPan.y / mapZoom}px)`,
                              transformOrigin: 'center center'
                            }}
                          >
                            <img
                              src={selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url}
                              alt="Venue Floorplan"
                              className={`w-full h-full ${mapFitMode === 'contain' ? 'object-contain' : 'object-cover'} object-center select-none pointer-events-none opacity-95`}
                            />
                          </div>

                          {/* Expand map button overlay */}
                          <button
                            type="button"
                            onClick={() => setIsFullscreenMapOpen(true)}
                            className="absolute bottom-3 right-3 z-30 px-3 py-2 rounded-2xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 hover:text-white text-[11px] font-bold backdrop-blur-md border border-slate-700/80 flex items-center gap-1.5 shadow-2xl active:scale-95 transition-all"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                            <span>Expand Full</span>
                          </button>
                        </div>

                        {/* Helper caption */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <span>💡 Consult blueprint to locate halls & rooms</span>
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                            {selectedEvent?.location_name || 'Arena'}
                          </span>
                        </div>
                      </div>

                      {/* Selected Table Card */}
                      {selectedTableSlot ? (
                        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-sky-50 via-sky-100/70 to-emerald-50 border-2 border-sky-400 shadow-md animate-in fade-in space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                                {selectedTableSlot.table_number.replace(/^Table\s*/i, '')}
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-200/80 px-2 py-0.5 rounded-md inline-block">
                                  ✓ Chosen Table
                                </span>
                                <h4 className="font-extrabold text-slate-900 text-base mt-0.5">
                                  {selectedTableSlot.table_number}
                                </h4>
                                <p className="text-slate-600 text-xs">
                                  {selectedTableSlot.zone}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-base font-black text-slate-900 font-mono block">
                                {selectedTableSlot.price_sek ? `${selectedTableSlot.price_sek.toLocaleString()} SEK` : 'Included'}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700">Locked to Book</span>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-sky-200/60 flex items-center justify-between text-xs text-slate-600">
                            <span className="text-[11px]">
                              {selectedTableSlot.size || 'Standard Table'} {selectedTableSlot.power_included && '• ⚡ 230V Included'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const detailsElem = document.getElementById('exhibitor-details-section');
                                if (detailsElem) detailsElem.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="text-xs font-black text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-1"
                            >
                              <span>Next: Details & Payment</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                          <Store className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                          <p className="font-bold text-slate-700">No Table Selected Yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Pick any table number from the directory list on the right.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RIGHT (OR FULL WIDTH): ALL TABLES WITH NUMBERS IN A LIST */}
                  <div className={showMapOption && (selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url) ? "lg:col-span-7 space-y-4" : "w-full space-y-4"}>
                    {/* Search & Filter Toolbar */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Search stall # */}
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search by table number (e.g. 1, 2, B-01)..."
                            value={tableSearchTerm}
                            onChange={e => setTableSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>

                        {/* View Switcher: List vs Number Tiles */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-xs font-bold shadow-sm">
                            <button
                              type="button"
                              onClick={() => setTableDisplayMode('LIST')}
                              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                tableDisplayMode === 'LIST'
                                  ? 'bg-sky-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title="Detailed List of All Tables"
                            >
                              <List className="w-3.5 h-3.5" />
                              <span>List</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTableDisplayMode('TILES')}
                              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                tableDisplayMode === 'TILES'
                                  ? 'bg-sky-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                              title="Compact Number Tiles Grid"
                            >
                              <LayoutGrid className="w-3.5 h-3.5" />
                              <span>Number Tiles</span>
                            </button>
                          </div>

                          {/* Sort Dropdown */}
                          <select
                            value={tableSortOrder}
                            onChange={(e: any) => setTableSortOrder(e.target.value)}
                            className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="number">Sort: Table #</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                          </select>
                        </div>
                      </div>

                      {/* Zone Filter Buttons & Available Checkbox */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-500 mr-1 flex items-center gap-1 text-[11px]">
                            <Filter className="w-3 h-3 text-sky-600" /> Zone:
                          </span>
                          {distinctZones.map(zoneKey => (
                            <button
                              key={zoneKey}
                              type="button"
                              onClick={() => setTableFilterZone(zoneKey)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                                tableFilterZone === zoneKey
                                  ? 'bg-sky-600 text-white shadow-sm'
                                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                              }`}
                            >
                              {zoneKey === 'ALL' ? 'All Zones' : zoneKey}
                            </button>
                          ))}
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold select-none text-xs">
                          <input
                            type="checkbox"
                            checked={onlyShowAvailable}
                            onChange={e => setOnlyShowAvailable(e.target.checked)}
                            className="rounded text-sky-600 focus:ring-sky-500"
                          />
                          <span>Available Only</span>
                        </label>
                      </div>
                    </div>

                    {/* Table Counter */}
                    <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                      <span className="font-semibold">
                        Showing <strong className="text-slate-900">{sortedDisplaySlots.length}</strong> Tables with Numbers
                      </span>
                      <span className="text-emerald-600 font-bold">
                        {sortedDisplaySlots.filter(s => s.status === 'available').length} Open to Choose
                      </span>
                    </div>

                    {/* LIST VIEW vs NUMBER TILES VIEW */}
                    {sortedDisplaySlots.length === 0 ? (
                      <div className="p-10 rounded-3xl bg-slate-50 border border-slate-200 text-center text-slate-500 space-y-2">
                        <Store className="w-8 h-8 text-slate-400 mx-auto" />
                        <h4 className="font-bold text-slate-700 text-sm">No Tables Match Filter</h4>
                        <p className="text-xs text-slate-400">
                          Try adjusting your search query or selecting 'All Zones'.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setTableSearchTerm('');
                            setTableFilterZone('ALL');
                            setOnlyShowAvailable(false);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-sm"
                        >
                          Reset Filters
                        </button>
                      </div>
                    ) : tableDisplayMode === 'LIST' ? (
                      /* DETAILED ROW-BY-ROW NUMBERED TABLE LIST */
                      <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1.5 custom-scrollbar">
                        {sortedDisplaySlots.map(slot => {
                          const isSelected = selectedTableSlot?.id === slot.id || selectedTableSlot?.table_number === slot.table_number;
                          const isBooked = slot.status === 'booked';
                          const isReserved = slot.status === 'reserved';

                          return (
                            <div
                              key={slot.id}
                              onClick={() => !isBooked && !isReserved && handleSelectTable(slot)}
                              className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none ${
                                isBooked
                                  ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed text-slate-400'
                                  : isReserved
                                  ? 'bg-amber-50/60 border-amber-200 opacity-70 cursor-not-allowed text-amber-800'
                                  : isSelected
                                  ? 'bg-sky-50/80 border-sky-600 shadow-md ring-2 ring-sky-500/20 cursor-pointer'
                                  : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-sky-300 cursor-pointer shadow-sm'
                              }`}
                            >
                              {/* Left: Number Badge & Details */}
                              <div className="flex items-center gap-3.5">
                                {/* Bold Table Number Badge */}
                                <div
                                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono font-black text-sm shrink-0 border ${
                                    isSelected
                                      ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                                      : isBooked
                                      ? 'bg-slate-200 text-slate-500 border-slate-300'
                                      : 'bg-slate-100 text-slate-800 border-slate-200'
                                  }`}
                                >
                                  <span className="text-[9px] uppercase tracking-widest text-slate-400 font-sans font-bold leading-none">NO.</span>
                                  <span className="leading-none mt-0.5">{slot.table_number.replace(/^Table\s*/i, '')}</span>
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className={`font-black text-sm ${isSelected ? 'text-sky-900' : 'text-slate-900'}`}>
                                      {slot.table_number}
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                      {slot.zone.split(' - ')[0]}
                                    </span>
                                    {slot.power_included && (
                                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5">
                                        <Zap className="w-2.5 h-2.5 text-amber-500" /> 230V
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-2">
                                    <span>{slot.size || 'Standard Stall'}</span>
                                    <span>•</span>
                                    <span className="truncate max-w-xs">{slot.description}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Price & Selection Button */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                                <div className="text-left sm:text-right">
                                  <span className="font-mono font-extrabold text-sm text-slate-900 block leading-tight">
                                    {slot.price_sek ? `${slot.price_sek.toLocaleString()} SEK` : 'Package Rate'}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    {isBooked ? 'Unavailable' : 'Moms Included'}
                                  </span>
                                </div>

                                {isSelected ? (
                                  <button
                                    type="button"
                                    className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Selected</span>
                                  </button>
                                ) : isBooked ? (
                                  <span className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold flex items-center gap-1 border border-slate-200">
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Booked</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectTable(slot);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-white hover:bg-sky-600 text-sky-700 hover:text-white border-2 border-sky-600 text-xs font-bold transition-all shadow-sm active:scale-95"
                                  >
                                    Choose Table
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* COMPACT NUMBER TILES GRID */
                      <div className={`grid ${showMapOption && (selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url) ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'} gap-3 max-h-[640px] overflow-y-auto pr-1.5 custom-scrollbar`}>
                        {sortedDisplaySlots.map(slot => {
                          const isSelected = selectedTableSlot?.id === slot.id || selectedTableSlot?.table_number === slot.table_number;
                          const isBooked = slot.status === 'booked';
                          const isReserved = slot.status === 'reserved';

                          return (
                            <div
                              key={slot.id}
                              onClick={() => !isBooked && !isReserved && handleSelectTable(slot)}
                              className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between text-left select-none relative ${
                                isBooked
                                  ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed text-slate-400'
                                  : isReserved
                                  ? 'bg-amber-50 border-amber-200 opacity-70 cursor-not-allowed text-amber-800'
                                  : isSelected
                                  ? 'bg-sky-600 text-white border-sky-600 shadow-xl scale-102 ring-4 ring-sky-500/20 cursor-pointer'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-sky-400 cursor-pointer shadow-sm'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${isSelected ? 'text-sky-200' : 'text-slate-400'}`}>
                                    {slot.zone.split(' - ')[0]}
                                  </span>
                                  <h4 className={`font-black text-base mt-0.5 font-mono ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                    {slot.table_number}
                                  </h4>
                                </div>

                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-white text-sky-600 flex items-center justify-center font-bold">
                                    <Check className="w-3 h-3" />
                                  </div>
                                ) : isBooked ? (
                                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                                    <Lock className="w-3 h-3" />
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    Open
                                  </span>
                                )}
                              </div>

                              <div className={`mt-3 pt-2 border-t text-[11px] flex items-center justify-between ${isSelected ? 'border-sky-500/50 text-sky-100' : 'border-slate-100 text-slate-600'}`}>
                                <span className="font-mono font-bold">
                                  {slot.price_sek ? `${slot.price_sek} kr` : 'Package'}
                                </span>
                                {slot.power_included && (
                                  <Zap className={`w-3 h-3 ${isSelected ? 'text-amber-300' : 'text-amber-500'}`} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* STEP 4: BUSINESS DETAILS & TECHNICAL REQUIREMENTS */}
              <div id="exhibitor-details-section" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-600 mb-1">
                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-mono text-[11px] font-bold">4</span>
                    Exhibitor Specifications
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Your Business Details & Equipment</h2>
                  <p className="text-slate-500 text-xs sm:text-sm">
                    Enter the official business and logistical information that will appear on your venue badge and exhibitor catalogue.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Business / Brand Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        placeholder="e.g. Stockholm Lumière Studio"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Contact Person <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={e => {
                          setContactName(e.target.value);
                          if (!cardHolder) setCardHolder(e.target.value);
                        }}
                        placeholder="e.g. Elias Bergström"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="elias@studio.se"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => {
                          setPhone(e.target.value);
                          setSwishPhone(e.target.value);
                        }}
                        placeholder="+46 70 123 45 67"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Craft / Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    >
                      {Object.values(VendorCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Company Org / VAT No. (For Tax Invoice)
                    </label>
                    <input
                      type="text"
                      value={companyVat}
                      onChange={e => setCompanyVat(e.target.value)}
                      placeholder="e.g. SE556123456701"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                  </div>
                </div>

                {/* Electrical & Furniture Allotment */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide">
                      Venue Electrical Feed & Equipment
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Power Outlet
                      </label>
                      <select
                        value={powerType}
                        onChange={e => {
                          const val = e.target.value as any;
                          setPowerType(val);
                          setPowerNeeded(val !== 'none');
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800"
                      >
                        <option value="standard_230v">Standard 230V / 10A (Included)</option>
                        <option value="high_load_400v">Heavy Load 400V 3-Phase</option>
                        <option value="none">No Electricity</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Tables ({tablesCount})
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={tablesCount}
                        onChange={e => setTablesCount(parseInt(e.target.value))}
                        className="w-full accent-sky-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Chairs ({chairsCount})
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="6"
                        value={chairsCount}
                        onChange={e => setChairsCount(parseInt(e.target.value))}
                        className="w-full accent-sky-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Staff Passes ({staffCount})
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="6"
                        value={staffCount}
                        onChange={e => setStaffCount(parseInt(e.target.value))}
                        className="w-full accent-sky-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 5: DIRECT PAYMENT CHECKOUT */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 sm:p-10 shadow-lg space-y-8">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-600 mb-1">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-[11px] font-bold">5</span>
                    Direct Payment & Confirmation
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Direct Exhibitor Payment Checkout</h2>
                  <p className="text-slate-500 text-xs sm:text-sm">
                    Settle booth fees directly to instantly guarantee your table number and receive your official VAT receipt.
                  </p>
                </div>

                {/* Itemized Calculation Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Reserved Table</span>
                    <p className="text-lg font-bold text-slate-900">
                      {selectedTableSlot?.table_number || 'No table selected'}
                    </p>
                    <p className="text-xs text-slate-500">{selectedPackage?.name}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Tax Breakdown (25% Swedish Moms)</span>
                    <p className="text-xs text-slate-700 mt-1">
                      Net: <strong>{calculation.netSubtotal.toLocaleString()} SEK</strong>
                    </p>
                    <p className="text-xs text-slate-700">
                      Moms (25%): <strong>{calculation.vatMoms.toLocaleString()} SEK</strong>
                    </p>
                  </div>

                  <div className="md:text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Payable Now</span>
                    <p className="text-3xl font-black font-mono text-slate-900">
                      {calculation.grossPrice.toLocaleString()} <span className="text-sm font-bold text-slate-600">SEK</span>
                    </p>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    Choose Direct Payment Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Swish Option */}
                    <div
                      onClick={() => setPaymentMethod('swish')}
                      className={`cursor-pointer rounded-2xl border-2 p-4 flex items-center gap-3 transition-all ${
                        paymentMethod === 'swish'
                          ? 'border-sky-600 bg-sky-50/50 shadow-md ring-2 ring-sky-500/10'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Swish</h4>
                        <p className="text-[10px] text-slate-500">Instant Swedish Mobile Pay</p>
                      </div>
                    </div>

                    {/* Credit Card Option */}
                    <div
                      onClick={() => setPaymentMethod('card')}
                      className={`cursor-pointer rounded-2xl border-2 p-4 flex items-center gap-3 transition-all ${
                        paymentMethod === 'card'
                          ? 'border-sky-600 bg-sky-50/50 shadow-md ring-2 ring-sky-500/10'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Card</h4>
                        <p className="text-[10px] text-slate-500">Visa, Mastercard, Amex</p>
                      </div>
                    </div>

                    {/* Klarna / Bank Option */}
                    <div
                      onClick={() => setPaymentMethod('klarna')}
                      className={`cursor-pointer rounded-2xl border-2 p-4 flex items-center gap-3 transition-all ${
                        paymentMethod === 'klarna'
                          ? 'border-sky-600 bg-sky-50/50 shadow-md ring-2 ring-sky-500/10'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center font-bold">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Klarna</h4>
                        <p className="text-[10px] text-slate-500">Pay Later / Direct Bank</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Fields according to method */}
                {paymentMethod === 'swish' && (
                  <div className="p-6 rounded-2xl bg-sky-50/40 border border-sky-100 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Swish Mobile Payment</h4>
                        <p className="text-xs text-slate-500">
                          Confirm the Swish phone number or scan the QR code in your Swish app.
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                        <Check className="w-3.5 h-3.5" /> Swish Test Mode Enabled
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Swish Registered Phone Number
                        </label>
                        <input
                          type="tel"
                          value={swishPhone}
                          onChange={e => setSwishPhone(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
                        />
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
                        <QrCode className="w-8 h-8 text-sky-600 shrink-0" />
                        <div>
                          <strong>Recipient:</strong> Creative Events Nordic AB<br />
                          <strong>Amount:</strong> {calculation.grossPrice.toLocaleString()} SEK
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-900 text-sm">Credit or Debit Card Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={e => setCardHolder(e.target.value)}
                          placeholder="Name as printed on card"
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                          CVC / CVV
                        </label>
                        <input
                          type="password"
                          value={cardCvc}
                          onChange={e => setCardCvc(e.target.value)}
                          maxLength={4}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'klarna' && (
                  <div className="p-6 rounded-2xl bg-pink-50/40 border border-pink-200 text-xs text-slate-700">
                    <p className="font-bold text-slate-900 mb-1">Klarna Instant Checkout</p>
                    <p>Pay within 30 days after the event or slice the fee into 3 interest-free monthly installments of {Math.round(calculation.grossPrice / 3).toLocaleString()} SEK.</p>
                  </div>
                )}

                {/* Terms agreement */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-direct-pay"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 mt-1 cursor-pointer"
                  />
                  <label htmlFor="terms-direct-pay" className="text-xs text-slate-600 cursor-pointer">
                    I agree to the Exhibitor Code of Conduct, confirm the selected table number <strong>{selectedTableSlot?.table_number || ''}</strong>, and authorize immediate payment of <strong>{calculation.grossPrice.toLocaleString()} SEK</strong>.
                  </label>
                </div>

                {submitError && (
                  <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Direct Payment Submit Button */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={isProcessingPayment}
                    onClick={handleDirectPaymentAndSubmit}
                    className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-sky-600 text-white font-extrabold text-xs uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl flex items-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Direct Payment...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Pay {calculation.grossPrice.toLocaleString()} SEK & Lock Table</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: MY BOOKINGS & INVOICES */}
          {activeTab === 'my-bookings' && (
            <motion.div
              key="my-bookings-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Your Reserved Event Stalls & Receipts</h2>
                  <p className="text-slate-500 text-xs sm:text-sm">
                    Review assigned table numbers, download official Swedish VAT Tax Invoices, and print your exhibitor pass.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('book')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-sky-600 transition-all shadow-md self-start"
                >
                  <Store className="w-4 h-4" /> Book Another Stall
                </button>
              </div>

              {userBookings.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                    <Store className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No Reserved Stalls Found</h3>
                  <p className="text-slate-500 text-xs max-w-md mx-auto mt-2">
                    {user 
                      ? "You haven't booked any stalls on the market layout yet. Choose an event and pick your table to complete payment."
                      : "Sign in with your vendor account to track your submitted applications, or browse upcoming events to pick your table."
                    }
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('book')}
                      className="px-6 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-sky-500 transition-all shadow-md"
                    >
                      Browse Floorplans & Book
                    </button>
                    {!user && (
                      <Link
                        to="/login"
                        className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md"
                      >
                        Sign In
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {userBookings.map(booking => (
                    <div
                      key={booking.id}
                      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {booking.booking_ref}
                          </span>
                          {getStatusBadge(booking.status, booking.payment_status)}
                          {(booking.selected_table_number || booking.assigned_booth) && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                              {booking.selected_table_number || booking.assigned_booth}
                            </span>
                          )}
                          {booking.payment_method && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                              Paid via {booking.payment_method}
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {booking.event_title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {booking.event_date}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {booking.event_city} • {booking.event_location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5 text-slate-400" />
                              {booking.booth_package_name}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-xl">
                          <span className="font-semibold text-slate-700">Exhibitor: </span>
                          {booking.business_name} ({booking.contact_name}) • {booking.showcase_pitch || 'Standard vendor presentation.'}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-end md:self-center">
                        <div className="text-right mr-2">
                          <div className="text-xs text-slate-400 uppercase font-bold">Total Settled</div>
                          <div className="text-base font-bold font-mono text-slate-900">
                            {booking.price.toLocaleString()} {booking.currency}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewingInvoice(booking)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                        >
                          <Receipt className="w-3.5 h-3.5 text-slate-600" /> Tax Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingBooking(booking)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-sky-600 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" /> Pass Voucher
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL: OFFICIAL VAT TAX INVOICE */}
      <AnimatePresence>
        {viewingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-800"
            >
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white">
                <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
                  <div>
                    <span className="font-brand text-xs font-extrabold uppercase tracking-widest text-slate-900">
                      Creative Events Nordic AB
                    </span>
                    <h3 className="text-xl font-black uppercase text-slate-900 mt-1">
                      VAT Tax Invoice / Kvitto
                    </h3>
                    <p className="text-xs text-slate-500">Org.nr: 559123-4567 • MOMS: SE559123456701</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Invoice No.</span>
                    <p className="font-mono font-bold text-sm text-slate-900">{viewingInvoice.booking_ref}-INV</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{viewingInvoice.payment_date ? viewingInvoice.payment_date.split('T')[0] : 'Paid'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 text-xs mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Billed To</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{viewingInvoice.business_name}</p>
                    <p className="text-slate-600">{viewingInvoice.contact_name}</p>
                    <p className="text-slate-600">{viewingInvoice.email} • {viewingInvoice.phone}</p>
                    {viewingInvoice.payer_company_vat && (
                      <p className="text-slate-500 mt-1">VAT/Org: {viewingInvoice.payer_company_vat}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Event & Table Allocation</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{viewingInvoice.event_title}</p>
                    <p className="text-slate-600">{viewingInvoice.event_city} • {viewingInvoice.event_date}</p>
                    <p className="font-bold text-sky-700 mt-1">
                      Assigned: {viewingInvoice.selected_table_number || viewingInvoice.assigned_booth}
                    </p>
                  </div>
                </div>

                <table className="w-full text-xs mb-6 border-t border-b border-slate-200">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 text-left">Description</th>
                      <th className="py-2.5 text-right">Net</th>
                      <th className="py-2.5 text-right">MOMS (25%)</th>
                      <th className="py-2.5 text-right">Gross Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3">
                        <strong className="text-slate-900">{viewingInvoice.booth_package_name}</strong>
                        <div className="text-[11px] text-slate-400">Includes table allotment, electrical feed & directory promotion</div>
                      </td>
                      <td className="py-3 text-right font-mono">{(viewingInvoice.subtotal || Math.round(viewingInvoice.price * 0.8)).toLocaleString()} SEK</td>
                      <td className="py-3 text-right font-mono">{(viewingInvoice.vat_amount || Math.round(viewingInvoice.price * 0.2)).toLocaleString()} SEK</td>
                      <td className="py-3 text-right font-mono font-bold">{viewingInvoice.price.toLocaleString()} SEK</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex items-center justify-between text-xs p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Payment Status: Settle in Full ({viewingInvoice.payment_method?.toUpperCase() || 'DIRECT'})</span>
                  </div>
                  <div className="font-mono text-emerald-900 font-bold">
                    {viewingInvoice.payment_transaction_id}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-sky-600 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EXHIBITOR PASS VOUCHER */}
      <AnimatePresence>
        {viewingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setViewingBooking(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-4 border-slate-900 rounded-2xl p-6 sm:p-8 bg-slate-50 relative">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                  <div>
                    <span className="font-brand text-xs font-extrabold uppercase tracking-widest text-slate-900">
                      Creative Events Nordic
                    </span>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                      Official Exhibitor Pass
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Booking Ref</span>
                    <p className="font-mono font-bold text-sm text-slate-900">{viewingBooking.booking_ref}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs mb-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Event</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{viewingBooking.event_title}</p>
                    <p className="text-slate-500 mt-0.5">{viewingBooking.event_date} • {viewingBooking.event_city}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Assigned Table / Stall</p>
                    <p className="font-bold text-sky-700 text-sm mt-0.5">
                      {viewingBooking.selected_table_number || viewingBooking.assigned_booth}
                    </p>
                    <p className="text-slate-500 mt-0.5">{viewingBooking.booth_package_name}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Business / Brand</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingBooking.business_name}</p>
                    <p className="text-slate-500">{viewingBooking.contact_name} ({viewingBooking.phone})</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Payment Status</p>
                    <div className="mt-1">{getStatusBadge(viewingBooking.status, viewingBooking.payment_status)}</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-1 mb-6">
                  <p><strong>Power Feed:</strong> {viewingBooking.power_needed ? (viewingBooking.power_type === 'high_load_400v' ? '400V 3-Phase Approved' : 'Standard 230V Included') : 'None Requested'}</p>
                  <p><strong>Furniture Allotment:</strong> {viewingBooking.tables_count} Tables, {viewingBooking.chairs_count} Chairs, {viewingBooking.staff_count} Staff Lanyards</p>
                  {viewingBooking.admin_notes && (
                    <p className="text-slate-500 italic pt-1"><strong>Logistics Note:</strong> {viewingBooking.admin_notes}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200 pt-3">
                  <span>Present this voucher at Venue Exhibitor Check-In Desk</span>
                  <span>Creative Events Stockholm HQ</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-sky-600 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Pass
                </button>
                <button
                  type="button"
                  onClick={() => setViewingBooking(null)}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EXPANDED FULLSCREEN FLOORPLAN MAP MODAL ───────────────────────── */}
      <AnimatePresence>
        {isFullscreenMapOpen && (
          <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 max-w-6xl w-full rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-white"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold uppercase tracking-wider">
                      Interactive Venue Blueprint
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {selectedEvent?.location_name}, {selectedEvent?.city}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {selectedEvent?.title} — Floorplan & Stall Layout
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl text-xs font-bold mr-2 border border-slate-700">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      className="px-2 py-1 rounded-lg hover:bg-slate-700 text-sky-400 flex items-center gap-1 transition-all"
                      title="Zoom Out (-)"
                    >
                      <ZoomOut className="w-4 h-4" />
                      <span className="hidden sm:inline">Zoom Out</span>
                    </button>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-amber-300 font-mono text-xs font-black min-w-[45px] text-center border border-slate-700">
                      {Math.round(mapZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      className="px-2 py-1 rounded-lg hover:bg-slate-700 text-emerald-400 flex items-center gap-1 transition-all"
                      title="Zoom In (+)"
                    >
                      <ZoomIn className="w-4 h-4" />
                      <span className="hidden sm:inline">Zoom In</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      className="px-2 py-1 rounded-lg hover:bg-slate-700 text-slate-300 text-[11px] transition-all"
                      title="Fit Entire Map"
                    >
                      Fit 100%
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapFitMode(m => m === 'contain' ? 'cover' : 'contain')}
                      className={`px-2 py-1 rounded-lg text-[11px] transition-all font-bold ${
                        mapFitMode === 'contain'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                      title="Toggle Full Blueprint View vs Fill Frame"
                    >
                      {mapFitMode === 'contain' ? 'See Full Map' : 'Fill View'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFullscreenMapOpen(false)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Fullscreen Canvas (Clean Blueprint Viewer, NO FRAGILE PINS) */}
              <div className="relative flex-1 min-h-[500px] max-h-[75vh] overflow-auto bg-slate-950 p-6 flex items-center justify-center">
                <div
                  className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 transition-transform duration-200 flex items-center justify-center"
                  style={{ transform: `scale(${mapZoom})`, transformOrigin: 'center center' }}
                >
                  {(selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url) ? (
                    <img
                      src={selectedEvent?.floor_plan_image_url || marketLayout?.map_image_url}
                      alt="Venue Floorplan Blueprint"
                      className={`w-full h-full ${mapFitMode === 'contain' ? 'object-contain' : 'object-cover'} object-center select-none pointer-events-none opacity-95`}
                    />
                  ) : (
                    <div className="text-center p-8 text-slate-400">
                      <Map className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-white">No Blueprint Image Attached</p>
                      <p className="text-xs text-slate-400 mt-1">Please refer to the table directory list to pick your stall number.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer with Selection Callout */}
              <div className="p-5 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedTableSlot ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                        {selectedTableSlot.table_number.replace('Table ', '')}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-sky-400">Selected Stall</p>
                        <h4 className="font-extrabold text-white text-base">
                          {selectedTableSlot.table_number} • {selectedTableSlot.zone}
                        </h4>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Refer to the blueprint for room orientation, then select your table number from the directory list.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullscreenMapOpen(false);
                      const detailsElem = document.getElementById('exhibitor-details-section');
                      if (detailsElem) {
                        detailsElem.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <span>Confirm Stall & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorEventBookings;
