import { Terminal, Shield, Zap, Search, Server, ShieldAlert, Cpu, ExternalLink, Globe, BookOpen, Lock } from 'lucide-react';

const TOOLS_DOCS = [
  {
    name: 'WHOIS Reconnaissance',
    icon: Search,
    color: 'text-blue-400',
    coreCmd: '$ whois target.com',
    link: 'https://www.whois.com/',
    description: 'Queries internet registry databases to map domain ownership, registrar information, and registration epochs. Crucial for identifying newly registered phishing domains.',
  },
  {
    name: 'Shodan Intelligence',
    icon: Globe,
    color: 'text-orange-500',
    coreCmd: '$ curl https://api.shodan.io/shodan/host/[IP]?key=...',
    link: 'https://www.shodan.io/',
    description: 'The search engine for Internet-connected devices. Maps public exposure, open ports, and service banners without making direct contact with the target.',
  },
  {
    name: 'VirusTotal Domain Reputation',
    icon: Shield,
    color: 'text-blue-600',
    coreCmd: '$ curl https://www.virustotal.com/api/v3/domains/[DOMAIN]',
    link: 'https://www.virustotal.com/',
    description: 'Aggregates data from over 70 antivirus scanners and URL/domain blacklisting services to determine the reputation and malicious history of a target.',
  },
  {
    name: 'HTTP Security Headers Analysis',
    icon: Shield,
    color: 'text-purple-400',
    coreCmd: '$ curl -I --max-time 10 https://target.com',
    link: 'https://securityheaders.com/',
    description: 'Analyzes web server responses for absent security headers (HSTS, CSP, X-Frame-Options) to identify vulnerabilities to clickjacking and MITM attacks.',
  },
  {
    name: 'Nmap Port Discovery',
    icon: Server,
    color: 'text-[var(--color-neon-cyan)]',
    coreCmd: '$ nmap -T4 -sV --open -oN - target.com',
    link: 'https://nmap.org/',
    description: 'Active port scanning and service version fingerprinting. Identifies open ports, running protocols, and validates host uptime using TCP Connect or SYN stealth methods.',
  },
  {
    name: 'Subfinder Enumeration',
    icon: Zap,
    color: 'text-[var(--color-neon-purple)]',
    coreCmd: '$ subfinder -d target.com -silent',
    link: 'https://github.com/projectdiscovery/subfinder',
    description: 'Passive subdomain discovery using passive online sources. Maps the extended attack surface without actively communicating with the target infrastructure.',
  },
  {
    name: 'Nikto Web Vulnerability Scanner',
    icon: ShieldAlert,
    color: 'text-yellow-400',
    coreCmd: '$ nikto -h target.com -nointeractive',
    link: 'https://cirt.net/Nikto2',
    description: 'Perform comprehensive tests against web servers for multiple items, including over 6700 potentially dangerous files/programs, and checks for outdated server versions.',
  },
  {
    name: 'Nuclei Template Engine',
    icon: Cpu,
    color: 'text-[var(--color-neon-green)]',
    coreCmd: '$ nuclei -u target.com -severity critical,high,medium -silent',
    link: 'https://nuclei.projectdiscovery.io/',
    description: 'Fast and customizable vulnerability scanner based on simple YAML DSL. We deploy over 8,000 community-curated CVE templates to find known exploits.',
  },
  {
    name: 'SQLMap Interface (SQLi)',
    icon: Terminal,
    color: 'text-red-500',
    coreCmd: '$ sqlmap -u target.com --batch --random-agent --level=1',
    link: 'https://sqlmap.org/',
    description: 'Automated SQL injection and database takeover tool. Probes URL parameters and forms for boolean-based, time-based, and error-based injection flaws.',
  },
  {
    name: 'XSS Analysis Engine',
    icon: Terminal,
    color: 'text-orange-400',
    coreCmd: '$ nuclei -u target.com -tags xss -silent',
    link: 'https://owasp.org/www-community/attacks/xss/',
    description: 'Cross-Site Scripting (XSS) payload delivery. Maps reflection endpoints and injects safe payloads to determine if malicious JS can be executed on the client.',
  },
  {
    name: 'OWASP ZAP DAST',
    icon: ShieldAlert,
    color: 'text-blue-500',
    coreCmd: '$ zap-cli quick-scan target.com',
    link: 'https://www.zaproxy.org/',
    description: 'Zed Attack Proxy baseline automated web application scanner. Checks for the OWASP Top 10 vulnerabilities via active crawling and fuzzing.',
  },
  {
    name: 'DoS/DDoS Vulnerability Check',
    icon: Zap,
    color: 'text-red-600',
    coreCmd: '$ nmap --script dos -p80,443 target.com',
    link: 'https://nmap.org/nsedoc/categories/dos.html',
    description: 'Safely probes the server using Nmap scripts (like Slowloris or HTTP-Slow-Body) to determine if it is susceptible to resource starvation and Denial of Service.',
  }
];

const EXTERNAL_LINKS = [
  { name: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/', desc: 'The gold standard for web application security awareness.' },
  { name: 'CVE Mitre Database', url: 'https://cve.mitre.org/', desc: 'Comprehensive list of publicly disclosed cybersecurity vulnerabilities.' },
  { name: 'Exploit Database', url: 'https://www.exploit-db.com/', desc: 'Archive of exploits and vulnerable software for security research.' },
  { name: 'Parrot Security OS', url: 'https://www.parrotsec.org/', desc: 'The base operating system used for ReconX AI deployments.' },
];

export default function DocumentationPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 px-4">
      {/* Hero Section */}
      <div className="relative glass p-10 rounded-3xl overflow-hidden border border-[var(--color-border)] shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150">
          <Globe size={180} className="text-[var(--color-neon-cyan)]" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[var(--color-neon-cyan)]/20 rounded-lg text-[var(--color-neon-cyan)]">
                <Shield size={32} />
             </div>
             <h1 className="text-4xl font-black text-white tracking-widest uppercase">Operator Manual</h1>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] max-w-2xl leading-relaxed font-mono">
             ReconX AI is an autonomous security intelligence platform. It orchestrates a suite of industry-standard penetration testing tools, 
             synthesizing raw data through a Groq-powered Llama 3.1 neural engine to deliver actionable remediation strategies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Tools column */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
              <Terminal className="text-[var(--color-neon-green)]" size={24} />
              <h2 className="text-xl font-bold text-white uppercase tracking-wider font-mono">Core Toolchain</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TOOLS_DOCS.map((tool, idx) => (
              <div key={idx} className="glass p-6 rounded-2xl flex flex-col justify-between border border-[var(--color-border)] hover:border-[var(--color-neon-green)]/30 transition-all bg-[var(--color-bg-panel)]/40 relative group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-[var(--color-bg-elevated)] ${tool.color}`}>
                      <tool.icon size={20} />
                    </div>
                    <a href={tool.link} target="_blank" rel="noreferrer" className="text-[var(--color-text-muted)] hover:text-white transition-colors">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-widest">{tool.name}</h3>
                  <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                    {tool.description}
                  </p>
                </div>
                
                <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                  <div className="bg-[#050508] border border-[var(--color-border)] rounded-lg p-2.5 overflow-x-auto terminal-scroll shadow-inner">
                    <code className="text-[10px] font-mono text-[var(--color-neon-green)] whitespace-nowrap">
                      {tool.coreCmd}
                    </code>
                  </div>
                </div>
              </div>
            ))}
           </div>
        </div>

        {/* Sidebar info column */}
        <div className="space-y-10">
           {/* Section 1: AI Engine */}
           <div className="glass p-6 rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-black to-[var(--color-neon-purple)]/5 space-y-4">
              <div className="flex items-center gap-3">
                 <Cpu className="text-[var(--color-neon-purple)]" size={20} />
                 <h3 className="text-xs font-black text-white uppercase tracking-widest">Neural reasoning</h3>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-mono">
                 Our system uses a dual-engine architecture:
                 <br /><br />
                 • <b>Llama 3.1 8B (Real-time):</b> Used for lightning-fast terminal analysis and live reasoning updates.
                 <br />
                 • <b>Llama 3.1 70B (Deep Reasoning):</b> Deployed for the final synthesis to identify complex vulnerability chains and strategic remediation.
              </p>
           </div>

           {/* Section 2: External Links */}
           <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2 text-[var(--color-text-muted)]">
                 <BookOpen size={16} />
                 <h3 className="text-[11px] font-bold uppercase tracking-widest">Intelligence Sources</h3>
              </div>
              <div className="space-y-4">
                {EXTERNAL_LINKS.map((link, i) => (
                   <a key={i} href={link.url} target="_blank" rel="noreferrer" className="block p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/20 hover:border-[var(--color-neon-cyan)]/30 transition-all group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-white font-mono">{link.name}</span>
                        <ExternalLink size={12} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-neon-cyan)] transition-colors" />
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)] leading-tight">{link.desc}</p>
                   </a>
                ))}
              </div>
           </div>

           {/* Section 3: Legal Section */}
           <div className="p-6 rounded-2xl border-2 border-[var(--color-neon-red)]/20 bg-[var(--color-neon-red)]/5 space-y-4">
              <div className="flex items-center gap-3">
                 <Lock className="text-[var(--color-neon-red)]" size={20} />
                 <h3 className="text-xs font-black text-white uppercase tracking-widest">Authorized Use</h3>
              </div>
              <p className="text-[10px] text-red-100/60 leading-relaxed italic">
                 Unauthorized use of these tools against networks without explicit written permission is illegal. 
                 ReconX AI is designed for ethical use and security compliance testing only.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
