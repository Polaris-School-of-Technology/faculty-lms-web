import React, { useState, useEffect, useRef } from 'react';
import supabase from './config/supabase';
import api from './utils/api';
import { QR_REFRESH_TIME, QR_REFRESH_INTERVAL, MAX_QR_REQUESTS } from './constants/app';

// Components
import LoginPage from './components/pages/LoginPage';
import DashboardPage from './components/pages/DashboardPage';
import QrDisplayPage from './components/pages/QrDisplayPage';

// --- Main App Component ---
export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('login'); // 'login', 'dashboard', 'qr'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [countdown, setCountdown] = useState(QR_REFRESH_TIME);
  const [requestCount, setRequestCount] = useState(0);

  // --- Refs for timers and counters ---
  const qrGenerationTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const requestCountRef = useRef(0);

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
      if (session && view === 'dashboard') {
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
    fetchSessions();
  }, [session, view]);

  // --- Corrected QR Generation Logic ---
  useEffect(() => {
    // Only run this effect when we are on the QR page with a selected session
    if (view === 'qr' && selectedSession) {
      const generateQrCode = async () => {
        // Use the ref to check the request count
        if (requestCountRef.current >= MAX_QR_REQUESTS) {
          setError(`Maximum QR generations (${MAX_QR_REQUESTS}) reached.`);
          stopQrGeneration(); // This will clear timers and switch view
          return;
        }

        try {
          setError('');
          const response = await api.post('/api/v1/attendance/generateQrCode', {
            sessionId: selectedSession.id
          });

          // Increment the ref and update the state for display
          requestCountRef.current++;
          setRequestCount(requestCountRef.current);
          setQrToken(response.data.token);
          setCountdown(QR_REFRESH_TIME); // Reset countdown on successful generation

          // Schedule the next generation using a ref for the timeout ID
          qrGenerationTimeoutRef.current = setTimeout(generateQrCode, QR_REFRESH_INTERVAL);

        } catch (err) {
          setError('Failed to generate QR code: ' + err.message);
          stopQrGeneration();
        }
      };

      // Initial call to start the generation cycle
      generateQrCode();

      // Set up a separate, simple countdown timer
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      // Cleanup function to clear timers when the view changes or component unmounts
      return () => {
        clearTimeout(qrGenerationTimeoutRef.current);
        clearInterval(countdownIntervalRef.current);
      };
    }
    // The dependency array is now correct, preventing the infinite loop
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
    setSelectedSession(session);
    requestCountRef.current = 0; // Reset counter ref
    setRequestCount(0); // Reset counter state for display
    setView('qr');
  };

  const stopQrGeneration = () => {
    // Clear timers using the refs
    clearTimeout(qrGenerationTimeoutRef.current);
    clearInterval(countdownIntervalRef.current);
    
    setQrToken(null);
    setSelectedSession(null);
    requestCountRef.current = 0;
    setRequestCount(0);
    setView('dashboard');
  };

  if (loading && !session) {
    return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  const renderView = () => {
    switch(view) {
      case 'dashboard':
        return <DashboardPage
                 user={session.user}
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
                 onStop={stopQrGeneration}
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