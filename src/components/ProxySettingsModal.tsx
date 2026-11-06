import React from 'react';
import { Sliders, Check, Globe, Shield, MousePointer, Volume2, Sparkles } from 'lucide-react';
import { ProxyConfig, ProxyMode } from '../types';

interface ProxySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProxyConfig;
  onUpdateConfig: (partial: Partial<ProxyConfig>) => void;
}

const CROSSHAIR_COLORS = [
  { name: 'Emerald', hex: '#22c55e' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'White', hex: '#ffffff' },
];

export const ProxySettingsModal: React.FC<ProxySettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase text-white font-mono tracking-wider">
                Proxy & Client Settings
              </h2>
              <p className="text-xs text-slate-400">
                Configure network routes, mouse sensitivity, and crosshair overlays
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-300">
          {/* Active Proxy Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Proxy Connection Engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateConfig({ mode: 'builtin' })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  config.mode === 'builtin'
                    ? 'border-amber-500 bg-amber-500/15 text-white font-bold'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-white">Built-in Reverse Proxy</div>
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                  Server-side HTTP + WebSocket tunnel
                </div>
              </button>

              <button
                type="button"
                onClick={() => onUpdateConfig({ mode: 'mirror' })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  config.mode === 'mirror'
                    ? 'border-amber-500 bg-amber-500/15 text-white font-bold'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-white">Unblocked Mirror</div>
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                  BrowserFPS / Alternative node
                </div>
              </button>
            </div>
          </div>

          {/* Custom URL Input if Custom or Mirror */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Target / Mirror URL
            </label>
            <input
              type="text"
              value={config.customUrl}
              onChange={(e) => onUpdateConfig({ customUrl: e.target.value })}
              placeholder="https://example-proxy.com/service/krunker"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-slate-500">
              You can insert an Ultraviolet instance URL or custom proxy link here.
            </p>
          </div>

          {/* Mouse Sensitivity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MousePointer className="w-3.5 h-3.5" />
                <span>Mouse Sensitivity Multiplier</span>
              </label>
              <span className="font-mono text-amber-400 font-bold">{config.mouseSensitivity.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={config.mouseSensitivity}
              onChange={(e) => onUpdateConfig({ mouseSensitivity: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Crosshair Overlay Customizer */}
          <div className="space-y-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Custom Overlay Crosshair
              </label>
              <input
                type="checkbox"
                checked={config.showCrosshair}
                onChange={(e) => onUpdateConfig({ showCrosshair: e.target.checked })}
                className="accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </div>

            {config.showCrosshair && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Crosshair Color</span>
                  <div className="flex items-center gap-1.5">
                    {CROSSHAIR_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => onUpdateConfig({ crosshairColor: c.hex })}
                        className={`w-5 h-5 rounded-full transition-transform cursor-pointer border ${
                          config.crosshairColor === c.hex
                            ? 'scale-125 border-white shadow-md'
                            : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Size ({config.crosshairSize}px)</span>
                  <input
                    type="range"
                    min="3"
                    max="14"
                    value={config.crosshairSize}
                    onChange={(e) => onUpdateConfig({ crosshairSize: parseInt(e.target.value, 10) })}
                    className="w-36 accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-2.5">
            <label className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
              <div>
                <div className="text-xs font-bold text-white">High FPS WebGL Optimizer</div>
                <div className="text-[10px] text-slate-400">
                  Requests high-performance GPU context and desynchronized low-latency canvas
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.highFpsMode}
                onChange={(e) => onUpdateConfig({ highFpsMode: e.target.checked })}
                className="accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
              <div>
                <div className="text-xs font-bold text-white">Procedural Audio Feedback</div>
                <div className="text-[10px] text-slate-400">
                  Plays Web Audio hitmarker dings and jump effects
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.audioFeedback}
                onChange={(e) => onUpdateConfig({ audioFeedback: e.target.checked })}
                className="accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors shadow-lg shadow-amber-500/20"
          >
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
