import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, ShieldAlert, Lock } from 'lucide-react';
import { AdReply } from '../types';
import { api } from '../services/api';
import { supabase } from '../supabaseClient';
import { emailService } from '../services/emailService';

// Contact info filter — blocks phone numbers and email addresses (same pattern as ChatInterface)
const CONTACT_PATTERNS = [
  /(\+?\d[\d\s\-().]{6,}\d)/g,
  /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g,
];

function containsContactInfo(text: string): boolean {
  return CONTACT_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

interface AdReplyChatProps {
  adId: string;
  /** The profile-id of the current user */
  currentUserId: string;
  currentUserRole: 'USER' | 'VENDOR' | 'ADMIN';
  /** Name displayed in the chat header */
  displayName: string;
  /** When true the input is hidden (read-only view — e.g. ad owner reading vendor thread) */
  readOnly?: boolean;
  /** Whether this is an admin view (enables polling fallback) */
  isAdmin?: boolean;
  /** Filter replies to only show a specific sender's thread (used by admin vendor-wise view) */
  filterSenderId?: string;
}

const AdReplyChat: React.FC<AdReplyChatProps> = ({
  adId,
  currentUserId,
  currentUserRole,
  displayName,
  readOnly = false,
  isAdmin = false,
  filterSenderId,
}) => {
  const [replies, setReplies] = useState<AdReply[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [contactWarning, setContactWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottomRef = useRef(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  });
  const scrollToBottom = () => scrollToBottomRef.current();


  // Initial load + mark read
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    api.getAdReplies(adId).then(data => {
      if (!mounted) return;
      const filtered = filterSenderId ? data.filter(r => r.sender_id === filterSenderId) : data;
      setReplies(filtered);
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    });
    // Mark replies as read
    if (currentUserRole === 'USER') {
      api.markAdRepliesRead(adId, filterSenderId);
    } else if (currentUserRole === 'VENDOR') {
      api.markAdRepliesRead(adId);
    }
    return () => { mounted = false; };
  }, [adId, currentUserRole, filterSenderId]);

  // Realtime subscription for new replies
  useEffect(() => {
    const channel = supabase
      .channel(`ad-replies:${adId}${filterSenderId ? `-${filterSenderId}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ad_replies',
          filter: `ad_id=eq.${adId}`,
        },
        (payload) => {
          const newReply = payload.new as AdReply;
          if (filterSenderId && newReply.sender_id !== filterSenderId) return;
          setReplies(prev => {
            if (prev.find(r => r.id === newReply.id)) return prev;
            return [...prev, newReply];
          });
          setTimeout(scrollToBottom, 50);
          if (currentUserRole === 'USER') {
            api.markAdRepliesRead(adId, filterSenderId);
          } else if (currentUserRole === 'VENDOR') {
            api.markAdRepliesRead(adId);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [adId, currentUserRole, filterSenderId]);

  // Polling fallback for admins (RLS may block realtime for them)
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getAdReplies(adId);
        const filtered = filterSenderId ? data.filter(r => r.sender_id === filterSenderId) : data;
        const fetchedIds = filtered.map(r => r.id).join(',');
        const currentIds = replies.map(r => r.id).join(',');
        if (fetchedIds !== currentIds) {
          setReplies(filtered);
          setTimeout(scrollToBottom, 50);
        }
      } catch (err) {
        console.warn('Ad replies polling fallback failed:', err);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [adId, isAdmin, filterSenderId, replies]);

  // Scroll when replies change
  useEffect(() => {
    scrollToBottom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replies]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isSending) return;

    if (containsContactInfo(text)) {
      setContactWarning(true);
      setTimeout(() => setContactWarning(false), 4000);
      return;
    }

    setContactWarning(false);
    setIsSending(true);
    setInputValue('');

    try {
      const newReply = await api.sendAdReply(adId, text, filterSenderId);
      // Optimistic update
      setReplies(prev => {
        if (prev.find(r => r.id === newReply.id)) return prev;
        return [...prev, { ...newReply, sender_name: currentUserRole === 'USER' ? 'You' : displayName }];
      });
      setTimeout(scrollToBottom, 50);

      // Fire-and-forget: notify the ad poster when a vendor replies
      if (currentUserRole === 'VENDOR') {
        (async () => {
          try {
            const { data: ad } = await supabase
              .from('ads')
              .select('user_id')
              .eq('id', adId)
              .maybeSingle();
            if (ad?.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email, business_name')
                .eq('id', ad.user_id)
                .maybeSingle();
              if (profile?.email) {
                await emailService.sendMessageNotification({
                  recipientEmail: profile.email,
                  recipientName: profile.business_name || 'there',
                  senderName: displayName,
                });
              }
            }
          } catch (_) { /* silent — notification failure must never affect chat */ }
        })();
      }
    } catch (err) {
      console.error('Failed to send ad reply:', err);
      setInputValue(text);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedReplies: { date: string; replies: AdReply[] }[] = [];
  replies.forEach(r => {
    const dateLabel = formatDate(r.created_at);
    const group = groupedReplies.find(g => g.date === dateLabel);
    if (group) group.replies.push(r);
    else groupedReplies.push({ date: dateLabel, replies: [r] });
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{displayName}</p>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {readOnly ? 'Read-only view' : 'Private thread'}
          </p>
        </div>
        {readOnly && (
          <div className="ml-auto flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">View only</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar bg-slate-50/50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Send className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 font-medium">No messages yet</p>
            {!readOnly && <p className="text-xs text-slate-300 mt-1">Send your reply below</p>}
          </div>
        ) : (
          groupedReplies.map(group => (
            <div key={group.date}>
              {/* Date divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {group.replies.map((reply, idx) => {
                const isOwn = currentUserRole === 'VENDOR'
                  ? (reply.sender_role === 'VENDOR' && reply.sender_id === currentUserId)
                  : currentUserRole === 'ADMIN'
                  ? (reply.sender_role === 'USER') // Align USER on the right for admin view
                  : (reply.sender_role === 'USER');

                const prevReply = group.replies[idx - 1];
                const isPrevOwn = prevReply && (
                  currentUserRole === 'VENDOR'
                    ? (prevReply.sender_role === 'VENDOR' && prevReply.sender_id === currentUserId)
                    : currentUserRole === 'ADMIN'
                    ? (prevReply.sender_role === 'USER') // Align USER on the right for admin view
                    : (prevReply.sender_role === 'USER')
                );

                const isSameSequence = prevReply && (isOwn === isPrevOwn);

                return (
                  <div
                    key={reply.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isSameSequence ? 'mt-0.5' : 'mt-3'}`}
                  >
                    {/* Sender label for non-own messages (useful in USER view with multiple vendors) */}
                    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!isOwn && !isSameSequence && (
                        <span className="text-[10px] font-bold text-sky-500 mb-1 px-1 uppercase tracking-widest">
                          {reply.sender_role === 'USER' ? 'Ad Owner' : (reply.sender_name || 'Vendor')}
                        </span>
                      )}
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isOwn
                            ? 'bg-sky-600 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
                        } ${isSameSequence ? (isOwn ? 'rounded-tr-lg' : 'rounded-tl-lg') : ''}`}
                      >
                        {reply.content}
                      </div>
                      {(!isSameSequence || idx === group.replies.length - 1) && (
                        <span className={`text-[10px] text-slate-400 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                          {formatTime(reply.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Contact info warning */}
      {contactWarning && (
        <div className="mx-4 mb-2 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 animate-in slide-in-from-bottom-2">
          <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 font-medium">
            Contact information (phone/email) cannot be shared in this chat.
          </p>
        </div>
      )}

      {/* Input — hidden when readOnly */}
      {!readOnly && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex-shrink-0 bg-white">
          <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-4 py-2 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400 transition-all">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply... (Enter to send)"
              rows={1}
              style={{ resize: 'none', minHeight: '36px', maxHeight: '120px' }}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none py-1.5 leading-relaxed"
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isSending}
              className="p-2 rounded-xl bg-sky-600 text-white hover:bg-sky-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 mb-0.5 shadow-sm"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[9px] text-slate-300 text-center mt-2 font-medium tracking-wide">
            Contact info sharing is not permitted · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
};

export default AdReplyChat;
