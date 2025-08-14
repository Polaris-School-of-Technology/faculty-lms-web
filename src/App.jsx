// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import supabase from './config/supabase';
import api from './utils/api';
import { QR_REFRESH_TIME, MAX_QR_REQUESTS } from './constants/app';

// Components
import LoginPage from './components/pages/LoginPage';
import DashboardPage from './components/pages/DashboardPage';
import QrDisplayPage from './components/pages/QrDisplayPage';

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('login');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [countdown, setCountdown] = useState(QR_REFRESH_TIME);
  const [requestCount, setRequestCount] = useState(0);

  const requestCountRef = useRef(0);
  const apiTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        api.setToken(session.access_token);
        setView('dashboard');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        api.setToken(session.access_token);
        setView('dashboard');
      } else {
        api.setToken(null);
        setView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      if (session) {
        setLoading(true);
        setError('');
        try {
          const sessionsData = await api.get('/api/v1/session/faculty_upcoming');
          setUpcomingSessions(sessionsData);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    };
    
    if (session) {
      fetchSessions();
    }
  }, [session]);


  // --- FINAL, ROBUST QR Code Generation Logic ---
  useEffect(() => {
    if (view !== 'qr' || !selectedSession) {
      return;
    }

    const runQrCycle = async () => {
      // Check if we've hit the request limit
      if (requestCountRef.current >= MAX_QR_REQUESTS) {
        stopQrGeneration(true); // Auto-stop when limit is reached
        return;
      }

      try {
        setError('');
        setQrToken(null); // Show a loading state

        const response = await api.post('/api/v1/attendance/generateQrCode', {
          sessionId: selectedSession.id
        });

        // --- SUCCESS! Update state and start timers ---
        requestCountRef.current++;
        setRequestCount(requestCountRef.current);
        setQrToken(response.data.token);
        setCountdown(QR_REFRESH_TIME);

        // Clear any old countdown and start a new one
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        
        // Schedule the *next* API call using a timeout
        // This ensures the delay starts *after* the current call is finished
        apiTimerRef.current = setTimeout(runQrCycle, QR_REFRESH_TIME * 1000);

      } catch (err) {
        setError('Failed to generate QR code: ' + err.message);
        stopQrGeneration();
      }
    };

    runQrCycle(); // Initial call to start the loop

    // Cleanup function to clear all timers when the view changes or component unmounts
    return () => {
      if (apiTimerRef.current) clearTimeout(apiTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [view, selectedSession]);

  const handleLogin = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const { session: backendSession } = await api.login(email, password);
      if (backendSession) {
        await supabase.auth.setSession(backendSession);
      } else {
        throw new Error('Login successful, but no session received.');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUpcomingSessions([]);
  };

  const startQrGeneration = (session) => {
    requestCountRef.current = 0; // Reset counter
    setSelectedSession(session);
    setView('qr');
  };

  const stopQrGeneration = async (isAutoStop = false) => {
    // Clear timers immediately
    if (apiTimerRef.current) clearTimeout(apiTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    if (selectedSession) {
      try {
        await api.post('/api/v1/attendance/complete', { sessionId: selectedSession.id });
      } catch (err) {
        if (isAutoStop) {
           setError(`Max requests reached. Session marked as complete.`);
        } else {
           setError(`Failed to stop session: ${err.message}`);
        }
      }
    }
    
    setQrToken(null);
    setSelectedSession(null);
    setView('dashboard');
  };
  
  const renderView = () => {
    switch(view) {
      case 'dashboard':
        return <DashboardPage
                 user={session?.user}
                 onLogout={handleLogout}
                 sessions={upcomingSessions}
                 loading={loading}
                 error={error}
                 onStartAttendance={startQrGeneration}
               />;
      case 'qr':
        return <QrDisplayPage
                 session={selectedSession}
                 qrToken={qrToken}
                 countdown={countdown}
                 onStop={() => stopQrGeneration(false)}
                 error={error}
                 requestCount={requestCount}
               />;
      case 'login':
      default:
        return <LoginPage onLogin={handleLogin} error={error} loading={loading} />;
    }
  }

  return (
    <div className="bg-black text-white min-h-screen font-sans">
      {renderView()}
    </div>
  );
}