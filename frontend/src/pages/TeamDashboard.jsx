import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio,
  Award,
  FolderLock,
  Cpu,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  FileSearch,
  GitBranch,
  HelpCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { api } from '../utils/api';
import { playDialClick } from '../utils/audio';

export function TeamDashboard() {
  const { user, refreshAuth } = useAuth();
  const { formattedTime, isPaused, round } = useTimer();

  const [challenges, setChallenges] = useState([]);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [echoRemaining, setEchoRemaining] = useState(5);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [chData, evData, echoData] = await Promise.all([
        api.get('/challenges'),
        api.get('/evidence'),
        api.get('/echo/history')
      ]);

      setChallenges(chData || []);
      const unlockedFiles = (evData || []).filter((f) => f.is_unlocked).length;
      setEvidenceCount(unlockedFiles);
      setEchoRemaining(echoData?.prompts_remaining ?? 5);
      await refreshAuth();
    } catch (err) {
      console.warn('Dashboard load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const solvedCount = challenges.filter((c) => c.is_solved).length;

  const challengeSlugIcons = {
    frequency: '📻',
    static: '⚡',
    script: '📜',
    frame: '📹',
    echo: '🤖'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner & Mission Briefing */}
      <div className="relative rounded-2xl bg-gradient-to-r from-deadair-900 via-deadair-850 to-deadair-900 border border-deadair-800 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_center,rgba(0,255,102,0.08)_0,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-deadair-green/10 text-deadair-green border border-deadair-green/30">
                STATION W-DEAD 94.7 FM
              </span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-deadair-800 text-zinc-300 border border-deadair-700">
                ROOM {user?.room || 'A'}
              </span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-deadair-amber/10 text-deadair-amber border border-deadair-amber/30">
                ROUND {round} {round === 2 ? '• ON AIR FINALE' : '• INVESTIGATION'}
              </span>
            </div>
            <h1 className="font-tech text-2xl sm:text-3xl font-bold tracking-wide text-zinc-100">
              TEAM: {user?.team_name?.toUpperCase() || 'STATION INVESTIGATORS'}
            </h1>
            <p className="font-mono text-xs text-zinc-400 leading-relaxed">
              At 23:54 on October 31, 1984, midnight host Alan Vance disappeared during a 7-minute station blackout. Solve the 5 signal challenges to unlock evidence, reconstruct the timeline, and submit your final case theory before the transmitter timer runs out.
            </p>
          </div>

          {/* Quick Stats Pill Block */}
          <div className="flex flex-wrap md:flex-col gap-3 justify-start md:justify-center">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-deadair-950 border border-deadair-800 shadow-inner">
              <Award className="w-6 h-6 text-deadair-amber" />
              <div>
                <div className="font-mono text-[10px] text-zinc-400 uppercase">CURRENT SCORE</div>
                <div className="font-tech text-xl font-bold text-deadair-amber">{user?.current_score || 0} PTS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-deadair-900 border border-deadair-800 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-xs uppercase">Solved Puzzles</span>
            <CheckCircle2 className="w-4 h-4 text-deadair-green" />
          </div>
          <div className="font-tech text-2xl font-bold text-zinc-100">{solvedCount} / 5</div>
          <div className="font-mono text-[11px] text-zinc-500">Unlimited attempts per puzzle</div>
        </div>

        <div className="p-5 rounded-xl bg-deadair-900 border border-deadair-800 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-xs uppercase">Evidence Unlocked</span>
            <FolderLock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-tech text-2xl font-bold text-cyan-400">{evidenceCount} / 5 Files</div>
          <div className="font-mono text-[11px] text-zinc-500">Ready in Evidence Room</div>
        </div>

        <div className="p-5 rounded-xl bg-deadair-900 border border-deadair-800 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-xs uppercase">ECHO Battery</span>
            <Cpu className="w-4 h-4 text-deadair-amber" />
          </div>
          <div className="font-tech text-2xl font-bold text-deadair-amber">{echoRemaining} / 5 Tokens</div>
          <div className="font-mono text-[11px] text-zinc-500">Atomic AI terminal quota</div>
        </div>

        <div className="p-5 rounded-xl bg-deadair-900 border border-deadair-800 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-xs uppercase">Broadcast Clock</span>
            <Clock className="w-4 h-4 text-deadair-green" />
          </div>
          <div className="font-tech text-2xl font-bold text-deadair-green">{formattedTime}</div>
          <div className="font-mono text-[11px] text-zinc-500">{isPaused ? 'Timer Paused by Admin' : 'Active Countdown'}</div>
        </div>
      </div>

      {/* 5 Core Challenges Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-tech text-xl font-bold text-zinc-100 flex items-center gap-2">
              <span>INVESTIGATION FREQUENCIES</span>
              <span className="text-xs font-mono text-zinc-400 font-normal">(5 CORE CHALLENGES)</span>
            </h2>
            <p className="font-mono text-xs text-zinc-400">
              Each challenge can be attempted an unlimited number of times. First correct solve sets your permanent solve time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {challenges.map((ch, idx) => {
            const isSolved = ch.is_solved;
            const emoji = challengeSlugIcons[ch.slug] || '📻';

            return (
              <Link
                key={ch.id}
                to={`/challenges/${ch.slug}`}
                onClick={playDialClick}
                className={`group relative rounded-xl p-5 border transition flex flex-col justify-between shadow-xl backdrop-blur-sm ${
                  isSolved
                    ? 'bg-deadair-900/90 border-deadair-green/40 hover:border-deadair-green hover:shadow-deadair-green/5'
                    : 'bg-deadair-900 border-deadair-800 hover:border-zinc-500 hover:bg-deadair-850'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{emoji}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-deadair-850 text-deadair-amber border border-deadair-700">
                        +{ch.points_value} PTS
                      </span>
                      {isSolved ? (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-deadair-green/20 text-deadair-green border border-deadair-green/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> SOLVED
                        </span>
                      ) : (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-deadair-800 text-zinc-400 border border-deadair-700">
                          {ch.attempt_count > 0 ? `${ch.attempt_count} ATTEMPTS` : 'OPEN'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                      CHALLENGE #{idx + 1} • {ch.slug.toUpperCase()}
                    </div>
                    <h3 className="font-tech text-lg font-bold text-zinc-100 group-hover:text-deadair-green transition">
                      {ch.title}
                    </h3>
                  </div>

                  <p className="font-mono text-xs text-zinc-400 line-clamp-2">
                    {ch.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-deadair-800 flex items-center justify-between text-xs font-mono text-zinc-400 group-hover:text-zinc-200">
                  <span>{isSolved ? 'Review Solved Puzzle' : 'Open Frequency Terminal'}</span>
                  <ArrowRight className="w-4 h-4 text-deadair-green group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Next Steps: Timeline & Final Case Submission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <Link
          to="/timeline"
          onClick={playDialClick}
          className="group p-6 rounded-xl bg-deadair-900 border border-deadair-800 hover:border-cyan-500 transition shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-lg bg-cyan-950/40 text-cyan-400 border border-cyan-800">
              <GitBranch className="w-6 h-6" />
            </div>
            <span className="font-mono text-xs text-cyan-400 font-bold uppercase">+200 PTS TOTAL</span>
          </div>
          <h3 className="font-tech text-lg font-bold text-zinc-100 group-hover:text-cyan-400 transition">
            Reconstruct Broadcast Timeline
          </h3>
          <p className="font-mono text-xs text-zinc-400">
            Organize the 4 key moments between 23:15 and 23:54 using decrypted evidence logs.
          </p>
        </Link>

        <Link
          to="/final-submission"
          onClick={playDialClick}
          className="group p-6 rounded-xl bg-deadair-900 border border-deadair-800 hover:border-deadair-amber transition shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-lg bg-amber-950/40 text-deadair-amber border border-amber-800">
              <FileSearch className="w-6 h-6" />
            </div>
            <span className="font-mono text-xs text-deadair-amber font-bold uppercase">FINAL DOSSIER</span>
          </div>
          <h3 className="font-tech text-lg font-bold text-zinc-100 group-hover:text-deadair-amber transition">
            Submit Final Case Theory
          </h3>
          <p className="font-mono text-xs text-zinc-400">
            Formulate your case theory on Alan Vance's fate, the involved conspirators, and the escape route.
          </p>
        </Link>
      </div>
    </div>
  );
}
