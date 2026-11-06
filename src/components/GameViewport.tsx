import React, { useRef, useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  RotateCcw,
  Maximize2,
  Tv,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ProxyConfig } from '../types';

interface GameViewportProps {
  config: ProxyConfig;
  onUpdateConfig: (partial: Partial<ProxyConfig>) => void;
  onSwitchToPractice: () => void;
  onSwitchToMirror: () => void;
}

export const GameViewport: React.FC<GameViewportProps> = ({
  config,
  onUpdateConfig,
  onSwitchToPractice,
  onSwitchToMirror,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showKeybinds, setShowKeybinds] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showNetworkTip, setShowNetworkTip] = useState(true);

  // Compute active target URL based on config mode
  const getTargetUrl = () => {
    switch (config.mode) {
      case 'builtin':
        return config.builtinEndpoint || '/krunker-live';
      case 'mirror':
        return config.mirrorUrl || 'https://browserfps.com';
      case 'custom':
        return config.customUrl || '/krunker-live';
      default:
        return '/krunker-live';
    }
  };

  const currentUrl = getTargetUrl();

  // Pointer lock handling
  const requestLock = () => {
    try {
      if (iframeRef.current) {
        iframeRef.current.focus();
        iframeRef.current.contentWindow?.focus();
        // Request lock on container or iframe
        containerRef.current?.requestPointerLock?.();
      }
    } catch (e) {
      console.warn('Pointer lock request error:', e);
    }
  };

  useEffect(() => {
    const handleLockChange = () => {
      const locked =
        document.pointerLockElement === containerRef.current ||
        document.pointerLockElement === iframeRef.current;
      setIsLocked(locked);
    };

    document.addEventListener('pointerlockchange', handleLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handleLockChange);
    };
  }, []);

  const handleReload = () => {
    setHasLoaded(false);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 z-30 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/70 shadow-2xl max-w-[95%]">
        {/* Pointer Lock Aim Button */}
        <button
          onClick={requestLock}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            isLocked
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/25 animate-pulse'
          }`}
          title="Click to lock mouse pointer into game for FPS mouse aim"
        >
          {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          <span>{isLocked ? 'Mouse Locked (Aiming)' : 'Lock Mouse to Aim'}</span>
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1 hidden sm:block" />

        {/* Aspect Ratio Selector */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-950/70 p-0.5 rounded-full border border-slate-800 text-[11px] font-bold">
          <button
            onClick={() => onUpdateConfig({ aspectRatio: '16:9' })}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
              config.aspectRatio === '16:9' ? 'bg-slate-700 text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Standard 16:9 Widescreen"
          >
            16:9
          </button>
          <button
            onClick={() => onUpdateConfig({ aspectRatio: '4:3' })}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
              config.aspectRatio === '4:3' ? 'bg-slate-700 text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title="4:3 Stretched Pro Aspect Ratio (Bigger targets)"
          >
            4:3 Pro
          </button>
          <button
            onClick={() => onUpdateConfig({ aspectRatio: 'fill' })}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
              config.aspectRatio === 'fill' ? 'bg-slate-700 text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Fill 100% of browser window"
          >
            Fill
          </button>
        </div>

        {/* Crosshair toggle */}
        <button
          onClick={() => onUpdateConfig({ showCrosshair: !config.showCrosshair })}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer hidden md:flex items-center gap-1 ${
            config.showCrosshair
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
          title="Toggle centered overlay crosshair"
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.crosshairColor || '#22c55e' }}
          />
          <span>Crosshair</span>
        </button>

        {/* Reload button */}
        <button
          onClick={handleReload}
          className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
          title="Reload game proxy"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Keybinds help toggle */}
        <button
          onClick={() => setShowKeybinds(!showKeybinds)}
          className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
          title="Show keybinds and shortcuts"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Open in new tab */}
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
          title="Open directly in unblocked window"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Network Firewall / Tip Banner */}
      {showNetworkTip && (
        <div className="absolute bottom-3 left-4 right-4 z-20 max-w-2xl mx-auto bg-slate-900/90 border border-slate-700 backdrop-blur-md rounded-xl p-3 shadow-xl flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Connected via <strong className="text-white font-mono">{config.mode.toUpperCase()}</strong> proxy with WebSocket relay. If your school blocks upstream sockets:
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={onSwitchToMirror}
              className="text-amber-400 hover:underline font-bold"
            >
              Try Mirror
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={onSwitchToPractice}
              className="text-sky-400 hover:underline font-bold"
            >
              Play 3D Arena
            </button>
            <button
              onClick={() => setShowNetworkTip(false)}
              className="text-slate-500 hover:text-white ml-2 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Keybinds Drawer */}
      {showKeybinds && (
        <div className="absolute top-14 z-30 bg-slate-900/95 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-md text-xs text-slate-300 max-w-sm w-full space-y-2">
          <div className="flex items-center justify-between font-bold text-white border-b border-slate-800 pb-1.5">
            <span>Krunker.io Controls</span>
            <button onClick={() => setShowKeybinds(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg">
              <span className="text-slate-400">Move</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded">WASD</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg">
              <span className="text-slate-400">Aim / Shoot</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded">Mouse L/R</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg">
              <span className="text-slate-400">Jump / Bunnyhop</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded">Space</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg">
              <span className="text-slate-400">Slide-kick</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded">Shift</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg">
              <span className="text-slate-400">Reload</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded">R</kbd>
            </div>
            <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg">
              <span className="text-slate-400">Swap Weapon</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded">Q</kbd>
            </div>
          </div>
        </div>
      )}

      {/* Crosshair Overlay */}
      {config.showCrosshair && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center justify-center">
          <div
            style={{
              width: `${config.crosshairSize || 6}px`,
              height: `${config.crosshairSize || 6}px`,
              backgroundColor: config.crosshairColor || '#22c55e',
              borderRadius: '50%',
              boxShadow: `0 0 8px ${config.crosshairColor || '#22c55e'}`,
            }}
          />
        </div>
      )}

      {/* Game Iframe Container with Aspect Ratio Constraint */}
      <div
        className={`relative transition-all duration-300 flex items-center justify-center ${
          config.aspectRatio === '16:9'
            ? 'w-full h-full max-w-[calc(100vh*16/9)] max-h-[calc(100vw*9/16)] shadow-2xl'
            : config.aspectRatio === '4:3'
            ? 'w-full h-full max-w-[calc(100vh*4/3)] max-h-[calc(100vw*3/4)] shadow-2xl border-x-4 border-slate-900'
            : 'w-full h-full'
        }`}
      >
        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={currentUrl}
          title="Krunker Game Frame"
          onLoad={() => setHasLoaded(true)}
          allow="autoplay; fullscreen; pointer-lock; camera; microphone"
          sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
          className="w-full h-full border-none bg-slate-950 block"
        />

        {/* Loading placeholder */}
        {!hasLoaded && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-4 z-10">
            <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Tunnelling through Proxy Gateway...
              </p>
              <p className="text-xs text-slate-400">
                Establishing HTTP rewrite and WebSocket relay to Krunker nodes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
