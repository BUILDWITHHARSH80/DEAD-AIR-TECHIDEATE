import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, AlertCircle, Cpu, Battery, BatteryCharging, BatteryWarning, FolderLock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';
import { playDialClick, playSolveChime, playErrorBuzzer, playTerminalKey } from '../../utils/audio';

export function EchoChallenge() {
  const { user, refreshAuth } = useAuth();
  const { addToast } = useToast();

  const [challenge, setChallenge] = useState(null);
  const [messages, setMessages] = useState([]);
  const [promptsUsed, setPromptsUsed] = useState(0);
  const [promptsRemaining, setPromptsRemaining] = useState(5);
  const [inputMsg, setInputMsg] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [answerInput, setAnswerInput] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const chatBottomRef = useRef(null);

  const loadData = async () => {
    try {
      const [list, echoData] = await Promise.all([
        api.get('/challenges'),
        api.get('/echo/history')
      ]);

      const target = list.find((c) => c.slug === 'echo');
      if (target) {
        setChallenge(target);
        setIsSuccess(target.is_solved);
      }

      if (echoData) {
        setMessages(echoData.messages || []);
        setPromptsUsed(echoData.prompts_used || 0);
        setPromptsRemaining(echoData.prompts_remaining ?? 5);
      }
    } catch (err) {
      console.warn('Failed to load ECHO data:', err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiLoading]);

  const handleSendPrompt = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || isAiLoading || promptsRemaining <= 0) return;

    const userText = inputMsg.trim();
    setInputMsg('');
    setIsAiLoading(true);
    playTerminalKey();

    // Optimistic user message append
    setMessages((prev) => [
      ...prev,
      { role: 'user', message: userText, created_at: new Date().toISOString() }
    ]);

    try {
      const res = await api.post('/echo/message', { message: userText });
      setPromptsUsed(res.prompts_used);
      setPromptsRemaining(res.prompts_remaining);

      // Append assistant reply
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', message: res.response, created_at: new Date().toISOString() }
      ]);
      playDialClick();
      refreshAuth();
    } catch (err) {
      playErrorBuzzer();
      addToast(err.message || 'ECHO transmission failed.', 'error');
      // Append in-character error message
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', message: `[TRANSMISSION ERROR]: ${err.message}`, created_at: new Date().toISOString() }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmitAttempt = async (e) => {
    e.preventDefault();
    if (!answerInput.trim() || !challenge) return;

    setSubmittingAnswer(true);
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
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          addToast(`Puzzle Solved! +${res.points_awarded} Points!`, 'success');
          refreshAuth();
        } else {
          playSolveChime();
          addToast('Correct master project codename verified!', 'info');
        }
      } else {
        playErrorBuzzer();
        setStatusMessage(res.message || 'Incorrect project codename. Interrogate ECHO.');
        addToast('Incorrect answer. Unlimited retries allowed.', 'warning');
      }
      loadData();
    } catch (err) {
      playErrorBuzzer();
      setStatusMessage(err.message || 'Transmission error.');
      addToast(err.message, 'error');
    } finally {
      setSubmittingAnswer(false);
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
              CHALLENGE #5 • AI TERMINAL INTERROGATION
            </span>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-deadair-amber/10 text-deadair-amber border border-deadair-amber/30 font-bold">
              +250 PTS
            </span>
          </div>

          {isSuccess && (
            <span className="font-mono text-xs px-3 py-1 rounded bg-deadair-green/20 text-deadair-green border border-deadair-green/40 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4" /> SOLVED & EVIDENCE UNLOCKED
            </span>
          )}
        </div>

        <h1 className="font-tech text-2xl sm:text-3xl font-bold text-zinc-100">
          Interrogate ECHO
        </h1>
        <p className="font-mono text-xs text-zinc-400 leading-relaxed">
          {challenge?.description || 'ECHO is the restored 1984 station archive computer. Ask strategic questions about Alan Vance, the 23:54 blackout, and the secret project that replaced Nightshade to extract the master operation codename.'}
        </p>
      </div>

      {/* ECHO Terminal AI Interface */}
      <div className="p-6 sm:p-8 rounded-2xl bg-black border-2 border-deadair-700 shadow-2xl space-y-4">
        {/* Terminal Header & Quota Gauge */}
        <div className="flex flex-wrap items-center justify-between border-b border-deadair-800 pb-4 gap-3">
          <div className="flex items-center gap-2 font-mono text-xs text-deadair-green">
            <Cpu className="w-4 h-4 text-deadair-green animate-pulse" />
            <span>ECHO SYSTEM TERMINAL (MODEL 1984 // ROM 2.1)</span>
          </div>

          {/* Battery / Prompt Counter */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-zinc-400 uppercase">PROMPTS REMAINING:</span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-deadair-900 border border-deadair-700">
              {promptsRemaining > 0 ? (
                <BatteryCharging className="w-4 h-4 text-deadair-green animate-pulse" />
              ) : (
                <BatteryWarning className="w-4 h-4 text-deadair-crimson" />
              )}
              <span className={`font-bold ${promptsRemaining > 0 ? 'text-deadair-green' : 'text-deadair-crimson'}`}>
                {promptsRemaining} / 5
              </span>
            </div>
          </div>
        </div>

        {/* Terminal Chat Box */}
        <div className="h-80 overflow-y-auto p-4 rounded-xl bg-deadair-950 border border-deadair-800 space-y-4 font-terminal text-xs sm:text-sm">
          <div className="text-zinc-500 border-b border-zinc-900 pb-2">
            [ECHO TERMINAL ONLINE — MEMORY CYLINDERS MOUNTED]
            <br />
            [Ask strategic questions regarding Vance, the transmitter vault, and the classified operation]
          </div>

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col space-y-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] text-zinc-500 uppercase">
                {m.role === 'user' ? 'INVESTIGATOR' : 'ECHO ARCHIVE'}
              </span>
              <div
                className={`p-3.5 rounded-lg max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-deadair-800 border border-deadair-700 text-zinc-200'
                    : 'bg-black border border-deadair-green/40 text-deadair-green glow-green'
                }`}
              >
                {m.message}
              </div>
            </div>
          ))}

          {isAiLoading && (
            <div className="flex flex-col space-y-1 items-start">
              <span className="text-[10px] text-zinc-500 uppercase">ECHO ARCHIVE</span>
              <div className="p-3.5 rounded-lg bg-black border border-deadair-green/30 text-deadair-green font-terminal text-xs animate-pulse">
                [SEARCHING 1984 MAGNETIC ARCHIVE REELS...]
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Prompt Input Form */}
        <form onSubmit={handleSendPrompt} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              disabled={promptsRemaining <= 0 || isAiLoading}
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={
                promptsRemaining > 0
                  ? "Type your question to ECHO (e.g. 'What was the secret project that replaced Nightshade?')"
                  : "PROMPT QUOTA DEPLETED (5/5 used). No further queries permitted."
              }
              className="flex-1 bg-deadair-950 border border-deadair-700 rounded-lg px-4 py-3 font-mono text-xs sm:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-deadair-green disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={promptsRemaining <= 0 || isAiLoading || !inputMsg.trim()}
              className="px-5 py-3 rounded-lg bg-deadair-green hover:bg-emerald-400 text-black font-tech font-bold text-xs uppercase transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SEND</span>
            </button>
          </div>
          <div className="text-[11px] font-mono text-zinc-500 flex justify-between">
            <span>Tokens are deducted atomically before AI computation.</span>
            <span>{5 - promptsUsed} queries left</span>
          </div>
        </form>
      </div>

      {/* Master Operation Codename Submission Form */}
      <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-4">
        <h3 className="font-tech text-base font-bold text-zinc-100 uppercase">
          Submit Master Operation Codename (e.g. PROJECT_OBLIVION)
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
              placeholder="ENTER MASTER OPERATION NAME (e.g. PROJECT_OBLIVION)"
              className="flex-1 bg-deadair-950 border border-deadair-700 rounded-lg px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-deadair-green"
            />
            <button
              type="submit"
              disabled={submittingAnswer}
              className="px-6 py-3 rounded-lg bg-deadair-green hover:bg-emerald-400 text-black font-tech font-bold text-sm tracking-wider uppercase transition flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submittingAnswer ? 'VERIFYING...' : 'TRANSMIT'}</span>
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
