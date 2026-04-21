import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Cpu, Shield, Loader2, User, Bot, Terminal } from 'lucide-react';
import { chatService } from '../services/api';

export default function CopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadHistory = async () => {
    setFetchingHistory(true);
    try {
      const res = await chatService.getHistory();
      if (res.data.length > 0) {
        setMessages(res.data);
      } else {
        // Initial Greeting if no history
        setMessages([{
          role: 'assistant',
          content: "Welcome, Operator. I am the ReconX Agentic Copilot. I've finished analyzing your latest scan telemetry. How can I assist with your offensive-security strategy today?"
        }]);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatService.sendMessage(input);
      if (res.data && res.data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
      } else {
        throw new Error("Empty response from reasoning engine.");
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = err.response?.data?.error || err.message || "Neural Uplink Interrupted.";
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Neural Link Error: ${errorMsg}. Local diagnostics suggest the reasoning loop was aborted. Please check your network or try a simpler query.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-mono">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[350px] md:w-[400px] h-[500px] glass rounded-2xl flex flex-col overflow-hidden border-[#00ff41]/30 shadow-[0_0_40px_rgba(0,255,65,0.1)]"
          >
            {/* Header */}
            <div className="bg-[#0a150a] border-b border-[#00ff41]/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Cpu className="text-[var(--color-neon-green)] animate-pulse" size={20} />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-black shadow-[0_0_5px_#00ff41]" />
                </div>
                <div>
                  <h3 className="text-white text-xs font-black tracking-widest uppercase">Agentic Copilot</h3>
                  <p className="text-[9px] text-[var(--color-neon-green)] opacity-70">Neural Link: ACTIVE</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[var(--color-text-muted)] hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 terminal-scroll bg-[#050805]/80"
            >
              {fetchingHistory ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 opacity-50">
                  <Loader2 className="animate-spin text-[var(--color-neon-green)]" />
                  <p className="text-[10px] uppercase tracking-tighter italic">Fetching encrypted logs...</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`mt-1 h-7 w-7 rounded-lg border flex items-center justify-center shrink-0
                        ${msg.role === 'user' ? 'bg-white/5 border-white/20' : 'bg-[var(--color-neon-green)]/10 border-[var(--color-neon-green)]/40'}`}
                      >
                        {msg.role === 'user' ? <User size={14} className="text-white/60" /> : <Shield size={14} className="text-[var(--color-neon-green)]" />}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl text-[11px] leading-relaxed break-words shadow-sm
                        ${msg.role === 'user' 
                          ? 'bg-blue-900/10 border border-blue-500/20 text-blue-100 rounded-tr-none' 
                          : 'bg-[#0d1a0d] border border-[#00ff41]/20 text-[var(--color-neon-green)] rounded-tl-none font-medium'}`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#0d1a0d] border border-[#00ff41]/20 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 className="animate-spin text-[var(--color-neon-green)]" size={14} />
                    <span className="text-[10px] text-[var(--color-neon-green)]/70 italic">Agentic reasoning...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-[#0a150a] border-t border-[#00ff41]/10">
              <div className="relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask ReconX Co-Pilot..."
                  className="w-full bg-[#050805] border border-[#00ff41]/20 rounded-xl px-4 py-3 pr-12 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--color-neon-green)] focus:ring-1 focus:ring-[var(--color-neon-green)]/40 transition-all font-mono"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--color-neon-green)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 opacity-30">
                <Terminal size={10} className="text-[var(--color-neon-green)]" />
                <p className="text-[8px] uppercase tracking-widest text-[#00ff41]">Encrypted Multi-Turn Session</p>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border 
          ${isOpen 
            ? 'bg-red-500/10 border-red-500/40 text-red-500 hover:bg-red-500/20' 
            : 'bg-[var(--color-neon-green)]/10 border-[var(--color-neon-green)]/40 text-[var(--color-neon-green)] hover:bg-[var(--color-neon-green)]/20 shadow-[0_0_20px_rgba(0,255,65,0.2)]'}`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </div>
  );
}
