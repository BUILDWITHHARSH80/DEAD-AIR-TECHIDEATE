import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radio, ArrowLeft, Send, CheckCircle2, AlertCircle, Volume2, Sparkles, FolderLock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';
import { playDialClick, playFrequencyTone, playSolveChime, playErrorBuzzer, playStaticBurst } from '../../utils/audio';

export function FrequencyChallenge() {
  const { user, refreshAuth } = useAuth();
  const { addToast } = useToast();

  const [challenge, setChallenge] = useState(null);
  const [frequency, setFrequency] = useState(94.7);
  const [answerInput, setAnswerInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [unlockedFileId, setUnlockedFileId] = useState(null);

  const loadChallenge = async () => {
    try {
      const list = await api.get('/challenges');
      const target = list.find((c) => c.slug === 'frequency');
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

  const handleFrequencyChange = (val) => {
    const num = parseFloat(val);
    setFrequency(num);
    playDialClick();

    // If near target frequency 96.4 MHz (+-0.2)
    const diff = Math.abs(num - 96.4);
    if (diff < 0.1) {
      playFrequencyTone(880, 0.15); // High clear carrier tone
    } else if (diff < 0.4) {
      playFrequencyTone(440, 0.08); // Lower harmonic tone
    } else {
      playStaticBurst(0.04); // White noise static
    }
  };

  const handleTune = (delta) => {
    const next = Math.min(108.0, Math.max(94.0, parseFloat((frequency + delta).toFixed(1))));
    handleFrequencyChange(next);
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
          setUnlockedFileId(res.unlocked_file_id);
          refreshAuth();
        } else {
          playSolveChime();
          addToast('Correct transmission!', 'info');
        }
      } else {
        playErrorBuzzer();
        setStatusMessage(res.message || 'Incorrect signal. Check the beacon harmonic.');
        addToast('Incorrect answer. Unlimited retries are allowed.', 'warning');
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

  const signalStrength = Math.max(0, Math.min(100, Math.round(100 - Math.abs(frequency - 96.4) * 80)));
  const isSignalLocked = signalStrength >= 95;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back link */}
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
              CHALLENGE #1 • FREQUENCY TUNER
            </span>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-deadair-amber/10 text-deadair-amber border border-deadair-amber/30 font-bold">
              +100 PTS
            </span>
          </div>

          {isSuccess && (
            <span className="font-mono text-xs px-3 py-1 rounded bg-deadair-green/20 text-deadair-green border border-deadair-green/40 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4" /> SOLVED & EVIDENCE UNLOCKED
            </span>
          )}
        </div>

        <h1 className="font-tech text-2xl sm:text-3xl font-bold text-zinc-100">
          The Ghost Carrier
        </h1>
        <p className="font-mono text-xs text-zinc-400 leading-relaxed">
          {challenge?.description || 'At 23:15, a phantom carrier wave overlapped W-DEAD 94.7 FM. Use the frequency tuner below to sweep the VHF spectrum between 94.0 and 108.0 MHz. Lock onto the carrier harmonic to decode the beacon designation.'}
        </p>
      </div>

      {/* Interactive Radio Frequency Tuner Unit */}
      <div className="p-6 sm:p-8 rounded-2xl bg-deadair-900 border-2 border-deadair-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-deadair-800 pb-4">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
            <Radio className="w-4 h-4 text-deadair-green animate-pulse" />
            <span>MODEL: MARCONI RF-84 SPECTRUM SWEEPER</span>
          </div>
          <div className="font-mono text-xs text-zinc-500">BAND: VHF / FM</div>
        </div>

        {/* Big LED Frequency Display */}
        <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-black border border-deadair-700 space-y-2 shadow-inner">
          <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
            CARRIER FREQUENCY
          </div>
          <div className="font-mono text-4xl sm:text-5xl font-bold text-deadair-green tracking-widest glow-green">
            {frequency.toFixed(1)} <span className="text-xl text-deadair-green-dim font-normal">MHz</span>
          </div>

          {/* Signal Quality Meter */}
          <div className="w-full max-w-md space-y-1 pt-3">
            <div className="flex justify-between font-mono text-[11px] text-zinc-400">
              <span>SIGNAL LOCK:</span>
              <span className={isSignalLocked ? 'text-deadair-green font-bold glow-green' : 'text-zinc-500'}>
                {isSignalLocked ? 'CARRIER SYNCHRONIZED (100%)' : `${signalStrength}% (STATIC)`}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-deadair-800 overflow-hidden border border-deadair-700">
              <div
                className={`h-full transition-all duration-150 ${
                  isSignalLocked ? 'bg-deadair-green' : signalStrength > 50 ? 'bg-deadair-amber' : 'bg-deadair-crimson'
                }`}
                style={{ width: `${signalStrength}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dial Controls */}
        <div className="space-y-4">
          <input
            type="range"
            min="94.0"
            max="108.0"
            step="0.1"
            value={frequency}
            onChange={(e) => handleFrequencyChange(e.target.value)}
            className="w-full h-3 bg-deadair-800 rounded-lg appearance-none cursor-pointer accent-deadair-green"
          />

          <div className="flex justify-between font-mono text-xs text-zinc-500 px-1">
            <span>94.0 MHz (W-DEAD)</span>
            <span>96.4 MHz</span>
            <span>101.5 MHz</span>
            <span>108.0 MHz</span>
          </div>

          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => handleTune(-1.0)}
              className="px-3 py-1.5 rounded-lg bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-xs font-mono text-zinc-300"
            >
              -1.0 MHz
            </button>
            <button
              onClick={() => handleTune(-0.1)}
              className="px-3 py-1.5 rounded-lg bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-xs font-mono text-zinc-300"
            >
              -0.1 MHz
            </button>
            <button
              onClick={() => handleTune(0.1)}
              className="px-3 py-1.5 rounded-lg bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-xs font-mono text-zinc-300"
            >
              +0.1 MHz
            </button>
            <button
              onClick={() => handleTune(1.0)}
              className="px-3 py-1.5 rounded-lg bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-xs font-mono text-zinc-300"
            >
              +1.0 MHz
            </button>
          </div>
        </div>

        {/* Demodulated Audio / Visual Output */}
        <div className="p-4 rounded-xl bg-deadair-950 border border-deadair-800 space-y-2">
          <div className="font-mono text-[10px] text-zinc-400 uppercase flex items-center justify-between">
            <span>DEMODULATED BEACON TELEMETRY:</span>
            {isSignalLocked && <span className="text-deadair-green text-[10px]">DECODED</span>}
          </div>

          {isSignalLocked ? (
            <div className="p-4 rounded-lg bg-deadair-900 border border-deadair-green/40 text-deadair-green font-mono text-sm leading-relaxed animate-in fade-in">
              <p className="font-bold flex items-center gap-2">
                <Volume2 className="w-4 h-4 animate-pulse" /> [CARRIER BEACON CAPTURED AT 96.4 MHz]:
              </p>
              <p className="mt-2 text-zinc-100 text-base font-terminal">
                "NAV BEACON: <strong className="text-deadair-green underline">HARBOR_LIGHTS</strong> // REPEATER SLIP 42 ACTIVE"
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-black border border-zinc-800 text-zinc-500 font-terminal text-xs">
              [STATIC NOISE — SWEEP FREQUENCIES NEAR 96.4 MHz TO LOCK CARRIER TONE]
            </div>
          )}
        </div>
      </div>

      {/* Answer Submission Form */}
      <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-4">
        <h3 className="font-tech text-base font-bold text-zinc-100 uppercase">
          Submit Beacon Designation (Unlimited Retries)
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
              placeholder="ENTER DECODED BEACON NAME (e.g. HARBOR_LIGHTS)"
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
