import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, ArrowRight, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { playDialClick, playSolveChime, playErrorBuzzer } from '../../utils/audio';

export function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { loginAdmin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      playErrorBuzzer();
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await loginAdmin(username, password);
      playSolveChime();
      if (res.admin.role === 'room_coordinator') {
        navigate('/admin/coordinator');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      playErrorBuzzer();
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (user, pass) => {
    playDialClick();
    setUsername(user);
    setPassword(pass);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-deadair-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.05)_0,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-deadair-900 border border-deadair-700 shadow-xl mb-2">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="font-tech text-3xl font-bold tracking-wider text-zinc-100 uppercase">
            GAME MASTER <span className="text-cyan-400">CONTROL</span>
          </h1>
          <p className="font-mono text-xs text-zinc-400">
            DEAD AIR EVENT PLATFORM COMMAND CENTER
          </p>
        </div>

        <div className="bg-deadair-900/90 border border-deadair-800 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="border-b border-deadair-800 pb-3 flex items-center justify-between">
            <span className="font-mono text-xs uppercase text-zinc-400">ADMINISTRATOR AUTH</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-deadair-850 text-cyan-400 border border-deadair-700">
              RESTRICTED
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
                Admin Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g. admin or coord_a"
                  className="w-full bg-deadair-950 border border-deadair-700 rounded-lg px-3.5 py-2.5 pl-10 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-400"
                />
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1.5 uppercase">
                Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-deadair-950 border border-deadair-700 rounded-lg px-3.5 py-2.5 pl-10 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-400"
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-tech font-bold text-sm tracking-wider uppercase transition shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <span>{loading ? 'AUTHENTICATING...' : 'ENTER COMMAND CONSOLE'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          </form>

          {/* Demo Quick Fill */}
          <div className="pt-2 border-t border-deadair-800 space-y-2">
            <div className="text-[11px] font-mono text-zinc-500 text-center uppercase">
              Quick Admin Demo Fill
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => fillDemo('admin', 'DeadAir2026!')}
                className="px-2.5 py-1 rounded bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-cyan-400 font-mono text-xs transition"
              >
                Super Admin (admin)
              </button>
              <button
                type="button"
                onClick={() => fillDemo('coord_a', 'playdeadair')}
                className="px-2.5 py-1 rounded bg-deadair-850 hover:bg-deadair-800 border border-deadair-700 text-zinc-300 font-mono text-xs transition"
              >
                Room A Coordinator
              </button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/login"
            onClick={playDialClick}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-deadair-green transition"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>&larr; Return to Team Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
