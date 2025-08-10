import React, { useState, useEffect, useRef } from 'react';
import supabase from './config/supabase';
import api from './utils/api';

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
  const [countdown, setCountdown] = useState(10);
  
  const qrIntervalRef = useRef(null);

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

  useEffect(() => {
    if (view === 'qr' && selectedSession) {
      const generateAndRefreshQr = async () => {
        try {
          setError('');
          const response = await api.post('/api/v1/attendance/generateQrCode', { sessionId: selectedSession.id });
          setQrToken(response.data.token);
          setCountdown(10); // Reset countdown
        } catch (err) {
          setError('Failed to generate QR code: ' + err.message);
          stopQrGeneration();
        }
      };

      generateAndRefreshQr();
      qrIntervalRef.current = setInterval(generateAndRefreshQr, 10000);
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => (prev > 1 ? prev - 1 : 10));
      }, 1000);

      return () => {
        clearInterval(qrIntervalRef.current);
        clearInterval(countdownInterval);
      };
    }
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
    setView('qr');
  };

  const stopQrGeneration = () => {
    clearInterval(qrIntervalRef.current);
    setQrToken(null);
    setSelectedSession(null);
    setView('dashboard');
  };

  if (loading && !session) {
    return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  const renderView = () => {
    switch(view) {
      case 'dashboard':
        return <DashboardPage user={session.user} onLogout={handleLogout} sessions={upcomingSessions} loading={loading} error={error} onStartAttendance={startQrGeneration} />;
      case 'qr':
        return <QrDisplayPage session={selectedSession} qrToken={qrToken} countdown={countdown} onStop={stopQrGeneration} error={error} />;
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

// --- Page Components ---
