import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Network, Zap, Target, EyeOff, Server,
  ShieldCheck, CheckCircle, AlertCircle, Loader,
} from 'lucide-react';
import { scanService } from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ─── Scan Mode definitions ───── */
const MODES = [
  {
    id: 'Quick',
    icon: Zap,
    color: 'text-[var(--color-neon-cyan)]',
    glow: 'shadow-neon-cyan',
    border: 'border-[var(--color-neon-cyan)]/40',
    bg: 'bg-[var(--color-neon-cyan)]/8',
    title: 'Quick Scan',
    desc: 'Rapid port discovery, WHOIS, Headers, SSL, and automated SQLi/XSS proofing.',
    time: '~3 min',
  },
  {
    id: 'Deep',
    icon: Target,
    color: 'text-[var(--color-neon-green)]',
    glow: 'shadow-neon-green',
    border: 'border-[var(--color-neon-green)]/40',
    bg: 'bg-[var(--color-neon-green)]/8',
    title: 'Deep Scan',
    desc: 'Everything in Quick + Full Vuln Assessment, OWASP ZAP, Subfinder, and DoS audit.',
    time: '~15 min',
  },
  {
    id: 'Phishing',
    icon: EyeOff,
    color: 'text-[#ff3860]',
    glow: 'shadow-red-500',
    border: 'border-[#ff3860]/40',
    bg: 'bg-[#ff3860]/8',
    title: 'Phishing Check',
    desc: 'Analyzes target HTML, WHOIS, and SSL for deceptive/scam elements.',
    time: '~1 min',
    badge: 'NEW',
  },
  {
    id: 'Custom',
    icon: Server,
    color: 'text-[var(--color-neon-purple)]',
    glow: 'shadow-neon-purple',
    border: 'border-[var(--color-neon-purple)]/40',
    bg: 'bg-[var(--color-neon-purple)]/8',
    title: 'Custom Engine',
    desc: 'Hand-pick specific scanning engines for targeted security analysis.',
    time: 'Variable',
    badge: 'FLEXIBLE',
  },
];

const TOOLS = [
  { id: 'shodan',    label: 'Shodan Intel',    desc: 'Public exposure and open port intelligence' },
  { id: 'vt',        label: 'VirusTotal',      desc: 'Domain reputation and malware analysis' },
  { id: 'headers',   label: 'Header & SSL',     desc: 'HTTP security headers & certificate audit' },
  { id: 'whois',     label: 'WHOIS Recon',      desc: 'Domain registration & ownership intelligence' },
  { id: 'subfinder', label: 'Subfinder',        desc: 'Passive subdomain enumeration' },
  { id: 'nmap',      label: 'Nmap Engine',      desc: 'Active port discovery & service fingerprinting' },
  { id: 'nikto',     label: 'Nikto Web',        desc: 'Web server misconfiguration & CGI scanner' },
  { id: 'nuclei',    label: 'Nuclei templates', desc: 'Powerful template-based vulnerability scanner' },
  { id: 'sqlmap',    label: 'SQL Injection',    desc: 'Automated SQLi and DB takeover probing' },
  { id: 'xss',       label: 'XSS Proofing',     desc: 'Cross-Site Scripting payload analysis' },
  { id: 'zap',       label: 'OWASP ZAP',        desc: 'DAST baseline web application scanner' },
  { id: 'dos',       label: 'DoS Checker',      desc: 'Resource starvation vulnerability audit' },
];

const CHECKS = [
  'Shodan Public Exposure',
  'VirusTotal Reputation',
  'SQL Injection (Boolean/Time)',
  'XSS / Open Redirects',
  'OWASP Top 10 Analysis',
  'SSL / Protocol Weakness',
  'Subdomain Exposure',
  'DoS Susceptibility',
  'Security Headers (CSP/HSTS)',
  'Whois Phishing Indicators',
];

export default function ScanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [target, setTarget] = useState('');
  const [mode, setMode] = useState('Quick');
  const [selectedTools, setSelectedTools] = useState({
    shodan: true, vt: true, nmap: true, nikto: false, nuclei: false, subfinder: false, whois: true, headers: true
  });
  const [authorised, setAuthorised] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');

  const valid = target.trim() !== '' && authorised;

  const toggleTool = (id) => {
    setSelectedTools(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setError('');
    setLaunching(true);
    try {
      const payload = {
        target_url: target.trim(),
        scan_type: mode,
        user_id: user?.id ?? 1,
        custom_params: mode === 'Custom' ? selectedTools : null
      };
      const res = await scanService.start(payload.target_url, payload.scan_type, payload.user_id, payload.custom_params);
      navigate(`/terminal?scanId=${res.data.scan_id}`);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to start scan. Is the backend running?');
      setLaunching(false);
    }
  };

  return (
    <form onSubmit={handleLaunch} className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <Network className="text-[var(--color-neon-cyan)]" size={28} />
          Launch Autonomous Scan
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Configure target parameters and select an AI deployment protocol.
        </p>
      </div>

      {/* Target input */}
      <section className="glass p-6 space-y-4">
        <label htmlFor="scan-target" className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
          Target Node · URL / IP / Domain
        </label>
        <div className="relative">
          <Network size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-neon-cyan)]" />
          <input
            id="scan-target"
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="https://target.example.com"
            required
            className="w-full bg-black/20 border-2 border-[var(--color-border)] rounded-xl py-4 pl-12 pr-4 text-white font-mono text-sm focus:outline-none focus:border-[var(--color-neon-cyan)] focus:shadow-neon-cyan transition-all"
          />
        </div>

        {/* Security checks checklist */}
        <div className="pt-2">
          <p className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Checks Included</p>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
            {CHECKS.map((c) => (
              <div key={c} className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <CheckCircle size={13} className="text-[var(--color-neon-green)] shrink-0" />
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mode selector */}
      <section className="glass p-6 space-y-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Deployment Mode</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODES.map(({ id, icon: Icon, color, glow, border, bg, title, desc, time, badge }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`text-left border-2 rounded-xl p-5 flex items-start gap-4 transition-all duration-200
                  ${active ? `${bg} ${border} ${glow}` : 'border-[var(--color-border)] bg-black/10 hover:bg-black/20'}`}
              >
                <div className={`p-2.5 rounded-lg bg-black/40 ${color} shrink-0`}>
                  <Icon size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-bold text-sm ${active ? color : 'text-white'}`}>{title}</h4>
                    {badge && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-[var(--color-neon-red)]/20 text-[var(--color-neon-red)] border border-[var(--color-neon-red)]/30 rounded font-mono font-bold">
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] mt-2 block">{time}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Custom Tool Selection (Conditional) */}
      <AnimatePresence>
        {mode === 'Custom' && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="glass p-6 space-y-4 border-[var(--color-neon-purple)]/30 bg-[var(--color-neon-purple)]/5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-neon-purple)] font-bold">Engine Configuration</p>
                <span className="text-[9px] text-[var(--color-text-muted)] font-mono uppercase">Select active modules</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTool(t.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                      ${selectedTools[t.id] 
                        ? 'bg-black/20 border-[var(--color-neon-purple)] shadow-[0_0_15px_rgba(191,64,255,0.1)]' 
                        : 'bg-transparent border-[var(--color-border)] opacity-50 hover:opacity-100'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selectedTools[t.id] ? 'bg-[var(--color-neon-purple)]/20 text-[var(--color-neon-purple)]' : 'bg-black/40 text-[var(--color-text-muted)]'}`}>
                      {selectedTools[t.id] ? <CheckCircle size={20} /> : <Loader size={20} className="opacity-20" />}
                    </div>
                    <div>
                      <h5 className={`text-xs font-bold ${selectedTools[t.id] ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>{t.label}</h5>
                      <p className="text-[10px] text-[var(--color-text-muted)] leading-tight mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Authorization checkbox */}
      <section className="glass p-6">
        <label className="flex items-start gap-4 cursor-pointer group">
          <div className="relative mt-0.5 shrink-0">
            <input
              id="auth-check"
              type="checkbox"
              checked={authorised}
              onChange={(e) => setAuthorised(e.target.checked)}
              className="w-5 h-5 appearance-none border-2 border-[var(--color-border)] rounded bg-black/20 checked:bg-[var(--color-neon-green)] checked:border-[var(--color-neon-green)] transition-all cursor-pointer"
            />
            <AnimatePresence>
              {authorised && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <CheckCircle size={14} className="text-black" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            <span className="font-bold text-white">Target Authorization Confirmed</span><br />
            I confirm I have explicit legal written permission to perform penetration testing against this target. Unauthorized scanning is illegal and may violate computer fraud laws.
          </div>
        </label>
      </section>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4"
          >
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
            {error.includes('already active') && (
              <Link 
                to={`/terminal?scanId=${error.split('#').pop() || ''}`}
                className="text-[10px] font-mono uppercase bg-[var(--color-neon-red)]/10 text-[var(--color-neon-red)] self-start px-3 py-1.5 rounded border border-[var(--color-neon-red)]/20 hover:bg-white hover:text-black transition-all flex items-center gap-2"
              >
                Reconnect to Terminal <Terminal size={12} />
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launch button */}
      <div className="flex justify-end gap-4 pt-2">
        <button type="button" onClick={() => navigate(-1)} className="px-5 py-3 text-sm font-mono text-[var(--color-text-muted)] hover:text-white transition-colors">
          ABORT
        </button>
        <button
          id="launch-scan-btn"
          type="submit"
          disabled={!valid || launching}
          className={`px-10 py-3 rounded-xl font-black font-mono tracking-widest text-sm transition-all flex items-center gap-3
            ${valid && !launching
              ? 'bg-[var(--color-neon-green)] text-black hover:bg-white shadow-neon-green'
              : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] cursor-not-allowed'}`}
        >
          {launching ? (
            <><Loader size={16} className="animate-spin" /> DEPLOYING…</>
          ) : (
            <><CheckCircle size={16} /> INITIATE SEQUENCE</>
          )}
        </button>
      </div>
    </form>
  );
}
