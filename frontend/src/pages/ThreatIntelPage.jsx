import { Globe, AlertOctagon, TrendingUp, Cpu, Network } from 'lucide-react';

export default function ThreatIntelPage() {
  return (
    <div className="threat-intel-page flex flex-col gap-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Globe className="text-blue-500" /> Global Threat Intel
          </h1>
          <p className="text-muted">Live feed of global cyber threats and zero-day vulnerabilities.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        {/* Live Attack Map Placeholder */}
        <div className="col-span-2 glass-panel p-6 relative overflow-hidden flex flex-col items-center justify-center border border-blue-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black z-0"></div>
          
          <Network size={100} className="text-blue-500/30 animate-pulse z-10" />
          <h3 className="text-xl font-bold text-blue-400 z-10 mt-4 tracking-widest uppercase">Live Trajectory Map</h3>
          <p className="text-xs text-muted mono z-10 mt-2">Connecting to C2 Intelligence Feeds...</p>

          <div className="absolute bottom-4 left-4 z-10 p-3 bg-black/60 border border-white/10 rounded mono text-xs">
            <p className="text-red-400">[LIVE] DDoS attack targeting US-East (Finance)</p>
            <p className="text-orange-400">[LIVE] Log4Shell exploit attempt mitigated in EU</p>
          </div>
        </div>

        {/* Latest CVEs */}
        <div className="glass-panel p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar border border-white/5">
          <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
            <AlertOctagon size={16} /> Latest CVEs
          </h3>

          <div className="bg-red-500/10 p-4 rounded border border-red-500/30">
            <div className="flex justify-between items-start mb-1">
              <span className="font-bold text-sm text-red-500">CVE-2026-1049</span>
              <span className="tag tag-critical p-0.5 px-2 text-[10px]">CVSS 9.8</span>
            </div>
            <p className="text-xs text-muted">Remote Code Execution in widely used OpenSSL branch.</p>
          </div>

          <div className="bg-orange-500/10 p-4 rounded border border-orange-500/30">
            <div className="flex justify-between items-start mb-1">
              <span className="font-bold text-sm text-orange-500">CVE-2026-0921</span>
              <span className="tag tag-high p-0.5 px-2 text-[10px]">CVSS 8.4</span>
            </div>
            <p className="text-xs text-muted">Authentication bypass in major cloud provider hypervisor.</p>
          </div>

          <div className="bg-white/5 p-4 rounded border border-white/10 mt-2">
            <h4 className="font-bold text-xs text-blue-400 mb-2 flex items-center gap-2"><TrendingUp size={12}/> Trending Exploit Kits</h4>
            <div className="text-xs text-muted mono flex flex-col gap-1">
              <p>1. Cobalt Strike (Modified)</p>
              <p>2. Follina Docs</p>
              <p>3. Sliver C2</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
