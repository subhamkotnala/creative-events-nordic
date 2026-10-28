import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Ticket, Calendar, MapPin, Clock, Printer, Store, 
  ShieldCheck, AlertCircle, Sparkles, CheckCircle2 
} from 'lucide-react';
import { EventTicketOrder } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface MyTicketsModalProps {
  onClose: () => void;
}

export const MyTicketsModal: React.FC<MyTicketsModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'TICKETS' | 'STALLS'>('TICKETS');
  const [tickets, setTickets] = useState<EventTicketOrder[]>([]);
  const [stalls, setStalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<EventTicketOrder | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allTickets = await api.getAllTicketOrders();
      setTickets(allTickets);
      if (allTickets.length > 0 && !selectedTicket) {
        setSelectedTicket(allTickets[0]);
      }

      const allStalls = await api.getAllVendorTableBookings();
      setStalls(allStalls);
    } catch (err) {
      console.error('Failed to load my tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative bg-white rounded-3xl max-w-3xl w-full my-6 max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 z-10 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white rounded-t-3xl flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                <Ticket className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-black text-white">
                My Entry Tickets & Stall Permits
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Access your digital passes for admission and exhibitor verification
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-slate-100 flex items-center gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('TICKETS')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'TICKETS'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Attendee Tickets ({tickets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STALLS')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'STALLS'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Vendor Table Permits ({stalls.length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
              Loading passes...
            </div>
          ) : activeTab === 'TICKETS' ? (
            tickets.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No entry tickets found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When you purchase or claim entry passes for Creative Events on the home page, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="p-5 rounded-2xl border-2 border-slate-200 hover:border-sky-500 bg-white shadow-sm space-y-3 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-sky-600 font-bold uppercase tracking-wider">
                          REF: {ticket.payment_reference}
                        </span>
                        <h4 className="text-base font-black text-slate-900">
                          {ticket.event_title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          {ticket.status} • {ticket.total_price_sek === 0 ? 'FREE' : `${ticket.total_price_sek} SEK`}
                        </span>
                        <button
                          onClick={handlePrint}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-1"
                          title="Print Ticket"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date</span>
                        <span className="font-bold">{ticket.event_date}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Venue</span>
                        <span className="font-bold truncate">{ticket.event_location}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Attendee</span>
                        <span className="font-bold">{ticket.attendee_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tier & Qty</span>
                        <span className="font-bold">{ticket.quantity}x {ticket.tier_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            stalls.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Store className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No vendor stall bookings found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When you select and reserve a table from Vendor Bookings for Events, your exhibitor permit will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {stalls.map((booking, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/30 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-amber-700 font-bold uppercase tracking-wider">
                          TABLE {booking.table?.table_number} • {booking.table?.zone}
                        </span>
                        <h4 className="text-base font-black text-slate-900">
                          {booking.table?.booked_by_vendor?.business_name || 'Vendor Stall'}
                        </h4>
                        <p className="text-xs text-slate-500">{booking.eventTitle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200">
                          {booking.table?.price_sek} SEK ({booking.table?.booked_by_vendor?.payment_method})
                        </span>
                        <button
                          onClick={handlePrint}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-2 border-t border-amber-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Contact</span>
                        <span className="font-bold">{booking.table?.booked_by_vendor?.contact_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Email</span>
                        <span className="font-bold truncate">{booking.table?.booked_by_vendor?.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Category</span>
                        <span className="font-bold truncate">{booking.table?.booked_by_vendor?.category}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Ref</span>
                        <span className="font-mono font-bold text-[11px] truncate">
                          {booking.table?.booked_by_vendor?.booking_reference}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
};
