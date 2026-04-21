import { Outlet, useLocation } from 'react-router-dom';
import { Bell, Search, Menu, X, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';

const NOTIFICATIONS = [
  { id: 1, icon: AlertOctagon, color: 'text-[var(--color-neon-red)]', title: 'CRITICAL — SQL Injection Detected', desc: '/api/v1/login on api.production.com', time: '2h ago' },
  { id: 2, icon: AlertTriangle, color: 'text-yellow-400', title: 'HIGH — Outdated nginx 1.14.0', desc: 'CVE-2021-23017 on gateway.internal', time: '5h ago' },
  { id: 3, icon: Info, color: 'text-[var(--color-neon-green)]', title: 'Scan Complete — REP-012 ready', desc: 'api.production.com — Score: 76/100', time: '6h ago' },
];

export default function DashboardLayout() {
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const location = useLocation();

  return (
    <div className="flex h-screen w-full bg-transparent text-[var(--color-text-primary)] overflow-hidden">
      {/* Sidebar — receives open state and close handler */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-16 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-panel)]/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 z-10 gap-3">

          {/* Hamburger — mobile only */}
          <button
            id="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-[var(--color-text-muted)] hover:text-white transition-colors shrink-0"
          >
            <Menu size={22} />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-xs md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
            <input
              id="global-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search target, CVE…"
              className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-neon-cyan)] transition-all font-mono"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live scanning pill — hidden on small screens */}
            <div className="hidden sm:flex items-center gap-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-full px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-neon-green)] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-neon-green)]"></span>
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">2 scans active</span>
            </div>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                id="notifications-btn"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative text-[var(--color-text-muted)] hover:text-white transition-colors"
              >
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-neon-red)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{NOTIFICATIONS.length}</span>
              </button>

              {/* Notification dropdown */}
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 w-80 glass rounded-2xl border border-[var(--color-border)] shadow-xl z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-widest">Alerts</span>
                      <button onClick={() => setNotifOpen(false)} className="text-[var(--color-text-muted)] hover:text-white transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                    {NOTIFICATIONS.map((n) => (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-elevated)]/50 transition-colors cursor-pointer">
                        <n.icon size={16} className={`${n.color} mt-0.5 shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-bold text-white truncate">{n.title}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">{n.desc}</p>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono shrink-0">{n.time}</span>
                      </div>
                    ))}
                    <div className="px-4 py-2 text-center">
                      <span className="text-[10px] text-[var(--color-neon-green)] font-mono cursor-pointer hover:underline">View all alerts →</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-5 md:py-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Dashboard Footer */}
        <footer className="shrink-0 h-10 border-t border-[var(--color-border)] bg-[var(--color-bg-panel)]/60 backdrop-blur-sm flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-neon-green)] opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-neon-green)]"></span>
            </span>
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">ENGINE ONLINE</span>
          </div>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">© 2026 ReconX AI · Autonomous Security Intelligence</span>
          <span className="text-[10px] font-mono text-[var(--color-neon-cyan)]">v2.0.0</span>
        </footer>
      </div>
    </div>
  );
}
