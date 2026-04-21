import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, Terminal, ShieldAlert, Cpu } from 'lucide-react';
import { scanService } from '../services/api';

const BADGE = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };

const SICONS = {
  Critical: <AlertTriangle size={15} className="text-[#ff3860] shrink-0" />,
  High:     <AlertTriangle size={15} className="text-orange-500 shrink-0" />,
  Medium:   <AlertTriangle size={15} className="text-yellow-500 shrink-0" />,
  Low:      <AlertTriangle size={15} className="text-[var(--color-neon-green)] shrink-0" />,
};

function Row({ v, idx }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.04 }}
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 md:px-5 py-4 border-b border-[#0d230d]/60 hover:bg-[#0a120a]/50 cursor-pointer transition-colors group"
      >
        {/* Title + icon */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {SICONS[v.severity]}
          <span className="text-sm font-medium text-white group-hover:text-[var(--color-neon-green)] transition-all truncate">
            {v.title}
          </span>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-3 flex-wrap ml-6 sm:ml-0">
          <span className={`text-[10px] px-2.5 py-1 rounded font-mono font-bold ${BADGE[v.severity]}`}>{v.severity}</span>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] hidden sm:block truncate max-w-[120px]" title={v.target_url}>{v.target_url}</span>
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono hidden md:block">
            {new Date(v.scan_date).toLocaleDateString()}
          </span>
          <span className="text-[var(--color-text-muted)] group-hover:text-white transition-colors ml-auto sm:ml-0">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </motion.div>

      {/* Expanded detail */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-[#050805] border-b border-[#0d230d]/60"
          >
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase mb-1 tracking-widest">Target Endpoint</p>
                  <code className="text-[11px] text-[var(--color-neon-green)] bg-[#0d150d] px-3 py-1.5 rounded border border-[#0d230d] block font-mono break-all font-bold">
                    {v.endpoint}
                  </code>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase mb-1 tracking-widest">Metadata</p>
                  <div className="flex gap-2">
                    <span className="text-[10px] badge-info px-2 py-0.5 rounded font-mono">{v.owasp || 'N/A'}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono border border-[#0d230d] px-2 py-0.5 rounded italic">MITRE: {v.mitre || 'T1190'}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase mb-2 flex items-center gap-1.5 tracking-widest">
                  <Cpu size={11} className="text-[var(--color-neon-green)]" /> AI-Generated Remediation
                </p>
                <div className="bg-[#0d150d] border border-[#0d230d] rounded-xl p-4 text-[11px] text-[var(--color-text-muted)] font-mono leading-relaxed whitespace-pre-wrap break-words italic">
                  <span className="text-[var(--color-neon-green)] font-bold not-italic">Operator Memo: </span>
                  {v.fix || "No specific fix provided. Review relevant security documentation for standard mitigation patterns."}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function VulnerabilitiesPage() {
  const [findings, setFindings] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const filters = ['All', 'Critical', 'High', 'Medium', 'Low'];

  useEffect(() => {
    scanService.getFindings().then(res => {
      setFindings(res.data);
    }).catch(err => {
      console.error('Failed to fetch findings:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const shown = filter === 'All' ? findings : findings.filter((v) => v.severity === filter);

  // Stats calculation
  const stats = {
    Critical: findings.filter(f => f.severity === 'Critical').length,
    High:     findings.filter(f => f.severity === 'High').length,
    Medium:   findings.filter(f => f.severity === 'Medium').length,
    Low:      findings.filter(f => f.severity === 'Low').length,
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-[#ff3860] shrink-0" size={24} />
            Hacker Threat Feed
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Real-time discoveries from your active engine. Click any row to expand AI remediation.
          </p>
        </div>
        {/* Severity filters */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all
                ${filter === f
                  ? 'bg-[var(--color-neon-green)]/15 border border-[var(--color-neon-green)]/50 text-[var(--color-neon-green)] shadow-neon-green/10'
                  : 'bg-[#0d150d] border border-[#0d230d] text-[var(--color-text-muted)] hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {Object.entries(stats).map(([label, count]) => (
          <div key={label} className="glass p-3 md:p-4 flex items-center justify-between rounded-xl">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
            <span className={`text-xl font-black px-2 py-0.5 rounded badge-${label.toLowerCase()}`}>{count}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass overflow-hidden border-[#0d230d]">
        <div className="hidden sm:flex items-center gap-4 px-5 py-3 border-b border-[#0d230d] bg-[#0a120a]">
          <div className="flex-1 text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Target Finding</div>
          <div className="w-20 text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Severity</div>
          <div className="w-28 text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)] hidden md:block">Asset Host</div>
          <div className="w-20 text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Date</div>
          <div className="w-4"></div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[var(--color-neon-green)]/20 border-t-[var(--color-neon-green)] rounded-full animate-spin" />
            <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">Accessing Audit Logs…</span>
          </div>
        ) : shown.length > 0 ? (
          shown.map((v, i) => <Row key={v.id || i} v={v} idx={i} />)
        ) : (
          <div className="py-20 flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-[var(--color-bg-elevated)] rounded-full">
              <Terminal size={32} className="text-[var(--color-text-muted)] opacity-50" />
            </div>
            <div>
              <p className="text-sm font-mono font-bold text-white">No vulnerabilities discovered yet.</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xs px-6 font-mono">Run your first autonomous scan in the Terminal to start populating this feed with real intelligence.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
