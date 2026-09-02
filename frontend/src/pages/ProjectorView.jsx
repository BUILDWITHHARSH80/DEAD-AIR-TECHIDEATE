import React, { useState, useEffect } from 'react';
import { Radio, Trophy, Clock, Award, Zap, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import { useTimer } from '../context/TimerContext';

export function ProjectorView() {
  const { formattedTime, isPaused, round } = useTimer();
  const [finaleState, setFinaleState] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [buzzerSecondsRemaining, setBuzzerSecondsRemaining] = useState(null);

  const loadData = async () => {
    try {
      const [fData, lData] = await Promise.all([
        api.get('/finale/state'),
        api.get('/admin/leaderboard')
      ]);
      setFinaleState(fData || {});
      setLeaderboard(lData || []);
    } catch (err) {
      console.warn('Failed to load projector state:', err.message);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000); // 3s fast poll for venue screen
    return () => clearInterval(interval);
  }, []);

  // Compute rapid buzzer remaining seconds
  useEffect(() => {
    if (!finaleState?.timer_end_time || !finaleState?.is_timer_running) {
      setBuzzerSecondsRemaining(null);
      return;
    }

    const tick = () => {
      const end = new Date(finaleState.timer_end_time).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((end - now) / 1000));
      setBuzzerSecondsRemaining(diff);
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [finaleState]);

  const activeQuestion = finaleState?.current_question;
  const isRound2 = finaleState?.is_active || round === 2;

  return (
    <div className="min-h-screen bg-deadair-950 text-zinc-100 flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden font-mono select-none">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,102,0.06)_0,transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-40" />

      {/* Top Venue Broadcast Header */}
      <header className="flex items-center justify-between border-b-2 border-deadair-800 pb-6 z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-deadair-900 border-2 border-deadair-green flex items-center justify-center shadow-lg">
            <Radio className="w-8 h-8 text-deadair-green animate-pulse" />
          </div>
          <div>
            <div className="font-tech text-3xl sm:text-4xl font-bold tracking-widest text-zinc-100 flex items-center gap-3">
              DEAD AIR <span className="text-deadair-green glow-green">94.7 FM</span>
            </div>
            <div className="text-xs text-zinc-400 tracking-wider uppercase mt-0.5">
              OCTOBER 31, 1984 • LIVE STAGE BROADCAST CONSOLE
            </div>
          </div>
        </div>

        {/* Big Giant Stage Timer */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-xs text-zinc-400 uppercase tracking-widest">
              {buzzerSecondsRemaining !== null ? 'RAPID BUZZER' : (isPaused ? 'TIMER PAUSED' : `ROUND ${round} TIME`)}
            </div>
            <div
              className={`font-tech text-5xl sm:text-6xl font-bold tracking-widest ${
                buzzerSecondsRemaining !== null
                  ? buzzerSecondsRemaining <= 10
                    ? 'text-deadair-crimson glow-crimson animate-pulse-fast'
                    : 'text-deadair-amber glow-amber'
                  : 'text-deadair-green glow-green'
              }`}
            >
              {buzzerSecondsRemaining !== null ? `${buzzerSecondsRemaining}s` : formattedTime}
            </div>
          </div>
        </div>
      </header>

      {/* Center Stage: Active Question or Round 1 Live Standings */}
      <main className="my-auto py-8 z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Main Broadcast Banner / Active Question */}
        <div className="lg:col-span-8 space-y-6">
          {activeQuestion ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-black border-2 border-deadair-green/60 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-deadair-800 pb-4">
                <span className="px-4 py-1 rounded-full bg-deadair-amber/20 text-deadair-amber border border-deadair-amber/40 font-bold text-sm tracking-wider uppercase flex items-center gap-2">
                  <Zap className="w-4 h-4" /> FINALE RAPID FIRE #{activeQuestion.index}
                </span>
                <span className="font-tech text-2xl font-bold text-deadair-amber">
                  +{activeQuestion.points} PTS
                </span>
              </div>

              <div className="space-y-4">
                <h2 className="font-tech text-3xl sm:text-4xl font-bold text-zinc-100 uppercase tracking-wide">
                  {activeQuestion.title}
                </h2>
                <p className="font-mono text-xl sm:text-2xl text-zinc-200 leading-relaxed font-medium">
                  {activeQuestion.prompt}
                </p>
              </div>

              {buzzerSecondsRemaining !== null && (
                <div className="w-full bg-deadair-800 h-4 rounded-full overflow-hidden border border-deadair-700">
                  <div
                    className="h-full bg-deadair-amber transition-all duration-200"
                    style={{
                      width: `${(buzzerSecondsRemaining / (activeQuestion.time_limit || 60)) * 100}%`
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 sm:p-12 rounded-3xl bg-deadair-900 border-2 border-deadair-800 shadow-2xl space-y-4 text-center">
              <h2 className="font-tech text-3xl sm:text-4xl font-bold text-zinc-100 uppercase tracking-wider">
                {isRound2 ? 'ROUND 2: "ON AIR" FINALE' : 'ROUND 1: THE DISAPPEARANCE OF ALAN VANCE'}
              </h2>
              <p className="font-mono text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                {isRound2
                  ? 'Finalist teams prepare for rapid forensic questions from the broadcast master.'
                  : 'Teams are actively decrypting frequencies, extracting CCTV frames, and assembling the final case dossier.'}
              </p>
            </div>
          )}
        </div>

        {/* Right: Live Standings Top List */}
        <div className="lg:col-span-4 p-6 sm:p-8 rounded-3xl bg-deadair-900/90 border-2 border-deadair-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-deadair-800 pb-3">
            <div className="flex items-center gap-2 font-tech text-lg font-bold text-deadair-amber">
              <Trophy className="w-5 h-5 text-deadair-amber" />
              <span>LIVE STANDINGS</span>
            </div>
            <span className="text-[11px] text-zinc-500 uppercase">TOP TEAMS</span>
          </div>

          <div className="space-y-2.5">
            {leaderboard.slice(0, 7).map((t, idx) => (
              <div
                key={t.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  idx === 0
                    ? 'bg-amber-950/30 border-deadair-amber text-zinc-100'
                    : 'bg-deadair-950 border-deadair-850 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0
                        ? 'bg-deadair-amber text-black font-bold'
                        : 'bg-deadair-800 text-zinc-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-sm truncate max-w-[140px] sm:max-w-[180px]">
                      {t.team_name}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Room {t.room} • {t.challenges_solved}/5 Solved
                    </div>
                  </div>
                </div>

                <div className="font-tech text-lg font-bold text-deadair-amber">
                  {t.current_score} PTS
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Footer Ticker */}
      <footer className="border-t-2 border-deadair-800 pt-4 flex items-center justify-between text-xs text-zinc-500 z-10">
        <div>W-DEAD 94.7 FM BROADCAST VENUE DISPLAY</div>
        <div>POWERED BY DEAD AIR EVENT ENGINE</div>
      </footer>
    </div>
  );
}
