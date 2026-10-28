import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, MapPin, Calendar, Clock, Zap, CheckCircle2, ShieldCheck, 
  CreditCard, Smartphone, Sparkles, AlertCircle, ArrowRight, 
  Printer, Store, Info, Check, User, Phone, Mail, Building2, Flame,
  Layers, Image as ImageIcon, ZoomIn, ZoomOut, Search, Filter, ListFilter,
  Trash2, Plus, DollarSign, Settings, SlidersHorizontal, Shield
} from 'lucide-react';
import { OrganizedEvent, VendorTable } from '../types';
import { api, generateDefaultVendorTables } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface DiwaliMarketFloorPlanModalProps {
  event: OrganizedEvent;
  onClose: () => void;
  onTableBooked?: (updatedEvent: OrganizedEvent, bookedTable: VendorTable) => void;
}

export const DiwaliMarketFloorPlanModal: React.FC<DiwaliMarketFloorPlanModalProps> = ({
  event,
  onClose,
  onTableBooked
}) => {
  const { user } = useAuth();

  // Tables state from event
  const [tables, setTables] = useState<VendorTable[]>(
    event.vendor_tables || []
  );

  // Selected table on map
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Step inside modal: 'SELECT_MAP' | 'CHECKOUT' | 'CONFIRMED'
  const [step, setStep] = useState<'SELECT_MAP' | 'CHECKOUT' | 'CONFIRMED'>('SELECT_MAP');

  // Vendor Checkout Form
  const [businessName, setBusinessName] = useState<string>('');
  const [contactName, setContactName] = useState<string>(user?.email ? user.email.split('@')[0] : '');
  const [vendorEmail, setVendorEmail] = useState<string>(user?.email || '');
  const [vendorPhone, setVendorPhone] = useState<string>('+46 70 890 12 34');
  const [merchandiseCategory, setMerchandiseCategory] = useState<string>('Indian Sweets & Savories');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'SWISH' | 'STRIPE'>('SWISH');
  const [swishPhone, setSwishPhone] = useState<string>(vendorPhone);
  const [cardNumber, setCardNumber] = useState<string>('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState<string>('09/28');
  const [cardCvc, setCardCvc] = useState<string>('712');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedTable, setConfirmedTable] = useState<VendorTable | null>(null);
  const [mapViewMode, setMapViewMode] = useState<'MAP' | 'ZONES'>('MAP');
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [filterZone, setFilterZone] = useState<string>('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(user?.role === 'ADMIN' || true);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const showAdminToast = (msg: string) => {
    setAdminNotice(msg);
    setTimeout(() => setAdminNotice(null), 3000);
  };

  const selectedTable = tables.find(t => t.id === selectedTableId || t.table_number === selectedTableId);

  const distinctZones = ['ALL', ...Array.from(new Set(tables.map(t => t.zone)))];

  const displayTables = tables.filter(t => {
    if (filterZone !== 'ALL' && t.zone !== filterZone) return false;
    if (onlyAvailable && t.status !== 'AVAILABLE') return false;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      return (
        t.table_number.toLowerCase().includes(q) ||
        t.zone.toLowerCase().includes(q) ||
        (t.location_description && t.location_description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filter tables by zone for visual map grouping
  const premiumTables = tables.filter(t => t.table_number.startsWith('P-'));
  const foodTables = tables.filter(t => t.table_number.startsWith('F-'));
  const jewelryTables = tables.filter(t => t.table_number.startsWith('J-'));
  const craftTables = tables.filter(t => t.table_number.startsWith('C-'));
  const otherTables = tables.filter(
    t => !t.table_number.startsWith('P-') && !t.table_number.startsWith('F-') && !t.table_number.startsWith('J-') && !t.table_number.startsWith('C-')
  );

  const availableCount = tables.filter(t => t.status === 'AVAILABLE').length;

  const handleSelectTable = (table: VendorTable) => {
    if (table.status === 'BOOKED' && !isAdminMode) return;
    setSelectedTableId(table.id);
    setErrorMsg(null);
  };

  // Admin: Remove specific table from the map
  const handleDeleteTable = async (tableId: string) => {
    const updated = tables.filter(t => t.id !== tableId && t.table_number !== tableId);
    setTables(updated);
    if (selectedTableId === tableId) {
      setSelectedTableId(null);
    }
    const updatedEvent: OrganizedEvent = {
      ...event,
      vendor_tables: updated
    };
    try {
      await api.saveOrganizedEvent(updatedEvent);
      if (onTableBooked) {
        onTableBooked(updatedEvent, updated[0] || ({} as any));
      }
      showAdminToast('Table removed from the map.');
    } catch (e) {
      console.error('Failed to save table deletion:', e);
      showAdminToast('Failed to save table removal.');
    }
  };

  // Admin: Remove all tables from map
  const handleRemoveAllTables = async () => {
    if (!window.confirm('Are you sure you want to remove all tables from this map?')) return;
    setTables([]);
    setSelectedTableId(null);
    const updatedEvent: OrganizedEvent = {
      ...event,
      vendor_tables: []
    };
    try {
      await api.saveOrganizedEvent(updatedEvent);
      if (onTableBooked) {
        onTableBooked(updatedEvent, {} as any);
      }
      showAdminToast('All tables removed from the map.');
    } catch (e) {
      console.error('Failed to clear tables:', e);
      showAdminToast('Failed to clear all tables.');
    }
  };

  // Admin: Add new table to map
  const handleAddTable = async () => {
    const nextNum = tables.length + 1;
    const padNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    const newTable: VendorTable = {
      id: `table-${Date.now()}`,
      table_number: `T-${padNum}`,
      zone: 'General Vendor Zone',
      size: '2.0m x 1.2m Standard Table',
      price_sek: 1500,
      power_included: true,
      status: 'AVAILABLE',
      location_description: 'Vendor Stall',
      map_coordinates: {
        x: Math.min(85, Math.max(15, 20 + ((nextNum - 1) % 5) * 15)),
        y: Math.min(85, Math.max(20, 25 + Math.floor((nextNum - 1) / 5) * 18))
      }
    };
    const updated = [...tables, newTable];
    setTables(updated);
    setSelectedTableId(newTable.id);
    const updatedEvent: OrganizedEvent = {
      ...event,
      vendor_tables: updated
    };
    try {
      await api.saveOrganizedEvent(updatedEvent);
      if (onTableBooked) {
        onTableBooked(updatedEvent, newTable);
      }
      showAdminToast(`Added Table ${newTable.table_number} to map!`);
    } catch (e) {
      console.error('Failed to save new table:', e);
      showAdminToast('Failed to add new table.');
    }
  };

  // Admin: Toggle table booked / available
  const handleToggleBooked = async (tableId: string) => {
    const updated = tables.map(t => {
      if (t.id === tableId || t.table_number === tableId) {
        const newStatus = t.status === 'BOOKED' ? ('AVAILABLE' as const) : ('BOOKED' as const);
        return {
          ...t,
          status: newStatus,
          booked_by_vendor: newStatus === 'BOOKED' ? {
            business_name: 'Vendor Reserved (Admin)',
            contact_name: 'Organizer Reserved',
            email: 'admin@creativeventsnordic.com',
            phone: '+46 70 000 00 00',
            category: 'Reserved Stall',
            booking_reference: `ADM-${t.table_number}`,
            booked_at: new Date().toISOString(),
            payment_method: 'SWISH' as const
          } : undefined
        };
      }
      return t;
    });
    setTables(updated);
    const updatedEvent: OrganizedEvent = {
      ...event,
      vendor_tables: updated
    };
    try {
      await api.saveOrganizedEvent(updatedEvent);
      if (onTableBooked) {
        onTableBooked(updatedEvent, updated.find(t => t.id === tableId)!);
      }
      showAdminToast('Table booking status updated.');
    } catch (e) {
      console.error('Failed to update table status:', e);
    }
  };

  // Admin: Update table price
  const handleUpdateTablePrice = async (tableId: string, newPrice: number) => {
    const validPrice = Math.max(0, newPrice);
    const updated = tables.map(t => {
      if (t.id === tableId || t.table_number === tableId) {
        return { ...t, price_sek: validPrice };
      }
      return t;
    });
    setTables(updated);
    const updatedEvent: OrganizedEvent = {
      ...event,
      vendor_tables: updated
    };
    try {
      await api.saveOrganizedEvent(updatedEvent);
      if (onTableBooked) {
        onTableBooked(updatedEvent, updated.find(t => t.id === tableId)!);
      }
      showAdminToast(`Price updated to ${validPrice} SEK`);
    } catch (e) {
      console.error('Failed to update table price:', e);
    }
  };

  const handleProceedToCheckout = () => {
    if (!selectedTable) {
      setErrorMsg('Please click an available table on the venue map first.');
      return;
    }
    setStep('CHECKOUT');
  };

  const handleFillTestCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('08/29');
    setCardCvc('382');
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;
    setErrorMsg(null);

    if (!businessName.trim() || !contactName.trim() || !vendorEmail.trim()) {
      setErrorMsg('Please provide your Business Name, Contact Name, and Email.');
      return;
    }

    setIsProcessing(true);

    if (paymentMethod === 'SWISH') {
      setProcessStatus('Connecting to Swish Sweden merchant portal...');
      await new Promise(r => setTimeout(r, 900));
      setProcessStatus('Verifying Swish authorization on Mobile BankID...');
      await new Promise(r => setTimeout(r, 1000));
      setProcessStatus('Payment approved via Swish!');
    } else {
      setProcessStatus('Connecting to Stripe Secure Gateway...');
      await new Promise(r => setTimeout(r, 900));
      setProcessStatus('Authorizing business transaction...');
      await new Promise(r => setTimeout(r, 1000));
      setProcessStatus('Stripe charge successful!');
    }

    const bookingRef = `CE-STALL-${selectedTable.table_number}-${Date.now().toString().slice(-4)}`;

    const bookingData: NonNullable<VendorTable['booked_by_vendor']> = {
      business_name: businessName.trim(),
      contact_name: contactName.trim(),
      email: vendorEmail.trim(),
      phone: vendorPhone.trim(),
      category: merchandiseCategory,
      booking_reference: bookingRef,
      booked_at: new Date().toISOString(),
      payment_method: paymentMethod
    };

    try {
      const result = await api.bookVendorTable(event.id, selectedTable.id, bookingData);
      setTables(result.event.vendor_tables || []);
      setConfirmedTable(result.table);
      setStep('CONFIRMED');
      if (onTableBooked) {
        onTableBooked(result.event, result.table);
      }
    } catch (err: any) {
      console.error('Failed to book vendor table:', err);
      // Fallback local update
      const updatedTables = tables.map(t => {
        if (t.id === selectedTable.id || t.table_number === selectedTable.table_number) {
          return {
            ...t,
            status: 'BOOKED' as const,
            booked_by_vendor: bookingData
          };
        }
        return t;
      });
      setTables(updatedTables);
      const booked = updatedTables.find(t => t.id === selectedTable.id) || selectedTable;
      setConfirmedTable(booked);
      setStep('CONFIRMED');
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
        onClick={() => !isProcessing && onClose()}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative bg-white rounded-3xl max-w-7xl w-full my-4 max-h-[96vh] overflow-y-auto shadow-2xl border border-slate-100 z-10 flex flex-col"
      >
        {/* Header with festive Diwali accent */}
        <div className="relative bg-gradient-to-r from-amber-950 via-slate-950 to-amber-950 p-6 text-white overflow-hidden rounded-t-3xl border-b border-amber-500/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <button
            onClick={() => !isProcessing && onClose()}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-1 shadow-sm">
              <Store className="w-3 h-3 text-amber-200" />
              Vendor Bookings for Events
            </span>
            <span className="text-[11px] text-amber-200/90 font-medium flex items-center gap-1">
              Vendor Stalls & Interactive Table Map
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {event.title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-amber-100/90 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              {event.start_date} {event.end_date && event.end_date !== event.start_date ? `to ${event.end_date}` : ''}
            </span>
            {event.time && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {event.time}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              {event.location_name}, {event.city}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
              {availableCount} of {tables.length} Stalls Available
            </span>
          </div>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-6 flex-1">
          <AnimatePresence mode="wait">
            {step === 'SELECT_MAP' && (
              <div className="space-y-6">
                {/* Instructions Bar & Legend */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">
                      Click any <strong className="text-emerald-700">green table</strong> on the hall map below to review pricing, size, and reserve it instantly.
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* View Switcher */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold mr-2">
                      <button
                        type="button"
                        onClick={() => setMapViewMode('MAP')}
                        className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                          mapViewMode === 'MAP'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" /> {event.floor_plan_image_url ? 'Blueprint Map' : 'Interactive Map'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapViewMode('ZONES')}
                        className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                          mapViewMode === 'ZONES'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Layers className="w-3 h-3" /> Zone View
                      </button>
                    </div>

                    {/* Zoom Toggle when on Map */}
                    {mapViewMode === 'MAP' && (
                      <button
                        type="button"
                        onClick={() => setMapZoom(prev => (prev === 1 ? 1.2 : 1))}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1 transition-colors mr-2"
                        title="Toggle Zoom"
                      >
                        <ZoomIn className="w-3 h-3 text-amber-600" />
                        <span>{mapZoom === 1 ? 'Zoom 1.2x' : 'Fit View'}</span>
                      </button>
                    )}

                    {/* Legend badges */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-emerald-500 border border-emerald-600 shadow-sm" />
                        <span className="text-slate-600">Available</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-amber-500 ring-2 ring-amber-400/50 shadow-sm" />
                        <span className="text-slate-600">Selected</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-slate-300 border border-slate-400 shadow-sm" />
                        <span className="text-slate-600">Booked</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Toast Notification */}
                {adminNotice && (
                  <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> {adminNotice}
                    </span>
                    <button type="button" onClick={() => setAdminNotice(null)} className="text-white/80 hover:text-white">✕</button>
                  </div>
                )}

                {/* ── ORGANIZER & ADMIN TOOLBAR (Add, Remove Tables, Remove All) ── */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Organizer Controls</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAdminMode(prev => !prev)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isAdminMode
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{isAdminMode ? 'Admin Editing Active' : 'Enable Admin Editing'}</span>
                    </button>
                  </div>

                  {isAdminMode && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleAddTable}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                        title="Add a new table onto this floor plan"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Table</span>
                      </button>

                      {tables.length > 0 && (
                        <button
                          type="button"
                          onClick={handleRemoveAllTables}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                          title="Remove all tables from this map"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove All Tables ({tables.length})</span>
                        </button>
                      )}

                      <span className="text-[11px] text-slate-400 px-1">
                        Total: <strong className="text-white font-mono">{tables.length}</strong> stalls
                      </span>
                    </div>
                  )}
                </div>

                {/* ── MODE A: INTERACTIVE BLUEPRINT MAP + SIDE STALL DIRECTORY ── */}
                {mapViewMode === 'MAP' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Map Canvas (7-8 Columns on desktop) */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-2">
                      <div className="relative bg-slate-950 rounded-3xl p-4 sm:p-6 border-2 border-slate-800 shadow-2xl overflow-hidden text-white min-h-[520px] md:min-h-[580px] select-none">
                        {/* Uploaded Map Image Backdrop or Schematic Grid */}
                        {event.floor_plan_image_url ? (
                          <div
                            className="absolute inset-0 pointer-events-none overflow-hidden transition-transform duration-300"
                            style={{ transform: `scale(${mapZoom})`, transformOrigin: 'center center' }}
                          >
                            <img
                              src={event.floor_plan_image_url}
                              alt="Venue Floor Plan"
                              className="w-full h-full object-cover object-center opacity-75"
                            />
                            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[0.5px]" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
                        )}

                        {/* STAGE & CULTURAL PERFORMANCE PAVILION (Only if schematic grid with no custom map) */}
                        {!event.floor_plan_image_url && (
                          <div className="relative mb-5 text-center pointer-events-none z-10">
                            <div className="max-w-md mx-auto py-2.5 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 border border-yellow-300/50 flex items-center justify-center gap-2">
                              <Sparkles className="w-4 h-4 fill-slate-950" />
                              MAIN STAGE & EXHIBITION PAVILION
                              <Sparkles className="w-4 h-4 fill-slate-950" />
                            </div>
                          </div>
                        )}

                        {/* EMPTY MAP NOTICE */}
                        {tables.length === 0 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-30">
                            <div className="bg-slate-900/90 backdrop-blur-md p-6 rounded-3xl border border-slate-700 max-w-sm space-y-3 shadow-2xl">
                              <Store className="w-10 h-10 text-amber-400 mx-auto" />
                              <h4 className="text-base font-bold text-white">All Tables Removed from Map</h4>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                The venue blueprint is displayed cleanly without table pins. Click below to add vendor tables whenever you are ready.
                              </p>
                              {isAdminMode && (
                                <button
                                  type="button"
                                  onClick={handleAddTable}
                                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                                >
                                  <Plus className="w-4 h-4" /> Add Table to Map
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* INTERACTIVE TABLE MARKERS ON BLUEPRINT */}
                        <div
                          className="relative w-full h-[460px] sm:h-[500px] transition-transform duration-300"
                          style={{ transform: `scale(${mapZoom})`, transformOrigin: 'center center' }}
                        >
                          {tables.map(table => {
                            const isSelected = selectedTableId === table.id || selectedTableId === table.table_number;
                            const isBooked = table.status === 'BOOKED';
                            const isHovered = hoveredTableId === table.id;
                            const x = table.map_coordinates?.x ?? 50;
                            const y = table.map_coordinates?.y ?? 50;

                            return (
                              <div
                                key={table.id}
                                style={{
                                  left: `${x}%`,
                                  top: `${y}%`,
                                  transform: 'translate(-50%, -50%)'
                                }}
                                className="absolute z-20"
                              >
                                {/* Hover Tooltip Preview */}
                                {isHovered && !isSelected && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-xl bg-slate-900/95 border border-amber-400 text-left pointer-events-none z-40 text-white shadow-2xl backdrop-blur-md animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-300">
                                      <span>Table {table.table_number}</span>
                                      <span>{table.price_sek} SEK</span>
                                    </div>
                                    <div className="text-[10px] text-slate-300 font-semibold truncate mt-0.5">
                                      {table.zone}
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-0.5">
                                      {table.size} {table.power_included && '• ⚡ 230V'}
                                    </div>
                                    <div className="text-[9px] text-emerald-400 font-bold mt-1">
                                      {isBooked ? '🔴 Booked' : '👉 Click to Select Location'}
                                    </div>
                                  </div>
                                )}

                                {/* Admin Quick Remove "X" Button on Map Pin */}
                                {isAdminMode && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTable(table.id);
                                    }}
                                    className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-black shadow-md hover:scale-115 active:scale-95 transition-all z-30 border border-white"
                                    title={`Remove Table ${table.table_number} from map`}
                                  >
                                    ✕
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={isBooked && !isAdminMode}
                                  onClick={() => handleSelectTable(table)}
                                  onMouseEnter={() => setHoveredTableId(table.id)}
                                  onMouseLeave={() => setHoveredTableId(null)}
                                  className={`p-2.5 rounded-2xl border-2 transition-all shadow-xl flex flex-col items-center justify-center text-center cursor-pointer select-none ${
                                    isSelected
                                      ? 'bg-amber-500 text-slate-950 border-white ring-4 ring-amber-400/90 scale-115 z-30 shadow-amber-500/50'
                                      : isBooked
                                      ? 'bg-slate-900/90 text-slate-500 border-slate-700/60 opacity-60'
                                      : 'bg-slate-900/90 backdrop-blur-sm hover:bg-slate-800 text-white border-emerald-500/90 hover:border-emerald-400 hover:scale-105 hover:shadow-emerald-500/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-1 font-mono text-xs font-black leading-none">
                                    <span>{table.table_number}</span>
                                    {table.power_included && (
                                      <Zap className={`w-2.5 h-2.5 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                                    )}
                                  </div>
                                  <div className={`text-[10px] font-black mt-1 leading-none ${isSelected ? 'text-slate-950 font-extrabold' : 'text-emerald-400'}`}>
                                    {isBooked ? 'Booked' : `${table.price_sek} kr`}
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* ENTRANCE FOYER (Only if schematic grid with no custom map) */}
                        {!event.floor_plan_image_url && (
                          <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/90 text-[10px] font-black uppercase tracking-wider text-slate-300 border border-slate-700 backdrop-blur-sm">
                              ↓ MAIN VISITOR ENTRANCE ↓
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-2 pt-0.5">
                        <span>💡 Click any stall pin on the map or select directly from the side list.</span>
                        <span className="font-semibold text-emerald-600">✓ Selected tables sync across map & directory</span>
                      </div>
                    </div>

                    {/* Right: Side List of all Tables with Price (4-5 Columns on desktop) */}
                    <div className="lg:col-span-5 xl:col-span-4 bg-slate-900/95 rounded-3xl p-4 sm:p-5 border-2 border-slate-800 shadow-2xl text-white flex flex-col space-y-3.5 backdrop-blur-md">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div>
                          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-amber-400" />
                            Stalls & Table Prices
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Choose table directly from this list
                          </p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          {availableCount} Available
                        </span>
                      </div>

                      {/* Search & Filter */}
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={tableSearch}
                            onChange={e => setTableSearch(e.target.value)}
                            placeholder="Search table #, zone, size..."
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          {tableSearch && (
                            <button
                              type="button"
                              onClick={() => setTableSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => { setFilterZone('ALL'); setOnlyAvailable(false); }}
                            className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                              filterZone === 'ALL' && !onlyAvailable
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            All ({tables.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setOnlyAvailable(prev => !prev)}
                            className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                              onlyAvailable
                                ? 'bg-emerald-500 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            Available ({availableCount})
                          </button>
                        </div>
                      </div>

                      {/* List of Tables */}
                      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {displayTables.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                            <p>No tables match your filter.</p>
                            {isAdminMode && (
                              <button
                                type="button"
                                onClick={handleAddTable}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add New Table
                              </button>
                            )}
                          </div>
                        ) : (
                          displayTables.map(table => {
                            const isSelected = selectedTableId === table.id || selectedTableId === table.table_number;
                            const isBooked = table.status === 'BOOKED';

                            return (
                              <div
                                key={table.id}
                                className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 border-white ring-2 ring-amber-400 shadow-md'
                                    : isBooked
                                    ? 'bg-slate-950/60 text-slate-500 border-slate-800/80'
                                    : 'bg-slate-950/80 hover:bg-slate-800/90 text-white border-slate-800 hover:border-emerald-500/60'
                                }`}
                              >
                                <button
                                  type="button"
                                  disabled={isBooked && !isAdminMode}
                                  onClick={() => handleSelectTable(table)}
                                  onMouseEnter={() => setHoveredTableId(table.id)}
                                  onMouseLeave={() => setHoveredTableId(null)}
                                  className="flex-1 text-left min-w-0"
                                >
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-xs font-black">
                                        Table {table.table_number}
                                      </span>
                                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                        isSelected
                                          ? 'bg-slate-950 text-amber-300'
                                          : isBooked
                                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                      }`}>
                                        {isBooked ? 'Booked' : 'Available'}
                                      </span>
                                      {table.power_included && (
                                        <span className={`text-[9px] flex items-center gap-0.5 ${isSelected ? 'text-slate-900' : 'text-amber-400'}`}>
                                          <Zap className="w-2.5 h-2.5" /> 230V
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-[11px] truncate ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                                      {table.zone}
                                    </p>
                                  </div>
                                </button>

                                <div className="text-right flex items-center gap-2 flex-shrink-0">
                                  <div>
                                    <span className={`text-xs font-black block ${isSelected ? 'text-slate-950 font-extrabold' : 'text-emerald-400'}`}>
                                      {table.price_sek} SEK
                                    </span>
                                    <span className={`text-[9px] font-semibold block ${isSelected ? 'text-slate-900 underline' : isBooked ? 'text-rose-400' : 'text-slate-400'}`}>
                                      {isSelected ? 'Selected ✓' : isBooked ? 'Occupied' : 'Choose Table'}
                                    </span>
                                  </div>

                                  {/* Admin Delete Table Button */}
                                  {isAdminMode && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTable(table.id);
                                      }}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        isSelected
                                          ? 'bg-rose-900/80 text-white hover:bg-rose-950'
                                          : 'text-rose-400 hover:text-white hover:bg-rose-600'
                                      }`}
                                      title={`Remove Table ${table.table_number} from map`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Selected Table Action Footer inside the side list */}
                      {selectedTable ? (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 space-y-3 shadow-lg">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span>Selected: Table {selectedTable.table_number}</span>
                            <span className="text-sm font-black">{selectedTable.price_sek} SEK</span>
                          </div>
                          <p className="text-[10px] text-slate-900 font-medium truncate">
                            {selectedTable.zone} • {selectedTable.size}
                          </p>

                          {/* Admin Controls on Selected Table */}
                          {isAdminMode && (
                            <div className="p-2.5 rounded-xl bg-slate-950/20 backdrop-blur-sm border border-slate-950/20 space-y-2 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-slate-900 uppercase">Admin Tools:</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleBooked(selectedTable.id)}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-white hover:bg-slate-900 transition-colors"
                                >
                                  {selectedTable.status === 'BOOKED' ? 'Mark Available' : 'Show as Booked'}
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-semibold text-slate-900">Price:</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTablePrice(selectedTable.id, 0)}
                                  className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold hover:bg-slate-800"
                                  title="Remove price (Make Free)"
                                >
                                  Remove Price (0 kr)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTablePrice(selectedTable.id, (selectedTable.price_sek || 0) + 200)}
                                  className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold hover:bg-slate-800"
                                >
                                  +200 kr
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTablePrice(selectedTable.id, Math.max(0, (selectedTable.price_sek || 0) - 200))}
                                  className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold hover:bg-slate-800"
                                >
                                  -200 kr
                                </button>
                              </div>

                              {/* Prominent Remove Table Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteTable(selectedTable.id)}
                                className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                                title={`Remove Table ${selectedTable.table_number} from map`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove Table {selectedTable.table_number} from Map</span>
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleProceedToCheckout}
                            className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                          >
                            <span>Reserve & Pay Stall</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                          <p>👆 Click any table in this list or on the map</p>
                          {isAdminMode && (
                            <button
                              type="button"
                              onClick={handleAddTable}
                              className="text-[11px] text-amber-400 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                            >
                              <Plus className="w-3 h-3" /> Add Table to Map
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── MODE B: ZONE CATEGORIZED BREAKDOWN ── */
                  <div className="relative bg-slate-900 rounded-3xl p-4 sm:p-8 border-2 border-slate-800 shadow-2xl overflow-hidden text-white">
                    {/* Background grid markings or custom image */}
                    {event.floor_plan_image_url ? (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <img
                          src={event.floor_plan_image_url}
                          alt="Venue Floor Plan"
                          className="w-full h-full object-cover object-center opacity-30"
                        />
                        <div className="absolute inset-0 bg-slate-950/70" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                    )}

                  {/* STAGE & CULTURAL PERFORMANCE PAVILION */}
                  <div className="relative mb-8 text-center">
                    <div className="max-w-md mx-auto py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 border border-yellow-300/50 flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 fill-slate-950" />
                      MAIN STAGE & CULTURAL PERFORMANCES (BHANGRA, BOLLYWOOD & DANCES)
                      <Sparkles className="w-4 h-4 fill-slate-950" />
                    </div>
                    <div className="w-32 h-1 bg-amber-500/30 mx-auto rounded-full mt-1" />
                  </div>

                  {/* 1. ZONE P: Premium Front Entrance Stalls */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Zone P — Premium Front Stage Boulevard
                      </span>
                      <span className="text-[10px] text-amber-300/80 font-mono">
                        Prime Footfall • 2,500 SEK • Power Included
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {premiumTables.map(table => {
                        const isSelected = selectedTableId === table.table_number;
                        const isBooked = table.status === 'BOOKED';
                        return (
                          <button
                            key={table.id}
                            type="button"
                            disabled={isBooked}
                            onClick={() => handleSelectTable(table)}
                            className={`relative p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between text-left ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 border-white ring-4 ring-amber-400/60 scale-[1.03] shadow-xl z-10'
                                : isBooked
                                ? 'bg-slate-800/80 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-60'
                                : 'bg-slate-800 hover:bg-slate-700/80 text-white border-emerald-500/60 hover:border-emerald-400 hover:scale-[1.02] shadow-md'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-black">
                                {table.table_number}
                              </span>
                              {table.power_included && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                  isSelected ? 'bg-slate-950 text-amber-300' : 'bg-amber-400/20 text-amber-300'
                                }`}>
                                  <Zap className="w-2.5 h-2.5" /> 230V
                                </span>
                              )}
                            </div>

                            <div className="mt-3">
                              {isBooked ? (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-bold text-rose-400 block uppercase">Booked</span>
                                  <span className="text-[9px] text-slate-400 truncate block">
                                    {table.booked_by_vendor?.business_name || 'Reserved'}
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className={`text-xs font-black block ${isSelected ? 'text-slate-950' : 'text-emerald-400'}`}>
                                    {table.price_sek} SEK
                                  </span>
                                  <span className={`text-[9px] font-medium block truncate ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {isSelected ? 'Selected' : 'Available'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. ZONE F: Food & Sweets Bazaar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-400" />
                        Zone F — Food & Authentic Sweets Bazaar
                      </span>
                      <span className="text-[10px] text-orange-300/80 font-mono">
                        Catering Stall 3m x 1.5m • 2,200 SEK • Power Included
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      {foodTables.map(table => {
                        const isSelected = selectedTableId === table.table_number;
                        const isBooked = table.status === 'BOOKED';
                        return (
                          <button
                            key={table.id}
                            type="button"
                            disabled={isBooked}
                            onClick={() => handleSelectTable(table)}
                            className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between text-left ${
                              isSelected
                                ? 'bg-orange-500 text-slate-950 border-white ring-4 ring-orange-400/60 scale-[1.03] shadow-xl z-10'
                                : isBooked
                                ? 'bg-slate-800/80 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-60'
                                : 'bg-slate-800 hover:bg-slate-700/80 text-white border-emerald-500/60 hover:border-emerald-400 hover:scale-[1.02] shadow-md'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black">{table.table_number}</span>
                              <span className={`text-[8px] font-bold px-1 rounded ${isSelected ? 'bg-slate-950 text-orange-300' : 'bg-orange-400/20 text-orange-300'}`}>
                                Food
                              </span>
                            </div>
                            <div className="mt-2.5">
                              {isBooked ? (
                                <span className="text-[9px] font-bold text-rose-400 block uppercase truncate">
                                  {table.booked_by_vendor?.business_name ? 'Occupied' : 'Booked'}
                                </span>
                              ) : (
                                <span className={`text-xs font-black block ${isSelected ? 'text-slate-950' : 'text-emerald-400'}`}>
                                  {table.price_sek} SEK
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. ZONE J: Ethnic Wear & Jewelry Pavilion */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        Zone J — Ethnic Wear, Sarees & Designer Jewelry
                      </span>
                      <span className="text-[10px] text-purple-300/80 font-mono">
                        Fashion Boutique Display 2m x 1.2m • 1,800 SEK
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      {jewelryTables.map(table => {
                        const isSelected = selectedTableId === table.table_number;
                        const isBooked = table.status === 'BOOKED';
                        return (
                          <button
                            key={table.id}
                            type="button"
                            disabled={isBooked}
                            onClick={() => handleSelectTable(table)}
                            className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between text-left ${
                              isSelected
                                ? 'bg-purple-500 text-slate-950 border-white ring-4 ring-purple-400/60 scale-[1.03] shadow-xl z-10'
                                : isBooked
                                ? 'bg-slate-800/80 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-60'
                                : 'bg-slate-800 hover:bg-slate-700/80 text-white border-emerald-500/60 hover:border-emerald-400 hover:scale-[1.02] shadow-md'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black">{table.table_number}</span>
                              <span className={`text-[8px] font-bold px-1 rounded ${isSelected ? 'bg-slate-950 text-purple-300' : 'bg-purple-400/20 text-purple-300'}`}>
                                Fashion
                              </span>
                            </div>
                            <div className="mt-2.5">
                              {isBooked ? (
                                <span className="text-[9px] font-bold text-rose-400 block uppercase truncate">
                                  {table.booked_by_vendor?.business_name ? 'Occupied' : 'Booked'}
                                </span>
                              ) : (
                                <span className={`text-xs font-black block ${isSelected ? 'text-slate-950' : 'text-emerald-400'}`}>
                                  {table.price_sek} SEK
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. ZONE C: Henna, Handcrafted Diyas & Decor */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-400" />
                        Zone C — Henna Artist Pavilion, Handcrafted Diyas & Decor
                      </span>
                      <span className="text-[10px] text-teal-300/80 font-mono">
                        Artisan Table 2m x 1m • 1,500 SEK
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      {craftTables.map(table => {
                        const isSelected = selectedTableId === table.table_number;
                        const isBooked = table.status === 'BOOKED';
                        return (
                          <button
                            key={table.id}
                            type="button"
                            disabled={isBooked}
                            onClick={() => handleSelectTable(table)}
                            className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between text-left ${
                              isSelected
                                ? 'bg-teal-400 text-slate-950 border-white ring-4 ring-teal-400/60 scale-[1.03] shadow-xl z-10'
                                : isBooked
                                ? 'bg-slate-800/80 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-60'
                                : 'bg-slate-800 hover:bg-slate-700/80 text-white border-emerald-500/60 hover:border-emerald-400 hover:scale-[1.02] shadow-md'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black">{table.table_number}</span>
                              <span className={`text-[8px] font-bold px-1 rounded ${isSelected ? 'bg-slate-950 text-teal-300' : 'bg-teal-400/20 text-teal-300'}`}>
                                Crafts
                              </span>
                            </div>
                            <div className="mt-2.5">
                              {isBooked ? (
                                <span className="text-[9px] font-bold text-rose-400 block uppercase truncate">
                                  {table.booked_by_vendor?.business_name ? 'Occupied' : 'Booked'}
                                </span>
                              ) : (
                                <span className={`text-xs font-black block ${isSelected ? 'text-slate-950' : 'text-emerald-400'}`}>
                                  {table.price_sek} SEK
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. ADDITIONAL / BESPOKE TABLES (if configured by admin) */}
                  {otherTables.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-sky-400" />
                          Additional & Custom Stalls
                        </span>
                        <span className="text-[10px] text-sky-300/80 font-mono">
                          Bespoke Floor Positions
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {otherTables.map(table => {
                          const isSelected = selectedTableId === table.id || selectedTableId === table.table_number;
                          const isBooked = table.status === 'BOOKED';
                          return (
                            <button
                              key={table.id}
                              type="button"
                              disabled={isBooked}
                              onClick={() => handleSelectTable(table)}
                              className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between text-left ${
                                isSelected
                                  ? 'bg-sky-500 text-slate-950 border-white ring-4 ring-sky-400/60 scale-[1.03] shadow-xl z-10'
                                  : isBooked
                                  ? 'bg-slate-800/80 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-60'
                                  : 'bg-slate-800 hover:bg-slate-700/80 text-white border-emerald-500/60 hover:border-emerald-400 hover:scale-[1.02] shadow-md'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-black">{table.table_number}</span>
                                {table.power_included && (
                                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                                )}
                              </div>
                              <div className="mt-2.5">
                                {isBooked ? (
                                  <span className="text-[9px] font-bold text-rose-400 block uppercase truncate">
                                    Occupied
                                  </span>
                                ) : (
                                  <span className={`text-xs font-black block ${isSelected ? 'text-slate-950' : 'text-emerald-400'}`}>
                                    {table.price_sek} SEK
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ENTRANCE FOYER */}
                  <div className="pt-4 border-t border-slate-800/80 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-800/90 text-[10px] font-black uppercase tracking-wider text-slate-400 border border-slate-700">
                      ↓ MAIN VISITOR ENTRANCE ↓
                    </div>
                  </div>
                </div>
                )}

                {/* SELECTED TABLE INSPECTION DRAWER */}
                {selectedTable ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 to-sky-950 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 border border-sky-500/20"
                  >
                    <div className="space-y-1.5 text-center md:text-left flex-1">
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-xs font-black uppercase">
                          Stall {selectedTable.table_number}
                        </span>
                        <span className="text-xs font-bold text-sky-200">
                          {selectedTable.zone}
                        </span>
                        {selectedTable.power_included && (
                          <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                            <Zap className="w-3 h-3" /> Electricity Included
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300">
                        {selectedTable.size}. Includes 2 vendor chairs, draped trestle table, access during morning setup (08:30 - 10:30).
                      </p>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Stall Fee</span>
                        <span className="text-2xl font-black text-amber-400">{selectedTable.price_sek} SEK</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleProceedToCheckout}
                        className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
                      >
                        <span>Reserve & Pay Table</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-900 text-xs text-center font-medium">
                    Please click any available green table on the venue map above to select your booth position and proceed to payment.
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: VENDOR STALL CHECKOUT ── */}
            {step === 'CHECKOUT' && selectedTable && (
              <form onSubmit={handleConfirmBooking} className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-black text-slate-900">
                      Reserve Table {selectedTable.table_number} — Vendor Information & Payment
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedTable.zone} • {selectedTable.price_sek} SEK
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep('SELECT_MAP')}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 underline"
                  >
                    ← Back to Interactive Map
                  </button>
                </div>

                {/* Vendor Business Details */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    1. Exhibitor / Vendor Details
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Business / Brand Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        placeholder="e.g. Royal Mithai & Chai Co."
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Contact Person Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={e => setContactName(e.target.value)}
                        placeholder="e.g. Anita Patel"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Vendor Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={vendorEmail}
                        onChange={e => setVendorEmail(e.target.value)}
                        placeholder="contact@royalmithai.se"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Mobile Phone (+46) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={vendorPhone}
                        onChange={e => {
                          setVendorPhone(e.target.value);
                          setSwishPhone(e.target.value);
                        }}
                        placeholder="+46 70 123 45 67"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Merchandise & Stall Goods Category
                      </label>
                      <select
                        value={merchandiseCategory}
                        onChange={e => setMerchandiseCategory(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      >
                        <option value="Indian Sweets & Savories">Indian Sweets & Fresh Savories</option>
                        <option value="Hot Street Food & Chai">Hot Street Food, Samosas & Masala Chai</option>
                        <option value="Ethnic Wear & Sarees">Ethnic Wear, Sarees, Kurtas & Lehengas</option>
                        <option value="Jewelry & Bangles">Traditional Jewelry, Kundan & Bangles</option>
                        <option value="Handcrafted Diyas & Puja Items">Handcrafted Diyas, Rangoli & Puja Decor</option>
                        <option value="Henna & Mehndi Art">Henna & Bridal Mehndi Artistry</option>
                        <option value="Artisanal Gifts & Home Decor">Artisanal Gifts, Spices & Home Decor</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Payment Selection (Swish & Stripe) */}
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      2. Secure Payment ({selectedTable.price_sek} SEK)
                    </label>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Instant Stall Lock
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('SWISH')}
                      className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 font-bold text-xs transition-all ${
                        paymentMethod === 'SWISH'
                          ? 'border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">
                        S
                      </div>
                      <div className="text-left">
                        <span className="block leading-tight font-black">Swish Sweden</span>
                        <span className="text-[10px] text-slate-400 font-normal">Fast Mobile BankID</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('STRIPE')}
                      className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2.5 font-bold text-xs transition-all ${
                        paymentMethod === 'STRIPE'
                          ? 'border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <div className="text-left">
                        <span className="block leading-tight font-black">Stripe Card</span>
                        <span className="text-[10px] text-slate-400 font-normal">Visa, Mastercard</span>
                      </div>
                    </button>
                  </div>

                  {paymentMethod === 'SWISH' ? (
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-950 flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-blue-600" />
                          Swish Number:
                        </span>
                        <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                          123 456 7890 (Creative Events AB)
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-800">
                        Message reference will be automatically set to: <span className="font-bold font-mono">STALL-{selectedTable.table_number}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Card Payment</span>
                        <button
                          type="button"
                          onClick={handleFillTestCard}
                          className="text-[10px] font-bold text-sky-600 hover:text-sky-700 underline"
                        >
                          Auto-fill Test Card
                        </button>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono font-semibold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expiry</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={e => setCardExpiry(e.target.value)}
                            className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CVC</label>
                          <input
                            type="text"
                            value={cardCvc}
                            onChange={e => setCardCvc(e.target.value)}
                            className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Confirm Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 active:scale-[0.99] transition-all disabled:opacity-75"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{processStatus || 'Reserving Stall...'}</span>
                      </>
                    ) : (
                      <>
                        <span>Pay {selectedTable.price_sek} SEK & Secure Table {selectedTable.table_number}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                    Once verified, table {selectedTable.table_number} is locked in your business name and cannot be booked by others.
                  </p>
                </div>
              </form>
            )}

            {/* ── STEP 3: CONFIRMED VENDOR PERMIT / STALL CERTIFICATE ── */}
            {step === 'CONFIRMED' && confirmedTable && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Stall Reserved & Verified!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Table {confirmedTable.table_number} is now officially registered to <strong className="text-slate-800">{confirmedTable.booked_by_vendor?.business_name}</strong>.
                  </p>
                </div>

                {/* Printable Exhibitor Pass */}
                <div 
                  id="printable-vendor-stall-pass"
                  className="relative bg-white rounded-3xl border-2 border-amber-500 overflow-hidden shadow-2xl"
                >
                  {/* Top Certificate Header */}
                  <div className="bg-gradient-to-r from-amber-950 via-slate-950 to-amber-950 text-white p-6 relative">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-widest">
                        EXHIBITOR STALL PERMIT
                      </span>
                      <span className="text-[11px] font-mono text-amber-200">
                        REF: {confirmedTable.booked_by_vendor?.booking_reference}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-black text-white">
                          {confirmedTable.booked_by_vendor?.business_name}
                        </h4>
                        <p className="text-xs text-amber-200/90 font-medium">
                          Category: {confirmedTable.booked_by_vendor?.category}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-right">
                        <span className="text-[10px] uppercase font-bold text-amber-300 block">Assigned Position</span>
                        <span className="text-2xl font-black text-amber-400 font-mono">
                          TABLE {confirmedTable.table_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Zone</span>
                        <span className="font-bold text-slate-900">{confirmedTable.zone}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dimensions</span>
                        <span className="font-bold text-slate-900">{confirmedTable.size}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Electricity</span>
                        <span className="font-bold text-emerald-700">{confirmedTable.power_included ? 'Yes (230V)' : 'Standard'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paid Fee</span>
                        <span className="font-black text-slate-900">{confirmedTable.price_sek} SEK ({confirmedTable.booked_by_vendor?.payment_method})</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-800 block">Exhibitor Check-In & Setup Window</span>
                        <p className="text-slate-500 text-[11px]">
                          Event Date: <strong>{event.start_date}</strong>. Vendor loading bay opens at <strong>08:30</strong>. Booths must be ready by <strong>10:30</strong> before visitor entry.
                        </p>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase flex-shrink-0">
                        Permit Validated
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handlePrint}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Print Exhibitor Pass</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Done & Close</span>
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export const EventFloorPlanModal = DiwaliMarketFloorPlanModal;
export type { DiwaliMarketFloorPlanModalProps as EventFloorPlanModalProps };
export default DiwaliMarketFloorPlanModal;
