import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';

const TimerContext = createContext(null);

export function TimerProvider({ children }) {
  const [eventState, setEventState] = useState({
    round: 1,
    event_start_time: null,
    event_end_time: null,
    is_paused: false,
    paused_at: null,
    paused_duration_accumulated: 0,
    duration_minutes: 90,
  });

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [serverTimeOffset, setServerTimeOffset] = useState(0); // client clock drift correction
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await api.get('/event/state');
      if (res) {
        setEventState(res);
        if (res.server_time) {
          const serverNow = new Date(res.server_time).getTime();
          const clientNow = Date.now();
          setServerTimeOffset(serverNow - clientNow);
        }
        setIsLoaded(true);
      }
    } catch (err) {
      console.warn('Failed to sync event timer state:', err.message);
    }
  }, []);

  // Poll event state every 25 seconds to keep timer synchronized
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 25000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Client-side local 1-second tick computation
  useEffect(() => {
    const updateCountdown = () => {
      if (!eventState.event_end_time) {
        setRemainingSeconds(eventState.duration_minutes * 60);
        return;
      }

      if (eventState.is_paused) {
        // When paused, freeze at the paused moment
        const end = new Date(eventState.event_end_time).getTime();
        const pausedAt = eventState.paused_at ? new Date(eventState.paused_at).getTime() : Date.now() + serverTimeOffset;
        const totalPausedAccum = (eventState.paused_duration_accumulated || 0) * 1000;
        const remaining = Math.max(0, Math.floor((end + totalPausedAccum - pausedAt) / 1000));
        setRemainingSeconds(remaining);
        return;
      }

      const now = Date.now() + serverTimeOffset;
      const end = new Date(eventState.event_end_time).getTime();
      const totalPausedAccum = (eventState.paused_duration_accumulated || 0) * 1000;
      const remaining = Math.max(0, Math.floor((end + totalPausedAccum - now) / 1000));
      setRemainingSeconds(remaining);
    };

    updateCountdown();
    const timerInterval = setInterval(updateCountdown, 1000);
    return () => clearInterval(timerInterval);
  }, [eventState, serverTimeOffset]);

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const formattedTime = `${hours > 0 ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <TimerContext.Provider
      value={{
        round: eventState.round || 1,
        isPaused: eventState.is_paused,
        remainingSeconds,
        formattedTime,
        isExpired: remainingSeconds <= 0 && isLoaded && !!eventState.event_end_time,
        isLoaded,
        resyncTimer: fetchState
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
