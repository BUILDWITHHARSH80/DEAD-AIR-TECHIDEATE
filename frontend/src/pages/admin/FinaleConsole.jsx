import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Tv, Play, Square, Award, ArrowLeft, Send, Clock, Plus, Minus } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { playDialClick, playSolveChime, playErrorBuzzer } from '../../utils/audio';

export function FinaleConsole() {
  const { addToast } = useToast();

  const [finaleState, setFinaleState] = useState(null);
  const [loading, setLoading] = useState(true);

  const presetQuestions = [
    {
      index: 1,
      title: 'The Blackout Trigger',
      prompt: 'Who authorized the 7-minute power blackout override at 23:54 and from which sub-level room?',
      points: 100,
      time_limit: 60
    },
    {
      index: 2,
      title: 'Maritime Escape',
      prompt: 'What was the vessel name and slipway number that Vance utilized for his harbor evacuation?',
      points: 100,
      time_limit: 60
    },
    {
      index: 3,
      title: 'Signal Offset Frequency',
      prompt: 'What exact MHz frequency carrier transmitted the decoded NAV beacon signal?',
      points: 100,
      time_limit: 60
    },
    {
      index: 4,
      title: 'The Infrasound Experiment',
      prompt: 'What was the official FCC codename for the covert audio resonance testing conducted on W-DEAD?',
      points: 150,
      time_limit: 90
    },
    {
      index: 5,
      title: 'Grand Mystery Revelation',
      prompt: 'State the master classified operation that replaced Project Nightshade and explain its intended purpose.',
      points: 200,
      time_limit: 90
    }
  ];

  const loadFinale = async () => {
    try {
      const data = await api.get('/finale/state');
      setFinaleState(data || {});
    } catch (err) {
      console.warn('Failed to load finale state:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinale();
    const interval = setInterval(loadFinale, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePushQuestion = async (q) => {
    try {
      playDialClick();
      await api.post('/finale/display-question', {
        question_index: q.index,
        title: q.title,
        prompt: q.prompt,
        points: q.points,
        time_limit: q.time_limit
      });
      playSolveChime();
      addToast(`Pushed Question #${q.index} to Projector Screen!`, 'success');
      loadFinale();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleStartTimer = async (seconds) => {
    try {
      playDialClick();
      await api.post('/finale/timer/start', { seconds });
      addToast(`Launched ${seconds}s rapid buzzer countdown on Projector!`, 'success');
      loadFinale();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleStopTimer = async () => {
    try {
      playDialClick();
      await api.post('/finale/timer/stop');
      addToast('Buzzer timer stopped.', 'warning');
      loadFinale();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleScoreTeam = async (teamId, delta, teamName) => {
    try {
      playDialClick();
      await api.post('/finale/score/update', {
        team_id: teamId,
        delta: delta,
        reason: `Stage rapid question bonus: ${delta > 0 ? '+' : ''}${delta} pts`
      });
      playSolveChime();
      addToast(`${delta > 0 ? '+' : ''}${delta} PTS awarded to ${teamName}`, 'success');
      loadFinale();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl">
        <div className="space-y-1">
          <Link
            to="/admin"
            onClick={playDialClick}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-cyan-400 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> &larr; Back to Game Master Console
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-deadair-amber" />
            <h1 className="font-tech text-2xl sm:text-3xl font-bold text-zinc-100 uppercase tracking-wide">
              ROUND 2 "ON AIR" FINALE STAGE MANAGER
            </h1>
          </div>
          <p className="font-mono text-xs text-zinc-400">
            Control live questions, rapid-fire buzzer timers, and finalist scoring mirrored to the venue Projector View.
          </p>
        </div>

        <Link
          to="/projector"
          target="_blank"
          onClick={playDialClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deadair-green hover:bg-emerald-400 text-black font-tech font-bold text-xs uppercase transition shadow-lg self-start sm:self-auto"
        >
          <Tv className="w-4 h-4" />
          <span>LAUNCH PROJECTOR SCREEN</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Preset Rapid-Fire Question Library */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-4">
          <div className="font-mono text-xs font-bold text-zinc-300 uppercase border-b border-deadair-800 pb-3 flex items-center justify-between">
            <span>QUESTION LAUNCHER LIBRARY</span>
            <span className="text-zinc-500 text-[10px]">CLICK TO PUSH TO VENUE SCREEN</span>
          </div>

          <div className="space-y-3">
            {presetQuestions.map((q) => (
              <div
                key={q.index}
                className="p-4 rounded-xl bg-deadair-950 border border-deadair-800 hover:border-zinc-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs"
              >
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-deadair-850 text-deadair-amber border border-deadair-700 font-bold">
                      Q#{q.index} • {q.points} PTS
                    </span>
                    <span className="text-zinc-500">({q.time_limit}s TIMER)</span>
                  </div>
                  <div className="font-tech text-base font-bold text-zinc-100">{q.title}</div>
                  <div className="text-zinc-400 leading-relaxed">{q.prompt}</div>
                </div>

                <button
                  onClick={() => handlePushQuestion(q)}
                  className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-tech font-bold text-xs uppercase transition flex items-center gap-1.5 self-start sm:self-auto shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>DISPLAY ON SCREEN</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Rapid Buzzer Timer & Finalist Live Score Control */}
        <div className="space-y-6">
          {/* Buzzer Timer Panel */}
          <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-4 font-mono text-xs">
            <div className="font-bold text-zinc-300 uppercase border-b border-deadair-800 pb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-deadair-green" />
              <span>RAPID BUZZER TIMER</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-zinc-400">Current Timer Status:</span>
              <span className={finaleState?.is_timer_running ? 'text-deadair-green font-bold glow-green' : 'text-zinc-500'}>
                {finaleState?.is_timer_running ? 'COUNTING DOWN' : 'STOPPED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleStartTimer(60)}
                className="py-2.5 rounded-lg bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-deadair-green font-bold transition flex items-center justify-center gap-1"
              >
                <Play className="w-3.5 h-3.5" /> START 60s
              </button>
              <button
                onClick={() => handleStartTimer(90)}
                className="py-2.5 rounded-lg bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-deadair-amber font-bold transition flex items-center justify-center gap-1"
              >
                <Play className="w-3.5 h-3.5" /> START 90s
              </button>
            </div>

            <button
              onClick={handleStopTimer}
              className="w-full py-2.5 rounded-lg bg-deadair-crimson hover:bg-red-600 text-white font-bold transition flex items-center justify-center gap-1"
            >
              <Square className="w-3.5 h-3.5" /> HALT BUZZER
            </button>
          </div>

          {/* Finalists Live Points Board */}
          <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-4 font-mono text-xs">
            <div className="font-bold text-zinc-300 uppercase border-b border-deadair-800 pb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-deadair-amber" />
              <span>FINALIST TEAMS SCORING</span>
            </div>

            {(!finaleState?.finalist_teams || finaleState.finalist_teams.length === 0) ? (
              <div className="text-zinc-500 py-4 text-center">
                No finalists selected yet. Mark finalists from the main admin matrix.
              </div>
            ) : (
              <div className="space-y-3">
                {finaleState.finalist_teams.map((team) => (
                  <div
                    key={team.id}
                    className="p-3 rounded-xl bg-deadair-950 border border-deadair-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-100">{team.team_name}</span>
                      <span className="font-bold text-deadair-amber text-sm">{team.current_score} PTS</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleScoreTeam(team.id, 100, team.team_name)}
                        className="flex-1 py-1 rounded bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-deadair-green font-bold"
                      >
                        +100
                      </button>
                      <button
                        onClick={() => handleScoreTeam(team.id, 50, team.team_name)}
                        className="flex-1 py-1 rounded bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-cyan-400 font-bold"
                      >
                        +50
                      </button>
                      <button
                        onClick={() => handleScoreTeam(team.id, -50, team.team_name)}
                        className="py-1 px-2.5 rounded bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-deadair-crimson"
                      >
                        -50
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
