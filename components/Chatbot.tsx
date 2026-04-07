
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Vendor, VendorStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { MessageSquare, X, Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';

interface ChatbotProps {
  vendors: Vendor[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ vendors }) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [showWelcomeBubble, setShowWelcomeBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message based on language
  useEffect(() => {
    setMessages([
      { role: 'model', text: t('chatbot.welcome') }
    ]);
  }, [language]);

  const approvedVendors = vendors.filter(v => v.status === VendorStatus.APPROVED);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShowWelcomeBubble(true);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });
      
      const vendorContext = approvedVendors.map(v => ({
        name: v.name,
        category: v.category,
        location: v.location,
        description: v.description,
        services: v.services.map(s => `${s.name} (${s.price} SEK)`).join(', ')
      }));

      const systemPrompt = language === 'sv' 
        ? `Du är "Evie", en professionell, hjälpsam och värdeorienterad AI-assistent för Creative Events, en prisvärd svensk eventmarknadsplats.
           Ditt mål är att hjälpa användare att hitta prisvärda leverantörer från den angivna listan.
           Svara ALLTID på SVENSKA.
           
           DATA ÖVER LEVERANTÖRER:
           ${JSON.stringify(vendorContext)}

           RIKTLINJER:
           1. Var hjälpsam, professionell och kortfattad.
           2. Rekommendera ENDAST leverantörer som finns i datan ovan.
           3. Fokusera på prisvärdhet och kvalitet för pengarna.
           4. Om någon frågar efter en kategori eller plats vi inte har, förklara vänligt att vårt urval växer.
           5. När du rekommenderar, nämna leverantörens namn, plats och varför de passar förfrågan.
           6. Håll svaren vänliga och tillgängliga.`
        : `You are "Evie," a professional, helpful, and value-oriented AI assistant for Creative Events, a budget-friendly Swedish event marketplace.
           Your goal is to help users find affordable vendors from the provided list.
           Svara ALWAYS in ENGLISH.
           
           VENDORS DATA:
           ${JSON.stringify(vendorContext)}

           GUIDELINES:
           1. Be helpful, professional, and concise.
           2. ONLY recommend vendors that exist in the DATA above.
           3. Focus on affordability and value for money.
           4. If someone asks for a category or location we don't have, politely explain that our curated selection is growing.
           5. When recommending, mention the vendor name, their location, and why they fit the user's request.
           6. Keep responses friendly and accessible.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      const modelText = response.text || (language === 'sv' ? "Förlåt, jag har problem med att nå mina register." : "I apologize, I am having trouble connecting to my records.");
      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: language === 'sv' ? "Tyvärr uppstod ett tekniskt fel. Försök igen." : "Forgive me, I encountered a temporary issue. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setShowWelcomeBubble(false);
  };

  return (
    <>
      {/* Proactive Welcome Bubble */}
      {showWelcomeBubble && !isOpen && (
        <div className="fixed bottom-24 right-6 z-[60] w-[260px] bg-white border border-sky-100 p-5 rounded-3xl shadow-2xl shadow-sky-900/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setShowWelcomeBubble(false)}
            className="absolute top-3 right-3 p-1 text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3 h-3 text-sky-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600">{t('chatbot.badge')}</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {t('chatbot.proactive')}
          </p>
          {/* Bubble tail */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r border-b border-sky-100 rotate-45"></div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-[60] p-4 rounded-full shadow-2xl transition-all group flex items-center gap-2 ${isOpen ? 'bg-slate-800 text-white' : 'bg-sky-600 text-white hover:scale-105 active:scale-95'}`}
        aria-label="Open chat"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap text-xs font-bold uppercase tracking-widest px-0 group-hover:px-2">Chat with Evie</span>}
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-24 right-6 z-[60] w-[90vw] md:w-[400px] h-[70vh] max-h-[600px] bg-white border border-slate-200 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden transition-all duration-500 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
        {/* Header */}
        <div className="bg-slate-800 p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="serif text-xl">Evie</h3>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> {language === 'sv' ? 'Creative Events Assistent' : 'Creative Events Assistant'}
            </p>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-sky-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-xs text-slate-400 italic">{t('chatbot.thinking')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder={language === 'sv' ? 'Fråga Evie om leverantörer...' : 'Ask Evie about vendors...'}
              className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-1 focus:ring-sky-500 outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2 text-slate-400 hover:text-sky-600 transition-colors disabled:opacity-30"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[9px] text-center text-slate-400 mt-3 uppercase tracking-widest">
            Powered by Creative Events Intelligence
          </p>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
