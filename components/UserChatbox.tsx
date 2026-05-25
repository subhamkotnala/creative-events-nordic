import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Loader2, MessageSquare, X } from 'lucide-react';
import { Conversation } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import ChatInterface from './ChatInterface';
import { motion, AnimatePresence } from 'framer-motion';

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface UserChatboxProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

const UserChatbox: React.FC<UserChatboxProps> = ({ isOpen, onClose, onUnreadCountChange }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Safe user ID — never throws even if user is null
  const userId = user?.id ?? '';

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const convs = await api.getConversations(userId, 'USER');
      setConversations(convs);
      const count = await api.getUnreadCount(userId, 'USER');
      onUnreadCountChange?.(count);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, onUnreadCountChange]);

  // Reload conversations whenever the panel opens
  useEffect(() => {
    if (isOpen && userId) {
      loadConversations();
    }
  }, [isOpen, userId, loadConversations]);

  // Poll unread count in background (safe: userId may be '')
  useEffect(() => {
    if (!userId) return;
    api.getUnreadCount(userId, 'USER').then(c => onUnreadCountChange?.(c));
    const interval = setInterval(() => {
      api.getUnreadCount(userId, 'USER').then(c => onUnreadCountChange?.(c));
    }, 15000);
    return () => clearInterval(interval);
  }, [userId, onUnreadCountChange]);

  // Realtime: refresh list when conversations update
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`user-chatbox-rt-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
        if (isOpen) loadConversations();
        else api.getUnreadCount(userId, 'USER').then(c => onUnreadCountChange?.(c));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, isOpen, loadConversations, onUnreadCountChange]);

  // Don't render anything if not a USER
  if (!user || user.role !== 'USER') return null;

  const handleSelectConv = (conv: Conversation) => {
    setSelectedConv(conv);
    onUnreadCountChange?.(0); // optimistic clear
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-in panel from the right */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, x: 380 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 380 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed right-0 top-0 z-[80] w-[380px] h-full bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              {selectedConv ? (
                <button
                  onClick={() => setSelectedConv(null)}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors group"
                >
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                </button>
              ) : (
                <div>
                  <h3 className="text-sm font-bold text-slate-900">My Messages</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Your vendor conversations</p>
                </div>
              )}
              <button
                onClick={() => { onClose(); setSelectedConv(null); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {selectedConv ? (
                  <motion.div
                    key={selectedConv.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    <ChatInterface
                      conversation={selectedConv}
                      currentUserId={userId}
                      currentUserRole="USER"
                      displayName={selectedConv.vendor_name || 'Vendor'}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-full overflow-y-auto custom-scrollbar"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                          <MessageSquare className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">No conversations yet</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Inquire on any vendor package to start a conversation
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {conversations.map(conv => (
                          <button
                            key={conv.id}
                            onClick={() => handleSelectConv(conv)}
                            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left group"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                              {(conv.vendor_name || 'V').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-colors">
                                  {conv.vendor_name || 'Vendor'}
                                </p>
                                <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                                  {timeAgo(conv.last_message_at)}
                                </span>
                              </div>
                              {conv.package_name && (
                                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500 mb-0.5 truncate">
                                  {conv.package_name}
                                </p>
                              )}
                              <p className="text-xs text-slate-400 truncate">
                                {conv.last_message || 'Start of conversation'}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UserChatbox;
