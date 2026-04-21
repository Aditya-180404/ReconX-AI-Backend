import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import {
  ShieldAlert, Zap, Lock, Terminal, ArrowRight,
  Globe, Cpu, Eye, CheckCircle,
} from 'lucide-react';
import Footer from '../components/Footer';

const features = [
  {
    icon: Zap,
    color: 'text-[var(--color-neon-cyan)]',
    border: 'hover:border-[var(--color-neon-cyan)]/50',
    title: 'Autonomous Recon',
    desc: 'Maps domains, subdomains, open ports, and leaky endpoints automatically — no manual scripting required.'
  },
  {
    icon: Terminal,
    color: 'text-[var(--color-neon-green)]',
    border: 'hover:border-[var(--color-neon-green)]/50',
    title: 'Chain Exploitation Simulation',
    desc: "ReconX doesn't stop at finding headers. It chains vulnerabilities with LLM reasoning to validate real impact."
  },
  {
    icon: Lock,
    color: 'text-[var(--color-neon-purple)]',
    border: 'hover:border-[var(--color-neon-purple)]/50',
    title: 'Instant Fix Code',
    desc: 'Get mitigation code snippets instantly — Nginx configs, React CSP headers, SQL prepared statements.'
  },
  {
    icon: Cpu,
    color: 'text-[var(--color-neon-cyan)]',
    border: 'hover:border-[var(--color-neon-cyan)]/50',
    title: 'AI Copilot Intelligence',
    desc: 'The AI Copilot explains every finding in plain English, maps OWASP Top 10, and prioritizes your remediation queue.'
  },
  {
    icon: Globe,
    color: 'text-[var(--color-neon-green)]',
    border: 'hover:border-[var(--color-neon-green)]/50',
    title: 'Dark Web Leak Monitor',
    desc: 'Continuously monitors breach databases for leaked credentials and data belonging to your organization.'
  },
  {
    icon: Eye,
    color: 'text-[var(--color-neon-purple)]',
    border: 'hover:border-[var(--color-neon-purple)]/50',
    title: 'Stealth Scan Mode',
    desc: 'Evasion-aware scanning with rate-limiting and randomised payloads to avoid WAF detection during red-team exercises.'
  },
];

const stats = [
  { value: '10,000+', label: 'Targets Secured' },
  { value: '2.4M',    label: 'Vulnerabilities Found' },
  { value: '99.7%',   label: 'Accuracy Rate' },
  { value: '<90s',    label: 'First Finding' },
];

/* ─── Typewriter component ─── */
function Typewriter({ text, className, delay = 0 }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) return;
    const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), 45);
    return () => clearTimeout(t);
  }, [started, displayed, text]);

  return (
    <span className={className}>
      {displayed}
      {displayed.length < text.length && (
        <span className="animate-blink text-[var(--color-neon-green)]">|</span>
      )}
    </span>
  );
}

/* ─── Counting number component ─── */
function CountUp({ target, suffix = '', duration = 2000 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    // Handle non-numeric targets like '10,000+', '2.4M', '<90s'
    const isNumeric = !isNaN(parseFloat(target));
    if (!isNumeric) { setCount(target); return; }
    const end = parseFloat(target);
    const steps = 60;
    const step = end / steps;
    let current = 0;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      current = Math.min(current + step, end);
      setCount(Number.isInteger(end) ? Math.round(current) : current.toFixed(1));
      if (i >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, [inView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col overflow-x-hidden">

      {/* ── Navbar ────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-base)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-[var(--color-neon-cyan)]" size={28} />
            <span className="text-xl font-black tracking-widest">
              ReconX<span className="text-[var(--color-neon-cyan)]">.AI</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--color-text-muted)]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#stats"    className="hover:text-white transition-colors">Stats</a>
            <a href="#pricing"  className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 text-sm font-bold bg-[var(--color-neon-cyan)] text-black rounded-lg hover:bg-white transition-all shadow-neon-cyan"
            >
              Start Free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-6 pt-28 pb-24 overflow-hidden">
        {/* Radial glow blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-[var(--color-neon-cyan)]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[var(--color-neon-purple)]/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-full text-xs font-mono text-[var(--color-neon-cyan)] shadow-neon-cyan/30"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-neon-green)] opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-neon-green)]"></span>
          </span>
          Autonomous AI Pentesting Engine · v2.0
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.05] max-w-4xl mb-6"
        >
          <Typewriter text="Hack Yourself " className="text-white" delay={400} />
          <Typewriter
            text="Before They Do"
            className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-green)] to-[#00e5ff] glow-cyan"
            delay={1050}
          />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg md:text-xl text-[var(--color-text-muted)] max-w-2xl mb-12 leading-relaxed"
        >
          ReconX AI mimics elite red-team tactics — automatically recons, scans, exploits, and generates board-ready security reports in minutes, not months.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            to="/register"
            className="group px-8 py-4 bg-[var(--color-neon-cyan)] text-black rounded-xl font-bold text-base hover:bg-white transition-all shadow-neon-cyan flex items-center gap-3"
          >
            Deploy ReconX AI
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/dashboard"
            className="px-8 py-4 bg-[var(--color-bg-panel)] border border-[var(--color-border)] text-white rounded-xl font-bold text-base hover:border-[var(--color-neon-cyan)]/50 transition-all flex items-center gap-3"
          >
            <Terminal size={18} /> View Live Demo
          </Link>
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────── */}
      <section id="stats" className="border-y border-[var(--color-border)] bg-[var(--color-bg-panel)]/60 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 px-6 text-center">
          {stats.map(({ value, label }) => {
            // Parse numeric part + suffix
            const cleaned = value.replace(/[^0-9.]/g, '');
            const suffix = value.replace(/[0-9.]/g, '');
            const isNumeric = cleaned !== '';
            return (
              <div key={label}>
                <div className="text-3xl font-black text-[var(--color-neon-green)] mb-1 glow-green">
                  {isNumeric
                    ? <CountUp target={parseFloat(cleaned)} suffix={suffix} duration={2000} />
                    : value
                  }
                </div>
                <div className="text-sm text-[var(--color-text-muted)] font-medium">{label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Features ──────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4 tracking-tight">
            Everything a red team does.&nbsp;
            <span className="text-[var(--color-neon-cyan)] glow-cyan">Automated.</span>
          </h2>
          <p className="text-[var(--color-text-muted)] text-lg max-w-xl mx-auto">
            A complete offensive security workflow — from initial recon to executive report — orchestrated by AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, color, border, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className={`glass p-8 flex flex-col gap-4 transition-all duration-300 ${border} cursor-default hover:bg-[var(--color-bg-elevated)]/60`}
            >
              <div className={`${color} p-3 bg-[var(--color-bg-elevated)] w-fit rounded-xl`}>
                <Icon size={26} />
              </div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────── */}
      <section className="border-t border-[var(--color-border)] py-20 px-6 text-center bg-gradient-to-b from-[var(--color-bg-base)] to-[var(--color-bg-panel)]">
        <h2 className="text-4xl font-black mb-6 tracking-tight">
          Your attack surface is live right now.
        </h2>
        <p className="text-[var(--color-text-muted)] mb-10 text-lg max-w-lg mx-auto">
          Don't wait for a breach incident report. Start your first autonomous scan in under 60 seconds.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-3 px-10 py-4 bg-[var(--color-neon-green)] text-black rounded-xl font-bold text-lg hover:bg-white transition-all shadow-neon-green"
        >
          <CheckCircle size={22} />  Secure My Infrastructure
        </Link>
      </section>

      {/* ── Footer ────────────────────────────────── */}
      <Footer />
    </div>
  );
}
