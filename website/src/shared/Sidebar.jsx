import {
  Zap,
  LayoutDashboard,
  Calendar,
  Columns,
  Users,
  Settings,
  LogOut,
  Crown,
  Bot
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import useSubscription from '../hooks/useSubscription';

const Sidebar = ({ user, onSignOut }) => {
  const { isPro, scansRemaining, scanLimit, usagePercent, isNearLimit } = useSubscription(user);

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Calendar size={20} />, label: 'Planner', path: '/planner' },
    { icon: <Columns size={20} />, label: 'Kanban', path: '/kanban' },
    { icon: <Bot size={20} />, label: 'AI Coach', path: '/coach' },
    { icon: <Users size={20} />, label: 'Focus Rooms', path: '/rooms' },
  ];

  // Bar color: accent → amber → red as usage climbs
  const barColor = usagePercent < 70
    ? 'var(--accent-color)'
    : usagePercent < 90
      ? '#f59e0b'
      : '#ef4444';

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col border-r border-border transition-all duration-300" style={{ background: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'var(--accent-color)' }}>
          <Zap size={20} color="#fff" strokeWidth={3} />
        </div>
        <span className="text-xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>
          AntiDistract
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group
              ${isActive
                ? 'bg-accent/10 text-accent'
                : 'text-secondary hover:bg-white/5 hover:text-primary'}
            `}
            style={({ isActive }) => isActive ? { color: 'var(--accent-color)', backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)' } : {}}
          >
            {({ isActive }) => (
              <>
                <span className="transition-transform group-hover:scale-110">{item.icon}</span>
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--accent-color)' }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border space-y-1" style={{ borderColor: 'var(--border-color)' }}>
        <NavLink
          to="/settings"
          className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
              ${isActive
              ? 'bg-accent/10 text-accent'
              : 'text-secondary hover:bg-white/5 hover:text-primary'}
            `}
          style={({ isActive }) => isActive ? { color: 'var(--accent-color)', backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)' } : {}}
        >
          {({ isActive }) => (
            <>
              <Settings size={20} />
              Settings
              {isActive && (
                <motion.div
                  layoutId="active-pill-settings"
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--accent-color)' }}
                />
              )}
            </>
          )}
        </NavLink>

        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-secondary hover:bg-red-500/10 hover:text-red-500 transition-all"
        >
          <LogOut size={20} />
          Sign Out
        </button>

        {/* User Card with live AI scan usage */}
        {user && (
          <div className="mt-3 p-3 rounded-2xl flex flex-col gap-2.5 border" style={{ background: 'color-mix(in srgb, var(--accent-color) 4%, var(--bg-color))', borderColor: 'var(--border-color)' }}>
            {/* User info row */}
            <div className="flex items-center gap-2.5">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-full border border-border" alt="" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ background: 'var(--accent-color)' }}>
                  {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                </p>
                {/* Tier badge */}
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={isPro
                    ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }
                    : { background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)', color: 'var(--accent-color)', border: '1px solid color-mix(in srgb, var(--accent-color) 20%, transparent)' }
                  }
                >
                  {isPro ? '✦ Pro' : 'Free'}
                </span>
              </div>
            </div>

            {/* Usage bar */}
            <div className="flex flex-col gap-1">
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: barColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                  {scansRemaining}/{scanLimit} AI scans left
                </span>
                {/* Show upgrade nudge for free users near limit */}
                {!isPro && (
                  <NavLink
                    to="/settings?tab=billing"
                    className="text-[9px] font-black hover:opacity-75 transition-opacity"
                    style={{ color: isNearLimit ? '#f59e0b' : 'var(--accent-color)' }}
                  >
                    {isNearLimit ? '⚡ Upgrade' : 'Go Pro →'}
                  </NavLink>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
