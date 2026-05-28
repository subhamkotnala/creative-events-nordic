import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, ShieldAlert } from 'lucide-react';
import { Message, Conversation } from '../types';
import { api } from '../services/api';
import { supabase } from '../supabaseClient';

// Contact info filter — blocks phone numbers and email addresses
const CONTACT_PATTERNS = [
  /(\+?\d[\d\s\-().]{6,}\d)/g,             // phone numbers
  /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g,        // emails
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

interface ChatInterfaceProps {
  conversation: Conversation;
  currentUserId: string;
  currentUserRole: 'USER' | 'VENDOR';
  displayName: string; // Name shown at the top (vendor name for users, user name for vendors)
  isAdmin?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversation,
  currentUserId,
  currentUserRole,
  displayName,
  isAdmin = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [contactWarning, setContactWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load initial messages
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    api.getMessages(conversation.id).then(msgs => {
      if (isMounted) {
        setMessages(msgs);
        setIsLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    });
    // Mark messages as read
    api.markMessagesRead(conversation.id, currentUserRole);
    return () => { isMounted = false; };
  }, [conversation.id, currentUserRole, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 50);
          // Mark as read if not from us
          if (newMsg.sender_role !== currentUserRole) {
            api.markMessagesRead(conversation.id, currentUserRole);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversation.id, currentUserRole, scrollToBottom]);

  // Polling fallback to fetch messages when realtime is blocked by RLS for Admins
  useEffect(() => {
    if (!isAdmin) return;

    const interval = setInterval(async () => {
      try {
        const msgs = await api.getMessages(conversation.id);
        const uniqueFetched = msgs.map(m => m.id).join(',');
        const uniqueCurrent = messages.map(m => m.id).join(',');
        if (uniqueFetched !== uniqueCurrent) {
          setMessages(msgs);
          setTimeout(scrollToBottom, 50);
          
          // Also mark as read if has unread from customer
          const unreadFromUser = msgs.filter(m => m.sender_role === 'USER' && !m.is_read).length;
          if (unreadFromUser > 0) {
            api.markMessagesRead(conversation.id, currentUserRole);
          }
        }
      } catch (err) {
        console.warn("Messages polling fallback failed:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [conversation.id, isAdmin, messages, currentUserRole, scrollToBottom]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
      await api.sendMessage(conversation.id, currentUserId, currentUserRole, text);
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputValue(text); // restore on failure
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
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const dateLabel = formatDate(msg.created_at);
    const group = groupedMessages.find(g => g.date === dateLabel);
    if (group) {
      group.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateLabel, messages: [msg] });
    }
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
          {conversation.package_name && !isAdmin && (
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">
              {conversation.service_category} · {conversation.package_name}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar bg-slate-50/50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Send className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 font-medium">No messages yet</p>
            <p className="text-xs text-slate-300 mt-1">Start the conversation below</p>
          </div>
        ) : (
          groupedMessages.map(group => (
            <div key={group.date}>
              {/* Date divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {group.messages.map((msg, idx) => {
                const isOwn = msg.sender_id === currentUserId;
                const prevMsg = group.messages[idx - 1];
                const isSameSequence = prevMsg && prevMsg.sender_id === msg.sender_id;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isSameSequence ? 'mt-0.5' : 'mt-3'}`}
                  >
                    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isOwn
                            ? 'bg-sky-600 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
                        } ${isSameSequence ? (isOwn ? 'rounded-tr-lg' : 'rounded-tl-lg') : ''}`}
                      >
                        {msg.content}
                      </div>
                      {!isSameSequence || idx === group.messages.length - 1 ? (
                        <span className={`text-[10px] text-slate-400 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.created_at)}
                        </span>
                      ) : null}
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

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex-shrink-0 bg-white">
        <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-4 py-2 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400 transition-all">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
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
    </div>
  );
};

export default ChatInterface;
