import React, { useState } from 'react';
import { Copy, Check, Sliders, Zap, Crosshair, Award } from 'lucide-react';

interface ProConfigGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Preset {
  id: string;
  name: string;
  author: string;
  description: string;
  fov: number;
  fpsUncapped: boolean;
  settings: Record<string, any>;
}

const PRESETS: Preset[] = [
  {
    id: 'max-fps',
    name: 'Maximum FPS & Zero Lag',
    author: 'Competitive Pro',
    description: 'Stripped shadows, disabled particles, low lighting textures, zero bloom, uncapped framerate for 200+ FPS on school laptops.',
    fov: 95,
    fpsUncapped: true,
    settings: {
      shadows: false,
      particles: false,
      ambientShading: false,
      lighting: '0',
      fov: 95,
      fpsUncap: true,
      lowRes: true,
      bulletTrails: false,
      muzzleFlash: false,
      autoReload: true,
      aspectRatio: '4:3',
      crosshairType: '2',
      crosshairColor: '#22c55e',
    },
  },
  {
    id: 'bhop-slide',
    name: 'Slide-Hop & Bunnyhop Master',
    author: 'Movement God',
    description: 'High FOV (105), fast camera sensitivity, visible weapon bobbing disabled for clear jump vision, streamlined slide intervals.',
    fov: 105,
    fpsUncapped: true,
    settings: {
      fov: 105,
      fpsUncap: true,
      weaponBob: 0,
      weaponLean: 0,
      slideControl: 6,
      autoReload: true,
      crosshairType: '1',
      crosshairColor: '#06b6d4',
      speedRunTimer: true,
      scoreColor: '#f59e0b',
    },
  },
  {
    id: 'sniper-aim',
    name: 'Pixel-Perfect Sniper & Aim',
    author: 'Top Ranked Hunter',
    description: 'Small precision dot crosshair, steady scope view, lowered ADS sensitivity, crisp hit indicators.',
    fov: 90,
    fpsUncapped: true,
    settings: {
      fov: 90,
      fpsUncap: true,
      aimSensitivity: 0.8,
      crosshairType: '3',
      crosshairSize: 4,
      crosshairColor: '#f43f5e',
      hitColor: '#ef4444',
      dmgColor: '#f59e0b',
      critColor: '#e11d48',
    },
  },
];

export const ProConfigGenerator: React.FC<ProConfigGeneratorProps> = ({ isOpen, onClose }) => {
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const configJsonString = JSON.stringify(selectedPreset.settings, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(selectedPreset.settings));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase text-white font-mono tracking-wider">
                Krunker.io Pro Config Generator
              </h2>
              <p className="text-xs text-slate-400">
                Optimized competitive settings JSON to import directly into the in-game settings menu
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

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Preset Cards */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Pro Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPreset(p);
                    setCopied(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedPreset.id === p.id
                      ? 'border-amber-500 bg-amber-500/15 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>{p.name}</span>
                  </div>
                  <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">by {p.author}</div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* JSON Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Config Import String (JSON)
              </label>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  copied
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Import String'}</span>
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 max-h-48 overflow-y-auto font-mono text-xs text-amber-300/90 leading-relaxed selection:bg-amber-500/30">
              <pre>{configJsonString}</pre>
            </div>
          </div>

          {/* How to import instructions */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider">
              How to import into Krunker:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
              <li>Click the yellow <strong className="text-amber-400">Copy Import String</strong> button above.</li>
              <li>Inside the Krunker game screen, click the <strong className="text-white">Settings gear icon (⚙)</strong> on the left.</li>
              <li>Scroll to the bottom of the Settings window and click <strong className="text-white">Import</strong>.</li>
              <li>Press <kbd className="px-1 py-0.5 bg-slate-800 text-white rounded">Ctrl + V</kbd> to paste and click OK.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
