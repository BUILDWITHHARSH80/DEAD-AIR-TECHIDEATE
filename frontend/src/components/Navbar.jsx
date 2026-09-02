import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Radio,
  Clock,
  Award,
  FolderLock,
  GitBranch,
  FileCheck2,
  Volume2,
  VolumeX,
  LogOut,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { isSoundEnabled, toggleSound, playDialClick } from '../utils/audio';

export function Navbar() {
  const { user, role, logout } = useAuth();
  const { formattedTime, isPaused, remainingSeconds, round } = useTimer();
  const location = useLocation();
  const navigate = useNavigate();

  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    toggleSound(next);
    if (next) playDialClick();
  };

  const isLowTime = remainingSeconds <= 300 && remainingSeconds > 0; // less than 5 min

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Radio },
    { name: 'Evidence Room', path: '/evidence', icon: FolderLock },
    { name: 'Timeline', path: '/timeline', icon: GitBranch },
    { name: 'Case Theory', path: '/final-submission', icon: FileCheck2 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-deadair-900/90 border-b border-deadair-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Station ID */}
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              onClick={playDialClick}
              className="flex items-center gap-2.5 text-zinc-100 hover:text-deadair-green transition group"
            >
              <div className="w-9 h-9 rounded-lg bg-deadair-850 border border-deadair-700 flex items-center justify-center group-hover:border-deadair-green transition shadow-inner">
                <Radio className="w-5 h-5 text-deadair-green animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-tech text-lg font-bold tracking-wider text-zinc-100 group-hover:text-deadair-green transition flex items-center gap-1.5">
                  DEAD AIR
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-deadair-800 text-zinc-400 border border-deadair-700">
                    94.7 FM
                  </span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {role === 'team' ? `${user?.team_id || 'TEAM'} • ROOM ${user?.room || 'A'}` : 'COMMAND TERMINAL'}
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Live Event Countdown Timer */}
          <div className="hidden md:flex items-center">
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition font-mono ${
                isPaused
                  ? 'bg-deadair-amber/10 border-deadair-amber text-deadair-amber'
                  : isLowTime
                  ? 'bg-deadair-crimson/20 border-deadair-crimson text-deadair-crimson animate-pulse-fast'
                  : 'bg-deadair-850 border-deadair-700 text-deadair-green'
              }`}
            >
              <Clock className={`w-4 h-4 ${isLowTime ? 'animate-spin' : ''}`} />
              <span className="text-xs uppercase font-bold tracking-wider">
                {isPaused ? 'PAUSED' : `ROUND ${round}:`}
              </span>
              <span className="font-bold text-base tracking-widest">{formattedTime}</span>
            </div>
          </div>

          {/* Right Navigation & Status Indicators */}
          <div className="hidden lg:flex items-center gap-4">
            {role === 'team' && (
              <>
                <nav className="flex items-center gap-1">
                  {navLinks.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={playDialClick}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono tracking-wide transition ${
                          isActive
                            ? 'bg-deadair-800 text-deadair-green border border-deadair-700 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-deadair-850'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>

                {/* Score Pill */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-deadair-850 border border-deadair-700 text-deadair-amber font-mono text-sm font-bold shadow-inner">
                  <Award className="w-4 h-4 text-deadair-amber" />
                  <span>{user?.current_score || 0} PTS</span>
                </div>
              </>
            )}

            {(role?.includes('admin') || role === 'room_coordinator') && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-deadair-800 border border-deadair-700 text-xs font-mono text-cyan-400 hover:bg-deadair-700 transition"
              >
                <Shield className="w-4 h-4" />
                ADMIN PANEL
              </Link>
            )}

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundOn ? 'Mute Radio Audio FX' : 'Enable Radio Audio FX'}
              className="p-2 rounded-lg bg-deadair-850 border border-deadair-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-deadair-green" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-lg bg-deadair-850 border border-deadair-700 text-zinc-400 hover:text-deadair-crimson hover:border-deadair-crimson transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            {/* Mobile Timer */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-deadair-850 border border-deadair-700 font-mono text-xs text-deadair-green">
              <Clock className="w-3.5 h-3.5" />
              <span>{formattedTime}</span>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-deadair-850 border border-deadair-700 text-zinc-300 hover:text-zinc-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-deadair-800 bg-deadair-900 px-4 pt-3 pb-4 space-y-2">
          {role === 'team' && (
            <>
              <div className="flex items-center justify-between pb-2 border-b border-deadair-800">
                <span className="font-mono text-xs text-zinc-400">Team: {user?.team_name}</span>
                <span className="font-mono text-xs font-bold text-deadair-amber">{user?.current_score || 0} PTS</span>
              </div>
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      playDialClick();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-mono text-zinc-300 hover:bg-deadair-800"
                  >
                    <Icon className="w-4 h-4 text-deadair-green" />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}

          <div className="pt-2 border-t border-deadair-800 flex items-center justify-between">
            <button
              onClick={handleToggleSound}
              className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-zinc-200"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-deadair-green" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundOn ? 'SFX ON' : 'SFX MUTED'}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="flex items-center gap-1.5 text-xs font-mono text-deadair-crimson hover:underline"
            >
              <LogOut className="w-4 h-4" />
              <span>DISCONNECT</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
