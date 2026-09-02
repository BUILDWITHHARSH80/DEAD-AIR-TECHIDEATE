import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Shield, ArrowLeft, Search, Plus, Award, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';
import { playDialClick, playSolveChime } from '../../utils/audio';

export function CoordinatorView() {
  const { user, role } = useAuth();
  const { addToast } = useToast();

  const [teams, setTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Quick score adjust state
  const [activeTeam, setActiveTeam] = useState(null);
  const [delta, setDelta] = useState(25);
  const [reason, setReason] = useState('Room Coordinator clue assistance adjustment');

  const loadTeams = async () => {
    try {
      const data = await api.get('/admin/teams');
      setTeams(data || []);
    } catch (err) {
      console.warn('Failed to load coordinator teams:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleApplyPoints = async (team, points) => {
    try {
      playDialClick();
      await api.post('/admin/score/adjust', {
        team_id: team.id,
        delta: points,
        reason: `[Room ${user?.assigned_room || 'Coord'}] Rapid adjustment`
      });
      playSolveChime();
      addToast(`${points > 0 ? '+' : ''}${points} PTS to ${team.team_name}`, 'success');
      loadTeams();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const filtered = teams.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return t.team_name?.toLowerCase().includes(term) || t.team_id?.toLowerCase().includes(term);
  });

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin"
          onClick={playDialClick}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-cyan-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to GM Console
        </Link>
        <button
          onClick={loadTeams}
          className="p-1.5 rounded-lg bg-deadair-850 text-zinc-400 hover:text-zinc-200"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 rounded-xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-1">
        <div className="flex items-center gap-2 font-mono text-xs text-cyan-400">
          <Smartphone className="w-4 h-4" />
          <span>ROOM COORDINATOR ROAMING PANEL</span>
        </div>
        <h1 className="font-tech text-xl font-bold text-zinc-100">
          {user?.assigned_room ? `ROOM ${user.assigned_room} FLOORS` : 'ALL ROOMS ROAM'}
        </h1>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter teams in room..."
          className="w-full bg-deadair-950 border border-deadair-700 rounded-lg p-3 pl-9 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-400"
        />
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
      </div>

      {/* Mobile Team Cards */}
      <div className="space-y-3">
        {filtered.map((team) => (
          <div
            key={team.id}
            className="p-4 rounded-xl bg-deadair-900 border border-deadair-800 shadow-lg space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-tech text-base font-bold text-zinc-100">{team.team_name}</div>
                <div className="font-mono text-[11px] text-zinc-500">
                  {team.team_id} • Room {team.room} • {team.challenges_solved}/5 Solved
                </div>
              </div>
              <div className="font-tech text-lg font-bold text-deadair-amber">
                {team.current_score} PTS
              </div>
            </div>

            {/* Fast Score Adjustment Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-deadair-800">
              <button
                onClick={() => handleApplyPoints(team, 10)}
                className="flex-1 py-1.5 rounded bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-xs font-mono text-deadair-green font-bold"
              >
                +10 PTS
              </button>
              <button
                onClick={() => handleApplyPoints(team, 25)}
                className="flex-1 py-1.5 rounded bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-xs font-mono text-deadair-amber font-bold"
              >
                +25 PTS
              </button>
              <button
                onClick={() => handleApplyPoints(team, -10)}
                className="py-1.5 px-3 rounded bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-xs font-mono text-deadair-crimson"
              >
                -10
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
