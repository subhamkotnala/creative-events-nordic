import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Store, MapPin, Plus, Trash2, Check, Sparkles,
  Zap, DollarSign, LayoutGrid, List, CheckCircle2,
  Image as ImageIcon, Upload, Sliders, Layers, RotateCcw,
  Loader2, ZoomIn, ZoomOut, Filter, Search, Edit3
} from 'lucide-react';
import { OrganizedEvent, VendorTable } from '../types';
import { generateDefaultVendorTables } from '../services/api';
import { compressImage } from '../services/safeStorage';

interface AdminTableMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: OrganizedEvent;
  onSaveTables: (tables: VendorTable[], floorPlanImageUrl?: string) => Promise<void> | void;
  initialSelectedTableId?: string;
}

const DEFAULT_ZONES = [
  'Premium Front Entrance',
  'Food & Sweets Bazaar',
  'Ethnic Wear & Jewelry Pavilion',
  'Henna, Crafts & Decor',
  'General Vendor Stall'
];

const PRESET_MAP_IMAGES = [
  {
    name: 'Stockholm Annexet & Arena Blueprint',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=1400&q=80'
  },
  {
    name: 'Grand Convention Hall & Pavilion Plan',
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=80'
  },
  {
    name: 'Münchenbryggeriet Event Hall Plan',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80'
  }
];

export const AdminTableMapModal: React.FC<AdminTableMapModalProps> = ({
  isOpen,
  onClose,
  event,
  onSaveTables,
  initialSelectedTableId
}) => {
  const [tables, setTables] = useState<VendorTable[]>(() => {
    return event.vendor_tables && event.vendor_tables.length > 0
      ? JSON.parse(JSON.stringify(event.vendor_tables))
      : [];
  });

  const [floorPlanImageUrl, setFloorPlanImageUrl] = useState<string>(
    event.floor_plan_image_url || ''
  );

  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    initialSelectedTableId || (tables.length > 0 ? tables[0].id : null)
  );

  // Tab View: 'TABLES' (Smart Stall Directory - Primary) | 'MAP' (Blueprint Reference Guide)
  const [activeTab, setActiveTab] = useState<'TABLES' | 'MAP'>('TABLES');
  const [tableDisplayMode, setTableDisplayMode] = useState<'GRID' | 'LIST'>('GRID');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState<string>('ALL');

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isUploadingMap, setIsUploadingMap] = useState(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapFitMode, setMapFitMode] = useState<'contain' | 'cover'>('contain');

  // Batch Add Numbered Tables State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('Table ');
  const [batchCount, setBatchCount] = useState<number>(20);
  const [batchStartNum, setBatchStartNum] = useState<number>(1);
  const [batchZone, setBatchZone] = useState(DEFAULT_ZONES[0]);
  const [batchPrice, setBatchPrice] = useState<number>(1800);
  const [batchPower, setBatchPower] = useState(false);
  const [customZonesList, setCustomZonesList] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const selectedTable = tables.find(t => t.id === selectedTableId);
  const availableCount = tables.filter(t => t.status === 'AVAILABLE').length;
  const bookedCount = tables.filter(t => t.status === 'BOOKED').length;
  const totalRevenue = tables
    .filter(t => t.status === 'BOOKED')
    .reduce((sum, t) => sum + (t.price_sek || 0), 0);

  const allAvailableZones = Array.from(new Set([...tables.map(t => t.zone).filter(Boolean), ...customZonesList, ...DEFAULT_ZONES]));
  const distinctZones = Array.from(new Set(tables.map(t => t.zone).filter(Boolean)));

  const handleAddNewCustomZone = (newZoneName: string) => {
    const trimmed = newZoneName.trim();
    if (!trimmed) return;
    setCustomZonesList(prev => Array.from(new Set([...prev, trimmed])));
    showBriefMessage(`✓ Created zone "${trimmed}".`);
  };

  const showBriefMessage = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 3500);
  };

  // Instant Add Single Table
  const handleInstantAddTable = () => {
    const newId = `table-${Date.now()}`;
    const nextIndex = tables.length + 1;
    const newT: VendorTable = {
      id: newId,
      table_number: `Table ${nextIndex}`,
      zone: filterZone !== 'ALL' ? filterZone : DEFAULT_ZONES[(nextIndex - 1) % DEFAULT_ZONES.length],
      size: '2.0m x 1.2m Standard Stall',
      price_sek: 1500,
      power_included: false,
      status: 'AVAILABLE',
      location_description: `Stall Position ${nextIndex}`,
      map_coordinates: { x: 50, y: 50 }
    };
    setTables(prev => [...prev, newT]);
    setSelectedTableId(newId);
    showBriefMessage(`✓ Added ${newT.table_number}. Edit price or amenities below.`);
  };

  // Batch Generate Tables
  const handleBatchGenerateTables = () => {
    if (batchCount <= 0) return;
    const newBatch: VendorTable[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < batchCount; i++) {
      const currentNum = batchStartNum + i;
      const id = `table-batch-${timestamp}-${i}`;
      newBatch.push({
        id,
        table_number: `${batchPrefix}${currentNum}`,
        zone: batchZone,
        size: '2.0m x 1.2m Standard Stall',
        price_sek: Number(batchPrice) || 1500,
        power_included: batchPower,
        status: 'AVAILABLE',
        location_description: `${batchZone} #${currentNum}`,
        map_coordinates: { x: 50, y: 50 }
      });
    }

    setTables(prev => [...prev, ...newBatch]);
    if (newBatch.length > 0) {
      setSelectedTableId(newBatch[0].id);
    }
    setIsBatchModalOpen(false);
    showBriefMessage(`✨ Generated ${newBatch.length} numbered tables (${batchPrefix}${batchStartNum} to ${batchPrefix}${batchStartNum + batchCount - 1})!`);
  };

  // Upload Custom Blueprint Reference Image
  const handleMapImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMap(true);
    try {
      const compressedLocal = await compressImage(file, 1600, 1200, 0.78);
      setFloorPlanImageUrl(compressedLocal);
      showBriefMessage('✓ Blueprint image attached as reference guide. Vendors will choose their stall number directly from the directory.');
    } catch (err: any) {
      console.error('Failed to upload map:', err);
      showBriefMessage(err?.message || 'Failed to upload map image.');
    } finally {
      setIsUploadingMap(false);
      if (e.target) e.target.value = '';
    }
  };

  // Remove Map Option Completely
  const handleRemoveMapOption = () => {
    setFloorPlanImageUrl('');
    setActiveTab('TABLES');
    showBriefMessage('❌ Map option removed. Event now uses the clean Numbered Stall Directory only.');
  };

  // Update selected table
  const handleUpdateTable = (id: string, patch: Partial<VendorTable>) => {
    setTables(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  };

  // Delete table
  const handleDeleteTable = (id: string) => {
    setTables(prev => prev.filter(t => t.id !== id));
    if (selectedTableId === id) setSelectedTableId(null);
    showBriefMessage('Table removed from event.');
  };

  // Save changes
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveTables(tables, floorPlanImageUrl);
      showBriefMessage('✓ Stalls directory and event settings saved successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to save tables:', err);
      showBriefMessage(err?.message || 'Error saving tables');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered tables
  const filteredTables = tables.filter(t => {
    if (filterZone !== 'ALL' && t.zone !== filterZone) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.table_number.toLowerCase().includes(q) || (t.zone && t.zone.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl max-w-7xl w-full my-4 max-h-[96vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">

        {/* Hidden file input for map image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleMapImageFileUpload}
          className="hidden"
        />

        {/* ── Top Header ──────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-5 sm:p-6 text-white rounded-t-3xl border-b border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
                <Store className="w-3 h-3 fill-slate-950" /> Vendor Stall & Table Manager
              </span>
              <span className="text-xs text-amber-200 font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {event.location_name}, {event.city}
              </span>
              {floorPlanImageUrl ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
                  Blueprint Reference Attached
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                  Stall Directory Only (No Map)
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              {event.title}
            </h2>
            <p className="text-xs text-slate-300">
              Manage numbered stall booths, zones, prices, and amenities with zero alignment hassle.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-sm text-right text-xs">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">Stalls Revenue</span>
              <span className="font-mono font-black text-white">{totalRevenue.toLocaleString()} SEK</span>
            </div>

            {floorPlanImageUrl && (
              <button
                type="button"
                onClick={handleRemoveMapOption}
                className="px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                title="Remove map image and switch completely to stall directory"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                <span>Remove Map Option</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Stalls'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Status Banner / Notifications ───────────────────────────────────── */}
        {saveMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs font-bold text-emerald-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveMessage}</span>
            </div>
          </div>
        )}

        {/* ── Navigation Tabs & Quick Status Bar ───────────────────────────────── */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('TABLES')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                activeTab === 'TABLES'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Store className="w-4 h-4 text-amber-400" />
              <span>🎪 Numbered Stalls & Pricing ({tables.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MAP')}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                activeTab === 'MAP'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-sky-400" />
              <span>🗺️ Venue Blueprint Reference {floorPlanImageUrl ? '(Attached)' : '(Optional)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {availableCount} Available
            </span>
            <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              {bookedCount} Booked
            </span>
            <span className="text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-lg">
              Total {tables.length} Stalls
            </span>
          </div>
        </div>

        {/* ── TAB CONTENT ──────────────────────────────────────────────────────── */}
        {activeTab === 'TABLES' ? (
          /* ── TAB 1: SMART STALLS & TABLE DIRECTORY ─────────────────────────── */
          <div className="p-4 sm:p-6 space-y-5 flex-1">
            {/* Action Bar: Batch Add, Single Add, Search, Mode Toggle */}
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    title="Generate Table 1 to N in 1 click"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>⚡ Batch Add Tables</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleInstantAddTable}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Table</span>
                  </button>

                  {tables.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const defaultTables = generateDefaultVendorTables();
                        setTables(defaultTables);
                        if (defaultTables.length > 0) setSelectedTableId(defaultTables[0].id);
                        showBriefMessage('✓ Loaded 22 standard market tables with pricing & zones!');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Load Standard Layout (22 Tables)</span>
                    </button>
                  )}

                  {tables.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove all ${tables.length} tables?`)) {
                          setTables([]);
                          setSelectedTableId(null);
                          showBriefMessage('All tables removed.');
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search table # or zone..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 w-48 sm:w-56"
                    />
                  </div>

                  {/* View mode toggle */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-xs font-bold shadow-sm">
                    <button
                      type="button"
                      onClick={() => setTableDisplayMode('GRID')}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                        tableDisplayMode === 'GRID'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableDisplayMode('LIST')}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                        tableDisplayMode === 'LIST'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>List</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Zone Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/80 text-xs">
                <span className="font-bold text-slate-500 mr-1 flex items-center gap-1 text-[11px]">
                  <Filter className="w-3 h-3 text-sky-600" /> Filter Zone:
                </span>
                <button
                  type="button"
                  onClick={() => setFilterZone('ALL')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    filterZone === 'ALL'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  All Zones ({tables.length})
                </button>
                {distinctZones.map(zoneKey => {
                  const countInZone = tables.filter(t => t.zone === zoneKey).length;
                  return (
                    <button
                      key={zoneKey}
                      type="button"
                      onClick={() => setFilterZone(zoneKey)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                        filterZone === zoneKey
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      {zoneKey} ({countInZone})
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const customName = prompt('Enter new zone name (e.g. VIP Front Lounge, Food Court, Stage Left):');
                    if (customName && customName.trim()) {
                      handleAddNewCustomZone(customName.trim());
                      setFilterZone(customName.trim());
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 transition-all shadow-sm"
                  title="Create a new zone category"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Add Zone</span>
                </button>
              </div>
            </div>

            {/* Main Content Area: Tables Grid/List + Quick Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Tables Section (8 or 12 Cols) */}
              <div className={selectedTable ? "lg:col-span-8 space-y-4" : "lg:col-span-12 space-y-4"}>
                {filteredTables.length === 0 ? (
                  <div className="p-12 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-3">
                    <Store className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="font-bold text-slate-800 text-base">No Tables Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {tables.length === 0
                        ? "You haven't added any tables yet. Use 'Batch Add Tables' to generate Table 1 to 20 in 1 click!"
                        : "No tables match your search or zone filter."}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsBatchModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-sm"
                      >
                        ⚡ Batch Add Tables
                      </button>
                      <button
                        type="button"
                        onClick={handleInstantAddTable}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm"
                      >
                        + Add Single Table
                      </button>
                    </div>
                  </div>
                ) : tableDisplayMode === 'GRID' ? (
                  /* ── VISUAL NUMBERED STALL CARDS GRID ── */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[640px] overflow-y-auto pr-1">
                    {filteredTables.map(t => {
                      const isSelected = selectedTableId === t.id;
                      const isBooked = t.status === 'BOOKED';

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTableId(t.id)}
                          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left select-none relative ${
                            isSelected
                              ? 'bg-amber-50/90 border-amber-500 shadow-md ring-2 ring-amber-400/50'
                              : isBooked
                              ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                              : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-sky-300 shadow-sm'
                          }`}
                        >
                          {/* Top Row: Number & Status */}
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">STALL</span>
                              <h4 className="font-mono font-black text-base text-slate-900 leading-tight">
                                {t.table_number}
                              </h4>
                            </div>

                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              isBooked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isBooked ? 'Booked' : 'Open'}
                            </span>
                          </div>

                          {/* Zone */}
                          <div className="text-[11px] font-medium text-slate-600 truncate mt-1.5" title={t.zone}>
                            {t.zone}
                          </div>

                          {/* Price & Power */}
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                            <span className="font-mono font-black text-xs text-slate-900">
                              {t.price_sek ? `${t.price_sek.toLocaleString()} kr` : 'Free'}
                            </span>
                            {t.power_included && (
                              <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                                <Zap className="w-3 h-3 fill-amber-500" /> 230V
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ── DETAILED TABLE DIRECTORY LIST ── */
                  <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                    {filteredTables.map(t => {
                      const isSelected = selectedTableId === t.id;
                      const isBooked = t.status === 'BOOKED';

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTableId(t.id)}
                          className={`p-3 rounded-2xl border transition-all text-xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
                              : isBooked
                              ? 'bg-rose-50/40 border-rose-200'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-12 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-mono font-black text-xs text-slate-800 border border-slate-200 shrink-0">
                              {t.table_number.replace(/^Table\s*/i, '')}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm">{t.table_number}</h4>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  isBooked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {isBooked ? 'Booked' : 'Available'}
                                </span>
                                {t.power_included && (
                                  <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                                    <Zap className="w-3 h-3" /> 230V
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">{t.zone} • {t.size || 'Standard Stall'}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            {/* Inline Price edit */}
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={t.price_sek || 0}
                                onChange={e => handleUpdateTable(t.id, { price_sek: Number(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 rounded-lg border border-slate-300 font-mono font-black text-xs text-right bg-slate-50"
                              />
                              <span className="text-[11px] text-slate-500 font-bold">kr</span>
                            </div>

                            {/* Booked toggle */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTable(t.id, {
                                  status: isBooked ? 'AVAILABLE' : 'BOOKED',
                                  booked_by_vendor: isBooked ? undefined : {
                                    business_name: 'Marked Booked by Admin',
                                    contact_name: 'Admin Reserved',
                                    email: 'admin@event.com',
                                    phone: '',
                                    category: t.zone,
                                    booking_reference: `ADM-${t.table_number}`,
                                    booked_at: new Date().toISOString(),
                                    payment_method: 'SWISH'
                                  }
                                });
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-colors ${
                                isBooked
                                  ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {isBooked ? 'Mark Open' : 'Mark Booked'}
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTable(t.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Delete table"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inspector Panel (4 Cols) */}
              {selectedTable && (
                <div className="lg:col-span-4 bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-black uppercase">
                        {selectedTable.table_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        selectedTable.status === 'BOOKED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {selectedTable.status}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateTable(selectedTable.id, {
                          status: selectedTable.status === 'BOOKED' ? 'AVAILABLE' : 'BOOKED',
                          booked_by_vendor: selectedTable.status === 'BOOKED' ? undefined : {
                            business_name: 'Marked Booked by Admin',
                            contact_name: 'Admin Reserved',
                            email: 'admin@event.com',
                            phone: '',
                            category: selectedTable.zone,
                            booking_reference: `ADM-${selectedTable.table_number}`,
                            booked_at: new Date().toISOString(),
                            payment_method: 'SWISH'
                          }
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-colors ${
                        selectedTable.status === 'BOOKED'
                          ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {selectedTable.status === 'BOOKED' ? 'Mark Available' : 'Show as Booked'}
                    </button>
                  </div>

                  {/* Price Setting */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        Table Price (SEK)
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Charged to vendor</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={selectedTable.price_sek || 0}
                          onChange={e => handleUpdateTable(selectedTable.id, { price_sek: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          SEK
                        </span>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {[0, 1200, 1500, 1800, 2200, 2500].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleUpdateTable(selectedTable.id, { price_sek: amt })}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                            selectedTable.price_sek === amt
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {amt === 0 ? 'Free' : `${amt} kr`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Details Form: Table Number, Zone, Size, Power */}
                  <div className="space-y-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Table / Stall Number
                      </label>
                      <input
                        type="text"
                        value={selectedTable.table_number || ''}
                        onChange={e => handleUpdateTable(selectedTable.id, { table_number: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Zone Classification
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const customName = prompt('Create new zone name:');
                            if (customName && customName.trim()) {
                              handleAddNewCustomZone(customName.trim());
                              handleUpdateTable(selectedTable.id, { zone: customName.trim() });
                            }
                          }}
                          className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>New Zone</span>
                        </button>
                      </div>
                      <select
                        value={selectedTable.zone || allAvailableZones[0]}
                        onChange={e => {
                          if (e.target.value === '__CREATE_NEW__') {
                            const customName = prompt('Enter new zone name:');
                            if (customName && customName.trim()) {
                              handleAddNewCustomZone(customName.trim());
                              handleUpdateTable(selectedTable.id, { zone: customName.trim() });
                            }
                          } else {
                            handleUpdateTable(selectedTable.id, { zone: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 bg-white"
                      >
                        {allAvailableZones.map(z => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                        <option value="__CREATE_NEW__">+ Create New Custom Zone...</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Stall Dimensions
                      </label>
                      <input
                        type="text"
                        value={selectedTable.size || ''}
                        onChange={e => handleUpdateTable(selectedTable.id, { size: e.target.value })}
                        placeholder="2.0m x 1.2m Standard Stall"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selectedTable.power_included}
                          onChange={e => handleUpdateTable(selectedTable.id, { power_included: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                        />
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500" /> Electricity Included (230V)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Remove Table button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteTable(selectedTable.id)}
                    className="w-full py-2.5 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-black text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Delete {selectedTable.table_number}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── TAB 2: VENUE BLUEPRINT REFERENCE (OPTIONAL REFERENCE ONLY) ──── */
          <div className="p-4 sm:p-6 space-y-4 flex-1">
            {/* Blueprint Explainer & Control Bar */}
            <div className="bg-amber-500/10 border border-amber-200 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <h4 className="font-bold text-slate-900 text-sm">Venue Blueprint Reference</h4>
                </div>
                <p className="text-xs text-slate-600 max-w-xl">
                  {floorPlanImageUrl
                    ? "Blueprint attached! Vendors will see this as an architectural orientation guide for hall layout, doors, and stages, while selecting stall numbers cleanly from the directory."
                    : "No blueprint image attached. The event currently operates in clean Stall Directory mode (no map). You can attach an architectural floor plan photo below, or leave it map-free!"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Upload Blueprint button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMap}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {isUploadingMap ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Optimizing Image...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>{floorPlanImageUrl ? 'Replace Blueprint' : 'Upload Blueprint Photo'}</span>
                    </>
                  )}
                </button>

                {/* Preset layouts */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPresetsMenu(!showPresetsMenu)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Presets</span>
                  </button>

                  {showPresetsMenu && (
                    <div className="absolute right-0 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-40 space-y-1">
                      <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">
                        Select Preset Blueprint
                      </div>
                      {PRESET_MAP_IMAGES.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFloorPlanImageUrl(preset.url);
                            setShowPresetsMenu(false);
                            showBriefMessage(`Applied ${preset.name} reference blueprint.`);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-amber-50 transition-colors truncate"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remove map button */}
                {floorPlanImageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveMapOption}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Remove Map Option</span>
                  </button>
                )}
              </div>
            </div>

            {/* Blueprint Viewer with Zoom & Pan */}
            {floorPlanImageUrl ? (
              <div className="bg-slate-950 rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    High-Resolution Blueprint Reference Guide
                  </span>

                  <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 font-bold">
                    <button
                      type="button"
                      onClick={() => setMapZoom(z => Math.max(0.6, z - 0.25))}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5 text-sky-400" />
                      <span>Zoom Out</span>
                    </button>
                    <span className="px-2 py-0.5 font-mono text-amber-300 text-[11px]">
                      {Math.round(mapZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setMapZoom(z => Math.min(3, z + 0.25))}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Zoom In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapZoom(1)}
                      className="px-2 py-1 rounded-lg text-slate-300 hover:text-white"
                      title="Reset Zoom"
                    >
                      Fit 100%
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapFitMode(m => m === 'contain' ? 'cover' : 'contain')}
                      className="px-2 py-1 rounded-lg text-slate-300 hover:text-white"
                    >
                      {mapFitMode === 'contain' ? 'See Full Map' : 'Fill'}
                    </button>
                  </div>
                </div>

                <div className="relative w-full h-[480px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center select-none">
                  <div
                    className="absolute inset-0 flex items-center justify-center transition-transform duration-100"
                    style={{ transform: `scale(${mapZoom})`, transformOrigin: 'center center' }}
                  >
                    <img
                      src={floorPlanImageUrl}
                      alt="Venue Layout Blueprint"
                      className={`w-full h-full ${mapFitMode === 'contain' ? 'object-contain' : 'object-cover'} object-center`}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  💡 Vendors can review this architectural drawing to locate stages, doors, and aisles without broken pin coordinates.
                </p>
              </div>
            ) : (
              <div className="p-12 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-300 text-center space-y-3">
                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">No Blueprint Image Attached</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  This event uses the Smart Stall Directory only. Vendors can easily choose their stall from the numbered list and visual cards without needing a floor plan.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Blueprint Image</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-3xl">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Synchronizes instantly with public vendor bookings and checkout.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSaving ? 'Saving Changes...' : 'Save Stalls'}
            </button>
          </div>
        </div>

        {/* ── BATCH ADD NUMBERED TABLES MODAL ─────────────────────────────────── */}
        <AnimatePresence>
          {isBatchModalOpen && (
            <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h3 className="font-black text-slate-900 text-base">
                      Batch Add Numbered Tables
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Quickly generate a range of numbered tables at once. Vendors will choose their table number directly from the directory without broken map pin coordinates!
                </p>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Prefix
                      </label>
                      <input
                        type="text"
                        value={batchPrefix}
                        onChange={e => setBatchPrefix(e.target.value)}
                        placeholder="e.g. Table  or  T-"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Starting Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={batchStartNum}
                        onChange={e => setBatchStartNum(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      How Many Tables to Add?
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={batchCount}
                        onChange={e => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 font-mono font-black text-sm"
                      />
                      {[10, 20, 30].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setBatchCount(cnt)}
                          className={`px-3 py-2 rounded-xl font-bold border transition-colors ${
                            batchCount === cnt
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Zone Assignment
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const customName = prompt('Enter new zone name for batch:');
                          if (customName && customName.trim()) {
                            handleAddNewCustomZone(customName.trim());
                            setBatchZone(customName.trim());
                          }
                        }}
                        className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>New Zone</span>
                      </button>
                    </div>
                    <select
                      value={batchZone}
                      onChange={e => {
                        if (e.target.value === '__CREATE_NEW__') {
                          const customName = prompt('Enter new zone name for batch:');
                          if (customName && customName.trim()) {
                            handleAddNewCustomZone(customName.trim());
                            setBatchZone(customName.trim());
                          }
                        } else {
                          setBatchZone(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold bg-white"
                    >
                      {allAvailableZones.map(z => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                      <option value="__CREATE_NEW__">+ Create New Custom Zone...</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Price (SEK)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={batchPrice}
                        onChange={e => setBatchPrice(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={batchPower}
                          onChange={e => setBatchPower(e.target.checked)}
                          className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span className="font-bold text-slate-700">⚡ 230V Power</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 text-sky-900 text-xs">
                    Will create <strong>{batchCount}</strong> tables: <span className="font-mono font-bold">{batchPrefix}{batchStartNum}</span> to <span className="font-mono font-bold">{batchPrefix}{batchStartNum + batchCount - 1}</span> at {batchPrice} SEK each.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchGenerateTables}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
                  >
                    Generate {batchCount} Tables
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default AdminTableMapModal;
