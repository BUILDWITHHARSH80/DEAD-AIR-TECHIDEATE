import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radio, ArrowLeft, Send, CheckCircle2, AlertCircle, Play, Sliders, Volume2, FolderLock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';
import { playDialClick, playFrequencyTone, playSolveChime, playErrorBuzzer, playStaticBurst } from '../../utils/audio';

export function StaticChallenge() {
  const { user, refreshAuth } = useAuth();
  const { addToast } = useToast();

  const [challenge, setChallenge] = useState(null);
  const [filterLow, setFilterLow] = useState(30);
  const [filterMid, setFilterMid] = useState(40);
  const [filterHigh, setFilterHigh] = useState(85); // Target is high > 80, low < 20
  const [answerInput, setAnswerInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const loadChallenge = async () => {
    try {
      const list = await api.get('/challenges');
      const target = list.find((c) => c.slug === 'static');
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

  const handlePlayMorse = () => {
    playDialClick();
    // Play sequence of high-pitch beeps for NIGHTSHADE
    const morsePattern = [
      { t: 0.1, p: 0.05 }, // N: - .
      { t: 0.05, p: 0.15 },
      { t: 0.05, p: 0.05 }, // I: . .
      { t: 0.05, p: 0.15 },
      { t: 0.1, p: 0.05 }, // G: - - .
      { t: 0.1, p: 0.05 },
      { t: 0.05, p: 0.15 },
    ];
    morsePattern.forEach((item, i) => {
      setTimeout(() => {
        playFrequencyTone(1200, item.t);
      }, i * 150);
    });
  };

  const isFilteredCleanly = filterHigh >= 75 && filterLow <= 25;

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
          addToast('Correct transmission!', 'info');
        }
      } else {
        playErrorBuzzer();
        setStatusMessage(res.message || 'Incorrect codename or year. Filter the static bands.');
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
              CHALLENGE #2 • SPECTROGRAM DECODER
            </span>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-deadair-amber/10 text-deadair-amber border border-deadair-amber/30 font-bold">
              +150 PTS
            </span>
          </div>

          {isSuccess && (
            <span className="font-mono text-xs px-3 py-1 rounded bg-deadair-green/20 text-deadair-green border border-deadair-green/40 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4" /> SOLVED & EVIDENCE UNLOCKED
            </span>
          )}
        </div>

        <h1 className="font-tech text-2xl sm:text-3xl font-bold text-zinc-100">
          Spectrogram Interference
        </h1>
        <p className="font-mono text-xs text-zinc-400 leading-relaxed">
          {challenge?.description || 'A 15-second burst of static was recorded at 23:38 during the weather report. Filter the frequency bands to reveal hidden Morse code pulses and the secret government project codename and year.'}
        </p>
      </div>

      {/* Audio Filter Equalizer & Spectrogram */}
      <div className="p-6 sm:p-8 rounded-2xl bg-deadair-900 border-2 border-deadair-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-deadair-800 pb-4">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
            <Sliders className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>SPECTROGRAM BANDPASS EQUALIZER</span>
          </div>
          <button
            onClick={handlePlayMorse}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-xs font-mono text-deadair-green transition"
          >
            <Play className="w-3.5 h-3.5" /> PLAY BURST TONES
          </button>
        </div>

        {/* Spectrogram Graphic Canvas Simulation */}
        <div className="relative p-6 rounded-xl bg-black border border-cyan-950/60 overflow-hidden shadow-inner flex flex-col items-center justify-center space-y-4">
          <div className="w-full flex items-end justify-between h-28 gap-1.5 px-2">
            {[20, 35, 60, 85, 40, 95, 70, 30, 90, 45, 100, 65, 80, 50, 95, 30, 75, 40, 90].map((h, i) => {
              const active = isFilteredCleanly ? h > 50 : Math.random() > 0.4;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all duration-300 ${
                    isFilteredCleanly
                      ? 'bg-gradient-to-t from-cyan-600 to-deadair-green shadow-sm'
                      : 'bg-zinc-800'
                  }`}
                  style={{ height: `${active ? h : 15}%` }}
                />
              );
            })}
          </div>

          <div className="font-terminal text-center">
            {isFilteredCleanly ? (
              <div className="text-deadair-green text-sm sm:text-base tracking-widest glow-green animate-in fade-in">
                MORSE: -. .. --. .... - ... .... .- -.. . // YEAR: 1984
              </div>
            ) : (
              <div className="text-zinc-600 text-xs tracking-wider">
                [HIGH FREQUENCY STATIC INTERFERENCE — ISOLATE HIGH BANDS & CUT LOW RUMBLE]
              </div>
            )}
          </div>
        </div>

        {/* Filter Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 font-mono text-xs">
          <div className="space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span>LOW RUMBLE (CUT &lt; 25%):</span>
              <span className={filterLow <= 25 ? 'text-deadair-green' : 'text-zinc-500'}>{filterLow}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={filterLow}
              onChange={(e) => {
                setFilterLow(parseInt(e.target.value));
                playDialClick();
              }}
              className="w-full h-2 bg-deadair-800 rounded-lg appearance-none cursor-pointer accent-deadair-amber"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span>MID HARMONIC:</span>
              <span className="text-zinc-500">{filterMid}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={filterMid}
              onChange={(e) => {
                setFilterMid(parseInt(e.target.value));
                playDialClick();
              }}
              className="w-full h-2 bg-deadair-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span>HIGH MORSE (&gt; 75%):</span>
              <span className={filterHigh >= 75 ? 'text-deadair-green font-bold' : 'text-zinc-500'}>{filterHigh}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={filterHigh}
              onChange={(e) => {
                setFilterHigh(parseInt(e.target.value));
                playDialClick();
              }}
              className="w-full h-2 bg-deadair-800 rounded-lg appearance-none cursor-pointer accent-deadair-green"
            />
          </div>
        </div>
      </div>

      {/* Answer Submission Form */}
      <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-4">
        <h3 className="font-tech text-base font-bold text-zinc-100 uppercase">
          Submit Decoded Codename & Year (e.g. NIGHTSHADE_1984)
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
              placeholder="ENTER DECODED CODENAME (e.g. NIGHTSHADE_1984)"
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
