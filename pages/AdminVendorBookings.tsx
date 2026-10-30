import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Clock, Plus, Edit, Trash2, Eye, Star,
  CheckCircle2, AlertCircle, Sparkles, Tag, Users, ArrowRight,
  ExternalLink, Upload, X, Loader2, ArrowLeft, Shield, Filter,
  Search, Check, Mail, Phone, Ticket, Home, Globe, Printer,
  Download, Building2, Store, Zap, FileSpreadsheet, RefreshCw,
  CreditCard, DollarSign, MessageSquare, ChevronDown, Layers,
  LayoutGrid, Map, Lock, Receipt, Settings, CheckCircle,
  HelpCircle, Sliders, Copy
} from 'lucide-react';
import { 
  VendorEventBooking, OrganizedEvent, BoothPackage, EventBookingStatus, 
  BookingPaymentStatus, VendorCategory, EventTableSlot, EventMarketLayout,
  VendorTable
} from '../types';
import { api, DEFAULT_BOOTH_PACKAGES, DEFAULT_EVENT_SLOTS, DEFAULT_MAP_PRESETS } from '../services/api';
import { compressImage } from '../services/safeStorage';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AdminTableMapModal } from '../components/AdminTableMapModal';

export const PRESET_ZONE_PACKS = [
  {
    name: 'Wedding & Lifestyle Expo',
    description: 'Bridal couture, jewelry, photography, stage, and henna lounges',
    zones: [
      'Zone A - Bridal & Couture Pavilion',
      'Zone B - Fine Jewelry & Diamond Row',
      'Zone C - Venue & Photography Showcase',
      'Zone D - Stage & Runway Front',
      'Zone E - Hair, Makeup & Henna Lounge'
    ]
  },
  {
    name: 'Food & Culinary Festival',
    description: 'Street food kitchens, sweets, bakery items, spices, and drinks',
    zones: [
      'Zone A - Hot Kitchens & Street Food',
      'Zone B - Sweets, Desserts & Bakeries',
      'Zone C - Spices, Tea & Specialty Ingredients',
      'Zone D - Beverage & Tasting Garden'
    ]
  },
  {
    name: 'Artisan & Craft Market',
    description: 'Handmade crafts, pottery, Nordic decor, and creator pop-ups',
    zones: [
      'Zone A - Handmade Crafts & Ceramics',
      'Zone B - Textile, Fashion & Apparel',
      'Zone C - Home Decor & Nordic Living',
      'Zone D - Pop-Up Creators Aisle'
    ]
  },
  {
    name: 'Trade Fair & Exhibition',
    description: 'VIP island, exhibition halls, innovation alley, and networking',
    zones: [
      'Zone A - Main Entrance VIP Island',
      'Zone B - Central Exhibition Arena',
      'Zone C - Innovation & Tech Alley',
      'Zone D - Workshop & Networking Lounge'
    ]
  }
];

export const AdminVendorBookings: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialEventFilter = queryParams.get('eventId') || 'ALL';
  const initialView = (queryParams.get('view') as 'bookings' | 'layout' | 'packages') || (queryParams.get('tab') as any) || 'bookings';

  // Navigation tab for Admin: 'bookings' | 'layout' | 'packages'
  const [adminView, setAdminView] = useState<'bookings' | 'layout' | 'packages'>(initialView);

  // Data states
  const [bookings, setBookings] = useState<VendorEventBooking[]>([]);
  const [events, setEvents] = useState<OrganizedEvent[]>([]);
  const [boothPackages, setBoothPackages] = useState<BoothPackage[]>(DEFAULT_BOOTH_PACKAGES);
  const [currentLayout, setCurrentLayout] = useState<EventMarketLayout | null>(null);
  const [selectedLayoutEventId, setSelectedLayoutEventId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Visual Map States
  const [isVisualMapModalOpen, setIsVisualMapModalOpen] = useState(false);
  const [layoutViewMode, setLayoutViewMode] = useState<'MAP' | 'GRID'>('MAP');
  const [isUploadingLayoutMap, setIsUploadingLayoutMap] = useState(false);
  const [layoutMapZoom, setLayoutMapZoom] = useState(1);
  const [mapHoveredSlotId, setMapHoveredSlotId] = useState<string | null>(null);

  // Filters for bookings
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventFilter);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<string>('ALL');

  // Help / Workflow Guide Banner toggle
  const [showAdminGuide, setShowAdminGuide] = useState(true);

  // Modals for Packages
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Partial<BoothPackage>>({
    name: '',
    tier: 'standard',
    dimensions: '3m x 3m (9m²)',
    price: 4500,
    currency: 'SEK',
    description: '',
    features: ['1 Table & 2 Chairs', 'Electricity socket 230V', 'Exhibitor passes'],
    badge: '',
    popular: false,
    max_spots: 12
  });
  const [packageFeatureInput, setPackageFeatureInput] = useState('');

  // Modals for Tables / Slots
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableForm, setNewTableForm] = useState<Partial<EventTableSlot>>({
    id: 'B-09',
    table_number: 'Table B-09',
    zone: 'Zone B - Standard Hall',
    tier: 'standard',
    description: 'Standard exhibition table',
    status: 'available'
  });

  // Table Slot Detail / Edit Modal
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState<EventTableSlot | null>(null);
  const [editingSlot, setEditingSlot] = useState<EventTableSlot | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  // Batch Table Generator Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState<{
    zone: string;
    prefix: string;
    startNumber: number;
    count: number;
    tier: 'standard' | 'premium' | 'culinary' | 'artisan' | 'sponsor';
    description: string;
  }>({
    zone: 'Zone B - Standard Hall',
    prefix: 'Table B-',
    startNumber: 1,
    count: 6,
    tier: 'standard',
    description: 'Standard exhibition table'
  });

  // Floorplan Info Modal & Tab
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const [layoutSettingsTab, setLayoutSettingsTab] = useState<'details' | 'zones'>('details');
  const [layoutSettingsForm, setLayoutSettingsForm] = useState<{
    name: string;
    description: string;
    floor_plan_image_url?: string;
  }>({ name: '', description: '', floor_plan_image_url: '' });

  // Dedicated Zones Management States
  const [isZonesManagerOpen, setIsZonesManagerOpen] = useState(false);
  const [newZoneInput, setNewZoneInput] = useState('');
  const [editingZoneState, setEditingZoneState] = useState<{ original: string; current: string } | null>(null);

  // Custom Zone inputs for Table Modals
  const [newTableCustomZone, setNewTableCustomZone] = useState('');
  const [isCreatingCustomZoneForNew, setIsCreatingCustomZoneForNew] = useState(false);
  
  const [batchCustomZone, setBatchCustomZone] = useState('');
  const [isCreatingCustomZoneForBatch, setIsCreatingCustomZoneForBatch] = useState(false);

  const [editCustomZone, setEditCustomZone] = useState('');
  const [isCreatingCustomZoneForEdit, setIsCreatingCustomZoneForEdit] = useState(false);

  // Detail / Edit Booking Modal
  const [editingBooking, setEditingBooking] = useState<VendorEventBooking | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Quick Booth Assign Modal
  const [boothAssignTarget, setBoothAssignTarget] = useState<VendorEventBooking | null>(null);
  const [assignedBoothInput, setAssignedBoothInput] = useState('');

  // Tax Invoice Viewer Modal
  const [viewingTaxInvoice, setViewingTaxInvoice] = useState<VendorEventBooking | null>(null);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<VendorEventBooking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manual Add Booking Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const selectedLayoutEvent = useMemo(() => events.find(e => e.id === selectedLayoutEventId) || events[0] || null, [events, selectedLayoutEventId]);
  
  // Available Exhibition Zones in current layout
  const availableZones = useMemo(() => {
    const fromSlots = currentLayout?.slots?.map(s => s.zone).filter(Boolean) || [];
    const fromLayout = currentLayout?.zones || [];
    const defaults = [
      'Zone A - Premium Island',
      'Zone B - Standard Hall',
      'Zone C - Culinary Alley',
      'Zone D - Artisan Row'
    ];
    return Array.from(new Set([...fromLayout, ...fromSlots, ...defaults]));
  }, [currentLayout]);
  const [newBookingForm, setNewBookingForm] = useState<Partial<VendorEventBooking>>({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    category: 'Venues',
    booth_package_id: 'booth-standard',
    price: 4500,
    currency: 'SEK',
    selected_table_number: 'Table B-01',
    assigned_booth: 'Table B-01',
    power_needed: true,
    power_type: 'standard_230v',
    tables_count: 1,
    chairs_count: 2,
    staff_count: 2,
    status: 'CONFIRMED',
    payment_status: 'PAID_IN_FULL',
    payment_method: 'swish',
    admin_notes: 'Created manually by Administrator.'
  });

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bookingsData, eventsData] = await Promise.all([
        api.getVendorEventBookings(),
        api.getOrganizedEvents()
      ]);
      setBookings(bookingsData);
      setEvents(eventsData);

      const targetEvId = initialEventFilter !== 'ALL'
        ? initialEventFilter
        : (eventsData.length > 0 ? eventsData[0].id : '');
      setSelectedLayoutEventId(targetEvId);

      const [packagesData, layout] = await Promise.all([
        api.getBoothPackages(targetEvId || undefined),
        targetEvId ? api.getEventMarketLayout(targetEvId) : Promise.resolve(null)
      ]);
      setBoothPackages(packagesData);

      if (layout) {
        setCurrentLayout(layout);
        setLayoutSettingsForm({
          name: layout.name,
          description: layout.description || ''
        });
      }
    } catch (err) {
      console.error('Failed to load admin bookings data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLayoutEventChange = async (eventId: string) => {
    setSelectedLayoutEventId(eventId);
    try {
      const [layout, packagesData] = await Promise.all([
        api.getEventMarketLayout(eventId),
        api.getBoothPackages(eventId)
      ]);
      setCurrentLayout(layout);
      setBoothPackages(packagesData);
    } catch (err) {
      console.error('Failed to load layout or packages for event:', err);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Filtered Bookings List
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch =
        b.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.booking_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.selected_table_number && b.selected_table_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.assigned_booth && b.assigned_booth.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesEvent = selectedEventId === 'ALL' || b.event_id === selectedEventId;
      const matchesStatus = selectedStatus === 'ALL' || b.status === selectedStatus;
      const matchesPayment = selectedPayment === 'ALL' || b.payment_status === selectedPayment;

      return matchesSearch && matchesEvent && matchesStatus && matchesPayment;
    });
  }, [bookings, searchTerm, selectedEventId, selectedStatus, selectedPayment]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'PENDING').length;
    const confirmed = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'APPROVED').length;
    const totalRevenue = bookings
      .filter(b => b.status !== 'REJECTED' && b.status !== 'CANCELLED')
      .reduce((sum, b) => sum + (b.price || 0), 0);

    return { total, pending, confirmed, totalRevenue };
  }, [bookings]);

  // Package Save / Edit
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage.name) return;

    try {
      const pkgToSave: Partial<BoothPackage> = {
        ...editingPackage,
        event_id: editingPackage.event_id || selectedLayoutEventId
      };
      const saved = await api.saveBoothPackage(pkgToSave);
      setBoothPackages(prev => {
        const idx = prev.findIndex(p => p.id === saved.id);
        if (idx >= 0) {
          const cp = [...prev];
          cp[idx] = saved;
          return cp;
        }
        return [...prev, saved];
      });
      showNotification('success', `Booth Package "${saved.name}" saved.`);
      setIsPackageModalOpen(false);
    } catch (err: any) {
      showNotification('error', `Failed to save package: ${err.message}`);
    }
  };

  // Package Delete
  const handleDeletePackage = async (pkgId: string) => {
    if (!confirm('Are you sure you want to delete this booth package tier?')) return;
    try {
      await api.deleteBoothPackage(pkgId, selectedLayoutEventId);
      setBoothPackages(prev => prev.filter(p => p.id !== pkgId));
      showNotification('success', 'Booth package tier removed.');
    } catch (err: any) {
      showNotification('error', `Failed to delete package: ${err.message}`);
    }
  };

  // Table Slot Toggle Reserved / Available
  const handleToggleSlotStatus = async (slot: EventTableSlot) => {
    if (!currentLayout || !selectedLayoutEventId) return;
    if (slot.status === 'booked') {
      alert(`This table is booked by ${slot.booked_by_name} (${slot.booked_booking_ref}). Use the bookings tab to reassign or cancel.`);
      return;
    }

    const nextStatus = slot.status === 'available' ? 'reserved' : 'available';
    try {
      const updated = await api.updateTableSlot(selectedLayoutEventId, slot.id, { status: nextStatus });
      setCurrentLayout(updated);
      showNotification('success', `${slot.table_number} marked as ${nextStatus.toUpperCase()}`);
    } catch (err: any) {
      showNotification('error', `Failed to update table slot: ${err.message}`);
    }
  };

  // Open Slot Detail / Edit Modal
  const handleOpenSlotDetail = (slot: EventTableSlot) => {
    setSelectedSlotForDetail(slot);
    setEditingSlot({ ...slot });
    setIsSlotModalOpen(true);
  };

  // Save edited slot
  const handleSaveSlotDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot || !selectedLayoutEventId) return;

    try {
      const updated = await api.updateTableSlot(selectedLayoutEventId, editingSlot.id, {
        table_number: editingSlot.table_number,
        zone: editingSlot.zone,
        tier: editingSlot.tier,
        description: editingSlot.description,
        status: editingSlot.status,
        price_override: editingSlot.price_override
      });
      setCurrentLayout(updated);
      showNotification('success', `Saved changes for ${editingSlot.table_number}`);
      setIsSlotModalOpen(false);
      setEditingSlot(null);
    } catch (err: any) {
      showNotification('error', `Failed to update table slot: ${err.message}`);
    }
  };

  // Delete slot from layout
  const handleDeleteSlot = async (slotId: string) => {
    if (!selectedLayoutEventId) return;
    if (!confirm('Are you sure you want to remove this table slot from the floorplan?')) return;
    try {
      const updated = await api.deleteTableSlot(selectedLayoutEventId, slotId);
      setCurrentLayout(updated);
      showNotification('success', 'Table slot removed from floorplan.');
      setIsSlotModalOpen(false);
      setEditingSlot(null);
    } catch (err: any) {
      showNotification('error', `Failed to delete table slot: ${err.message}`);
    }
  };

  // Zone Management Functions
  const handleCreateZone = async (zoneName: string) => {
    const trimmed = zoneName.trim();
    if (!trimmed) {
      showNotification('error', 'Please enter a valid zone name.');
      return;
    }
    if (!currentLayout && !selectedLayoutEvent) return;

    try {
      const baseLayout: EventMarketLayout = currentLayout || {
        id: `layout-${selectedLayoutEventId}`,
        event_id: selectedLayoutEventId,
        name: `${selectedLayoutEvent?.title || 'Event'} Layout`,
        description: '',
        slots: []
      };

      const currentZonesList = baseLayout.zones || availableZones;
      if (currentZonesList.some(z => z.toLowerCase() === trimmed.toLowerCase())) {
        showNotification('error', `Zone "${trimmed}" already exists.`);
        return;
      }

      const updatedLayout: EventMarketLayout = {
        ...baseLayout,
        zones: [...currentZonesList, trimmed]
      };

      await api.saveEventMarketLayout(updatedLayout);
      setCurrentLayout(updatedLayout);
      setNewZoneInput('');
      showNotification('success', `Zone "${trimmed}" created successfully!`);
    } catch (err: any) {
      showNotification('error', `Failed to create zone: ${err.message}`);
    }
  };

  const handleRenameZone = async (oldZone: string, newZone: string) => {
    const trimmed = newZone.trim();
    if (!trimmed || trimmed === oldZone) {
      setEditingZoneState(null);
      return;
    }
    if (!currentLayout) return;

    try {
      const updatedSlots = currentLayout.slots.map(s => s.zone === oldZone ? { ...s, zone: trimmed } : s);
      const currentZonesList = currentLayout.zones || availableZones;
      const updatedZones = currentZonesList.map(z => z === oldZone ? trimmed : z);

      const updatedLayout: EventMarketLayout = {
        ...currentLayout,
        zones: Array.from(new Set(updatedZones)),
        slots: updatedSlots
      };

      await api.saveEventMarketLayout(updatedLayout);
      setCurrentLayout(updatedLayout);

      if (selectedLayoutEvent?.vendor_tables) {
        const updatedTables = selectedLayoutEvent.vendor_tables.map(t => t.zone === oldZone ? { ...t, zone: trimmed } : t);
        const updatedEvent = { ...selectedLayoutEvent, vendor_tables: updatedTables };
        await api.saveOrganizedEvent(updatedEvent);
        setEvents(prev => prev.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev));
      }

      const countAffected = currentLayout.slots.filter(s => s.zone === oldZone).length;
      showNotification('success', `Renamed "${oldZone}" to "${trimmed}" (${countAffected} tables updated).`);
      setEditingZoneState(null);
    } catch (err: any) {
      showNotification('error', `Failed to rename zone: ${err.message}`);
    }
  };

  const handleDeleteZone = async (zoneName: string) => {
    if (!currentLayout) return;
    const tablesInZone = currentLayout.slots.filter(s => s.zone === zoneName);
    
    if (tablesInZone.length > 0) {
      const confirmReassign = confirm(`Zone "${zoneName}" has ${tablesInZone.length} table(s). Reassign them to "Zone B - Standard Hall" and remove zone?`);
      if (!confirmReassign) return;
    }

    try {
      const fallbackZone = availableZones.find(z => z !== zoneName) || 'Zone B - Standard Hall';
      const updatedSlots = currentLayout.slots.map(s => s.zone === zoneName ? { ...s, zone: fallbackZone } : s);
      const currentZonesList = currentLayout.zones || availableZones;
      const updatedZones = currentZonesList.filter(z => z !== zoneName);

      const updatedLayout: EventMarketLayout = {
        ...currentLayout,
        zones: updatedZones,
        slots: updatedSlots
      };

      await api.saveEventMarketLayout(updatedLayout);
      setCurrentLayout(updatedLayout);
      showNotification('success', `Zone "${zoneName}" deleted.`);
    } catch (err: any) {
      showNotification('error', `Failed to delete zone: ${err.message}`);
    }
  };

  const handleApplyPresetPack = async (pack: typeof PRESET_ZONE_PACKS[0]) => {
    if (!currentLayout && !selectedLayoutEvent) return;
    try {
      const baseLayout: EventMarketLayout = currentLayout || {
        id: `layout-${selectedLayoutEventId}`,
        event_id: selectedLayoutEventId,
        name: `${selectedLayoutEvent?.title || 'Event'} Layout`,
        description: '',
        slots: []
      };
      const currentZonesList = baseLayout.zones || availableZones;
      const mergedZones = Array.from(new Set([...currentZonesList, ...pack.zones]));
      const updatedLayout: EventMarketLayout = {
        ...baseLayout,
        zones: mergedZones
      };
      await api.saveEventMarketLayout(updatedLayout);
      setCurrentLayout(updatedLayout);
      showNotification('success', `Added ${pack.zones.length} zones from "${pack.name}"!`);
    } catch (err: any) {
      showNotification('error', `Failed to add preset zones: ${err.message}`);
    }
  };

  // Batch generate multiple tables at once
  const handleBatchGenerateTables = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLayout || !selectedLayoutEventId) return;

    const targetZone = (isCreatingCustomZoneForBatch && batchCustomZone.trim())
      ? batchCustomZone.trim()
      : batchForm.zone;

    const newSlots: EventTableSlot[] = [];
    for (let i = 0; i < batchForm.count; i++) {
      const num = batchForm.startNumber + i;
      const formattedNum = num < 10 ? `0${num}` : `${num}`;
      const tableNumber = `${batchForm.prefix}${formattedNum}`;
      const slotId = tableNumber.toUpperCase().replace(/\s+/g, '-');

      if (!currentLayout.slots.some(s => s.id === slotId)) {
        newSlots.push({
          id: slotId,
          table_number: tableNumber,
          zone: targetZone,
          tier: batchForm.tier,
          description: batchForm.description,
          status: 'available',
          row: Math.floor((currentLayout.slots.length + newSlots.length) / 6) + 1,
          col: ((currentLayout.slots.length + newSlots.length) % 6) + 1
        });
      }
    }

    if (newSlots.length === 0) {
      showNotification('error', 'Tables with these numbers already exist in the floorplan.');
      return;
    }

    try {
      const currentZones = currentLayout.zones || availableZones;
      const updatedZones = Array.from(new Set([...currentZones, targetZone]));
      const updated = await api.batchAddTableSlots(selectedLayoutEventId, newSlots);
      const withZones: EventMarketLayout = {
        ...updated,
        zones: updatedZones
      };
      await api.saveEventMarketLayout(withZones);
      setCurrentLayout(withZones);
      showNotification('success', `Generated ${newSlots.length} new tables in "${targetZone}"!`);
      setIsBatchModalOpen(false);
      setIsCreatingCustomZoneForBatch(false);
      setBatchCustomZone('');
    } catch (err: any) {
      showNotification('error', `Failed to batch generate tables: ${err.message}`);
    }
  };

  // Save floorplan metadata
  const handleSaveLayoutSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLayout && !selectedLayoutEvent) return;
    try {
      const baseLayout: EventMarketLayout = currentLayout || {
        id: `layout-${selectedLayoutEventId}`,
        event_id: selectedLayoutEventId,
        name: layoutSettingsForm.name || `${selectedLayoutEvent?.title || 'Event'} Layout`,
        description: layoutSettingsForm.description || '',
        slots: []
      };

      const updated: EventMarketLayout = {
        ...baseLayout,
        name: layoutSettingsForm.name || baseLayout.name,
        description: layoutSettingsForm.description || baseLayout.description,
        map_image_url: layoutSettingsForm.floor_plan_image_url !== undefined ? layoutSettingsForm.floor_plan_image_url : baseLayout.map_image_url,
        floor_plan_image_url: layoutSettingsForm.floor_plan_image_url !== undefined ? layoutSettingsForm.floor_plan_image_url : baseLayout.floor_plan_image_url,
        zones: baseLayout.zones || availableZones
      };
      await api.saveEventMarketLayout(updated);
      setCurrentLayout(updated);

      if (selectedLayoutEvent) {
        const updatedEvent = {
          ...selectedLayoutEvent,
          floor_plan_image_url: updated.floor_plan_image_url
        };
        await api.saveOrganizedEvent(updatedEvent);
        setEvents(prev => prev.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev));
      }

      showNotification('success', 'Floorplan details and layout settings updated successfully.');
      setIsLayoutSettingsOpen(false);
    } catch (err: any) {
      showNotification('error', `Failed to save floorplan settings: ${err.message}`);
    }
  };

  // Duplicate an existing package
  const handleDuplicatePackage = (pkg: BoothPackage) => {
    setEditingPackage({
      ...pkg,
      id: undefined,
      event_id: selectedLayoutEventId,
      name: `${pkg.name} (Custom)`,
      badge: 'Custom'
    });
    setIsPackageModalOpen(true);
  };

  // Add Table Slot
  const handleAddTableSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLayout || !selectedLayoutEventId || !newTableForm.table_number) return;

    const targetZone = (isCreatingCustomZoneForNew && newTableCustomZone.trim())
      ? newTableCustomZone.trim()
      : (newTableForm.zone || 'Zone B - Standard Hall');

    const slotId = (newTableForm.id || newTableForm.table_number).toUpperCase().replace(/\s+/g, '-');
    const newSlot: EventTableSlot = {
      id: slotId,
      table_number: newTableForm.table_number,
      zone: targetZone,
      tier: (newTableForm.tier as any) || 'standard',
      description: newTableForm.description || 'Standard booth table',
      status: 'available',
      row: (currentLayout.slots.length % 6) + 1,
      col: Math.floor(currentLayout.slots.length / 6) + 1
    };

    try {
      const currentZones = currentLayout.zones || availableZones;
      const updatedZones = Array.from(new Set([...currentZones, targetZone]));
      const updatedLayout: EventMarketLayout = {
        ...currentLayout,
        zones: updatedZones,
        slots: [...currentLayout.slots, newSlot]
      };
      await api.saveEventMarketLayout(updatedLayout);
      setCurrentLayout(updatedLayout);
      showNotification('success', `Added ${newSlot.table_number} to "${targetZone}".`);
      setIsAddTableModalOpen(false);
      setIsCreatingCustomZoneForNew(false);
      setNewTableCustomZone('');
    } catch (err: any) {
      showNotification('error', `Failed to add table: ${err.message}`);
    }
  };

  // Reset Layout to Blueprint
  const handleResetLayout = async () => {
    if (!selectedLayoutEventId) return;
    if (!confirm('Reset this event market layout to default 24-table blueprint?')) return;
    try {
      const blueprint = api.generateDefaultEventLayout(selectedLayoutEventId);
      await api.saveEventMarketLayout(blueprint);
      const rehydrated = await api.getEventMarketLayout(selectedLayoutEventId);
      setCurrentLayout(rehydrated);
      showNotification('success', 'Market layout reset to standard blueprint.');
    } catch (err: any) {
      showNotification('error', `Failed to reset layout: ${err.message}`);
    }
  };

  // Status Change Handler
  const handleQuickStatusChange = async (booking: VendorEventBooking, newStatus: EventBookingStatus) => {
    try {
      const updated = await api.updateBookingStatus(booking.id, newStatus);
      if (updated) {
        setBookings(prev => prev.map(b => (b.id === booking.id ? updated : b)));
        showNotification('success', `Updated ${booking.business_name} status to ${newStatus}`);
      }
    } catch (err: any) {
      showNotification('error', `Failed to update status: ${err.message}`);
    }
  };

  // Payment Status Change Handler
  const handlePaymentStatusChange = async (booking: VendorEventBooking, newPayment: BookingPaymentStatus) => {
    try {
      const updated = await api.updateBookingStatus(booking.id, booking.status, booking.assigned_booth, booking.admin_notes, newPayment);
      if (updated) {
        setBookings(prev => prev.map(b => (b.id === booking.id ? updated : b)));
        showNotification('success', `Payment status for ${booking.business_name} updated to ${newPayment}`);
      }
    } catch (err: any) {
      showNotification('error', `Failed to update payment: ${err.message}`);
    }
  };

  // Booth Assignment Save
  const handleSaveBoothAssignment = async () => {
    if (!boothAssignTarget) return;
    try {
      const updated = await api.updateBookingStatus(
        boothAssignTarget.id,
        boothAssignTarget.status === 'PENDING' ? 'CONFIRMED' : boothAssignTarget.status,
        assignedBoothInput.trim()
      );
      if (updated) {
        setBookings(prev => prev.map(b => (b.id === boothAssignTarget.id ? updated : b)));
        showNotification('success', `Assigned ${assignedBoothInput} to ${boothAssignTarget.business_name}`);
      }
      setBoothAssignTarget(null);
    } catch (err: any) {
      showNotification('error', `Failed to assign booth: ${err.message}`);
    }
  };

  // Delete Booking Handler
  const handleDeleteBooking = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteVendorEventBooking(deleteTarget.id);
      setBookings(prev => prev.filter(b => b.id !== deleteTarget.id));
      showNotification('success', `Deleted booking for ${deleteTarget.business_name}`);
      setDeleteTarget(null);
    } catch (err: any) {
      showNotification('error', `Failed to delete booking: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit Booking Save
  const handleSaveEditingBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    try {
      const updated = await api.saveVendorEventBooking(editingBooking);
      setBookings(prev => prev.map(b => (b.id === updated.id ? updated : b)));
      showNotification('success', `Updated details for ${updated.business_name}`);
      setIsEditModalOpen(false);
      setEditingBooking(null);
    } catch (err: any) {
      showNotification('error', `Failed to save changes: ${err.message}`);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      alert('No bookings to export.');
      return;
    }

    const headers = [
      'Booking Ref',
      'Business Name',
      'Contact Person',
      'Email',
      'Phone',
      'Category',
      'Event Title',
      'Event Date',
      'City',
      'Booth Package',
      'Table Number',
      'Price (SEK)',
      'Payment Status',
      'Payment Method',
      'Transaction ID',
      'Status',
      'Admin Notes',
      'Created At'
    ];

    const rows = filteredBookings.map(b => [
      `"${b.booking_ref}"`,
      `"${b.business_name.replace(/"/g, '""')}"`,
      `"${b.contact_name.replace(/"/g, '""')}"`,
      `"${b.email}"`,
      `"${b.phone}"`,
      `"${b.category}"`,
      `"${b.event_title.replace(/"/g, '""')}"`,
      `"${b.event_date}"`,
      `"${b.event_city}"`,
      `"${b.booth_package_name}"`,
      `"${b.selected_table_number || b.assigned_booth || ''}"`,
      b.price,
      b.payment_status,
      b.payment_method || 'direct',
      `"${b.payment_transaction_id || ''}"`,
      b.status,
      `"${(b.admin_notes || '').replace(/"/g, '""')}"`,
      `"${b.created_at}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `creative_events_vendor_bookings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 pb-24 text-slate-800">
      {/* Top Admin Header Bar */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-400 mb-2">
                <Link to="/admin" className="hover:underline flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Admin Panel
                </Link>
                <span>/</span>
                <Link to="/admin/events" className="hover:underline">
                  Organized Events
                </Link>
                <span>/</span>
                <span className="text-white">Stall & Layout Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                <Store className="w-7 h-7 text-sky-400" />
                Event Stall & Layout Administration
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Configure exhibitor packages, manage interactive venue market floorplans, assign table numbers, and audit direct payments.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all border border-slate-700 shadow-sm"
              >
                <Download className="w-4 h-4 text-sky-400" />
                Export CSV
              </button>
              <Link
                to="/event-bookings"
                target="_blank"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md"
              >
                <ExternalLink className="w-4 h-4" /> View Booking Portal
              </Link>
            </div>
          </div>

          {/* Three Administration View Mode Tabs */}
          <div className="flex items-center gap-2 mt-8 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setAdminView('bookings')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                adminView === 'bookings'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800'
              }`}
            >
              <Store className="w-4 h-4" /> Bookings & Payments ({bookings.length})
            </button>
            <button
              type="button"
              onClick={() => setAdminView('layout')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                adminView === 'layout'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Market Layout Floorplan
            </button>
            <button
              type="button"
              onClick={() => setAdminView('packages')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                adminView === 'packages'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" /> Booth Packages ({boothPackages.length})
            </button>
          </div>
        </div>
      </div>

      {/* Floating Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Stall Inquiries</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-600">Pending Review</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Confirmed & Paid</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{stats.confirmed}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-sky-600">Stall Fee Turnover</p>
              <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                {stats.totalRevenue.toLocaleString()} <span className="text-xs font-bold text-slate-500">SEK</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════════
            VIEW 1: BOOKINGS & DIRECT PAYMENTS
        ═════════════════════════════════════════════════════════════════════════ */}
        {adminView === 'bookings' && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search vendor, table #, ref code..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-700"
                  >
                    <option value="ALL">All Curated Events ({events.length})</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="WAITLIST">Waitlist</option>
                    <option value="REJECTED">Declined</option>
                  </select>
                </div>

                <div>
                  <select
                    value={selectedPayment}
                    onChange={e => setSelectedPayment(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-700"
                  >
                    <option value="ALL">All Payments</option>
                    <option value="PAID_IN_FULL">Paid in Full</option>
                    <option value="DEPOSIT_PAID">Deposit Paid</option>
                    <option value="UNPAID">Unpaid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Ref & Vendor</th>
                      <th className="py-3.5 px-4">Event</th>
                      <th className="py-3.5 px-4">Selected Table</th>
                      <th className="py-3.5 px-4">Package</th>
                      <th className="py-3.5 px-4">Direct Payment</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-mono text-[11px] font-bold text-slate-400">
                            {booking.booking_ref}
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-0.5">
                            {booking.business_name}
                          </div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                            <span>{booking.contact_name}</span>
                            <span>•</span>
                            <span className="text-sky-600">{booking.email}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800 line-clamp-1 max-w-[180px]">
                            {booking.event_title}
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            {booking.event_date} • {booking.event_city}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {booking.selected_table_number || booking.assigned_booth ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 font-bold text-xs">
                              <Tag className="w-3 h-3 text-sky-600" />
                              {booking.selected_table_number || booking.assigned_booth}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No table assigned</span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800">{booking.booth_package_name}</div>
                          <div className="font-mono font-bold text-xs text-slate-900 mt-0.5">
                            {booking.price.toLocaleString()} {booking.currency}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              booking.payment_status === 'PAID_IN_FULL'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {booking.payment_status === 'PAID_IN_FULL' ? <Check className="w-3 h-3" /> : null}
                              {booking.payment_status}
                            </span>
                          </div>
                          {booking.payment_transaction_id && (
                            <div className="text-[10px] text-slate-400 font-mono mt-1">
                              {booking.payment_method?.toUpperCase()} • {booking.payment_transaction_id}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <select
                            value={booking.status}
                            onChange={e => handleQuickStatusChange(booking, e.target.value as EventBookingStatus)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white"
                          >
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="APPROVED">Approved</option>
                            <option value="PENDING">Pending Review</option>
                            <option value="WAITLIST">Waitlist</option>
                            <option value="REJECTED">Declined</option>
                          </select>
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingTaxInvoice(booking)}
                              title="View Tax Invoice"
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBooking(booking);
                                setIsEditModalOpen(true);
                              }}
                              title="Edit details"
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(booking)}
                              title="Delete booking"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════
            VIEW 2: MARKET LAYOUT & FLOORPLAN ALLOCATION
        ═════════════════════════════════════════════════════════════════════════ */}
        {adminView === 'layout' && (
          <div className="space-y-6">
            {/* Admin Workflow Guide Banner */}
            {showAdminGuide && (
              <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-sky-800/40 relative overflow-hidden">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
                      <HelpCircle className="w-6 h-6 text-sky-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        How Admin Sets Up Packages & Market Layout for Direct Payments
                      </h4>
                      <p className="text-xs text-sky-200/80">
                        Follow this simple 4-step flow to open booth booking and instant checkout for your event.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdminGuide(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Dismiss guide"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-800 text-xs">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-black flex items-center justify-center mb-2.5">
                      1
                    </div>
                    <h5 className="font-bold text-white text-sm">Add Booth Packages</h5>
                    <p className="text-slate-300 text-[11px] mt-1.5 leading-relaxed">
                      Go to the <strong>Booth Packages</strong> tab to define package tiers (Standard, Premium, Culinary, Artisan, Sponsor) with SEK prices, included furniture, dimensions, and badges.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-black flex items-center justify-center mb-2.5">
                      2
                    </div>
                    <h5 className="font-bold text-white text-sm">Design Market Layout</h5>
                    <p className="text-slate-300 text-[11px] mt-1.5 leading-relaxed">
                      Select your event floorplan below. Add single tables or use <strong>Batch Generate Tables</strong> to create numbered slots (e.g. Table A-01 to A-08) across arena zones.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-black flex items-center justify-center mb-2.5">
                      3
                    </div>
                    <h5 className="font-bold text-white text-sm">Vendors Pick Tables</h5>
                    <p className="text-slate-300 text-[11px] mt-1.5 leading-relaxed">
                      Vendors navigate to <code>/event-bookings</code>, choose their package, and click an available table number on the live visual map to reserve it.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center mb-2.5">
                      4
                    </div>
                    <h5 className="font-bold text-white text-sm">Direct Payment</h5>
                    <p className="text-slate-300 text-[11px] mt-1.5 leading-relaxed">
                      Vendors settle instantly with Swish, Card, or Klarna. The table is locked immediately, status marks <strong>Confirmed & Paid</strong>, and VAT receipt is generated!
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold uppercase tracking-wider">
                      Interactive Venue Map
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdminGuide(!showAdminGuide)}
                      className="text-xs text-slate-500 hover:text-sky-600 font-bold flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> {showAdminGuide ? 'Hide Guide' : 'Show Guide'}
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    {currentLayout?.name || 'Venue Floorplan & Table Slot Allocation'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentLayout?.description || 'Select an event to view booked tables, block slots, or customize table numbers.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={selectedLayoutEventId}
                    onChange={e => handleLayoutEventChange(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold max-w-[220px]"
                  >
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.city})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsVisualMapModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all"
                    title="Upload venue map blueprint image and position tables visually"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-950" /> Blueprint Map & Tables Placer
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddTableModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-sky-500 shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Table
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-indigo-500 shadow-sm flex items-center gap-1.5"
                    title="Generate multiple tables in one click"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Batch Generate
                  </button>

                  {/* MANAGE ZONES BUTTON */}
                  <button
                    type="button"
                    onClick={() => setIsZonesManagerOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all"
                    title="Create, rename, or customize exhibition zones"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                    <span>Manage Zones</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-800 text-purple-100 text-[10px] font-mono font-bold">
                      {availableZones.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const layoutName = currentLayout?.name || (selectedLayoutEvent ? `${selectedLayoutEvent.title} Floorplan Layout` : 'Floorplan Layout');
                      const layoutDesc = currentLayout?.description || (selectedLayoutEvent ? `Exhibition stall layout for ${selectedLayoutEvent.location_name}, ${selectedLayoutEvent.city}` : '');
                      const blueprintUrl = currentLayout?.floor_plan_image_url || currentLayout?.map_image_url || selectedLayoutEvent?.floor_plan_image_url || '';
                      
                      setLayoutSettingsForm({
                        name: layoutName,
                        description: layoutDesc,
                        floor_plan_image_url: blueprintUrl
                      });
                      setLayoutSettingsTab('details');
                      setIsLayoutSettingsOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                    title="Edit Floorplan Details, Blueprint & Zone Settings"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-300" />
                    <span>Settings</span>
                  </button>

                  <Link
                    to={`/event-bookings?eventId=${selectedLayoutEventId}`}
                    target="_blank"
                    className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1"
                    title="Preview what vendors see when booking"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Vendor View</span>
                    <ExternalLink className="w-3 h-3 text-emerald-600 ml-0.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={handleResetLayout}
                    className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-xs font-bold"
                    title="Reset layout to default 24 tables"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Layout Map Screen */}
              <div className="bg-slate-950 rounded-3xl p-6 sm:p-8 text-white relative shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      MAIN ARENA STAGE & RUNWAY
                    </div>
                    <span className="text-slate-400 text-xs font-mono">
                      {currentLayout?.slots.length || 0} Tables Configured
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* View Switcher MAP vs GRID */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setLayoutViewMode('MAP')}
                        className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                          layoutViewMode === 'MAP'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Map className="w-3.5 h-3.5" />
                        <span>Blueprint Map</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayoutViewMode('GRID')}
                        className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                          layoutViewMode === 'GRID'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Grid Directory</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-md bg-slate-800 border border-slate-700 inline-block"></span>
                        <span className="text-slate-300">Available</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-md bg-sky-600 inline-block"></span>
                        <span className="text-slate-300">Booked</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-md bg-amber-600 inline-block"></span>
                        <span className="text-slate-300">Reserved</span>
                      </div>
                    </div>
                  </div>
                </div>

                {layoutViewMode === 'MAP' ? (
                  <div className="space-y-4">
                    {/* Visual Blueprint Canvas */}
                    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl flex items-center justify-center">
                      {(currentLayout?.map_image_url || selectedLayoutEvent?.floor_plan_image_url) ? (
                        <>
                          <img
                            src={currentLayout?.map_image_url || selectedLayoutEvent?.floor_plan_image_url}
                            alt="Venue Layout Blueprint"
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[0.5px]" />
                        </>
                      ) : (
                        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
                      )}

                      {/* Stage landmark on top if no custom image */}
                      {!(currentLayout?.map_image_url || selectedLayoutEvent?.floor_plan_image_url) && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-widest pointer-events-none z-10">
                          MAIN STAGE & RUNWAY
                        </div>
                      )}

                      {/* Interactive Slot Pins placed at x%, y% */}
                      <div className="absolute inset-0 p-4">
                        {currentLayout?.slots.map(slot => {
                          const isBooked = slot.status === 'booked';
                          const isReserved = slot.status === 'reserved';
                          const x = slot.map_coordinates?.x ?? slot.x ?? 50;
                          const y = slot.map_coordinates?.y ?? slot.y ?? 50;

                          return (
                            <div
                              key={slot.id}
                              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                              className="absolute z-20"
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenSlotDetail(slot)}
                                onMouseEnter={() => setMapHoveredSlotId(slot.id)}
                                onMouseLeave={() => setMapHoveredSlotId(null)}
                                className={`px-2.5 py-1.5 rounded-xl border-2 text-xs font-black transition-all shadow-xl flex items-center gap-1.5 cursor-pointer select-none ${
                                  isBooked
                                    ? 'bg-sky-950/90 border-sky-500 text-sky-200'
                                    : isReserved
                                    ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                                    : 'bg-slate-900/90 border-emerald-400 hover:border-emerald-300 text-emerald-300 hover:scale-110 hover:shadow-emerald-500/40'
                                }`}
                              >
                                <span>{slot.table_number || slot.id}</span>
                                {slot.power_included && <Zap className="w-2.5 h-2.5 text-amber-400" />}
                              </button>

                              {/* Hover Tooltip */}
                              {mapHoveredSlotId === slot.id && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 rounded-xl bg-slate-900/95 border border-amber-400 text-white shadow-2xl z-40 text-left backdrop-blur-md pointer-events-none">
                                  <div className="text-[11px] font-black text-amber-300 flex items-center justify-between">
                                    <span>{slot.table_number}</span>
                                    <span>{slot.price_sek || 4500} SEK</span>
                                  </div>
                                  <div className="text-[10px] text-slate-300 truncate mt-0.5">{slot.zone}</div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">
                                    {slot.size || 'Standard Stall'} {slot.power_included && '• ⚡ 230V'}
                                  </div>
                                  <div className="text-[9px] font-bold mt-1 text-emerald-400">
                                    {isBooked ? `Booked: ${slot.booked_by_name}` : isReserved ? 'Reserved' : 'Click to Edit or Assign'}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Map info watermark & quick edit trigger */}
                      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsVisualMapModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm shadow-md"
                        >
                          <Layers className="w-3.5 h-3.5" /> Open Visual Map Editor
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {currentLayout?.slots.map(slot => {
                      const isBooked = slot.status === 'booked';
                      const isReserved = slot.status === 'reserved';

                      return (
                        <div
                          key={slot.id}
                          onClick={() => handleOpenSlotDetail(slot)}
                          className={`group relative rounded-2xl p-4 transition-all cursor-pointer border flex flex-col justify-between select-none ${
                            isBooked
                              ? 'bg-sky-950 border-sky-500 text-white shadow-md'
                              : isReserved
                              ? 'bg-amber-950/70 border-amber-600 text-white'
                              : 'bg-slate-900 border-slate-800 hover:border-sky-500 hover:bg-slate-850 text-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-mono text-[10px] text-slate-400 block">{slot.id}</span>
                              <h4 className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors">
                                {slot.table_number}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1">
                              {isBooked ? (
                                <CheckCircle className="w-4 h-4 text-sky-400" />
                              ) : isReserved ? (
                                <Lock className="w-4 h-4 text-amber-400" />
                              ) : (
                                <Edit className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px]">
                            <div className="flex items-center justify-between text-slate-300 font-semibold">
                              <span className="truncate">{slot.zone.split(' - ')[0]}</span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                {slot.tier}
                              </span>
                            </div>
                            <span className="block truncate text-slate-400 mt-1">
                              {isBooked
                                ? `Booked: ${slot.booked_by_name}`
                                : isReserved
                                ? 'Reserved (Click to edit)'
                                : slot.price_override
                                ? `${slot.price_override.toLocaleString()} SEK (Override)`
                                : 'Available (Click to edit)'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                  <span>
                    💡 <strong>Tip:</strong> Click on any table to edit its number, change tier/zone, block/reserve, or delete.
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Floorplan synced with live vendor checkout
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════════
            VIEW 3: BOOTH PACKAGES MANAGEMENT
        ═════════════════════════════════════════════════════════════════════════ */}
        {adminView === 'packages' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Custom Booth Package Tiers</h3>
                <p className="text-xs text-slate-500">
                  Create and adjust exhibitor booth packages, features, dimensions, and standard pricing for each event.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Event:</span>
                  <select
                    value={selectedLayoutEventId}
                    onChange={e => handleLayoutEventChange(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold max-w-[240px]"
                  >
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.city})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingPackage({
                      event_id: selectedLayoutEventId,
                      name: '',
                      tier: 'standard',
                      dimensions: '3m x 3m (9m²)',
                      price: 4500,
                      currency: 'SEK',
                      description: '',
                      features: ['1 Table & 2 Chairs', 'Electricity socket 230V', 'Exhibitor badges'],
                      badge: ''
                    });
                    setIsPackageModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" /> Create Package Tier
                </button>
              </div>
            </div>

            {boothPackages.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700">No Booth Packages for this Event</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
                  {selectedLayoutEvent ? `"${selectedLayoutEvent.title}" does not have any custom packages configured yet.` : 'Select an event to configure packages.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPackage({
                      event_id: selectedLayoutEventId,
                      name: '',
                      tier: 'standard',
                      dimensions: '3m x 3m (9m²)',
                      price: 4500,
                      currency: 'SEK',
                      description: '',
                      features: ['1 Table & 2 Chairs', 'Electricity socket 230V', 'Exhibitor badges'],
                      badge: ''
                    });
                    setIsPackageModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-sky-500 shadow-sm inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create First Package
                </button>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boothPackages.map(pkg => (
                <div
                  key={pkg.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {pkg.dimensions}
                      </span>
                      {pkg.badge && (
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                          {pkg.badge}
                        </span>
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-slate-900">{pkg.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{pkg.description}</p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-2xl font-black font-mono text-slate-900">
                        {pkg.price.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{pkg.currency}</span>
                    </div>

                    <ul className="mt-4 space-y-1 text-xs text-slate-600 pt-3 border-t border-slate-100">
                      {pkg.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleDuplicatePackage(pkg)}
                      className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center gap-1"
                      title="Clone package to create a variant"
                    >
                      <Copy className="w-3.5 h-3.5" /> Clone
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPackage(pkg);
                        setIsPackageModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT BOOTH PACKAGE */}
      <AnimatePresence>
        {isPackageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {editingPackage.id ? 'Edit Booth Package Tier' : 'Add New Booth Package'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedLayoutEvent ? `Event: ${selectedLayoutEvent.title} • ` : ''}Configure dimensions, pricing, and features for vendors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePackage} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Package Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard Shell Scheme (3x3m)"
                    value={editingPackage.name}
                    onChange={e => setEditingPackage({ ...editingPackage, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Package Tier
                    </label>
                    <select
                      value={editingPackage.tier}
                      onChange={e => setEditingPackage({ ...editingPackage, tier: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                    >
                      <option value="standard">Standard Shell</option>
                      <option value="premium">Premium Corner / Island</option>
                      <option value="culinary">Culinary & Beverage</option>
                      <option value="artisan">Artisan Tabletop</option>
                      <option value="sponsor">Main Stage VIP Sponsor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Dimensions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3m x 3m (9m²)"
                      value={editingPackage.dimensions}
                      onChange={e => setEditingPackage({ ...editingPackage, dimensions: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Price in SEK <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={editingPackage.price}
                      onChange={e => setEditingPackage({ ...editingPackage, price: parseInt(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Badge (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Most Popular"
                      value={editingPackage.badge || ''}
                      onChange={e => setEditingPackage({ ...editingPackage, badge: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description of who this package is for..."
                    value={editingPackage.description || ''}
                    onChange={e => setEditingPackage({ ...editingPackage, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Max Spots (Capacity)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 12"
                      value={editingPackage.max_spots || ''}
                      onChange={e => setEditingPackage({ ...editingPackage, max_spots: parseInt(e.target.value) || undefined })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editingPackage.popular ?? false}
                        onChange={e => setEditingPackage({ ...editingPackage, popular: e.target.checked })}
                        className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-700">Highlight as Popular Tier</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Features Included (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={editingPackage.features?.join('\n') || ''}
                    onChange={e => setEditingPackage({
                      ...editingPackage,
                      features: e.target.value.split('\n').filter(Boolean)
                    })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono"
                    placeholder="1x Dressed table & 2x chairs&#10;Power feed 230V&#10;2x Exhibitor passes"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPackageModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-sky-600 hover:bg-sky-500 text-white shadow-md"
                  >
                    Save Package
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD TABLE SLOT TO FLOORPLAN */}
      <AnimatePresence>
        {isAddTableModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-bold text-slate-900">Add Table Slot to Market Floorplan</h3>
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddTableSlot} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Table / Stall Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Table B-09 or Stall C-05"
                    value={newTableForm.table_number}
                    onChange={e => setNewTableForm({ ...newTableForm, table_number: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Zone Section
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCustomZoneForNew(!isCreatingCustomZoneForNew)}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{isCreatingCustomZoneForNew ? 'Select Existing Zone' : '+ Create New Zone'}</span>
                    </button>
                  </div>

                  {isCreatingCustomZoneForNew ? (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Zone E - Designer Pavilion or VIP Stage"
                      value={newTableCustomZone}
                      onChange={e => setNewTableCustomZone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border-2 border-purple-300 focus:border-purple-500 text-xs font-bold bg-purple-50/50"
                    />
                  ) : (
                    <select
                      value={newTableForm.zone}
                      onChange={e => {
                        if (e.target.value === '__NEW__') {
                          setIsCreatingCustomZoneForNew(true);
                        } else {
                          setNewTableForm({ ...newTableForm, zone: e.target.value });
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                    >
                      {availableZones.map(z => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                      <option value="__NEW__">+ Create New Zone...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Recommended Package Tier
                  </label>
                  <select
                    value={newTableForm.tier}
                    onChange={e => setNewTableForm({ ...newTableForm, tier: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                  >
                    <option value="standard">Standard Shell</option>
                    <option value="premium">Premium Corner</option>
                    <option value="culinary">Culinary Station</option>
                    <option value="artisan">Artisan Tabletop</option>
                    <option value="sponsor">Main Stage VIP Sponsor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Location Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Central aisle corner with direct electrical socket"
                    value={newTableForm.description}
                    onChange={e => setNewTableForm({ ...newTableForm, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddTableModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 text-white shadow-md"
                  >
                    Add Table to Map
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: FLOORPLAN & LAYOUT SETTINGS */}
      <AnimatePresence>
        {isLayoutSettingsOpen && (
          <div
            onClick={() => setIsLayoutSettingsOpen(false)}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in"
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative text-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Floorplan & Stall Settings</h3>
                    <p className="text-[11px] text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                      {selectedLayoutEvent?.title || 'Event Layout Configuration'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLayoutSettingsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* TABS: LAYOUT DETAILS vs ZONES */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <button
                  type="button"
                  onClick={() => setLayoutSettingsTab('details')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    layoutSettingsTab === 'details'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Layout Info & Blueprint</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutSettingsTab('zones')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    layoutSettingsTab === 'zones'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Exhibition Zones ({availableZones.length})</span>
                </button>
              </div>

              {layoutSettingsTab === 'details' ? (
                /* TAB 1: GENERAL LAYOUT & BLUEPRINT */
                <form onSubmit={handleSaveLayoutSettings} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Floorplan / Hall Layout Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Main Exhibition Hall & Arena Layout"
                      value={layoutSettingsForm.name}
                      onChange={e => setLayoutSettingsForm({ ...layoutSettingsForm, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Layout Description & Orientation Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Brief description for exhibitors (e.g. Hall layout with 24 stalls, fashion stage, and food bazaar)..."
                      value={layoutSettingsForm.description}
                      onChange={e => setLayoutSettingsForm({ ...layoutSettingsForm, description: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Blueprint Reference Setting */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                        <Map className="w-3.5 h-3.5 text-amber-600" />
                        Venue Blueprint Reference
                      </span>
                      {layoutSettingsForm.floor_plan_image_url ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Attached
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                          Stall Directory Only (No Map)
                        </span>
                      )}
                    </div>

                    {layoutSettingsForm.floor_plan_image_url ? (
                      <div className="space-y-2">
                        <div className="relative h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
                          <img
                            src={layoutSettingsForm.floor_plan_image_url}
                            alt="Blueprint Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setLayoutSettingsForm({ ...layoutSettingsForm, floor_plan_image_url: '' })}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Map Option</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsLayoutSettingsOpen(false);
                              setIsVisualMapModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Open Map & Stall Placer</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <p className="text-[11px] text-slate-500">
                          Operating in smart stall directory mode. Vendors select tables by number.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsLayoutSettingsOpen(false);
                            setIsVisualMapModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Add Blueprint</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stalls Summary Stats */}
                  {currentLayout && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Stalls</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{currentLayout.slots.length}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] text-emerald-600 font-bold uppercase block">Available</span>
                        <span className="font-mono font-bold text-emerald-800 text-sm">
                          {currentLayout.slots.filter(s => s.status === 'available').length}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                        <span className="text-[10px] text-sky-600 font-bold uppercase block">Booked</span>
                        <span className="font-mono font-bold text-sky-800 text-sm">
                          {currentLayout.slots.filter(s => s.status === 'booked').length}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsLayoutSettingsOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-sky-600 text-white shadow-md flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Settings</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* TAB 2: ZONES & SECTIONS MANAGER */
                <div className="space-y-5 text-xs">
                  {/* Create New Zone Box */}
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Create New Exhibition Zone</span>
                    </div>
                    <p className="text-[11px] text-purple-700">
                      Define a custom zone (e.g. VIP Front Island, Stage Runway, Food Truck Court, Designer Pavilion).
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter zone name (e.g. Zone E - Designer Pavilion)..."
                        value={newZoneInput}
                        onChange={e => setNewZoneInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateZone(newZoneInput);
                          }
                        }}
                        className="flex-1 p-2.5 rounded-xl border border-purple-200 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleCreateZone(newZoneInput)}
                        disabled={!newZoneInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Zone</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Zones List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        Active Event Zones ({availableZones.length})
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {currentLayout?.slots.length || 0} tables distributed across zones
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {availableZones.map(zoneName => {
                        const countInZone = currentLayout?.slots.filter(s => s.zone === zoneName).length || 0;
                        const isEditingThis = editingZoneState?.original === zoneName;

                        return (
                          <div
                            key={zoneName}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                          >
                            {isEditingThis ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="text"
                                  value={editingZoneState.current}
                                  onChange={e => setEditingZoneState({ ...editingZoneState, current: e.target.value })}
                                  className="flex-1 p-2 rounded-lg border border-purple-300 text-xs font-bold bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRenameZone(zoneName, editingZoneState.current)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingZoneState(null)}
                                  className="px-2 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                                  <span className="font-bold text-slate-800 text-xs">{zoneName}</span>
                                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
                                    {countInZone} {countInZone === 1 ? 'table' : 'tables'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingZoneState({ original: zoneName, current: zoneName })}
                                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                                    title="Rename zone"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteZone(zoneName)}
                                    className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Delete zone"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preset Zone Packs */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                      Quick Preset Zone Packs (1-Click Add)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PRESET_ZONE_PACKS.map(pack => (
                        <div
                          key={pack.name}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-300 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">{pack.name}</span>
                            <span className="text-[10px] text-slate-500 line-clamp-1 block mt-0.5">
                              {pack.description}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyPresetPack(pack)}
                            className="mt-2.5 w-full py-1.5 rounded-lg bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add {pack.zones.length} Zones</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsLayoutSettingsOpen(false)}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STANDALONE MODAL: DEDICATED ZONES MANAGER */}
      <AnimatePresence>
        {isZonesManagerOpen && (
          <div
            onClick={() => setIsZonesManagerOpen(false)}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in"
          >
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Exhibition Zones Manager</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Create, rename, and assign zones for {selectedLayoutEvent?.title || 'Event'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsZonesManagerOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Create New Zone Card */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 mb-5 space-y-2">
                <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Create New Zone
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter zone name (e.g. VIP Front Island, Food Truck Court, Designer Pavilion)..."
                    value={newZoneInput}
                    onChange={e => setNewZoneInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateZone(newZoneInput);
                      }
                    }}
                    className="flex-1 p-2.5 rounded-xl border border-purple-200 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateZone(newZoneInput)}
                    disabled={!newZoneInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Zone</span>
                  </button>
                </div>
              </div>

              {/* Current Active Zones List */}
              <div className="space-y-2.5 mb-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Current Active Zones ({availableZones.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {currentLayout?.slots.length || 0} tables in floorplan
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {availableZones.map(zoneName => {
                    const countInZone = currentLayout?.slots.filter(s => s.zone === zoneName).length || 0;
                    const isEditingThis = editingZoneState?.original === zoneName;

                    return (
                      <div
                        key={zoneName}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors"
                      >
                        {isEditingThis ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingZoneState.current}
                              onChange={e => setEditingZoneState({ ...editingZoneState, current: e.target.value })}
                              className="flex-1 p-2 rounded-xl border border-purple-300 text-xs font-bold bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameZone(zoneName, editingZoneState.current)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingZoneState(null)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5">
                              <Tag className="w-4 h-4 text-purple-600" />
                              <span className="font-bold text-slate-800 text-xs">{zoneName}</span>
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono font-bold">
                                {countInZone} {countInZone === 1 ? 'table' : 'tables'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingZoneState({ original: zoneName, current: zoneName })}
                                className="px-2.5 py-1.5 rounded-xl hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="Rename zone"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Rename</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteZone(zoneName)}
                                className="p-1.5 rounded-xl hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete zone"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preset Zone Packs */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Quick Preset Zone Packs
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Add standard industry zone classifications with one click.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESET_ZONE_PACKS.map(pack => (
                    <div
                      key={pack.name}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-purple-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{pack.name}</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {pack.description}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyPresetPack(pack)}
                        className="mt-3 w-full py-2 rounded-xl bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add {pack.zones.length} Zones</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end pt-5 border-t border-slate-100 mt-5">
                <button
                  type="button"
                  onClick={() => setIsZonesManagerOpen(false)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                >
                  Close & Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: BATCH GENERATE TABLES */}
      <AnimatePresence>
        {isBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-800"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Batch Generate Tables</h3>
                    <p className="text-[11px] text-slate-400">Quickly add numbered tables to the floorplan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBatchGenerateTables} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Table Prefix
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Table B- or Stall "
                      value={batchForm.prefix}
                      onChange={e => setBatchForm({ ...batchForm, prefix: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Start Number
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={batchForm.startNumber}
                      onChange={e => setBatchForm({ ...batchForm, startNumber: parseInt(e.target.value) || 1 })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Count to Generate
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={50}
                      value={batchForm.count}
                      onChange={e => setBatchForm({ ...batchForm, count: parseInt(e.target.value) || 1 })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Package Tier
                    </label>
                    <select
                      value={batchForm.tier}
                      onChange={e => setBatchForm({ ...batchForm, tier: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                    >
                      <option value="standard">Standard Shell</option>
                      <option value="premium">Premium Corner</option>
                      <option value="culinary">Culinary Station</option>
                      <option value="artisan">Artisan Tabletop</option>
                      <option value="sponsor">VIP Sponsor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Zone Section
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCustomZoneForBatch(!isCreatingCustomZoneForBatch)}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{isCreatingCustomZoneForBatch ? 'Select Existing Zone' : '+ Create New Zone'}</span>
                    </button>
                  </div>

                  {isCreatingCustomZoneForBatch ? (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Zone E - Food Trucks or Runway Row"
                      value={batchCustomZone}
                      onChange={e => setBatchCustomZone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border-2 border-purple-300 focus:border-purple-500 text-xs font-bold bg-purple-50/50"
                    />
                  ) : (
                    <select
                      value={batchForm.zone}
                      onChange={e => {
                        if (e.target.value === '__NEW__') {
                          setIsCreatingCustomZoneForBatch(true);
                        } else {
                          setBatchForm({ ...batchForm, zone: e.target.value });
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                    >
                      {availableZones.map(z => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                      <option value="__NEW__">+ Create New Zone...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Standard 3x3m table in main hall aisle"
                    value={batchForm.description}
                    onChange={e => setBatchForm({ ...batchForm, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-medium">
                  Will generate <strong>{batchForm.count}</strong> tables starting from <strong>{batchForm.prefix}{batchForm.startNumber < 10 ? `0${batchForm.startNumber}` : batchForm.startNumber}</strong> in <strong>{batchForm.zone}</strong>.
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5 transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Generate Tables</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT TABLE SLOT DETAIL */}
      <AnimatePresence>
        {isSlotModalOpen && editingSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-800"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-mono font-bold text-xs">
                    {editingSlot.table_number.replace(/^Table\s*/i, '')}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{editingSlot.table_number}</h3>
                    <p className="text-[11px] text-slate-400">{editingSlot.zone}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSlotDetail} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Table / Stall Number
                    </label>
                    <input
                      type="text"
                      required
                      value={editingSlot.table_number}
                      onChange={e => setEditingSlot({ ...editingSlot, table_number: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Status
                    </label>
                    <select
                      value={editingSlot.status}
                      onChange={e => setEditingSlot({ ...editingSlot, status: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                    >
                      <option value="available">Available (Open)</option>
                      <option value="reserved">Reserved</option>
                      <option value="booked">Booked (Occupied)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Zone Section
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCreatingCustomZoneForEdit(!isCreatingCustomZoneForEdit)}
                        className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>{isCreatingCustomZoneForEdit ? 'Select' : '+ New'}</span>
                      </button>
                    </div>

                    {isCreatingCustomZoneForEdit ? (
                      <input
                        type="text"
                        placeholder="Type new zone name..."
                        value={editCustomZone}
                        onChange={e => {
                          setEditCustomZone(e.target.value);
                          setEditingSlot({ ...editingSlot, zone: e.target.value });
                        }}
                        className="w-full p-2.5 rounded-xl border-2 border-purple-300 text-xs font-bold bg-purple-50/50"
                      />
                    ) : (
                      <select
                        value={editingSlot.zone}
                        onChange={e => {
                          if (e.target.value === '__NEW__') {
                            setIsCreatingCustomZoneForEdit(true);
                          } else {
                            setEditingSlot({ ...editingSlot, zone: e.target.value });
                          }
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                      >
                        {availableZones.map(z => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                        <option value="__NEW__">+ Create New Zone...</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Tier
                    </label>
                    <select
                      value={editingSlot.tier}
                      onChange={e => setEditingSlot({ ...editingSlot, tier: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                    >
                      <option value="standard">Standard Shell</option>
                      <option value="premium">Premium Corner</option>
                      <option value="culinary">Culinary Station</option>
                      <option value="artisan">Artisan Tabletop</option>
                      <option value="sponsor">VIP Sponsor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Price Override (Optional SEK)
                  </label>
                  <input
                    type="number"
                    placeholder="Leave blank for tier default"
                    value={editingSlot.price_override || ''}
                    onChange={e => setEditingSlot({ ...editingSlot, price_override: parseInt(e.target.value) || undefined })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Description & Location Notes
                  </label>
                  <input
                    type="text"
                    value={editingSlot.description || ''}
                    onChange={e => setEditingSlot({ ...editingSlot, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                {editingSlot.booked_by_name && (
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs space-y-0.5">
                    <span className="text-[10px] font-bold text-sky-800 uppercase block">Occupied by Exhibitor</span>
                    <p className="font-bold text-slate-900">{editingSlot.booked_by_name}</p>
                    {editingSlot.booked_booking_ref && (
                      <p className="text-[11px] font-mono text-slate-500">Ref: {editingSlot.booked_booking_ref}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleDeleteSlot(editingSlot.id)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Slot</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSlotModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: VIEW TAX INVOICE */}
      <AnimatePresence>
        {viewingTaxInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-800"
            >
              <button
                type="button"
                onClick={() => setViewingTaxInvoice(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400"
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
                      Official VAT Tax Invoice / Kvitto
                    </h3>
                    <p className="text-xs text-slate-500">Org.nr: 559123-4567 • MOMS: SE559123456701</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Invoice No.</span>
                    <p className="font-mono font-bold text-sm text-slate-900">{viewingTaxInvoice.booking_ref}-INV</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{viewingTaxInvoice.payment_date?.split('T')[0] || 'Settled'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 text-xs mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Exhibitor</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{viewingTaxInvoice.business_name}</p>
                    <p className="text-slate-600">{viewingTaxInvoice.contact_name}</p>
                    <p className="text-slate-600">{viewingTaxInvoice.email} • {viewingTaxInvoice.phone}</p>
                    {viewingTaxInvoice.payer_company_vat && (
                      <p className="text-slate-500 mt-1">VAT/Org: {viewingTaxInvoice.payer_company_vat}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Showcase Allocation</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{viewingTaxInvoice.event_title}</p>
                    <p className="text-slate-600">{viewingTaxInvoice.event_city} • {viewingTaxInvoice.event_date}</p>
                    <p className="font-bold text-sky-700 mt-1">
                      Table / Stall: {viewingTaxInvoice.selected_table_number || viewingTaxInvoice.assigned_booth}
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
                        <strong className="text-slate-900">{viewingTaxInvoice.booth_package_name}</strong>
                        <div className="text-[11px] text-slate-400">Exhibitor stall fee, table allotment, 230V feed & directory listing</div>
                      </td>
                      <td className="py-3 text-right font-mono">{(viewingTaxInvoice.subtotal || Math.round(viewingTaxInvoice.price * 0.8)).toLocaleString()} SEK</td>
                      <td className="py-3 text-right font-mono">{(viewingTaxInvoice.vat_amount || Math.round(viewingTaxInvoice.price * 0.2)).toLocaleString()} SEK</td>
                      <td className="py-3 text-right font-mono font-bold">{viewingTaxInvoice.price.toLocaleString()} SEK</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex items-center justify-between text-xs p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Settled via {viewingTaxInvoice.payment_method?.toUpperCase() || 'DIRECT'}</span>
                  </div>
                  <div className="font-mono text-emerald-900 font-bold">
                    {viewingTaxInvoice.payment_transaction_id}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-sky-600 text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setViewingTaxInvoice(null)}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT BOOKING DETAILS */}
      <AnimatePresence>
        {isEditModalOpen && editingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{editingBooking.booking_ref}</span>
                  <h3 className="text-xl font-bold text-slate-900">Edit Exhibitor Booking</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditingBooking} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingBooking.business_name}
                      onChange={e => setEditingBooking({ ...editingBooking, business_name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingBooking.contact_name}
                      onChange={e => setEditingBooking({ ...editingBooking, contact_name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={editingBooking.email}
                      onChange={e => setEditingBooking({ ...editingBooking, email: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={editingBooking.phone}
                      onChange={e => setEditingBooking({ ...editingBooking, phone: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Selected Table / Stall
                    </label>
                    <input
                      type="text"
                      value={editingBooking.selected_table_number || editingBooking.assigned_booth || ''}
                      onChange={e => setEditingBooking({
                        ...editingBooking,
                        selected_table_number: e.target.value,
                        assigned_booth: e.target.value
                      })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Price (SEK)
                    </label>
                    <input
                      type="number"
                      value={editingBooking.price}
                      onChange={e => setEditingBooking({ ...editingBooking, price: parseInt(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Internal Admin Logistics Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Logistics clearances, electrical load remarks..."
                    value={editingBooking.admin_notes || ''}
                    onChange={e => setEditingBooking({ ...editingBooking, admin_notes: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-sky-600 text-white shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DELETE CONFIRMATION */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-slate-900">Delete Exhibitor Booking?</h3>
              <p className="text-xs text-slate-500 mt-2">
                Are you sure you want to delete the reservation for <strong>{deleteTarget.business_name}</strong> ({deleteTarget.booking_ref})?
              </p>

              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteBooking}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 text-white shadow-md disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Visual Blueprint Map & Tables Placer Modal */}
      {isVisualMapModalOpen && selectedLayoutEvent && (
        <AdminTableMapModal
          isOpen={true}
          onClose={() => setIsVisualMapModalOpen(false)}
          event={selectedLayoutEvent}
          onSaveTables={async (tables: VendorTable[], floorPlanImageUrl?: string) => {
            try {
              let optimizedFloorPlan = floorPlanImageUrl || selectedLayoutEvent.floor_plan_image_url;
              if (optimizedFloorPlan && optimizedFloorPlan.startsWith('data:image/') && optimizedFloorPlan.length > 150000) {
                try {
                  optimizedFloorPlan = await compressImage(optimizedFloorPlan, 1600, 1200, 0.78);
                } catch {
                  // ignore
                }
              }

              const updatedEvent = {
                ...selectedLayoutEvent,
                vendor_tables: tables,
                floor_plan_image_url: optimizedFloorPlan
              };
              await api.saveOrganizedEvent(updatedEvent);

              // Update the layout in state and storage
              if (currentLayout) {
                const updatedLayout = {
                  ...currentLayout,
                  map_image_url: updatedEvent.floor_plan_image_url,
                  floor_plan_image_url: updatedEvent.floor_plan_image_url,
                  slots: tables.map((t, idx) => ({
                    id: t.id,
                    table_number: t.table_number,
                    zone: t.zone,
                    tier: (t.price_sek >= 7000 ? 'premium' : t.price_sek >= 5000 ? 'culinary' : 'standard') as any,
                    description: t.location_description || `${t.size || 'Table'} - ${t.zone}`,
                    status: (t.status === 'BOOKED' ? 'booked' : 'available') as any,
                    x: t.map_coordinates?.x ?? (15 + ((idx * 16) % 70)),
                    y: t.map_coordinates?.y ?? (20 + (Math.floor(idx / 5) * 15) % 65),
                    map_coordinates: t.map_coordinates || { x: 15 + ((idx * 16) % 70), y: 20 + (Math.floor(idx / 5) * 15) % 65 },
                    size: t.size,
                    price_sek: t.price_sek,
                    power_included: t.power_included,
                    booked_by_name: t.booked_by_vendor?.business_name
                  }))
                };
                await api.saveEventMarketLayout(updatedLayout);
                setCurrentLayout(updatedLayout);
              }

              const refreshedEvents = await api.getOrganizedEvents();
              setEvents(refreshedEvents);
              setIsVisualMapModalOpen(false);
              showNotification('success', `Saved venue map image & ${tables.length} tables for "${updatedEvent.title}"!`);
            } catch (err: any) {
              console.error('Error saving map from modal:', err);
              showNotification('error', err?.message || 'Failed to save map and tables.');
            }
          }}
        />
      )}
    </div>
  );
};

export default AdminVendorBookings;
