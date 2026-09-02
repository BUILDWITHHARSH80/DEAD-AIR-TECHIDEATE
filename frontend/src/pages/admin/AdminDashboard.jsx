import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Users,
  Award,
  Lock,
  Unlock,
  Radio,
  Tv,
  Smartphone,
  Trophy,
  Filter,
  Search,
  PlusCircle,
  RefreshCw,
  FileCheck2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTimer } from '../../context/TimerContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';
import { playDialClick, playSolveChime, playErrorBuzzer } from '../../utils/audio';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export function AdminDashboard() {
  const { user, role, logout } = useAuth();
  const { formattedTime, isPaused, round, resyncTimer } = useTimer();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Score adjust modal state
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [selectedTeamForScore, setSelectedTeamForScore] = useState(null);
  const [scoreDelta, setScoreDelta] = useState(50);
  const [scoreReason, setScoreReason] = useState('');

  // Reset challenge attempt modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedTeamForReset, setSelectedTeamForReset] = useState(null);
  const [selectedChallengeForReset, setSelectedChallengeForReset] = useState('');
  const [resetReason, setResetReason] = useState('');

  // Finalist select state
  const [selectedFinalistIds, setSelectedFinalistIds] = useState([]);

  // Timer controls state
  const [timerDuration, setTimerDuration] = useState(90);

  const loadData = async () => {
    try {
      const roomParam = selectedRoom === 'ALL' ? '' : `?room=${selectedRoom}`;
      const [teamsData, chData] = await Promise.all([
        api.get(`/admin/teams${roomParam}`),
        api.get('/challenges')
      ]);

      setTeams(teamsData || []);
      setChallenges(chData || []);
    } catch (err) {
      console.warn('Failed to load admin data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10s auto refetch
    return () => clearInterval(interval);
  }, [selectedRoom]);

  // Timer Actions
  const handleStartTimer = async () => {
    try {
      playDialClick();
      await api.post('/admin/timer/start', { duration_minutes: timerDuration });
      addToast(`Event countdown started (${timerDuration} min).`, 'success');
      resyncTimer();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handlePauseTimer = async () => {
    try {
      playDialClick();
      await api.post('/admin/timer/pause');
      addToast('Event timer paused.', 'warning');
      resyncTimer();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleResumeTimer = async () => {
    try {
      playDialClick();
      await api.post('/admin/timer/resume');
      addToast('Event timer resumed.', 'success');
      resyncTimer();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Challenge Lock/Unlock Toggle
  const handleToggleChallengeLock = async (ch) => {
    playDialClick();
    const endpoint = ch.is_locked_by_admin ? `/admin/challenges/${ch.id}/unlock` : `/admin/challenges/${ch.id}/lock`;
    try {
      await api.post(endpoint);
      addToast(`Challenge ${ch.title} ${ch.is_locked_by_admin ? 'Unlocked' : 'Locked'}.`, 'info');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Score Adjustment
  const handleOpenScoreModal = (t) => {
    playDialClick();
    setSelectedTeamForScore(t);
    setScoreDelta(50);
    setScoreReason('Bonus for forensic timeline deduction');
    setScoreModalOpen(true);
  };

  const handleConfirmScoreAdjust = async () => {
    if (!selectedTeamForScore || !scoreReason.trim()) return;
    try {
      await api.post('/admin/score/adjust', {
        team_id: selectedTeamForScore.id,
        delta: scoreDelta,
        reason: scoreReason
      });
      playSolveChime();
      addToast(`Score adjusted (${scoreDelta > 0 ? '+' : ''}${scoreDelta} PTS) for ${selectedTeamForScore.team_name}`, 'success');
      setScoreModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Attempt Reset Action
  const handleOpenResetModal = (t) => {
    playDialClick();
    setSelectedTeamForReset(t);
    setSelectedChallengeForReset(challenges[0]?.id || '');
    setResetReason('Hardware glitch dispute resolution');
    setResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!selectedTeamForReset || !selectedChallengeForReset) return;
    try {
      await api.post('/admin/attempts/reset', {
        team_id: selectedTeamForReset.id,
        challenge_id: selectedChallengeForReset,
        reason: resetReason
      });
      playSolveChime();
      addToast(`Attempt state reset for ${selectedTeamForReset.team_name}`, 'info');
      setResetModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Finalist Selection
  const toggleFinalist = (tId) => {
    playDialClick();
    if (selectedFinalistIds.includes(tId)) {
      setSelectedFinalistIds(selectedFinalistIds.filter((x) => x !== tId));
    } else {
      setSelectedFinalistIds([...selectedFinalistIds, tId]);
    }
  };

  const handlePromoteFinalists = async () => {
    if (selectedFinalistIds.length === 0) {
      addToast('Please select at least 1 finalist team.', 'warning');
      return;
    }
    try {
      await api.post('/admin/finalists/select', {
        team_ids: selectedFinalistIds
      });
      playSolveChime();
      addToast(`${selectedFinalistIds.length} Finalists selected! Transitioned to Round 2.`, 'success');
      loadData();
      resyncTimer();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const filteredTeams = teams.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.team_name?.toLowerCase().includes(term) ||
      t.team_id?.toLowerCase().includes(term) ||
      t.room?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Admin Header & Navigation Links */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            <h1 className="font-tech text-2xl sm:text-3xl font-bold text-zinc-100 uppercase tracking-wide">
              GAME MASTER LIVE CONTROL ROOM
            </h1>
          </div>
          <p className="font-mono text-xs text-zinc-400">
            Real-time event monitoring, timer authority, challenge controls, and dispute management.
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/projector"
            target="_blank"
            onClick={playDialClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-xs font-mono text-zinc-200 transition"
          >
            <Tv className="w-4 h-4 text-deadair-green" />
            <span>PROJECTOR VIEW</span>
          </Link>
          <Link
            to="/admin/finale"
            onClick={playDialClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-xs font-mono text-deadair-amber transition"
          >
            <Trophy className="w-4 h-4 text-deadair-amber" />
            <span>FINALE CONSOLE</span>
          </Link>
          <Link
            to="/admin/coordinator"
            onClick={playDialClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-xs font-mono text-cyan-400 transition"
          >
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>COORDINATOR MOBILE</span>
          </Link>
        </div>
      </div>

      {/* Event Timer Authority Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-deadair-800 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-300 font-bold uppercase">
              <Clock className="w-4 h-4 text-deadair-green" />
              <span>GLOBAL EVENT COUNTDOWN AUTHORITY</span>
            </div>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-deadair-850 text-deadair-green border border-deadair-700">
              ROUND {round}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">CURRENT REMAINING</div>
              <div className="font-tech text-4xl sm:text-5xl font-bold text-deadair-green tracking-widest glow-green">
                {formattedTime}
              </div>
              <div className="font-mono text-xs text-zinc-400">
                Status: {isPaused ? <span className="text-deadair-amber font-bold">PAUSED</span> : <span className="text-deadair-green font-bold">RUNNING</span>}
              </div>
            </div>

            {/* Timer Control Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {isPaused ? (
                <button
                  onClick={handleResumeTimer}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-deadair-green text-black font-tech font-bold text-xs uppercase transition shadow-md hover:bg-emerald-400"
                >
                  <Play className="w-4 h-4" /> RESUME TIMER
                </button>
              ) : (
                <button
                  onClick={handlePauseTimer}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-deadair-amber text-black font-tech font-bold text-xs uppercase transition shadow-md hover:bg-amber-400"
                >
                  <Pause className="w-4 h-4" /> PAUSE TIMER
                </button>
              )}

              <div className="flex items-center gap-1 bg-deadair-950 p-1 rounded-lg border border-deadair-800">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(parseInt(e.target.value) || 90)}
                  className="w-16 bg-deadair-900 border border-deadair-700 rounded px-2 py-1.5 font-mono text-xs text-center text-zinc-100"
                />
                <button
                  onClick={handleStartTimer}
                  className="px-3 py-1.5 rounded bg-deadair-850 hover:bg-deadair-800 text-zinc-300 font-mono text-xs transition"
                >
                  SET MINS & START
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Challenge Lock Matrix */}
        <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-3">
          <div className="font-mono text-xs font-bold text-zinc-300 uppercase border-b border-deadair-800 pb-2 flex items-center justify-between">
            <span>CHALLENGE LOCKS</span>
            <span className="text-[10px] text-zinc-500">TOGGLE LIVE</span>
          </div>

          <div className="space-y-2">
            {challenges.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between p-2 rounded-lg bg-deadair-950 border border-deadair-800 font-mono text-xs"
              >
                <span className="text-zinc-300 truncate max-w-[160px]">{ch.title}</span>
                <button
                  onClick={() => handleToggleChallengeLock(ch)}
                  className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold transition flex items-center gap-1 ${
                    ch.is_locked_by_admin
                      ? 'bg-deadair-crimson/20 text-deadair-crimson border border-deadair-crimson/40'
                      : 'bg-deadair-green/20 text-deadair-green border border-deadair-green/40'
                  }`}
                >
                  {ch.is_locked_by_admin ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{ch.is_locked_by_admin ? 'LOCKED' : 'OPEN'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Teams Monitoring Table */}
      <div className="p-6 rounded-2xl bg-deadair-900 border border-deadair-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-deadair-800 pb-4">
          <div className="space-y-1">
            <h2 className="font-tech text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-deadair-green" />
              <span>LIVE TEAM MONITORING MATRIX</span>
            </h2>
            <p className="font-mono text-xs text-zinc-400">
              Total {filteredTeams.length} active teams across all rooms.
            </p>
          </div>

          {/* Room Filter & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search team or room..."
                className="bg-deadair-950 border border-deadair-700 rounded-lg px-3 py-1.5 pl-8 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-400"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            </div>

            <div className="flex rounded-lg bg-deadair-950 p-1 border border-deadair-800 font-mono text-xs">
              {['ALL', 'A', 'B', 'C', 'D'].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    playDialClick();
                    setSelectedRoom(r);
                  }}
                  className={`px-2.5 py-1 rounded transition ${
                    selectedRoom === r
                      ? 'bg-cyan-400 text-black font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {r === 'ALL' ? 'ALL ROOMS' : `ROOM ${r}`}
                </button>
              ))}
            </div>

            <button
              onClick={loadData}
              title="Refresh Data"
              className="p-2 rounded-lg bg-deadair-850 border border-deadair-700 text-zinc-400 hover:text-zinc-100 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Teams Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-deadair-800 text-zinc-500 uppercase">
                <th className="py-3 px-3">Team</th>
                <th className="py-3 px-3">Room</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-3">Solves (0/5)</th>
                <th className="py-3 px-3">Attempts</th>
                <th className="py-3 px-3">Files</th>
                <th className="py-3 px-3">ECHO</th>
                <th className="py-3 px-3">Session</th>
                <th className="py-3 px-3">Dossier</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deadair-850">
              {filteredTeams.map((team) => (
                <tr key={team.id} className="hover:bg-deadair-850/50 transition">
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-zinc-100">{team.team_name}</div>
                    <div className="text-[10px] text-zinc-500">{team.team_id}</div>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-deadair-850 text-zinc-300 border border-deadair-700">
                      Room {team.room}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 font-bold text-deadair-amber text-sm">
                    {team.current_score} PTS
                  </td>

                  <td className="py-3.5 px-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      team.challenges_solved === 5
                        ? 'bg-deadair-green/20 text-deadair-green border border-deadair-green/40'
                        : 'bg-deadair-850 text-zinc-300'
                    }`}>
                      {team.challenges_solved} / 5
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-zinc-400">
                    {team.total_attempts}
                  </td>

                  <td className="py-3.5 px-3 text-cyan-400">
                    {team.files_unlocked}
                  </td>

                  <td className="py-3.5 px-3 text-zinc-400">
                    {team.echo_prompts_used} / 5
                  </td>

                  <td className="py-3.5 px-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase ${
                      team.is_logged_in
                        ? 'bg-deadair-green/10 text-deadair-green'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${team.is_logged_in ? 'bg-deadair-green animate-pulse' : 'bg-zinc-600'}`} />
                      {team.is_logged_in ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </td>

                  <td className="py-3.5 px-3">
                    {team.final_submission_locked ? (
                      <span className="px-2 py-0.5 rounded bg-deadair-green/10 text-deadair-green text-[10px] font-bold border border-deadair-green/30">
                        SEALED
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-[10px]">DRAFT</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleOpenScoreModal(team)}
                      className="px-2.5 py-1 rounded bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-deadair-amber font-mono text-[11px] transition"
                    >
                      ADJUST SCORE
                    </button>
                    <button
                      onClick={() => handleOpenResetModal(team)}
                      className="px-2.5 py-1 rounded bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-zinc-400 hover:text-deadair-crimson font-mono text-[11px] transition"
                    >
                      RESET ATTEMPT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Finalist Selection Action */}
        <div className="pt-4 border-t border-deadair-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-mono text-xs text-zinc-400">
            Top teams advance to Round 2 "On Air" finale stage presentation.
          </div>
          <Link
            to="/admin/finale"
            className="px-6 py-2.5 rounded-lg bg-deadair-amber hover:bg-amber-400 text-black font-tech font-bold text-xs uppercase transition flex items-center gap-2 shadow-lg"
          >
            <Trophy className="w-4 h-4" />
            <span>OPEN ROUND 2 FINALE STAGE CONTROLLER &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Manual Score Adjustment Modal */}
      {scoreModalOpen && selectedTeamForScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-deadair-900 border border-deadair-700 rounded-xl p-6 space-y-4 shadow-2xl font-mono text-xs">
            <h3 className="font-tech text-lg font-bold text-zinc-100 uppercase">
              Adjust Score: {selectedTeamForScore.team_name}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1 uppercase">Points Delta (+ or -)</label>
                <input
                  type="number"
                  value={scoreDelta}
                  onChange={(e) => setScoreDelta(parseInt(e.target.value) || 0)}
                  className="w-full bg-deadair-950 border border-deadair-700 rounded-lg p-2.5 text-zinc-100 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 uppercase">Audit Justification / Reason *</label>
                <textarea
                  rows={2}
                  value={scoreReason}
                  onChange={(e) => setScoreReason(e.target.value)}
                  placeholder="e.g. Special bonus for forensic timeline deduction..."
                  className="w-full bg-deadair-950 border border-deadair-700 rounded-lg p-2.5 text-zinc-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-deadair-800">
              <button
                onClick={() => setScoreModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-deadair-850 text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmScoreAdjust}
                className="px-4 py-2 rounded-lg bg-deadair-amber text-black font-bold uppercase"
              >
                Apply Score Delta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attempt Reset Modal */}
      {resetModalOpen && selectedTeamForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-deadair-900 border border-deadair-700 rounded-xl p-6 space-y-4 shadow-2xl font-mono text-xs">
            <h3 className="font-tech text-lg font-bold text-deadair-crimson uppercase">
              Reset Challenge Solve State: {selectedTeamForReset.team_name}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1 uppercase">Select Challenge</label>
                <select
                  value={selectedChallengeForReset}
                  onChange={(e) => setSelectedChallengeForReset(e.target.value)}
                  className="w-full bg-deadair-950 border border-deadair-700 rounded-lg p-2.5 text-zinc-100"
                >
                  {challenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 uppercase">Audit Reason for Reset *</label>
                <input
                  type="text"
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="e.g. Device reset / dispute settlement"
                  className="w-full bg-deadair-950 border border-deadair-700 rounded-lg p-2.5 text-zinc-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-deadair-800">
              <button
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-deadair-850 text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-lg bg-deadair-crimson text-white font-bold uppercase"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
