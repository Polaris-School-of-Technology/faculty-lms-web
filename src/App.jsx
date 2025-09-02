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

  // --- NEW: State for location and specific loading ---
  const [location, setLocation] = useState(null);
  const [startingSessionId, setStartingSessionId] = useState(null);


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


  // --- MODIFIED: QR Code Generation Logic with Location ---
  useEffect(() => {
    // Return early if we aren't in the right view or don't have location data
    if (view !== 'qr' || !selectedSession || !location) {
      return;
    }

    const runQrCycle = async () => {
      if (requestCountRef.current >= MAX_QR_REQUESTS) {
        stopQrGeneration(true); 
        return;
      }

      try {
        setError('');
        setQrToken(null); 

        // Send location data to the backend
        const response = await api.post('/api/v1/attendance/generateQrCode', {
          sessionId: selectedSession.id,
          latitude: location.latitude,
          longitude: location.longitude,
        });

        requestCountRef.current++;
        setRequestCount(requestCountRef.current);
        setQrToken(response.data.token);
        setCountdown(QR_REFRESH_TIME);

        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        
        apiTimerRef.current = setTimeout(runQrCycle, QR_REFRESH_TIME * 1000);

      } catch (err) {
        setError('Failed to generate QR code: ' + err.message);
        stopQrGeneration();
      }
    };

    runQrCycle();

    return () => {
      if (apiTimerRef.current) clearTimeout(apiTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [view, selectedSession, location]); // Added location to dependency array

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

  // --- MODIFIED: Fetches location before starting ---
  const startQrGeneration = async (session) => {
    setStartingSessionId(session.id);
    setError('');
    
    try {
      // Promisify the Geolocation API
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          return reject(new Error("Geolocation is not supported by your browser."));
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      
      // On success, set state to trigger the QR generation useEffect
      setLocation(coords);
      setSelectedSession(session);
      requestCountRef.current = 0;
      setView('qr');

    } catch (err) {
      let errorMessage = 'Could not get location. ';
      switch(err.code) {
        case err.PERMISSION_DENIED:
          errorMessage += 'Please allow location access in your browser settings.';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage += 'Location information is currently unavailable.';
          break;
        case err.TIMEOUT:
          errorMessage += 'Request for location timed out.';
          break;
        default:
          errorMessage += err.message;
      }
      setError(errorMessage);
    } finally {
      setStartingSessionId(null);
    }
  };


  const stopQrGeneration = async (isAutoStop = false) => {
    if (apiTimerRef.current) clearTimeout(apiTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    if (selectedSession) {
      try {
        await api.post('/api/v1/attendance/complete', { sessionId: selectedSession.id });
      } catch (err) {
        setError(isAutoStop ? `Max requests reached. Session marked as complete.` : `Failed to stop session: ${err.message}`);
      }
    }
    
    setQrToken(null);
    setSelectedSession(null);
    setLocation(null); // Clear location data
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
                 startingSessionId={startingSessionId}
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