import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../utils/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'team', 'super_admin', 'room_coordinator', null
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem('deadair_token');
    if (!token) {
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setRole(res.role);
      setUser(res.data);
    } catch (err) {
      console.warn('Auth validation failed:', err.message);
      localStorage.removeItem('deadair_token');
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();

    // Listen for single-session takeover / expiration
    const handleExpired = (e) => {
      const reason = e.detail || 'Your session has ended.';
      localStorage.removeItem('deadair_token');
      setUser(null);
      setRole(null);
      addToast(`Session Terminated: ${reason}`, 'error', 6000);
    };

    window.addEventListener('deadair_auth_expired', handleExpired);
    return () => window.removeEventListener('deadair_auth_expired', handleExpired);
  }, [refreshAuth, addToast]);

  const loginTeam = async (teamId, password) => {
    const res = await api.post('/auth/team-login', {
      team_id: teamId,
      password: password
    });
    localStorage.setItem('deadair_token', res.access_token);
    setUser(res.team);
    setRole('team');
    addToast(`Connected: Team ${res.team.team_name} (Room ${res.team.room})`, 'success');
    return res;
  };

  const loginAdmin = async (username, password) => {
    const res = await api.post('/auth/admin-login', {
      username: username,
      password: password
    });
    localStorage.setItem('deadair_token', res.access_token);
    setUser(res.admin);
    setRole(res.admin.role);
    addToast(`Admin Access Granted: ${res.admin.username}`, 'success');
    return res;
  };

  const logout = async () => {
    try {
      if (role === 'team') {
        await api.post('/auth/team-logout');
      }
    } catch (err) {
      // ignore
    } finally {
      localStorage.removeItem('deadair_token');
      setUser(null);
      setRole(null);
      addToast('Logged out of station frequencies.', 'info');
    }
  };

  const updateTeamLocalState = (patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoggedIn: !!user,
        loading,
        team: role === 'team' ? user : null,
        admin: role?.includes('admin') || role === 'room_coordinator' ? user : null,
        loginTeam,
        loginAdmin,
        logout,
        refreshAuth,
        updateTeamLocalState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
