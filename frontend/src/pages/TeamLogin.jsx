import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Radio, Lock, Users, AlertCircle, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { playDialClick, playSolveChime, playErrorBuzzer } from '../utils/audio';

export function TeamLogin() {
  const [teamId, setTeamId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { loginTeam } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamId.trim() || !password.trim()) {
      setErrorMsg('Please enter both Team ID and Password.');
      playErrorBuzzer();
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await loginTeam(teamId, password);
      playSolveChime();
      navigate('/dashboard');
    } catch (err) {
      playErrorBuzzer();
      setErrorMsg(err.message || 'Login failed. Verify your Team ID and access code.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (id) => {
    playDialClick();
    setTeamId(id);
    setPassword('playdeadair');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-deadair-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Radio Frequency Grid & Atmospheric Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,102,0.05)_0,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-deadair-green to-transparent opacity-50" />

      <div className="w-full max-w-md space-y-8 z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-deadair-900 border border-deadair-700 shadow-xl mb-2">
            <Radio className="w-8 h-8 text-deadair-green animate-pulse" />
          </div>
          <h1 className="font-tech text-3xl font-bold tracking-wider text-zinc-100 uppercase">
            DEAD AIR <span className="text-deadair-green">94.7 FM</span>
          </h1>
          <p className="font-mono text-xs text-zinc-400">
            OCTOBER 31, 1984 ARCHIVE RECOVERY TERMINAL
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-deadair-900/90 border border-deadair-800 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="border-b border-deadair-800 pb-3 flex items-center justify-between">
            <span className="font-mono text-xs uppercase text-zinc-400">TEAM AUTHENTICATION</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-deadair-850 text-deadair-green border border-deadair-700">
              SECURE LINK
            </span>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-deadair-crimson/10 border border-deadair-crimson/40 text-deadair-crimson font-mono text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1.5 uppercase">
                Team Identifier
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                  placeholder="e.g. TEAM-01"
                  className="w-full bg-deadair-950 border border-deadair-700 rounded-lg px-3.5 py-2.5 pl-10 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-deadair-green focus:ring-1 focus:ring-deadair-green transition"
                />
                <Users className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1.5 uppercase">
                Access Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-deadair-950 border border-deadair-700 rounded-lg px-3.5 py-2.5 pl-10 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-deadair-green focus:ring-1 focus:ring-deadair-green transition"
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Single Session Takeover Disclaimer */}
            <div className="p-3 rounded-lg bg-deadair-850/70 border border-deadair-800 text-[11px] font-mono text-zinc-400 leading-relaxed">
              <strong className="text-zinc-300">Single Active Device Rule:</strong> Logging in from this device will terminate any other active session for this team.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-deadair-green hover:bg-emerald-400 text-black font-tech font-bold text-sm tracking-wider uppercase transition shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <span>{loading ? 'CONNECTING TO FREQUENCY...' : 'ENTER BROADCAST BOOTH'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="pt-2 border-t border-deadair-800 space-y-2">
            <div className="text-[11px] font-mono text-zinc-500 text-center uppercase">
              Quick Demo Fill (Testing)
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {['TEAM-01', 'TEAM-02', 'TEAM-03', 'TEAM-04'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => fillDemo(id)}
                  className="px-2.5 py-1 rounded bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-zinc-400 hover:text-deadair-green font-mono text-xs transition"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Admin Switcher */}
        <div className="text-center">
          <Link
            to="/admin/login"
            onClick={playDialClick}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-cyan-400 transition"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Game Master & Coordinator Terminal &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
