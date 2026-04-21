import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ScanLine, AlertTriangle, FileText,
  Terminal as TerminalIcon, Settings, ShieldAlert, LogOut, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { label: 'Command Center',  path: '/dashboard',       icon: LayoutDashboard },
  { label: 'Launch Scan',     path: '/scan',             icon: ScanLine },
  { label: 'Threat Feed',     path: '/vulnerabilities',  icon: AlertTriangle },
  { label: 'AI Reports',      path: '/reports',          icon: FileText },
  { label: 'Documentation',   path: '/documentation',    icon: ShieldAlert },
  { label: 'Settings',        path: '/settings',         icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };
  const handleNav = () => { if (onClose) onClose(); };

  const sidebarContent = (
    <aside className="w-60 h-full flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-panel)] relative z-20 shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-[var(--color-neon-cyan)] shrink-0" size={26} />
          <span className="text-lg font-bold tracking-widest text-white select-none">
            ReconX<span className="text-[var(--color-neon-cyan)]">.AI</span>
          </span>
        </div>
        {/* Close button - only on mobile */}
        <button
          onClick={onClose}
          className="md:hidden text-[var(--color-text-muted)] hover:text-white transition-colors p-1"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
        {NAV.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={handleNav}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 select-none
              ${isActive
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-neon-cyan)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-[var(--color-neon-cyan)]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </AnimatePresence>
                <Icon
                  size={18}
                  className={isActive
                    ? 'text-[var(--color-neon-cyan)]'
                    : 'text-[var(--color-text-muted)] group-hover:text-white transition-colors'
                  }
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer — user + status */}
      <div className="p-3 border-t border-[var(--color-border)] space-y-2">
        {/* System heartbeat */}
        <div className="flex items-center justify-between bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2 border border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-neon-green)] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-neon-green)]"></span>
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase">Engine</span>
          </div>
          <span className="text-[10px] text-[var(--color-neon-green)] font-mono font-bold">ONLINE</span>
        </div>

        {/* User row */}
        <div className="flex items-center gap-3 px-2 py-1 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-neon-cyan)] to-[var(--color-neon-purple)] flex items-center justify-center text-black text-xs font-black select-none shrink-0">
            {user?.username?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.username ?? 'Admin'}</p>
            <p className="text-[10px] text-[var(--color-neon-cyan)] font-mono capitalize">{user?.role ?? 'User'}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-muted)] hover:text-[var(--color-neon-red)]"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar - always visible */}
      <div className="hidden md:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile sidebar - slide in overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30"
            />
            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="md:hidden fixed left-0 top-0 h-full z-40 flex"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
