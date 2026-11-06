import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GameViewport } from './components/GameViewport';
import { PracticeArena } from './components/PracticeArena';
import { CodeExportModal } from './components/CodeExportModal';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { ProxySettingsModal } from './components/ProxySettingsModal';
import { ProConfigGenerator } from './components/ProConfigGenerator';
import { ProxyConfig, ProxyMode } from './types';

const INITIAL_CONFIG: ProxyConfig = {
  mode: 'builtin',
  builtinEndpoint: '/krunker-live',
  customUrl: 'https://browserfps.com',
  mirrorUrl: 'https://browserfps.com',
  pointerLockEnabled: true,
  mouseSensitivity: 1.0,
  aspectRatio: 'fill',
  showCrosshair: true,
  crosshairColor: '#22c55e',
  crosshairSize: 6,
  audioFeedback: true,
  unblockAds: true,
  highFpsMode: true,
};

export default function App() {
  const [config, setConfig] = useState<ProxyConfig>(INITIAL_CONFIG);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProConfigOpen, setIsProConfigOpen] = useState(false);
  const [averagePing, setAveragePing] = useState<number | null>(null);

  // Background ping test for initial latency reading
  useEffect(() => {
    fetch('/api/ping?id=master')
      .then((res) => res.json())
      .then((data) => {
        const item = data.results?.[0];
        if (item && item.online) {
          setAveragePing(item.latencyMs);
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateConfig = (partial: Partial<ProxyConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleSelectMode = (mode: ProxyMode) => {
    handleUpdateConfig({ mode });
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Application Navigation */}
      <Header
        activeMode={config.mode}
        onSelectMode={handleSelectMode}
        onOpenCode={() => setIsCodeModalOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProConfig={() => setIsProConfigOpen(true)}
        onToggleFullscreen={handleToggleFullscreen}
        averagePing={averagePing}
      />

      {/* Main Viewport Area */}
      <main className="flex-1 w-full h-[calc(100vh-4rem)] relative overflow-hidden flex flex-col">
        {config.mode === 'practice' ? (
          <PracticeArena
            mouseSensitivity={config.mouseSensitivity}
            showCustomCrosshair={config.showCrosshair}
            crosshairColor={config.crosshairColor}
            crosshairSize={config.crosshairSize}
          />
        ) : (
          <GameViewport
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onSwitchToPractice={() => handleSelectMode('practice')}
            onSwitchToMirror={() => handleSelectMode('mirror')}
          />
        )}
      </main>

      {/* Standalone Code Modal (Node.js, HTML, Cloudflare, etc.) */}
      <CodeExportModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />

      {/* Server Ping Diagnostics Panel */}
      <DiagnosticsPanel
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        onUpdateAveragePing={(ping) => setAveragePing(ping)}
      />

      {/* Settings Modal */}
      <ProxySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onUpdateConfig={handleUpdateConfig}
      />

      {/* Pro Config Generator Modal */}
      <ProConfigGenerator
        isOpen={isProConfigOpen}
        onClose={() => setIsProConfigOpen(false)}
      />
    </div>
  );
}
