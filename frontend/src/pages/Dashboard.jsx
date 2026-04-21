import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight, Shield, AlertTriangle, Info, Terminal, Clock, Activity, Target
} from 'lucide-react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import { scanService } from '../services/api';

const kpiColor = (score) =>
  score >= 80 ? 'var(--color-neon-green)' : score >= 60 ? '#eab308' : '#ff3860';

const riskBadge = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };

/* ─── Reusable KPI Card ─────────── */
function KpiCard({ label, value, sub, trend, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass p-6 flex flex-col gap-2"
    >
      <span className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-widest">{label}</span>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-black text-white">{value}</span>
        {sub && <span className="text-sm text-[var(--color-text-muted)] mb-0.5">{sub}</span>}
      </div>
      {trend && (
        <span className="text-[10px] font-mono text-[var(--color-neon-green)] flex items-center gap-1">
          <ArrowUpRight size={12} /> {trend}
        </span>
      )}
      {children}
    </motion.div>
  );
}

export default function Dashboard() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scanService.getAll().then(res => {
      setScans(res.data);
    }).catch(err => {
      console.error('Dashboard fetch error:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  // Aggregates
  const completedScans = scans.filter(s => s.status === 'Completed');
  const avgScore = completedScans.length > 0
    ? Math.round(completedScans.reduce((a, b) => a + (b.score || 0), 0) / completedScans.length)
    : 0;
  
  const riskCounts = {
    Critical: scans.filter(s => s.risk === 'Critical').length,
    High:     scans.filter(s => s.risk === 'High').length,
    Medium:   scans.filter(s => s.risk === 'Medium').length,
    Low:      scans.filter(s => s.risk === 'Low').length,
  };

  const pieData = Object.entries(riskCounts).map(([name, value]) => ({
    name,
    value,
    color: name === 'Critical' ? '#ff3860' : name === 'High' ? '#f97316' : name === 'Medium' ? '#eab308' : '#00ff41'
  })).filter(d => d.value > 0);

  // Calculate trend using all scans
  const trendData = scans.length > 0
    ? [...scans].reverse().map((s, i) => ({ d: `Scan ${i+1}`, score: s.score || 0 }))
    : [{ d: 'Start', score: 0 }];

  const activeScan = scans.find(s => s.status === 'Running' || s.status === 'Pending');

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[var(--color-neon-green)]/20 border-t-[var(--color-neon-green)] rounded-full animate-spin" />
        <span className="text-sm font-mono text-[var(--color-text-muted)] uppercase tracking-widest animate-pulse">Syncing Engine Intelligence…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Operator Dashboard</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Real-time overview of your infrastructure's attack surface.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          {activeScan ? (
            <Link
              to={`/terminal?scanId=${activeScan.id}`}
              className="px-4 py-2 text-xs md:text-sm font-mono font-bold bg-[var(--color-neon-green)]/10 border border-[var(--color-neon-green)]/40 text-[var(--color-neon-green)] rounded-lg hover:bg-[var(--color-neon-green)] hover:text-black transition-all shadow-neon-green/20 flex items-center gap-2 animate-pulse"
            >
              Terminal Portal <Terminal size={15} />
            </Link>
          ) : (
            <Link
              to="/scan"
              className="px-4 py-2 text-xs md:text-sm font-mono font-bold bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg hover:border-[var(--color-neon-green)] hover:text-white transition-all flex items-center gap-2"
            >
              Launch Mission <Activity size={15} />
            </Link>
          )}
        </div>
      </div>

      {scans.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-12 flex flex-col items-center text-center gap-6"
        >
          <div className="p-5 bg-[var(--color-bg-elevated)] rounded-full text-[var(--color-neon-green)] shadow-neon-green/10 border border-[var(--color-neon-green)]/20">
            <Activity size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">No active intelligence detected.</h2>
            <p className="text-[var(--color-text-muted)] max-w-sm mx-auto text-sm leading-relaxed">Your attack surface is currently unmapped. Deploy the autonomous engine to begin real-time recon and vulnerability analysis.</p>
          </div>
          <Link to="/terminal" className="px-8 py-3 bg-[var(--color-neon-green)] text-black rounded-xl font-bold hover:bg-white transition-all shadow-neon-green">
            Initialise First Scan
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Row 1 — KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <KpiCard label="Global Security Score" value={avgScore} sub="/100" delay={0}>
              <div className="w-16 h-16 mt-2 self-end">
                <CircularProgressbar
                  value={avgScore}
                  styles={buildStyles({
                    pathColor: kpiColor(avgScore),
                    trailColor: 'rgba(255,255,255,0.05)',
                    strokeLinecap: 'butt',
                  })}
                />
              </div>
            </KpiCard>

            <KpiCard label="Findings" value={pieData.reduce((a,c) => a+c.value, 0)} delay={0.05}>
              <div className="flex gap-2 mt-2 flex-wrap">
                {pieData.map((p) => (
                  <span key={p.name} className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold badge-${p.name.toLowerCase()}`}>
                    {p.value} {p.name}
                  </span>
                ))}
              </div>
            </KpiCard>

            <KpiCard label="Total Targets" value={new Set(scans.map(s => s.target_url)).size} delay={0.1} />

            {/* Active Scan Progress */}
            {activeScan ? (
              <Link 
                to={`/terminal?scanId=${activeScan.id}`}
                className="glass p-6 flex flex-col gap-3 scan-beam hover:border-[var(--color-neon-green)]/40 transition-all group"
              >
                <div className="flex justify-between items-center text-[var(--color-text-muted)] group-hover:text-[var(--color-neon-green)] transition-colors">
                  <span className="text-[10px] font-mono uppercase tracking-widest">Active Scan</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-neon-green)] opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-neon-green)]"></span>
                  </span>
                </div>
                <p className="text-sm font-mono text-white font-semibold truncate group-hover:text-[var(--color-neon-cyan)] transition-colors text-glow-green">
                  {activeScan.target_url}
                </p>
                <div className="w-full bg-[#0d230d] h-1.5 rounded overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--color-neon-green)] shadow-neon-green"
                    animate={{ width: ['0%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                  />
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase mt-1">
                  Connecting to engine...
                </p>
              </Link>
            ) : (
              <div className="glass p-6 flex flex-col items-center justify-center text-center gap-2 opacity-60 grayscale">
                <Target size={20} className="text-[var(--color-text-muted)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">No Active Scans</span>
              </div>
            )}
          </div>

          {/* Row 2 — Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
            <div className="glass p-6 col-span-2">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Integrity Trend</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--color-neon-green)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--color-neon-green)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="d" stroke="#0d230d" tick={{ fill: '#555', fontSize: 10 }} />
                    <YAxis stroke="#0d230d" tick={{ fill: '#555', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: '#050805', border: '1px solid #0d230d', borderRadius: 8 }}
                      itemStyle={{ color: 'var(--color-neon-green)' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="var(--color-neon-green)" strokeWidth={2} fill="url(#grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass p-6 flex flex-col">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Risk Distribution</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} stroke="none" dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Legend iconType="circle" formatter={(v) => <span className="text-[10px] text-gray-500 font-mono">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 3 — Recent Activity */}
          <div className="glass">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#0d230d]">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Intelligence Stream</h3>
              <Link to="/reports" className="text-xs text-[var(--color-neon-green)] hover:underline font-mono">View All Logs →</Link>
            </div>
            <div>
              {scans.slice(0, 5).map((s, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-3 border-b border-[#0d230d]/50 hover:bg-[#0d150d]/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border border-[#0d230d] bg-[var(--color-bg-elevated)]`} style={{ color: kpiColor(s.score) }}>
                      {s.score || '—'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white font-mono">{s.target_url}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 mt-1 font-mono uppercase tracking-wider">
                        <Clock size={10} /> {new Date(s.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] px-2.5 py-1 rounded font-mono font-bold ${riskBadge[s.risk]}`}>{s.risk}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${s.status === 'Running' ? 'text-[var(--color-neon-green)] animate-pulse' : 'text-[var(--color-text-muted)]'}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
