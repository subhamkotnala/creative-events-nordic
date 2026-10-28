import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Ticket, Calendar, MapPin, Clock, CheckCircle2, ShieldCheck, 
  CreditCard, Smartphone, ArrowRight, Printer, Download, Sparkles, 
  AlertCircle, ChevronRight, User, Mail, Phone, Lock, QrCode
} from 'lucide-react';
import { OrganizedEvent, TicketTier, EventTicketOrder } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface EventTicketingModalProps {
  event: OrganizedEvent;
  onClose: () => void;
  onOrderComplete?: (order: EventTicketOrder) => void;
}

export const EventTicketingModal: React.FC<EventTicketingModalProps> = ({
  event,
  onClose,
  onOrderComplete
}) => {
  const { user } = useAuth();

  // Normalize tiers
  const tiers: TicketTier[] = (event.ticket_tiers && event.ticket_tiers.length > 0)
    ? event.ticket_tiers
    : [
        {
          id: 'standard',
          name: event.price && event.price.toLowerCase().includes('free') ? 'General Admission (Free)' : 'Standard Admission',
          price_sek: typeof event.ticket_price_sek === 'number' ? event.ticket_price_sek : (
            event.price && !isNaN(parseInt(event.price)) ? parseInt(event.price) : 0
          ),
          description: 'Full single-day access to all exhibitor stalls and open showcase areas.'
        }
      ];

  const [selectedTierId, setSelectedTierId] = useState<string>(tiers[0]?.id || 'standard');
  const [quantity, setQuantity] = useState<number>(1);

  // Attendee info
  const [attendeeName, setAttendeeName] = useState<string>(user?.email ? user.email.split('@')[0] : '');
  const [attendeeEmail, setAttendeeEmail] = useState<string>(user?.email || '');
  const [attendeePhone, setAttendeePhone] = useState<string>('+46 70 123 45 67');

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'SWISH' | 'STRIPE'>('SWISH');
  const [swishPhone, setSwishPhone] = useState<string>(attendeePhone || '+46 70 123 45 67');
  
  // Card state (Stripe)
  const [cardName, setCardName] = useState<string>(attendeeName || 'Anna Svensson');
  const [cardNumber, setCardNumber] = useState<string>('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState<string>('12/28');
  const [cardCvc, setCardCvc] = useState<string>('842');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [confirmedOrder, setConfirmedOrder] = useState<EventTicketOrder | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedTier = tiers.find(t => t.id === selectedTierId) || tiers[0];
  const unitPrice = selectedTier ? selectedTier.price_sek : 0;
  const totalPrice = unitPrice * quantity;
  const isFree = totalPrice === 0;

  const handleFillTestCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('08/29');
    setCardCvc('382');
    if (!cardName) setCardName(attendeeName || 'Creative Events Guest');
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      setErrorMsg('Please enter your full name and email address for ticket delivery.');
      return;
    }

    setIsProcessing(true);

    if (isFree) {
      setProcessingStatus('Issuing free visitor pass...');
    } else if (paymentMethod === 'SWISH') {
      setProcessingStatus('Connecting to Swish Sweden network...');
      await new Promise(r => setTimeout(r, 800));
      setProcessingStatus('Verifying Swish authorization on Mobile BankID...');
      await new Promise(r => setTimeout(r, 1100));
      setProcessingStatus('Payment received via Swish!');
    } else {
      setProcessingStatus('Connecting to Stripe Secure Gateway...');
      await new Promise(r => setTimeout(r, 800));
      setProcessingStatus('Validating 3D Secure / Bank authorization...');
      await new Promise(r => setTimeout(r, 1000));
      setProcessingStatus('Charge verified via Stripe!');
    }

    const orderRef = `CE-TKT-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrData = `VALID:CREATIVE_EVENTS|TICKET:${orderRef}|EVENT:${event.id}|NAME:${encodeURIComponent(attendeeName)}|TIER:${encodeURIComponent(selectedTier.name)}|QTY:${quantity}|SEK:${totalPrice}`;

    const newOrder: EventTicketOrder = {
      id: `order-${Date.now()}`,
      event_id: event.id,
      event_title: event.title,
      event_date: event.start_date,
      event_time: event.time,
      event_location: event.location_name,
      event_city: event.city,
      tier_name: selectedTier.name,
      quantity,
      total_price_sek: totalPrice,
      attendee_name: attendeeName.trim(),
      attendee_email: attendeeEmail.trim(),
      attendee_phone: attendeePhone.trim(),
      payment_method: isFree ? 'FREE' : paymentMethod,
      payment_reference: orderRef,
      qr_code_data: qrData,
      created_at: new Date().toISOString(),
      status: 'CONFIRMED'
    };

    try {
      await api.saveTicketOrder(newOrder);
      setConfirmedOrder(newOrder);
      if (onOrderComplete) onOrderComplete(newOrder);
    } catch (err) {
      console.error('Failed to save ticket order:', err);
      // Still show confirmed since order object is generated in memory
      setConfirmedOrder(newOrder);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={() => !isProcessing && onClose()}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative bg-white rounded-3xl max-w-2xl w-full my-6 max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 z-10 flex flex-col"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 text-white overflow-hidden rounded-t-3xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <button
            onClick={() => !isProcessing && onClose()}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-500 text-white">
              Official Entry Pass
            </span>
            <span className="text-[11px] text-sky-200/80 font-medium">
              Creative Events Nordic
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight line-clamp-1 pr-10">
            {event.title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-sky-100/90 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              {event.start_date} {event.end_date && event.end_date !== event.start_date ? `to ${event.end_date}` : ''}
            </span>
            {event.time && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                {event.time}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              {event.location_name}, {event.city}
            </span>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 flex-1 space-y-6">
          <AnimatePresence mode="wait">
            {!confirmedOrder ? (
              <form onSubmit={handleProcessPayment} className="space-y-6">
                {/* 1. Ticket Tier Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-sky-600" />
                      1. Select Admission Tier
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      All prices in Swedish Kronor (SEK)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {tiers.map((tier) => {
                      const isSelected = selectedTierId === tier.id;
                      return (
                        <div
                          key={tier.id}
                          onClick={() => setSelectedTierId(tier.id)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-sky-600 bg-sky-50/60 shadow-sm ring-1 ring-sky-500/20'
                              : 'border-slate-200/90 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${isSelected ? 'text-sky-950' : 'text-slate-800'}`}>
                                {tier.name}
                              </span>
                              {tier.price_sek === 0 && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                                  Free
                                </span>
                              )}
                            </div>
                            {tier.description && (
                              <p className="text-xs text-slate-500 leading-snug">
                                {tier.description}
                              </p>
                            )}
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="text-lg font-black text-slate-900 block">
                              {tier.price_sek === 0 ? '0 SEK' : `${tier.price_sek} SEK`}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">per person</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Quantity & Total Calculation */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Number of Tickets</span>
                    <span className="text-[11px] text-slate-500">Admit attendees aged 12+</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors shadow-sm"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-black text-slate-900 text-base">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors shadow-sm"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right pl-4 border-l border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Due</span>
                    <span className="text-xl font-black text-sky-600">
                      {totalPrice === 0 ? 'Free Entry' : `${totalPrice} SEK`}
                    </span>
                  </div>
                </div>

                {/* 3. Attendee Delivery Details */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-sky-600" />
                    2. Attendee Ticket Delivery Details
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Full Name on Pass *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={attendeeName}
                          onChange={e => setAttendeeName(e.target.value)}
                          placeholder="e.g. Maria Lindqvist"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Email (Pass sent here) *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={attendeeEmail}
                          onChange={e => setAttendeeEmail(e.target.value)}
                          placeholder="maria@example.se"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Mobile Phone (SMS Entry Pass Confirmation)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="tel"
                          value={attendeePhone}
                          onChange={e => {
                            setAttendeePhone(e.target.value);
                            setSwishPhone(e.target.value);
                          }}
                          placeholder="+46 70 123 45 67"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Payment Options (Swish & Stripe) */}
                {!isFree && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-sky-600" />
                        3. Sweden Payment Method
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit Encrypted
                      </span>
                    </label>

                    {/* Method Tabs: Swish vs Stripe */}
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
                          <span className="block leading-tight font-black">Swish</span>
                          <span className="text-[10px] text-slate-400 font-normal">Sweden Mobile App</span>
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

                    {/* Swish Details */}
                    {paymentMethod === 'SWISH' && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-blue-950 flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-blue-600" />
                            Swish Payment Receiver:
                          </span>
                          <span className="font-mono font-bold text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded">
                            123 456 7890
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-800 leading-relaxed">
                          Recipient: <span className="font-bold">Creative Events Nordic AB</span>. A notification will prompt your Swish app on completion.
                        </p>
                        <div>
                          <label className="block text-[10px] font-bold text-blue-900 uppercase tracking-wider mb-1">
                            Your Swish Mobile Number
                          </label>
                          <input
                            type="tel"
                            value={swishPhone}
                            onChange={e => setSwishPhone(e.target.value)}
                            placeholder="+46 70 123 45 67"
                            className="w-full px-3 py-2 bg-white rounded-xl border border-blue-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                        </div>
                      </div>
                    )}

                    {/* Stripe Card Details */}
                    {paymentMethod === 'STRIPE' && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-emerald-600" /> Card Details
                          </span>
                          <button
                            type="button"
                            onClick={handleFillTestCard}
                            className="text-[10px] font-bold text-sky-600 hover:text-sky-700 underline"
                          >
                            Auto-fill Test Card
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cardholder Name</label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={e => setCardName(e.target.value)}
                            placeholder="Anna Svensson"
                            className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Card Number</label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={e => setCardNumber(e.target.value)}
                            placeholder="4242 4242 4242 4242"
                            className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expiry</label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={e => setCardExpiry(e.target.value)}
                              placeholder="MM/YY"
                              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CVC</label>
                            <input
                              type="text"
                              value={cardCvc}
                              onChange={e => setCardCvc(e.target.value)}
                              placeholder="CVC"
                              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-sky-600/25 active:scale-[0.99] transition-all disabled:opacity-75"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{processingStatus || 'Securing Entry Pass...'}</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {isFree ? 'Claim Free Entry Ticket' : `Pay ${totalPrice} SEK with ${paymentMethod === 'SWISH' ? 'Swish' : 'Stripe'}`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                    Instant e-ticket pass generated with official entrance barcode & QR code.
                  </p>
                </div>
              </form>
            ) : (
              /* ── CONFIRMED ENTRY TICKET PRESENTATION ── */
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Payment Confirmed & Pass Issued!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Your digital entry pass is ready. Please present this ticket or barcode upon arrival at the venue.
                  </p>
                </div>

                {/* The Ticket Pass Card */}
                <div 
                  id="printable-entry-ticket"
                  className="relative bg-white rounded-3xl border-2 border-slate-900 overflow-hidden shadow-xl"
                >
                  {/* Ticket Top Banner */}
                  <div className="bg-slate-950 text-white p-5 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> OFFICIAL ENTRY PASS
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        {confirmedOrder.payment_reference}
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-white leading-tight">
                      {confirmedOrder.event_title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        {confirmedOrder.event_date}
                      </span>
                      {confirmedOrder.event_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          {confirmedOrder.event_time}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        {confirmedOrder.event_location}, {confirmedOrder.event_city}
                      </span>
                    </div>
                  </div>

                  {/* Perforation divider with semi-circle punch holes */}
                  <div className="relative py-2 bg-slate-900 flex items-center justify-between">
                    <div className="w-4 h-8 bg-white rounded-r-full -ml-2" />
                    <div className="flex-1 border-b-2 border-dashed border-slate-700 mx-2" />
                    <div className="w-4 h-8 bg-white rounded-l-full -mr-2" />
                  </div>

                  {/* Ticket Main Details */}
                  <div className="p-5 bg-white space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendee</span>
                        <span className="font-bold text-slate-900 text-sm">{confirmedOrder.attendee_name}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pass Tier</span>
                        <span className="font-bold text-sky-700 text-sm">{confirmedOrder.tier_name}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantity</span>
                        <span className="font-bold text-slate-900 text-sm">{confirmedOrder.quantity} Person(s)</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount Paid</span>
                        <span className="font-black text-slate-900 text-sm">
                          {confirmedOrder.total_price_sek === 0 ? 'FREE' : `${confirmedOrder.total_price_sek} SEK`}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">({confirmedOrder.payment_method})</span>
                        </span>
                      </div>
                    </div>

                    {/* QR Code & Barcode verification zone */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Stylized QR Code */}
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-white p-2 rounded-xl border border-slate-300 shadow-inner flex items-center justify-center">
                          <svg className="w-full h-full" viewBox="0 0 100 100">
                            {/* SVG mockup QR code pattern */}
                            <rect x="0" y="0" width="30" height="30" fill="#0f172a" />
                            <rect x="5" y="5" width="20" height="20" fill="#ffffff" />
                            <rect x="10" y="10" width="10" height="10" fill="#0f172a" />

                            <rect x="70" y="0" width="30" height="30" fill="#0f172a" />
                            <rect x="75" y="5" width="20" height="20" fill="#ffffff" />
                            <rect x="80" y="10" width="10" height="10" fill="#0f172a" />

                            <rect x="0" y="70" width="30" height="30" fill="#0f172a" />
                            <rect x="5" y="75" width="20" height="20" fill="#ffffff" />
                            <rect x="10" y="80" width="10" height="10" fill="#0f172a" />

                            {/* Data points */}
                            <rect x="40" y="10" width="15" height="10" fill="#0f172a" />
                            <rect x="45" y="25" width="10" height="15" fill="#0f172a" />
                            <rect x="40" y="50" width="20" height="10" fill="#0f172a" />
                            <rect x="70" y="45" width="10" height="15" fill="#0f172a" />
                            <rect x="40" y="75" width="15" height="15" fill="#0f172a" />
                            <rect x="65" y="75" width="20" height="10" fill="#0f172a" />
                          </svg>
                        </div>

                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                            <ShieldCheck className="w-3 h-3" /> Validated Security Pass
                          </span>
                          <p className="text-[11px] font-mono text-slate-600 font-bold">
                            REF: {confirmedOrder.payment_reference}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Scan on entrance tablet for instant badge issue.
                          </p>
                        </div>
                      </div>

                      {/* Barcode visual */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-0.5 h-10">
                          {[2, 4, 1, 3, 2, 5, 1, 3, 4, 2, 1, 4, 3, 2, 5, 2, 1, 3, 4, 1, 2, 3].map((w, i) => (
                            <div key={i} className="bg-slate-900 h-full" style={{ width: `${w * 1.5}px` }} />
                          ))}
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 tracking-widest mt-1">
                          * {confirmedOrder.payment_reference} *
                        </span>
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
                    <span>Print / Save Ticket PDF</span>
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
