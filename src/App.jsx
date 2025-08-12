// import React, { useState, useEffect, useRef } from 'react';
// import supabase from './config/supabase';
// import api from './utils/api';
// import { QR_REFRESH_TIME, QR_REFRESH_INTERVAL, MAX_QR_REQUESTS } from './constants/app';

// // Components
// import LoginPage from './components/pages/LoginPage';
// import DashboardPage from './components/pages/DashboardPage';
// import QrDisplayPage from './components/pages/QrDisplayPage';

// // --- Main App Component ---
// export default function App() {
//   const [session, setSession] = useState(null);
//   const [view, setView] = useState('login'); // 'login', 'dashboard', 'qr'
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   const [upcomingSessions, setUpcomingSessions] = useState([]);
//   const [selectedSession, setSelectedSession] = useState(null);
//   const [qrToken, setQrToken] = useState(null);
//   const [countdown, setCountdown] = useState(QR_REFRESH_TIME);
//   // State
//   const [requestCount, setRequestCount] = useState(0);
  
//   // Refs for tracking state and timers
//   const qrGenerationStarted = useRef(false);
//   const qrGenerationTimeout = useRef(null);
//   const countdownInterval = useRef(null);
//   const requestCountRef = useRef(0);

//   useEffect(() => {
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setSession(session);
//       if (session) {
//         api.setToken(session.access_token);
//         setView('dashboard');
//       }
//       setLoading(false);
//     });

//     const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
//       setSession(session);
//       if (session) {
//         api.setToken(session.access_token);
//         setView('dashboard');
//       } else {
//         api.setToken(null);
//         setView('login');
//       }
//     });

//     return () => subscription.unsubscribe();
//   }, []);

//   // Fetch sessions only once when the component mounts or when session changes
//   useEffect(() => {
//     const fetchSessions = async () => {
//       if (session) {  // Only fetch if we have a session
//         setLoading(true);
//         setError('');
//         try {
//           const sessionsData = await api.get('/api/v1/session/faculty_upcoming');
//           setUpcomingSessions(sessionsData);
//         } catch (err) {
//           setError(err.message);
//         } finally {
//           setLoading(false);
//         }
//       }
//     };
    
//     // Only fetch if we don't have any sessions yet
//     if (session && upcomingSessions.length === 0) {
//       fetchSessions();
//     }
//   }, [session, upcomingSessions.length]); // Added upcomingSessions.length to dependencies

//   // --- QR Code Generation Logic ---
//   useEffect(() => {
//     // Skip if not in QR view or no session
//     if (view !== 'qr' || !selectedSession) {
//       return;
//     }
    
//     // Reset state when starting new QR generation
//     if (!qrGenerationStarted.current) {
//       qrGenerationStarted.current = true;
//       requestCountRef.current = 0;
//       setRequestCount(0);
//     }
    
//     let timeoutId = null;
//     let intervalId = null;
    
//     const generateQrCode = async () => {
//       // Check if we've reached the maximum number of requests
//       if (requestCountRef.current >= MAX_QR_REQUESTS) {
//         setError(`Maximum QR generations (${MAX_QR_REQUESTS}) reached.`);
//         stopQrGeneration();
//         return;
//       }

//       try {
//         setError('');
//         setCountdown(0); // Show 0 while generating
        
//         const response = await api.post('/api/v1/attendance/generateQrCode', {
//           sessionId: selectedSession.id
//         });

//         // Update state with new token
//         requestCountRef.current++;
//         setRequestCount(requestCountRef.current);
//         setQrToken(response.data.token);
        
//         // Start countdown from 3
//         setCountdown(QR_REFRESH_TIME);
        
//         // Clear any existing interval
//         if (intervalId) clearInterval(intervalId);
        
//         // Start countdown
//         let count = QR_REFRESH_TIME;
//         intervalId = setInterval(() => {
//           count--;
//           setCountdown(count);
          
//           if (count === 1 && requestCountRef.current < MAX_QR_REQUESTS) {
//             // Schedule next generation when countdown is at 1
//             timeoutId = setTimeout(generateQrCode, 1000);
//           }
          
//           if (count <= 0) {
//             clearInterval(intervalId);
//           }
//         }, 1000);
        
//       } catch (err) {
//         setError('Failed to generate QR code: ' + err.message);
//         stopQrGeneration();
//       }
//     };

//     // Initial generation
//     if (requestCountRef.current < MAX_QR_REQUESTS) {
//       generateQrCode();
//     }

//     // Cleanup function
//     return () => {
//       if (timeoutId) clearTimeout(timeoutId);
//       if (intervalId) clearInterval(intervalId);
//     };
//   }, [view, selectedSession]);

//   const handleLogin = async (email, password) => {
//     setLoading(true);
//     setError('');
//     try {
//       const { session: backendSession } = await api.login(email, password);
//       if (backendSession) {
//         await supabase.auth.setSession(backendSession);
//       } else {
//         throw new Error('Login successful, but no session received.');
//       }
//     } catch (err) {
//       setError(err.message || 'Login failed');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogout = async () => {
//     await supabase.auth.signOut();
//     setUpcomingSessions([]);
//   };

//   const startQrGeneration = (session) => {
//     // Clear any existing intervals/timeouts
//     if (qrGenerationTimeout.current) clearTimeout(qrGenerationTimeout.current);
//     if (countdownInterval.current) clearInterval(countdownInterval.current);
    
//     // Reset state
//     setSelectedSession(session);
//     setRequestCount(0);
//     qrGenerationStarted.current = false;
//     setView('qr');
//   };

//   const stopQrGeneration = () => {
//     // Clear all timers
//     if (qrGenerationTimeout.current) clearTimeout(qrGenerationTimeout.current);
//     if (countdownInterval.current) clearInterval(countdownInterval.current);
    
//     // Reset state
//     setQrToken(null);
//     setSelectedSession(null);
//     setRequestCount(0);
//     qrGenerationStarted.current = false;
//     setView('dashboard');
//   };

//   if (loading && !session) {
//     return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">Loading...</div>;
//   }
  
//   const renderView = () => {
//     switch(view) {
//       case 'dashboard':
//         return <DashboardPage
//                  user={session.user}
//                  onLogout={handleLogout}
//                  sessions={upcomingSessions}
//                  loading={loading}
//                  error={error}
//                  onStartAttendance={startQrGeneration}
//                />;
//       case 'qr':
//         return <QrDisplayPage
//                  session={selectedSession}
//                  qrToken={qrToken}
//                  countdown={countdown}
//                  onStop={stopQrGeneration}
//                  error={error}
//                  requestCount={requestCount}
//                />;
//       case 'login':
//       default:
//         return <LoginPage onLogin={handleLogin} error={error} loading={loading} />;
//     }
//   }

//   return (
//     <div className="bg-black text-white min-h-screen font-sans">
//       {renderView()}
//     </div>
//   );
// }

import React, { useState, useEffect, useRef } from 'react';
import supabase from './config/supabase';
import api from './utils/api';
import { QR_REFRESH_TIME, MAX_QR_REQUESTS } from './constants/app';

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
  
  // Refs for tracking state and timers
  const qrGenerationStarted = useRef(false);
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

  // Fetch sessions only once when the component mounts or when session changes
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
    
    if (session && upcomingSessions.length === 0) {
      fetchSessions();
    }
  }, [session, upcomingSessions.length]);

  // --- QR Code Generation Logic with Pre-fetching ---
  useEffect(() => {
    if (view !== 'qr' || !selectedSession) {
      return;
    }
    
    if (!qrGenerationStarted.current) {
      qrGenerationStarted.current = true;
      requestCountRef.current = 0;
      setRequestCount(0);
    }
    
    let timeoutId = null;
    let intervalId = null;
    
    const generateQrCode = async () => {
      if (requestCountRef.current >= MAX_QR_REQUESTS) {
        setError(`Maximum QR generations (${MAX_QR_REQUESTS}) reached.`);
        stopQrGeneration();
        return;
      }

      try {
        setError('');
        // Don't reset countdown to 0, to avoid UI flicker
        
        const response = await api.post('/api/v1/attendance/generateQrCode', {
          sessionId: selectedSession.id
        });

        requestCountRef.current++;
        setRequestCount(requestCountRef.current);
        setQrToken(response.data.token);
        
        setCountdown(QR_REFRESH_TIME);
        
        if (intervalId) clearInterval(intervalId);
        
        let count = QR_REFRESH_TIME;
        intervalId = setInterval(() => {
          count--;
          setCountdown(count);
          
          // **PRE-FETCHING LOGIC**
          // When the countdown hits 1, start fetching the next token.
          if (count === 1 && requestCountRef.current < MAX_QR_REQUESTS) {
            timeoutId = setTimeout(generateQrCode, 1000);
          }
          
          if (count <= 0) {
            clearInterval(intervalId);
          }
        }, 1000);
        
      } catch (err) {
        setError('Failed to generate QR code: ' + err.message);
        stopQrGeneration();
      }
    };

    if (requestCountRef.current < MAX_QR_REQUESTS) {
      generateQrCode();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
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
    qrGenerationStarted.current = false;
    setSelectedSession(session);
    setView('qr');
  };

  const stopQrGeneration = () => {
    setQrToken(null);
    setSelectedSession(null);
    qrGenerationStarted.current = false;
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