import React from 'react';
import { Shield, Terminal, Activity, Sliders, Maximize2, Radio, Globe, Gamepad2 } from 'lucide-react';
import { ProxyMode } from '../types';

interface HeaderProps {
  activeMode: ProxyMode;
  onSelectMode: (mode: ProxyMode) => void;
  onOpenCode: () => void;
  onOpenDiagnostics: () => void;
  onOpenSettings: () => void;
  onOpenProConfig: () => void;
  onToggleFullscreen: () => void;
  averagePing: number | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onSelectMode,
  onOpenCode,
  onOpenDiagnostics,
  onOpenSettings,
  onOpenProConfig,
  onToggleFullscreen,
  averagePing,
}) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none z-30">
      {/* Brand logo & tagline */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
          <Gamepad2 className="w-6 h-6 text-slate-950 font-black" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black tracking-wider uppercase text-white font-mono">
              Krunker<span className="text-amber-400">Proxy</span>Hub
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              v2.4 Online
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            High-speed HTTP & WebSocket proxy for Krunker.io
          </p>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <nav className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => onSelectMode('builtin')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeMode === 'builtin'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Direct proxy through our Express backend with WebSocket bridging"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Live Proxy</span>
        </button>

        <button
          onClick={() => onSelectMode('mirror')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeMode === 'mirror'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Unblocked mirror gateways and backup FPS nodes"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Mirrors</span>
        </button>

        <button
          onClick={() => onSelectMode('practice')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeMode === 'practice'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Play 3D slide-hopping & target practice offline"
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>3D Arena</span>
        </button>

        <button
          onClick={() => onSelectMode('custom')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeMode === 'custom'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Specify a custom Ultraviolet or corporate proxy endpoint"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Custom URL</span>
        </button>
      </nav>

      {/* Action buttons & Ping */}
      <div className="flex items-center gap-2">
        {/* Ping status */}
        <button
          onClick={onOpenDiagnostics}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
          title="Regional server ping & network diagnostics"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span>{averagePing !== null ? `${averagePing}ms` : 'Ping'}</span>
        </button>

        {/* Source Code Modal */}
        <button
          onClick={onOpenCode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors border border-slate-700 cursor-pointer"
          title="View copyable Node.js, HTML, and Cloudflare proxy code"
        >
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Get Code</span>
        </button>

        {/* Pro Settings Config */}
        <button
          onClick={onOpenProConfig}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors border border-slate-700 cursor-pointer"
          title="Generate optimized Krunker settings (120+ FPS, FOV, crosshair)"
        >
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span>Pro Config</span>
        </button>

        {/* Direct Full Site Window */}
        <a
          href="/krunker-live"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
          title="Open Krunker directly in full browser window (100% server mirrored)"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Full Site</span>
        </a>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
          title="Configure proxy routing, crosshair, sensitivity"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
          title="Toggle Fullscreen Mode"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
