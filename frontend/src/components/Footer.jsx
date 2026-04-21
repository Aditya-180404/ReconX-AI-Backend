import { Link } from 'react-router-dom';
import { ShieldAlert, Globe, Mail, Terminal, Code2 } from 'lucide-react';
import { useState } from 'react';

export default function Footer() {
  const [hoveredLink, setHoveredLink] = useState(null);

  const links = {
    Product: ['Features', 'Pricing', 'Documentation', 'API Reference'],
    Resources: ['Security Blog', 'Vulnerability Database', 'Case Studies', 'Hackathon Kits'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Responsible Disclosure', 'Cookie Policy']
  };

  return (
    <footer className="w-full bg-[var(--color-bg-base)] border-t border-[var(--color-border)] pt-16 pb-8 relative overflow-hidden">
      {/* Background glow for footer */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-[var(--color-neon-cyan)]/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-6 relative z-10">
        
        {/* Brand Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-[var(--color-neon-cyan)]" size={32} />
            <span className="text-2xl font-black tracking-widest text-white">
              ReconX<span className="text-[var(--color-neon-cyan)]">.AI</span>
            </span>
          </div>
          <p className="text-[var(--color-text-muted)] text-sm max-w-sm leading-relaxed">
            The world's most advanced autonomous pentesting engine. Exposing vulnerabilities before the adversaries do, powered by cutting-edge LangGraph AI.
          </p>
          
          {/* Socials */}
          <div className="flex items-center gap-4 mt-2">
            {[Code2, Globe, Mail].map((Icon, idx) => (
              <a 
                key={idx} 
                href="#" 
                className="p-2.5 rounded-lg bg-[var(--color-bg-panel)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-neon-cyan)] hover:border-[var(--color-neon-cyan)]/50 transition-all hover:scale-110 hover:shadow-neon-cyan/20 cursor-pointer"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>

        {/* Links Columns */}
        {Object.entries(links).map(([title, items], colIdx) => (
          <div key={title} className="flex flex-col gap-4">
            <h4 className="text-white font-bold tracking-wider uppercase text-sm mb-2">{title}</h4>
            <ul className="flex flex-col gap-3">
              {items.map((item, idx) => (
                <li key={item}>
                  <Link 
                    to="#"
                    onMouseEnter={() => setHoveredLink(`${colIdx}-${idx}`)}
                    onMouseLeave={() => setHoveredLink(null)}
                    className="text-[var(--color-text-muted)] text-sm font-medium hover:text-[var(--color-neon-cyan)] transition-colors inline-flex items-center gap-2 group"
                  >
                    <span 
                      className={`text-[var(--color-neon-cyan)] opacity-0 -ml-4 transition-all duration-300 font-mono ${
                        hoveredLink === `${colIdx}-${idx}` ? 'opacity-100 ml-0' : ''
                      }`}
                    >
                      ▹
                    </span>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      <div className="mt-16 pt-8 border-t border-[var(--color-border)]/50 max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        
        {/* Live System Status - Interactive Pill */}
        <div className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-panel)] border border-[var(--color-border)] hover:border-[var(--color-neon-green)]/40 transition-colors cursor-help">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-neon-green)] opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-neon-green)]"></span>
          </span>
          <span className="text-xs font-mono text-[var(--color-text-muted)] group-hover:text-white transition-colors">
            All Systems Operational
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-mono">
          <Terminal size={14} className="text-[var(--color-neon-purple)]" />
          <span>© 2026 ReconX AI Inc. · Autonomous Security Intelligence</span>
        </div>
      </div>
    </footer>
  );
}
