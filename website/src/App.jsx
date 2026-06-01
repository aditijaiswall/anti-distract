import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import useExtensionTheme from './hooks/useExtensionTheme';

// Pages
import LandingPage from './landing/LandingPage';
import AuthPage from './landing/AuthPage';
import Layout from './shared/Layout';
import Dashboard from './app/dashboard/Dashboard';
import PlannerPage from './app/planner/PlannerPage';
import KanbanPage from './app/kanban/KanbanPage';
import CoachPage from './app/coach/CoachPage';
import RoomsPage from './app/rooms/RoomsPage';
import SettingsPage from './app/settings/SettingsPage';

import './index.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ APPLY THEME HERE
  useExtensionTheme();

  useEffect(() => {
    let isMounted = true;

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setSession(session);
        setLoading(false);
        if (session) {
          syncWithExtension(session);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session);
        if (session) {
          syncWithExtension(session);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const syncWithExtension = (session) => {
    window.dispatchEvent(new CustomEvent('STUDY_WITH_ME_SYNC', {
      detail: { session }
    }));
  };

  if (loading) return null;

  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage session={session} />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected App Routes */}
          <Route element={<Layout user={session?.user} session={session} />}>
            <Route path="/dashboard" element={<Dashboard user={session?.user} />} />
            <Route path="/planner" element={<PlannerPage user={session?.user} />} />
            <Route path="/kanban" element={<KanbanPage user={session?.user} />} />
            <Route path="/coach" element={<CoachPage user={session?.user} />} />
            <Route path="/rooms" element={<RoomsPage user={session?.user} />} />
            <Route path="/settings" element={<SettingsPage user={session?.user} />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={session ? "/dashboard" : "/"} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;