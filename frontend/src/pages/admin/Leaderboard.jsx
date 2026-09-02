import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Award, ArrowLeft, Radio, Medal, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../../utils/api';
import { playDialClick } from '../../utils/audio';

export function Leaderboard() {
  const [rankedTeams, setRankedTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = async () => {
    try {
      const data = await api.get('/admin/leaderboard');
      setRankedTeams(data || []);
    } catch (err) {
      console.warn('Failed to load leaderboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        to="/dashboard"
        onClick={playDialClick}
        className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-deadair-green transition"
      >
        <ArrowLeft className="w-4 h-4" /> &larr; BACK TO DASHBOARD
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-deadair-amber" />
            <h1 className="font-tech text-2xl sm:text-3xl font-bold text-zinc-100 uppercase tracking-wide">
              EVENT LEADERBOARD & RANKINGS
            </h1>
          </div>
          <p className="font-mono text-xs text-zinc-400">
            Live rankings ranked by total score and tie-broken by earliest verified solve time.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 px-3 py-1.5 rounded-lg bg-deadair-950 border border-deadair-800">
          <span className="w-2 h-2 rounded-full bg-deadair-green animate-ping" />
          <span>LIVE BROADCAST SYNC</span>
        </div>
      </div>

      {/* Rankings List */}
      <div className="bg-deadair-900 border border-deadair-800 rounded-2xl p-6 shadow-2xl space-y-3">
        {rankedTeams.map((team, idx) => {
          const rank = idx + 1;
          const isTop3 = rank <= 3;
          let rankBadge = `${rank}`;
          let borderClass = 'border-deadair-800';

          if (rank === 1) {
            borderClass = 'border-deadair-amber/60 bg-amber-950/20';
          } else if (rank === 2) {
            borderClass = 'border-zinc-400/50 bg-zinc-900';
          } else if (rank === 3) {
            borderClass = 'border-amber-700/50 bg-stone-900';
          }

          return (
            <div
              key={team.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition shadow-md font-mono ${borderClass}`}
            >
              <div className="flex items-center gap-4">
                {/* Rank Number */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-tech font-bold text-base ${
                    rank === 1
                      ? 'bg-deadair-amber text-black shadow-lg glow-amber'
                      : rank === 2
                      ? 'bg-zinc-300 text-black'
                      : rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-deadair-850 text-zinc-400 border border-deadair-700'
                  }`}
                >
                  {rank}
                </div>

                <div>
                  <div className="font-tech text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                    {team.team_name}
                    {team.status === 'finalist' && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-deadair-amber/20 text-deadair-amber border border-deadair-amber/40">
                        FINALIST
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {team.team_id} • Room {team.room} • {team.challenges_solved} / 5 Puzzles Solved
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-tech text-xl sm:text-2xl font-bold text-deadair-amber">
                  {team.current_score} PTS
                </div>
                <div className="text-[10px] text-zinc-500">
                  {team.latest_solve_time ? `Last solve: ${new Date(team.latest_solve_time).toLocaleTimeString()}` : 'No solves yet'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
