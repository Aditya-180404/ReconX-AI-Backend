import { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Play, Trash2, ShieldAlert, Cpu, AlertTriangle, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { scanService } from '../services/api';

export default function TerminalPage() {
  const [searchParams] = useSearchParams();
  const scanId = searchParams.get('scanId');
  const navigate = useNavigate();

  const [scan, setScan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStop = async () => {
    if (!scanId || stopping) return;
    setStopping(true);
    try {
      await scanService.stop(scanId);
      navigate('/reports');
    } catch (err) {
      console.error('Stop error:', err);
      setStopping(false);
    }
  };

  useEffect(() => {
    if (!scanId) {
      setLoading(false);
      return;
    }

    let interval;
    const fetchStatus = async () => {
      try {
        const res = await scanService.getById(scanId);
        setScan(res.data);
        
        // Parse raw_output into log lines
        const raw = res.data.raw_output || '';
        const lines = raw.split('\n').filter(l => l.trim() !== '').map(text => {
          let t = 'data';
          if (text.startsWith('[*]')) t = 'info';
          if (text.startsWith('[+]')) t = 'success';
          if (text.startsWith('[!]')) t = 'warn';
          if (text.startsWith('[!!]')) t = 'crit';
          // Command lines (show $ prompt style)
          const stripped = text.replace(/^\[\*\]\s*/, '').replace(/^\[!\]\s*/, '');
          if (stripped.startsWith('$ ')) t = 'cmd';
          // Section headers (════════ style)
          if (stripped.includes('══') || stripped.includes('╔') || stripped.includes('╚')) t = 'header';
          return { t, text: text.replace(/^\[[\*\+!\]]+\]\s*/, stripped.startsWith('$') ? '' : ''), ts: new Date().toLocaleTimeString() };
        });
        setLogs(lines);

        if (res.data.status === 'Completed' || res.data.status === 'Failed') {
          clearInterval(interval);
          setStopping(false);
        }
      } catch (err) {
        console.error('Terminal polling error:', err);
        setError('Failed to connect to scan engine.');
        clearInterval(interval);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 3000);

    return () => clearInterval(interval);
  }, [scanId]);

  if (!scanId) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-6">
        <div className="p-6 bg-[var(--color-bg-elevated)] rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)]">
          <ShieldAlert size={48} className="opacity-20" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">No active scan session.</h2>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xs font-mono">
            Launch a new autonomous scan to initialize the live terminal engine.
          </p>
        </div>
        <Link
          to="/scan"
          className="px-6 py-2 bg-[var(--color-neon-green)] text-black rounded-lg font-bold hover:bg-white transition-all shadow-neon-green"
        >
          Deploy Engine
        </Link>
      </div>
    );
  }

  const running = scan?.status === 'Running' || scan?.status === 'Pending' || scan?.status === 'Stopping';
  const isStopping = scan?.status === 'Stopping';

  return (
    <div className="flex flex-col h-full space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <TerminalIcon className={running ? 'text-[var(--color-neon-green)] animate-pulse' : 'text-[var(--color-neon-green)]'} size={26} />
            Autonomous Audit Terminal
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-[var(--color-text-muted)] font-mono">
              Target: <span className="text-white">{scan?.target_url || '...'}</span>
            </p>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold 
              ${isStopping ? 'bg-[var(--color-neon-red)]/20 text-[var(--color-neon-red)] animate-pulse' : 
                running ? 'bg-[var(--color-neon-green)]/20 text-[var(--color-neon-green)] animate-pulse' : 
                'bg-[#0d150d] text-[var(--color-text-muted)]'}`}>
              {scan?.status?.toUpperCase() || 'INITIALISING'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {(scan?.status === 'Running' || scan?.status === 'Pending') && (
            <button
              onClick={handleStop}
              disabled={stopping}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all font-bold text-xs
                ${stopping 
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 cursor-not-allowed' 
                  : 'bg-transparent border-red-500/40 text-red-500 hover:bg-red-500 hover:text-black shadow-lg shadow-red-500/10'}`}
            >
              {stopping ? (
                <><div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" /> TERMINATING...</>
              ) : (
                <><ShieldAlert size={14} /> FORCE ANALYZE</>
              )}
            </button>
          )}

          {scan?.status === 'Completed' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Link
                to="/reports"
                className="flex items-center gap-2 px-5 py-2 bg-[var(--color-neon-cyan)]/10 border border-[var(--color-neon-cyan)]/40 text-[var(--color-neon-cyan)] rounded-xl hover:bg-[var(--color-neon-cyan)] hover:text-black transition-all font-bold text-sm shadow-neon-cyan/20"
              >
                Full Intelligence Report <Cpu size={16} />
              </Link>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-4 overflow-hidden min-h-[500px]">
        {/* Terminal window */}
        <div className="flex-[2] flex flex-col glass overflow-hidden relative h-full">
          {/* Window chrome */}
          <div className="h-9 bg-[var(--color-bg-panel)] border-b border-[var(--color-border)] flex items-center px-4 gap-2 shrink-0">
            <span className="w-3 h-3 rounded-full bg-[#ff3860]"></span>
            <span className="w-3 h-3 rounded-full bg-[#ffdd57]"></span>
            <span className="w-3 h-3 rounded-full bg-[var(--color-neon-green)]"></span>
            <span className="ml-4 text-[11px] text-[var(--color-text-muted)] font-mono">
              operator@reconx-ai:~/audit/{scanId} — {scan?.scan_type}
            </span>
          </div>

          {/* Log output */}
          <div className="flex-1 overflow-y-auto p-5 text-[12px] md:text-[13px] leading-relaxed font-mono space-y-0.5 terminal-scroll bg-black/40">
            {logs.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-full opacity-40 gap-3">
                <div className="w-6 h-6 border-2 border-[var(--color-neon-green)]/20 border-t-[var(--color-neon-green)] rounded-full animate-spin" />
                <span className="text-xs uppercase tracking-widest text-[var(--color-neon-green)] pulse">Awaiting Engine Handshake…</span>
              </div>
            )}

            {error && (
              <div className="text-red-400 p-4 border border-red-500/20 bg-red-500/5 rounded-xl flex items-center gap-3">
                <AlertTriangle size={18} />
                {error}
              </div>
            )}

            {logs.map((l, i) => (
              <div
                key={i}
                className={`
                  ${l.t === 'info'    ? 'text-blue-400' : ''}
                  ${l.t === 'success' ? 'text-[var(--color-neon-green)]' : ''}
                  ${l.t === 'warn'    ? 'text-yellow-400' : ''}
                  ${l.t === 'crit'    ? 'text-[var(--color-neon-red)] font-bold bg-red-500/5' : ''}
                  ${l.t === 'data'    ? 'text-gray-500' : ''}
                  ${l.t === 'cmd'     ? 'text-[var(--color-neon-cyan)] bg-cyan-500/5 px-2 rounded' : ''}
                  ${l.t === 'header'  ? 'text-[var(--color-neon-green)] font-bold border-b border-[var(--color-neon-green)]/10 mt-2 mb-1' : ''}
                `}
              >
                <span className="opacity-30 mr-3 text-[10px]">{l.ts}</span>
                <span className="mr-2 font-bold">
                  {l.t === 'info'    && '[INFO]'}
                  {l.t === 'success' && '[DONE]'}
                  {l.t === 'warn'    && '[WARN]'}
                  {l.t === 'crit'    && '[CRIT]'}
                  {l.t === 'cmd'     && '[$]  '}
                  {l.t === 'header'  && '[====]'}
                  {l.t === 'data'    && '      '}
                </span>
                {l.text}
              </div>
            ))}
            
            {running && (
              <div className="flex items-center gap-2 text-[var(--color-neon-green)] animate-pulse mt-2">
                <span className="animate-blink">█</span>
                <span className="text-[10px] uppercase font-bold tracking-tighter">Executing Tool Pipeline...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* AI Preview Sidebox */}
        <div className="flex-1 min-w-[320px] glass border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col bg-[var(--color-bg-panel)]/40 relative">
          <div className="h-9 bg-[var(--color-bg-panel)] border-b border-[var(--color-border)] flex items-center px-4 justify-between shrink-0">
            <span className="text-[10px] text-white font-black uppercase tracking-widest flex items-center gap-2">
              <Cpu size={14} className="text-[var(--color-neon-green)]" />
              AI Reasoning Engine
            </span>
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] animate-pulse">
              {scan?.status === 'Completed' ? 'FINALIZED' : 
               scan?.current_tool ? `ACTIVE: ${scan.current_tool.toUpperCase()}` : 'ANALYSING...'}
            </span>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-6">
            {!scan?.ai_insight && scan?.status !== 'Completed' ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-4">
                <div className="p-4 bg-[var(--color-bg-elevated)] rounded-full animate-bounce">
                  <ShieldAlert size={32} className="text-[var(--color-neon-green)]" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-white uppercase tracking-tighter">Initializing Neural Link...</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-mono">Aggregating subterranean telemetry patterns.</p>
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Expert Reasoning Bento */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-black/40 border border-[var(--color-border)] rounded-2xl flex flex-col items-center justify-center gap-2">
                    <div className="relative flex items-center justify-center w-16 h-16">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-[var(--color-bg-elevated)]" />
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" 
                          strokeDasharray={176} strokeDashoffset={176 - (176 * (scan?.score || 0)) / 100}
                          className={scan?.score >= 80 ? 'text-[var(--color-neon-green)]' : scan?.score >= 60 ? 'text-yellow-400' : 'text-[var(--color-neon-red)]'}
                          style={{ transition: 'stroke-dashoffset 1s ease-out' }} 
                        />
                      </svg>
                      <span className="absolute text-lg font-black text-white">{scan?.score || '??'}</span>
                    </div>
                    <span className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">Audit Score</span>
                  </div>

                  <div className="p-4 bg-black/40 border border-[var(--color-border)] rounded-2xl flex flex-col items-center justify-center gap-2">
                    <div className="text-2xl font-black text-[var(--color-neon-cyan)] animate-pulse">
                      {Math.floor((scan?.score || 50) * 0.9 + (Math.random() * 10))}%
                    </div>
                    <span className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">AI Confidence</span>
                  </div>
                </div>

                {/* Strategic Reasoning Module */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                    <h4 className="text-[10px] font-black text-[var(--color-neon-green)] uppercase tracking-widest flex items-center gap-2">
                      <Cpu size={12} /> Strategic Synthesis
                    </h4>
                    <span className="text-[9px] font-mono text-[var(--color-neon-cyan)]">v12.2_LIVE</span>
                  </div>
                  
                  <div className="p-4 bg-[var(--color-bg-elevated)]/30 border border-[var(--color-border)] rounded-xl relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 p-1 opacity-5 text-[var(--color-neon-green)]"><ShieldAlert size={80} /></div>
                    <div className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-mono whitespace-pre-wrap relative z-10">
                      {scan?.ai_insight ? (
                        scan.ai_insight.split('\n').filter(l => l.trim()).map((line, idx) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, x: -5 }} 
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="mb-3 last:mb-0 flex gap-2"
                          >
                            <span className="text-[var(--color-neon-green)] flex-shrink-0">›</span>
                            <span className={line.toLowerCase().includes('critical') || line.toLowerCase().includes('high') ? 'text-red-400 font-bold' : 'text-gray-300'}>
                              {line.replace(/^•\s*/, '')}
                            </span>
                          </motion.div>
                        ))
                      ) : scan?.status === 'Completed' ? (
                        <div className="text-[var(--color-neon-cyan)]">Finalizing high-fidelity audit report...</div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 animate-pulse text-[var(--color-neon-cyan)]">
                            <div className="w-1.5 h-1.5 bg-[var(--color-neon-cyan)] rounded-full mr-2" />
                            Synchronizing OSINT data...
                          </div>
                          <div className="h-1 w-full bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                             <div className="h-full bg-[var(--color-neon-cyan)] animate-[loading_2s_infinite]" style={{width: '30%'}}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Threat Profile Meta */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-3 bg-black/20 border border-[var(--color-border)] rounded-xl group hover:border-[var(--color-neon-green)]/30 transition-all cursor-default">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className={scan?.risk === 'Critical' ? 'text-red-500' : 'text-yellow-400'} />
                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-tighter">Threat Profile</span>
                      </div>
                      <span className={`text-[10px] font-black font-mono px-3 py-1 rounded 
                        ${scan?.risk === 'Low' ? 'bg-[var(--color-neon-green)]/20 text-[var(--color-neon-green)]' : 
                          scan?.risk === 'Medium' ? 'bg-yellow-400/20 text-yellow-500' : 'bg-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'}`}>
                        {scan?.risk?.toUpperCase() || 'UNKNOWN'}
                      </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-panel)]">
             <Link 
              to={scan?.status === 'Completed' ? `/reports?id=${scanId}` : '#'}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all
                ${scan?.status === 'Completed' 
                  ? 'bg-[var(--color-neon-green)] text-black hover:bg-white shadow-[0_0_20px_rgba(0,255,102,0.3)]' 
                  : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] cursor-not-allowed opacity-50'}`}
             >
               View Intelligence Log <FileText size={14} />
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
