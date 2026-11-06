import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle2, XCircle, Clock, Globe2, Wifi } from 'lucide-react';
import { ServerPingResult } from '../types';

interface DiagnosticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateAveragePing?: (ping: number | null) => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  isOpen,
  onClose,
  onUpdateAveragePing,
}) => {
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<ServerPingResult[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/ping');
      if (resp.ok) {
        const data = await resp.json();
        setServers(data.results || []);
        setLastCheckTime(new Date().toLocaleTimeString());

        // Compute average ping among online nodes
        const onlineServers = (data.results || []).filter((s: ServerPingResult) => s.online);
        if (onlineServers.length > 0) {
          const avg = Math.round(
            onlineServers.reduce((acc: number, s: ServerPingResult) => acc + s.latencyMs, 0) /
              onlineServers.length
          );
          onUpdateAveragePing?.(avg);
        }
      }
    } catch (e) {
      console.error('Diagnostics check failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && servers.length === 0) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase text-white font-mono tracking-wider">
                Network & Node Diagnostics
              </h2>
              <p className="text-xs text-slate-400">
                Live HTTP & WebSocket latency to official Krunker.io regional nodes
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
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Last checked: {lastCheckTime || 'Never'}</span>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Testing Nodes...' : 'Retest All Nodes'}</span>
            </button>
          </div>

          {/* Servers Grid */}
          <div className="space-y-2">
            {servers.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Click "Retest All Nodes" to ping regional servers.
              </div>
            )}

            {servers.map((s) => (
              <div
                key={s.id}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      s.online ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{s.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 font-normal">
                        ({s.region})
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                      {s.host}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div
                      className={`text-sm font-black font-mono ${
                        s.latencyMs < 80
                          ? 'text-emerald-400'
                          : s.latencyMs < 180
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {s.online ? `${s.latencyMs}ms` : 'FAIL'}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">
                      {s.online ? `HTTP ${s.status}` : s.error || 'Blocked'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Educational notice on network unblocking */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-300 space-y-1">
            <div className="font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Wifi className="w-4 h-4" />
              <span>How the Proxy Handles School/Firewall Blocks</span>
            </div>
            <p className="text-amber-200/80 text-[11px] leading-relaxed">
              When network firewalls detect connections to *.krunker.io or inspect SNI hostnames, they drop the packets. Our reverse proxy fetches the game files on the server side and forwards the WebSocket frames through our own domain (or your Cloudflare/Vercel edge worker), rendering the traffic indistinguishable from normal secure web traffic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
