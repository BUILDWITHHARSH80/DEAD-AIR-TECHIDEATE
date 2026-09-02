import React from 'react';
import { X, FileText, Lock, Play, Pause, ShieldAlert, Terminal, FileCode2 } from 'lucide-react';
import { playDialClick, playStaticBurst } from '../utils/audio';

export function EvidenceViewer({ file, onClose }) {
  if (!file) return null;

  const handleClose = () => {
    playDialClick();
    onClose();
  };

  const isUnlocked = file.is_unlocked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-deadair-900 border border-deadair-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-deadair-800 bg-deadair-850">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isUnlocked ? 'bg-deadair-green/10 text-deadair-green border border-deadair-green/30' : 'bg-deadair-crimson/10 text-deadair-crimson border border-deadair-crimson/30'}`}>
              {file.file_type === 'transcript' && <Play className="w-5 h-5" />}
              {file.file_type === 'pdf' && <ShieldAlert className="w-5 h-5" />}
              {file.file_type === 'log' && <Terminal className="w-5 h-5" />}
              {file.file_type === 'text' && <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-tech text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                {file.title}
                {isUnlocked ? (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-deadair-green/20 text-deadair-green border border-deadair-green/40">
                    DECRYPTED
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-deadair-crimson/20 text-deadair-crimson border border-deadair-crimson/40">
                    LOCKED
                  </span>
                )}
              </h3>
              <p className="text-xs font-mono text-zinc-400">
                Source Challenge: {file.challenge_title || file.challenge_slug}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-deadair-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-sm bg-deadair-950/80">
          {!isUnlocked ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Lock className="w-12 h-12 text-deadair-crimson animate-pulse" />
              <h4 className="font-tech text-lg text-zinc-200">RESTRICTED EVIDENCE FILE</h4>
              <p className="text-xs text-zinc-400 max-w-md">
                This document is encrypted with Station 94.7 FM security cyphers. Solve the corresponding challenge to decrypt and review.
              </p>
            </div>
          ) : (
            <>
              {/* File Metadata Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-deadair-900 border border-deadair-800 text-xs text-zinc-400">
                <span>FORMAT: <strong className="text-zinc-200 uppercase">{file.file_type}</strong></span>
                {file.unlocked_at && (
                  <span>UNLOCKED AT: <strong className="text-deadair-green">{new Date(file.unlocked_at).toLocaleTimeString()}</strong></span>
                )}
                {file.storage_path && (
                  <span>ARCHIVE PATH: <strong className="text-zinc-300 font-terminal">{file.storage_path}</strong></span>
                )}
              </div>

              {/* Document Presentation Styling */}
              {file.file_type === 'pdf' && (
                <div className="relative p-6 rounded-lg bg-amber-950/10 border border-amber-900/30 text-amber-200/90 space-y-3 shadow-inner">
                  <div className="absolute top-3 right-4 font-mono text-[10px] tracking-widest text-amber-500/60 uppercase border border-amber-500/30 px-2 py-0.5 rotate-3">
                    DECLASSIFIED 1984
                  </div>
                  <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {file.content}
                  </div>
                </div>
              )}

              {file.file_type === 'transcript' && (
                <div className="p-5 rounded-lg bg-deadair-900 border border-deadair-700 text-emerald-300/90 space-y-3 shadow-inner font-mono">
                  <div className="flex items-center justify-between pb-3 border-b border-deadair-800">
                    <span className="text-xs text-zinc-400">CASSETTE DECK REEL #A-84</span>
                    <button
                      onClick={() => playStaticBurst(0.25)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-deadair-800 hover:bg-deadair-700 text-deadair-green transition"
                    >
                      <Play className="w-3.5 h-3.5" /> REPLAY STATIC BURST
                    </button>
                  </div>
                  <div className="text-xs whitespace-pre-wrap leading-relaxed">
                    {file.content}
                  </div>
                </div>
              )}

              {file.file_type === 'log' && (
                <div className="p-5 rounded-lg bg-black border border-cyan-900/50 text-cyan-300 space-y-2 font-terminal text-xs shadow-inner">
                  <div className="text-[11px] text-cyan-600 border-b border-cyan-950 pb-2">
                    [SYSTEM_BUS_TELEMETRY — BUFFER CAPTURE]
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {file.content}
                  </div>
                </div>
              )}

              {file.file_type === 'text' && (
                <div className="p-6 rounded-lg bg-deadair-900 border border-zinc-700 text-zinc-200 space-y-3 font-mono text-xs shadow-inner">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {file.content}
                  </div>
                </div>
              )}

              {file.unlocked_description && (
                <div className="p-3 rounded-lg bg-deadair-850 border border-deadair-800 text-xs text-zinc-400">
                  <strong className="text-zinc-300">Investigator Note:</strong> {file.unlocked_description}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-deadair-800 bg-deadair-850">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-lg bg-deadair-800 hover:bg-deadair-700 text-zinc-200 text-xs font-mono transition"
          >
            CLOSE ARCHIVE
          </button>
        </div>
      </div>
    </div>
  );
}
