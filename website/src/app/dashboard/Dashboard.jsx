import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useExtensionTheme from '../../hooks/useExtensionTheme';
import {
  Zap,
  Play,
  Target,
  Users,
  Layout,
  ChevronRight,
  Star,
  Quote,
  History,
  Skull,
  Clock,
  LogOut,
  LineChart,
  BarChart,
  PieChart,
  Palette,
  Plus,
  LogIn
} from 'lucide-react';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart as ReLineChart,
  Line,
  CartesianGrid
} from 'recharts';

const Dashboard = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [stats, setStats] = useState({
    goals: 0,
    interruptions: 0,
    focusTime: '0h 0m',
    sessions: [],
    distractions: [] // We'll keep mock distractions for now, as we only sync sessions currently
  });

  const [activeRange, setActiveRange] = useState('weekly');



  const fetchData = async () => {
    try {
      setLoading(prev => (stats.sessions.length === 0 ? true : prev));

      let startDate = new Date();
      if (activeRange === 'daily') startDate.setHours(0, 0, 0, 0);
      else if (activeRange === 'weekly') startDate.setDate(startDate.getDate() - 7);
      else if (activeRange === 'monthly') startDate.setMonth(startDate.getMonth() - 1);

      const [sessionsRes, interruptionsRes] = await Promise.all([
        supabase.from('study_sessions').select('*').eq('user_id', user.id).gte('timestamp', startDate.toISOString()).order('timestamp', { ascending: false }),
        supabase.from('study_interruptions').select('*').eq('user_id', user.id).gte('timestamp', startDate.toISOString()).order('timestamp', { ascending: false })
      ]);


      if (sessionsRes.error) {
        console.error('🚫 Sessions Error:', sessionsRes.error.message);
        throw sessionsRes.error;
      }
      if (interruptionsRes.error) {
        console.error('🚫 Interruptions Error:', interruptionsRes.error.message);
        throw interruptionsRes.error;
      }

      const sessionsData = sessionsRes.data;
      const interruptionsData = interruptionsRes.data;


      // Calculate stats
      const totalMinutes = sessionsData.reduce((acc, s) => acc + (s.duration / 60), 0);
      const h = Math.floor(totalMinutes / 60);
      const m = Math.floor(totalMinutes % 60);

      // Group sessions for the chart
      let chartData = [];
      if (activeRange === 'daily') {
        const hourMap = {};
        for (let i = 0; i < 24; i++) hourMap[i] = 0;
        sessionsData.forEach(s => {
          const hour = new Date(s.timestamp).getHours();
          hourMap[hour] += (s.duration / 60);
        });
        chartData = Object.entries(hourMap).map(([h, m]) => ({
          name: `${h.padStart(2, '0')}:00`,
          minutes: Math.round(m)
        }));
      } else if (activeRange === 'weekly') {
        const dayMap = {};
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        sessionsData.forEach(s => {
          const date = new Date(s.timestamp);
          const day = days[date.getDay()];
          dayMap[day] = (dayMap[day] || 0) + (s.duration / 60);
        });
        chartData = days.map(d => ({
          name: d,
          minutes: Math.round(dayMap[d] || 0)
        }));
      } else if (activeRange === 'monthly') {
        const dateMap = {};
        sessionsData.forEach(s => {
          const date = new Date(s.timestamp).getDate();
          dateMap[date] = (dateMap[date] || 0) + (s.duration / 60);
        });

        // Generate last 30 dates for a smooth timeline
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateNum = d.getDate();
          chartData.push({
            name: dateNum.toString(),
            minutes: Math.round(dateMap[dateNum] || 0)
          });
        }
      }


      // Combine sessions and interruptions for the unified history log
      const sessionsWithStatus = sessionsData.map(s => ({ ...s, status: 'Completed' }));
      const interruptionsWithStatus = interruptionsData.map(i => ({
        ...i,
        goal: i.goal_at_time || 'Session Interrupted',
        duration: 0,
        status: 'Interrupted'
      }));

      const allActivity = [...sessionsWithStatus, ...interruptionsWithStatus]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setStats(prev => ({
        ...prev,
        goals: sessionsData.length,
        interruptions: interruptionsData.length,
        focusTime: `${h}h ${m}m`,
        sessions: chartData,
        allSessions: allActivity.slice(0, 10)
      }));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, activeRange]);

  useEffect(() => {
    if (!user) return;
    setStats(prev => ({ ...prev, bridgeStatus: 'connecting' }));


    // Setup Extension Data Bridge (for local Distractions)
    let bridgeTimeout;
    const handleExtensionData = (e) => {
      clearTimeout(bridgeTimeout);
      const data = e.detail;

      const updates = { bridgeStatus: 'connected' };

      if (data && data.distractions) {
        const sortedDist = Object.entries(data.distractions)
          .sort((a, b) => b[1] - a[1]) // Sort by count descending
          .slice(0, 5) // Top 5
          .map(([domain, hits]) => ({ domain, hits }));

        updates.distractions = sortedDist.length > 0 ? sortedDist : [];
      }

      setStats(prev => ({
        ...prev,
        ...updates
      }));
    };

    const requestData = () => window.dispatchEvent(new CustomEvent('REQUEST_EXTENSION_DATA'));

    window.addEventListener('EXTENSION_DATA_RESPONSE', handleExtensionData);
    window.addEventListener('EXTENSION_BRIDGE_READY', requestData);

    // Ping for local stats immediately in case bridge is already ready
    requestData();

    // Detect if bridge is disconnected (e.g. requires page refresh)
    bridgeTimeout = setTimeout(() => {
      setStats(prev => ({
        ...prev,
        bridgeStatus: prev.bridgeStatus === 'connected' ? 'connected' : 'disconnected'
      }));
    }, 2000);

    // Real-time Subscriptions
    const sessionChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_sessions',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_interruptions',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      window.removeEventListener('EXTENSION_DATA_RESPONSE', handleExtensionData);
      window.removeEventListener('EXTENSION_BRIDGE_READY', requestData);
      supabase.removeChannel(sessionChannel);
    };
  }, [user]);

  // ------------------------

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading Productivity Data...</div>;

  return (
    <div className="w-full">
      {/* Welcome Section */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Welcome back, <span style={{ color: 'var(--accent-color)' }}>{user.user_metadata?.full_name || 'Focused User'}</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Here's your productivity deep-dive for the week.</p>
        </div>

        <div className="flex p-1 rounded-xl border border-border bg-card/50">
          {['daily', 'weekly', 'monthly'].map(range => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeRange === range
                ? 'bg-accent text-white shadow-lg'
                : 'text-secondary hover:text-primary'
                }`}
              style={activeRange === range ? { backgroundColor: 'var(--accent-color)' } : {}}
            >
              {range}
            </button>
          ))}
        </div>
      </motion.div>


      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0">
          <Link to="/rooms" className="block">
            <motion.div
              whileHover={{ y: -5 }}
              className="p-8 rounded-2xl flex flex-col md:flex-row items-center gap-6 cursor-pointer"
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--accent-color) 15%, transparent)' }}>
                <Users size={28} style={{ color: 'var(--accent-color)' }} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-black mb-1">Focus Together</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Create or join a private room and study with friends in real-time.</p>
              </div>
              <ChevronRight size={20} style={{ color: 'var(--text-secondary)' }} />
            </motion.div>
          </Link>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-12">
            <StatCard
              icon={<Target style={{ color: 'var(--accent-color)' }} />}
              label="Goals Reached"
              val={stats.goals}
              sub={activeRange === 'daily' ? 'Today' : activeRange === 'weekly' ? 'This week' : 'This month'}
            />
            <StatCard
              icon={<Skull className="text-red-500" />}
              label="Total Interruptions"
              val={stats.interruptions}
              sub={activeRange === 'daily' ? 'Today' : activeRange === 'weekly' ? 'This week' : 'This month'}
            />
            <StatCard
              icon={<Clock className="text-sky-500" />}
              label="Total Focus Hours"
              val={stats.focusTime}
              sub={activeRange === 'daily' ? 'Today' : activeRange === 'weekly' ? 'Avg. focus per day' : 'Total monthly progress'}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Main Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 p-6 rounded-2xl"
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <LineChart size={18} style={{ color: 'var(--accent-color)' }} />
                  Focus Trends (Minutes)
                </h3>
              </div>
              <div className="h-72 w-full min-h-[288px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={288}>
                  <ReBarChart data={stats.sessions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#666', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#666', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    />
                    <Bar dataKey="minutes" fill="var(--accent-color)" radius={[6, 6, 0, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Distractions Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl"
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
            >
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <PieChart size={18} className="text-red-500" />
                Top Sites Visited
              </h3>
              <div className="space-y-4">
                {stats.bridgeStatus === 'disconnected' ? (
                  <div className="p-4 rounded-xl text-center" style={{ background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-color) 20%, transparent)' }}>
                    <p className="text-sm font-bold mb-1" style={{ color: 'var(--accent-color)' }}>Extension Link Broken</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Please hard refresh this page (F5) so the dashboard can reconnect to your browser extension.</p>
                  </div>
                ) : stats.bridgeStatus === 'connecting' ? (
                  <p className="text-[#555] text-sm text-center py-4 animate-pulse">Syncing local memory...</p>
                ) : stats.distractions && stats.distractions.length > 0 ? (
                  stats.distractions.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border transition-all" style={{ background: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                      <span className="text-sm font-medium truncate max-w-[120px]" style={{ color: 'var(--text-secondary)' }}>{d.domain}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-color)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ background: 'var(--accent-color)', width: `${(d.hits / stats.distractions[0].hits) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{d.hits}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>No top sites visited today. Great focus!</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Recent History Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-8 rounded-2xl"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
          >
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
              <History size={22} className="text-sky-500" />
              Extended Session Logs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#222]">
                    <th className="pb-4 text-[#666] font-bold text-xs uppercase tracking-wider">Goal / Session Name</th>
                    <th className="pb-4 text-[#666] font-bold text-xs uppercase tracking-wider">Time Spent</th>
                    <th className="pb-4 text-[#666] font-bold text-xs uppercase tracking-wider">Timestamp</th>
                    <th className="pb-4 text-[#666] font-bold text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {stats.allSessions && stats.allSessions.length > 0 ? (
                    stats.allSessions.map((session, idx) => (
                      <SessionRow
                        key={session.id || idx}
                        goal={session.goal}
                        time={`${Math.floor(session.duration / 60)}m`}
                        date={new Date(session.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        status={session.status}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-[#555] text-sm">
                        No sessions synced yet. Start focusing in the extension!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, val, sub }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="p-6 rounded-2xl"
    style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
  >
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 opacity-90" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
      {icon}
    </div>
    <p className="text-[#888] text-sm font-semibold">{label}</p>
    <h4 className="text-2xl font-black mt-1">{val}</h4>
    <p className="text-[#555] text-xs mt-2">{sub}</p>
  </motion.div>
);

const SessionRow = ({ goal, time, date, status }) => {
  const isCompleted = status === 'Completed';
  return (
    <tr className="transition-colors group border-b" style={{ borderColor: 'color-mix(in srgb, var(--border-color) 40%, transparent)' }}>
      <td className="py-4 text-sm font-bold pr-4" style={{ color: 'var(--text-primary)' }}>{goal}</td>
      <td className="py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{time}</td>
      <td className="py-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{date}</td>
      <td className="py-4">
        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full`} style={{
          background: isCompleted ? 'color-mix(in srgb, var(--accent-color) 12%, transparent)' : 'color-mix(in srgb, var(--text-secondary) 15%, transparent)',
          color: isCompleted ? 'var(--accent-color)' : 'var(--text-secondary)',
          border: `1px solid ${isCompleted ? 'color-mix(in srgb, var(--accent-color) 30%, transparent)' : 'color-mix(in srgb, var(--text-secondary) 30%, transparent)'}`
        }}>
          {status}
        </span>
      </td>
    </tr>
  );
};

export default Dashboard;
