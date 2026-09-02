import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderLock, FileText, Play, Terminal, ShieldAlert, Lock, Unlock, Eye, ArrowLeft, Filter } from 'lucide-react';
import { api } from '../utils/api';
import { playDialClick } from '../utils/audio';
import { EvidenceViewer } from '../components/EvidenceViewer';

export function EvidenceRoom() {
  const [evidenceList, setEvidenceList] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [activeFile, setActiveFile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadEvidence = async () => {
    try {
      const data = await api.get('/evidence');
      setEvidenceList(data || []);
    } catch (err) {
      console.warn('Failed to load evidence files:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, []);

  const handleOpenFile = (file) => {
    playDialClick();
    setActiveFile(file);
  };

  const filtered = evidenceList.filter((f) => {
    if (filterType === 'all') return true;
    if (filterType === 'unlocked') return f.is_unlocked;
    if (filterType === 'locked') return !f.is_unlocked;
    return f.file_type === filterType;
  });

  const unlockedCount = evidenceList.filter((f) => f.is_unlocked).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back link */}
      <Link
        to="/dashboard"
        onClick={playDialClick}
        className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-deadair-green transition"
      >
        <ArrowLeft className="w-4 h-4" /> &larr; BACK TO DASHBOARD
      </Link>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-cyan-400" />
            <h1 className="font-tech text-2xl sm:text-3xl font-bold text-zinc-100 uppercase tracking-wide">
              EVIDENCE ARCHIVE LOCKER
            </h1>
          </div>
          <p className="font-mono text-xs text-zinc-400">
            Decrypted files recovered from Station W-DEAD 94.7 FM sub-level records and sound booth recorders.
          </p>
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-deadair-950 border border-deadair-800 self-start sm:self-auto font-mono text-xs">
          <span className="text-zinc-400 uppercase">UNLOCKED:</span>
          <span className="font-bold text-cyan-400 text-sm">{unlockedCount} / {evidenceList.length}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pt-2 border-b border-deadair-800 pb-4 font-mono text-xs">
        {[
          { id: 'all', label: 'ALL FILES' },
          { id: 'unlocked', label: 'DECRYPTED' },
          { id: 'locked', label: 'ENCRYPTED' },
          { id: 'transcript', label: 'AUDIO TRANSCRIPTS' },
          { id: 'pdf', label: 'CLASSIFIED MEMOS' },
          { id: 'log', label: 'TERMINAL LOGS' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              playDialClick();
              setFilterType(tab.id);
            }}
            className={`px-3 py-1.5 rounded-lg border transition ${
              filterType === tab.id
                ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800 font-bold'
                : 'bg-deadair-850 hover:bg-deadair-800 text-zinc-400 border-deadair-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((file, idx) => {
          const isUnlocked = file.is_unlocked;
          return (
            <div
              key={file.id}
              onClick={() => handleOpenFile(file)}
              className={`group cursor-pointer rounded-xl p-5 border transition flex flex-col justify-between shadow-xl backdrop-blur-sm ${
                isUnlocked
                  ? 'bg-deadair-900 border-deadair-700 hover:border-cyan-400 hover:bg-deadair-850'
                  : 'bg-deadair-900/60 border-deadair-800/80 hover:border-zinc-600 opacity-75'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg ${
                      isUnlocked
                        ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-800'
                        : 'bg-deadair-800 text-zinc-500 border border-deadair-700'
                    }`}
                  >
                    {file.file_type === 'transcript' && <Play className="w-4 h-4" />}
                    {file.file_type === 'pdf' && <ShieldAlert className="w-4 h-4" />}
                    {file.file_type === 'log' && <Terminal className="w-4 h-4" />}
                    {file.file_type === 'text' && <FileText className="w-4 h-4" />}
                  </div>

                  {isUnlocked ? (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-deadair-green/20 text-deadair-green border border-deadair-green/40 flex items-center gap-1 font-bold">
                      <Unlock className="w-3 h-3" /> DECRYPTED
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-deadair-crimson/20 text-deadair-crimson border border-deadair-crimson/40 flex items-center gap-1 font-bold">
                      <Lock className="w-3 h-3" /> ENCRYPTED
                    </span>
                  )}
                </div>

                <div>
                  <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                    {file.file_type.toUpperCase()} • {file.challenge_slug ? `FROM: ${file.challenge_slug.toUpperCase()}` : 'EVIDENCE FILE'}
                  </div>
                  <h3 className="font-tech text-base font-bold text-zinc-100 group-hover:text-cyan-400 transition">
                    {file.title}
                  </h3>
                </div>

                <p className="font-mono text-xs text-zinc-400 line-clamp-3">
                  {isUnlocked ? (file.unlocked_description || file.content) : '🔒 Complete the corresponding frequency puzzle to decrypt this file.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-deadair-800 flex items-center justify-between font-mono text-xs text-zinc-400 group-hover:text-zinc-200">
                <span>{isUnlocked ? 'Inspect Document' : 'View File Lock'}</span>
                <Eye className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Inspector */}
      {activeFile && (
        <EvidenceViewer file={activeFile} onClose={() => setActiveFile(null)} />
      )}
    </div>
  );
}
