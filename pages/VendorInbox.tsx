import React, { useState, useEffect, useCallback } from 'react';
import { Inbox, Loader2, MessageSquare, ChevronRight, ArrowLeft } from 'lucide-react';
import { Conversation } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import ChatInterface from '../components/ChatInterface';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const VendorInbox: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const convs = await api.getConversations(user.id, 'VENDOR');
      setConversations(convs);

      // For each conversation, check unread messages from users
      const unreadCounts: Record<string, number> = {};
      await Promise.all(
        convs.map(async (conv) => {
          const msgs = await api.getMessages(conv.id);
          const unread = msgs.filter(m => m.sender_role === 'USER' && !m.is_read).length;
          unreadCounts[conv.id] = unread;
        })
      );
      setUnreadMap(unreadCounts);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime: refresh list when conversations or messages update
  useEffect(() => {
    const channel = supabase
      .channel('vendor-inbox-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => loadConversations()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_role === 'USER') {
            setUnreadMap(prev => ({
              ...prev,
              [msg.conversation_id]: (prev[msg.conversation_id] || 0) + 1,
            }));
            // Refresh conversation list to update last_message
            loadConversations();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadConversations]);

  const handleSelectConv = (conv: Conversation) => {
    setSelectedConv(conv);
    // Clear unread badge for this conversation
    setUnreadMap(prev => ({ ...prev, [conv.id]: 0 }));
    api.markMessagesRead(conv.id, 'VENDOR');
  };

  const totalUnread = Object.values(unreadMap).reduce((sum, n) => sum + n, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl serif text-slate-900">Inbox</h1>
                {totalUnread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                    {totalUnread} new
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-0.5">Customer inquiries and messages</p>
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden flex" style={{ height: '70vh', minHeight: '500px' }}>

          {/* Conversation list (sidebar) */}
          <div className={`flex flex-col border-r border-slate-100 transition-all duration-300 ${selectedConv ? 'hidden md:flex md:w-72 lg:w-80' : 'w-full md:w-72 lg:w-80'}`}>
            <div className="px-5 py-4 border-b border-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2 text-slate-400">
                <Inbox className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {conversations.length} Conversation{conversations.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                    <MessageSquare className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">No inquiries yet</p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    When customers inquire about your packages, conversations will appear here.
                  </p>
                </div>
              ) : (
                <div>
                  {conversations.map(conv => {
                    const isSelected = selectedConv?.id === conv.id;
                    const unread = unreadMap[conv.id] || 0;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConv(conv)}
                        className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-all border-l-2 group ${
                          isSelected
                            ? 'bg-sky-50 border-sky-500'
                            : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm ${
                          isSelected ? 'bg-sky-600' : 'bg-gradient-to-br from-slate-600 to-slate-800'
                        }`}>
                          {(conv.user_name || 'U').charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-sky-700' : 'text-slate-900'}`}>
                              {conv.user_name || 'Customer'}
                            </p>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              {unread > 0 && (
                                <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                  {unread > 9 ? '9+' : unread}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {timeAgo(conv.last_message_at)}
                              </span>
                            </div>
                          </div>
                          {conv.package_name && (
                            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500 mb-0.5 truncate">
                              {conv.service_category} · {conv.package_name}
                            </p>
                          )}
                          <p className={`text-xs truncate ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                            {conv.last_message || 'New inquiry'}
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-all ${isSelected ? 'text-sky-500' : 'text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5'}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>
            <AnimatePresence mode="wait">
              {selectedConv ? (
                <motion.div
                  key={selectedConv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col h-full"
                >
                  {/* Mobile back button */}
                  <div className="md:hidden px-4 py-3 border-b border-slate-100 flex-shrink-0">
                    <button
                      onClick={() => setSelectedConv(null)}
                      className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Back to Inbox</span>
                    </button>
                  </div>
                  <ChatInterface
                    conversation={selectedConv}
                    currentUserId={user?.id || ''}
                    currentUserRole="VENDOR"
                    displayName={selectedConv.user_name || 'Customer'}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full text-center px-8"
                >
                  <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-5">
                    <MessageSquare className="w-9 h-9 text-slate-300" />
                  </div>
                  <h3 className="text-xl serif text-slate-700 mb-2">Select a Conversation</h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                    Choose a customer inquiry from the list on the left to start replying.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorInbox;
