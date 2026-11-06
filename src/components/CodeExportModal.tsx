import React, { useState } from 'react';
import { Copy, Check, Download, Terminal, Code2, Server, FileText, ChevronRight } from 'lucide-react';
import { CODE_SNIPPETS } from '../data/codeSnippets';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({ isOpen, onClose }) => {
  const [selectedId, setSelectedId] = useState(CODE_SNIPPETS[0].id);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentSnippet = CODE_SNIPPETS.find((s) => s.id === selectedId) || CODE_SNIPPETS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentSnippet.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentSnippet.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase text-white font-mono tracking-wider">
                Proxy Source Code & Deployment Scripts
              </h2>
              <p className="text-xs text-slate-400">
                Ready-to-run Node.js, HTML5, and Cloudflare code to host your own unblocked Krunker proxy
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

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar / Snippet List */}
          <div className="w-72 border-r border-slate-800 bg-slate-950/40 p-3 space-y-1.5 overflow-y-auto">
            <div className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1 tracking-wider">
              Files & Implementations
            </div>
            {CODE_SNIPPETS.map((snippet) => (
              <button
                key={snippet.id}
                onClick={() => {
                  setSelectedId(snippet.id);
                  setCopied(false);
                }}
                className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                  selectedId === snippet.id
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                }`}
              >
                <div className="truncate">
                  <div className="text-xs font-mono truncate">{snippet.filename}</div>
                  <div className="text-[11px] text-slate-400 truncate font-normal">
                    {snippet.title}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 ml-1" />
              </button>
            ))}

            {/* Quick Setup Guide */}
            <div className="mt-4 pt-4 border-t border-slate-800 px-3">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                Quick Deploy Commands
              </div>
              <div className="bg-slate-950 rounded-lg p-2.5 font-mono text-[11px] text-amber-300/90 space-y-1 border border-slate-800 select-all">
                <div>git clone &lt;repo&gt;</div>
                <div>npm install express ws</div>
                <div>node krunker-proxy-server.js</div>
              </div>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {/* Action Bar */}
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white font-mono">{currentSnippet.filename}</span>
                <span className="text-xs text-slate-400 ml-2">({currentSnippet.description})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors border border-slate-700 cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                  }`}
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed">
              <pre className="selection:bg-amber-500/30 selection:text-amber-200">
                <code>{currentSnippet.code}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
