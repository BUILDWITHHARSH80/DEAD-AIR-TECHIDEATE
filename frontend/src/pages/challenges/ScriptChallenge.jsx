import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, AlertCircle, FileText, FolderLock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';
import { playDialClick, playSolveChime, playErrorBuzzer } from '../../utils/audio';

export function ScriptChallenge() {
  const { user, refreshAuth } = useAuth();
  const { addToast } = useToast();

  const [challenge, setChallenge] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedLetters, setSelectedLetters] = useState([]);

  const loadChallenge = async () => {
    try {
      const list = await api.get('/challenges');
      const target = list.find((c) => c.slug === 'script');
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

  const toggleLetter = (letter, id) => {
    playDialClick();
    if (selectedLetters.includes(id)) {
      setSelectedLetters(selectedLetters.filter((x) => x !== id));
    } else {
      setSelectedLetters([...selectedLetters, id]);
    }
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
          addToast('Correct anagram cipher!', 'info');
        }
      } else {
        playErrorBuzzer();
        setStatusMessage(res.message || 'Incorrect cipher solution. Check the red circled letters.');
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
              CHALLENGE #3 • CENSORED SCRIPT CIPHER
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
          Censored Cue Sheet
        </h1>
        <p className="font-mono text-xs text-zinc-400 leading-relaxed">
          {challenge?.description || 'Alan Vance left his final cue sheet in Booth B. Several lines were redacted with black marker, but producer notes in the margins contain circled red letters. Unscramble the 3-word warning.'}
        </p>
      </div>

      {/* Typewriter Styled 1984 Radio Cue Sheet */}
      <div className="p-6 sm:p-8 rounded-2xl bg-amber-950/20 border-2 border-amber-900/40 shadow-2xl space-y-6 text-amber-100/90 font-mono">
        <div className="flex items-center justify-between border-b border-amber-900/40 pb-4">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>W-DEAD 94.7 FM — ON-AIR CUE SHEET (OCTOBER 31, 1984)</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-red-500 border border-red-500/40 px-2 py-0.5 rounded rotate-1">
            CONFIDENTIAL RECOVERY
          </span>
        </div>

        <div className="space-y-4 text-xs sm:text-sm leading-relaxed">
          <div className="p-4 rounded-lg bg-deadair-950/80 border border-amber-950 space-y-3">
            <p className="text-zinc-400 text-xs">
              <strong>[SEGMENT 1 - 23:00]:</strong> Intro theme. Welcome midnight listeners to the annual Halloween beacon.
            </p>

            <p>
              <strong>[SEGMENT 2 - 23:15]:</strong> Good evening port city. Tonight we look at{' '}
              <span className="bg-zinc-800 text-transparent select-none px-2 rounded">██████████</span> and the boat slips.
              <span className="text-red-400 font-bold ml-1">
                [<button onClick={() => toggleLetter('D', 1)} className="hover:underline text-red-400">D</button>]
                [<button onClick={() => toggleLetter('E', 2)} className="hover:underline text-red-400">E</button>]
                [<button onClick={() => toggleLetter('A', 3)} className="hover:underline text-red-400">A</button>]
                [<button onClick={() => toggleLetter('D', 4)} className="hover:underline text-red-400">D</button>]
              </span>
            </p>

            <p>
              <strong>[SEGMENT 3 - 23:30]:</strong> Weather forecast: dense coastal fog. Temperature falling.
            </p>

            <p>
              <strong>[SEGMENT 4 - 23:38]:</strong> Station manager instructions regarding transmitter sub-carrier:{' '}
              <span className="bg-zinc-800 text-transparent select-none px-3 rounded">████████████████</span>
              <span className="text-red-400 font-bold ml-1">
                [<button onClick={() => toggleLetter('A', 5)} className="hover:underline text-red-400">A</button>]
                [<button onClick={() => toggleLetter('I', 6)} className="hover:underline text-red-400">I</button>]
                [<button onClick={() => toggleLetter('R', 7)} className="hover:underline text-red-400">R</button>]
              </span>
            </p>

            <p>
              <strong>[SEGMENT 5 - 23:50]:</strong> Final track selection. Vance note scribbled in red margin:
              <br />
              <span className="italic text-zinc-300">"If the power cuts at 23:54... the transmission is not dead. It is waiting."</span>
              <span className="text-red-400 font-bold ml-1">
                [<button onClick={() => toggleLetter('S', 8)} className="hover:underline text-red-400">S</button>]
                [<button onClick={() => toggleLetter('I', 9)} className="hover:underline text-red-400">I</button>]
                [<button onClick={() => toggleLetter('L', 10)} className="hover:underline text-red-400">L</button>]
                [<button onClick={() => toggleLetter('E', 11)} className="hover:underline text-red-400">E</button>]
                [<button onClick={() => toggleLetter('N', 12)} className="hover:underline text-red-400">N</button>]
                [<button onClick={() => toggleLetter('C', 13)} className="hover:underline text-red-400">C</button>]
                [<button onClick={() => toggleLetter('E', 14)} className="hover:underline text-red-400">E</button>]
              </span>
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-deadair-900 border border-deadair-800 text-xs text-zinc-400 font-mono">
          <strong className="text-amber-400">Clue:</strong> Form the 3-word phrase from the circled margin letters (e.g. <span className="text-zinc-200">DEAD_AIR_SILENCE</span>).
        </div>
      </div>

      {/* Answer Submission Form */}
      <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-4">
        <h3 className="font-tech text-base font-bold text-zinc-100 uppercase">
          Submit Decrypted Script Phrase (Unlimited Retries)
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
              placeholder="ENTER 3-WORD PHRASE (e.g. DEAD_AIR_SILENCE)"
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
