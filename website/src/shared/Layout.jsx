import { Outlet, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { supabase } from '../lib/supabaseClient';
import FloatingChat from '../app/rooms/FloatingChat';
import useGlobalExtensionSync from '../hooks/useGlobalExtensionSync';

const Layout = ({ user, session }) => {
  const [chatOpen, setChatOpen] = useState(false);
  useGlobalExtensionSync(user);  // Sync today's tasks to extension from ANY page

  useEffect(() => {
    const handleToggle = (e) => setChatOpen(e.detail);
    window.addEventListener('CHAT_PANEL_TOGGLED', handleToggle);
    return () => window.removeEventListener('CHAT_PANEL_TOGGLED', handleToggle);
  }, []);

  // Protect the route
  if (!session) return <Navigate to="/" replace />;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex min-h-screen relative" style={{ background: 'var(--bg-color)' }}>
      {/* Persistant Left Sidebar */}
      <Sidebar user={user} onSignOut={handleSignOut} />

      {/* Main Content Area */}
      <main
        className="flex-1 overflow-y-auto h-screen custom-scroll transition-all duration-300"
        style={{ marginRight: chatOpen ? '30%' : '0' }}
      >
        <div className="max-w-[1400px] mx-auto p-8 md:p-12">
          <Outlet />
        </div>
      </main>

      <FloatingChat user={user} />
    </div>
  );
};

export default Layout;
