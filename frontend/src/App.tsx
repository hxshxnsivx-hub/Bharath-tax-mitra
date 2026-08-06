import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../src/i18n/config';
import { LanguageSelector } from './components/LanguageSelector';
import { AuthFlow } from './components/AuthFlow';
import { AmbientBackground } from './components/layout/AmbientBackground';
import { MainApp } from './pages/MainApp';
import { db } from './lib/db';

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  preferredLanguage: string;
  preferredRegime: 'old' | 'new';
}

function App() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    preferredLanguage: 'en',
    preferredRegime: 'new',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authenticated session on mount
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const profiles = await db.profiles.toArray();
        if (profiles.length > 0) {
          const profile = profiles[0];
          // Consider user authenticated if not a temp profile
          if (!profile.userId.startsWith('temp-') && profile.authToken) {
            setAuthState({
              isAuthenticated: true,
              userId: profile.userId,
              preferredLanguage: profile.languageCode,
              preferredRegime: profile.preferredRegime,
            });
          }
        }
      } catch (error) {
        console.error('Failed to check session:', error);
      } finally {
        setIsLoading(false);
      }
    }
    checkExistingSession();
  }, []);

  const handleAuthSuccess = (userId: string, language: string, regime: 'old' | 'new') => {
    setAuthState({
      isAuthenticated: true,
      userId,
      preferredLanguage: language,
      preferredRegime: regime,
    });
  };

  const handleLogout = async () => {
    try {
      if (authState.userId) {
        await db.profiles.delete(authState.userId);
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
    setAuthState({
      isAuthenticated: false,
      userId: null,
      preferredLanguage: 'en',
      preferredRegime: 'new',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Bharat Tax Mitra</p>
          <p className="text-blue-200 text-sm mt-1">Loading your session...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {/* Story layer under every route — auth, language, and the app itself */}
      <AmbientBackground />
      <Routes>
        {/* Language Selection (entry point) */}
        <Route
          path="/"
          element={
            authState.isAuthenticated
              ? <Navigate to="/app" replace />
              : <LanguageSelector />
          }
        />

        {/* Authentication Flow */}
        <Route
          path="/auth"
          element={
            authState.isAuthenticated
              ? <Navigate to="/app" replace />
              : <AuthFlow onAuthSuccess={handleAuthSuccess} />
          }
        />

        {/* Main Application (protected) */}
        <Route
          path="/app/*"
          element={
            authState.isAuthenticated
              ? <MainApp authState={authState} onLogout={handleLogout} />
              : <Navigate to="/" replace />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
