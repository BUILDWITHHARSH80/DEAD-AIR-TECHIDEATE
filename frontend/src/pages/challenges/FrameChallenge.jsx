import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, AlertCircle, Video, ZoomIn, FolderLock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';
import { playDialClick, playSolveChime, playErrorBuzzer } from '../../utils/audio';

export function FrameChallenge() {
  const { user, refreshAuth } = useAuth();
  const { addToast } = useToast();

  const [challenge, setChallenge] = useState(null);
  const [activeFrame, setActiveFrame] = useState(3);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const loadChallenge = async () => {
    try {
      const list = await api.get('/challenges');
      const target = list.find((c) => c.slug === 'frame');
      if (target) {
        setChallenge(target);
        setIsSuccess(target.is_solved);
      }
    } catch (err) {
      console.warn('Failed to load challenge:', err.message);
    }
  };

  useEffect(() => {
    loadChallenge();
  }, []);

  const handleFrameSelect = (idx) => {
    playDialClick();
    setActiveFrame(idx);
    setIsEnhanced(false);
  };

  const handleEnhance = () => {
    playDialClick();
    setIsEnhanced(!isEnhanced);
  };

  const handleSubmitAttempt = async (e) => {
    e.preventDefault();
    if (!answerInput.trim() || !challenge) return;

    setSubmitting(true);
    setStatusMessage('');

    try {
      const res = await api.post(`/challenges/${challenge.id}/attempt`, {
        submitted_answer: answerInput
      });

      if (res.is_correct) {
        setIsSuccess(true);
        setStatusMessage(res.message);
        if (res.is_first_solve) {
          playSolveChime();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          addToast(`Puzzle Solved! +${res.points_awarded} Points!`, 'success');
          refreshAuth();
        } else {
          playSolveChime();
          addToast('Correct vault location verified!', 'info');
        }
      } else {
        playErrorBuzzer();
        setStatusMessage(res.message || 'Incorrect room designation. Check Frame 3.');
        addToast('Incorrect answer. Unlimited retries allowed.', 'warning');
      }
      loadChallenge();
    } catch (err) {
      playErrorBuzzer();
      setStatusMessage(err.message || 'Transmission error.');
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        to="/dashboard"
        onClick={playDialClick}
        className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-deadair-green transition"
      >
        <ArrowLeft className="w-4 h-4" /> &larr; BACK TO DASHBOARD
      </Link>

      {/* Challenge Title Card */}
      <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-deadair-800 text-zinc-300 border border-deadair-700">
              CHALLENGE #4 • CCTV FORENSICS
            </span>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-deadair-amber/10 text-deadair-amber border border-deadair-amber/30 font-bold">
              +200 PTS
            </span>
          </div>

          {isSuccess && (
            <span className="font-mono text-xs px-3 py-1 rounded bg-deadair-green/20 text-deadair-green border border-deadair-green/40 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4" /> SOLVED & EVIDENCE UNLOCKED
            </span>
          )}
        </div>

        <h1 className="font-tech text-2xl sm:text-3xl font-bold text-zinc-100">
          CCTV Forensic Frame
        </h1>
        <p className="font-mono text-xs text-zinc-400 leading-relaxed">
          {challenge?.description || 'Corridor camera CAM-04 captured a 3-frame sequence at 23:52 before the system blackout. Enhance the badge reader display and locate the restricted room destination identifier.'}
        </p>
      </div>

      {/* Forensic CCTV Monitor Interface */}
      <div className="p-6 sm:p-8 rounded-2xl bg-deadair-900 border-2 border-deadair-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-deadair-800 pb-4">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
            <Video className="w-4 h-4 text-deadair-crimson animate-pulse" />
            <span>CAM-04 CORRIDOR TAPE RECORDER (1984-10-31)</span>
          </div>
          <button
            onClick={handleEnhance}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
              isEnhanced
                ? 'bg-deadair-green text-black border-deadair-green font-bold'
                : 'bg-deadair-850 hover:bg-deadair-800 border-deadair-700 text-zinc-200'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" /> {isEnhanced ? 'ENHANCE ACTIVE (200%)' : 'ENHANCE TIME-CODE'}
          </button>
        </div>

        {/* Security Screen Viewport */}
        <div className="relative p-8 rounded-xl bg-black border-2 border-zinc-800 overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[260px]">
          {/* CRT Noise Overlay */}
          <div className="absolute top-4 left-4 font-mono text-[10px] text-deadair-green">
            CAM-04 // 23:52:1{activeFrame} EST // REC [●]
          </div>
          <div className="absolute top-4 right-4 font-mono text-[10px] text-zinc-500">
            FRAME {activeFrame} OF 3
          </div>

          <div className="space-y-3 text-center my-4 font-terminal">
            {activeFrame === 1 && (
              <div className="text-zinc-500 text-xs sm:text-sm space-y-2">
                <p>[23:52:11 — MOTION DETECTED: Figure in trench coat walking down Sub-level corridor]</p>
                <div className="p-3 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded">
                  Door stencil out of focus. Approach distance 15m.
                </div>
              </div>
            )}

            {activeFrame === 2 && (
              <div className="text-zinc-400 text-xs sm:text-sm space-y-2">
                <p>[23:52:12 — FIGURE STANDS AT ACCESS TERMINAL: Keycard override initiated]</p>
                <div className="p-3 bg-zinc-950 border border-zinc-800 text-zinc-300 rounded">
                  Heavy steel vault door visible. Stencil: "TRANSMITTER_..."
                </div>
              </div>
            )}

            {activeFrame === 3 && (
              <div className="text-zinc-200 text-xs sm:text-sm space-y-3">
                <p className="text-deadair-green">[23:52:13 — HIGH RES FRAME CAPTURE BEFORE BLACKOUT]</p>
                {isEnhanced ? (
                  <div className="p-4 bg-black border-2 border-deadair-green rounded-lg text-deadair-green text-sm sm:text-base font-bold tracking-widest glow-green animate-in zoom-in-95">
                    STENCIL: TRANSMITTER_VAULT_B
                    <div className="text-xs text-zinc-300 font-normal mt-1 font-mono">
                      (SUB-LEVEL 2 POWER CONTROL ROOM)
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-lg text-xs">
                    "TRANSMITTER_VAU[..]_B" // Click 'ENHANCE TIME-CODE' above to sharpen the lens focus.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Frame Scrubber Buttons */}
        <div className="flex justify-center gap-3">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => handleFrameSelect(num)}
              className={`px-4 py-2 rounded-lg font-mono text-xs transition border ${
                activeFrame === num
                  ? 'bg-deadair-green text-black border-deadair-green font-bold shadow-md'
                  : 'bg-deadair-850 hover:bg-deadair-800 border-deadair-700 text-zinc-300'
              }`}
            >
              FRAME {num} (23:52:1{num})
            </button>
          ))}
        </div>
      </div>

      {/* Answer Submission Form */}
      <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-4">
        <h3 className="font-tech text-base font-bold text-zinc-100 uppercase">
          Submit Restricted Room Destination (e.g. TRANSMITTER_VAULT_B)
        </h3>

        {statusMessage && (
          <div
            className={`p-3 rounded-lg border font-mono text-xs flex items-center gap-2 ${
              isSuccess
                ? 'bg-deadair-green/10 border-deadair-green/40 text-deadair-green'
                : 'bg-deadair-crimson/10 border-deadair-crimson/40 text-deadair-crimson'
            }`}
          >
            {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitAttempt} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value.toUpperCase())}
              placeholder="ENTER ROOM DESTINATION (e.g. TRANSMITTER_VAULT_B)"
              className="flex-1 bg-deadair-950 border border-deadair-700 rounded-lg px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-deadair-green"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-lg bg-deadair-green hover:bg-emerald-400 text-black font-tech font-bold text-sm tracking-wider uppercase transition flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'VERIFYING...' : 'TRANSMIT'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Attempts made: {challenge?.attempt_count || 0}</span>
            <Link to="/evidence" onClick={playDialClick} className="text-cyan-400 hover:underline flex items-center gap-1">
              <FolderLock className="w-3.5 h-3.5" /> View Unlocked Evidence &rarr;
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
