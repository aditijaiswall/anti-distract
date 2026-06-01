import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Globe, Lock, Plus, LogIn, Clock, History, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import LiveRoom from './RoomView';

const RoomsPage = ({ user }) => {
  const [activeRoom, setActiveRoom] = useState(() => {
    try {
      const saved = localStorage.getItem('antidistract_activeRoom');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [createDuration, setCreateDuration] = useState(25);
  const [pastRooms, setPastRooms] = useState([]);
  const [codeCopied, setCodeCopied] = useState(false);

  // Validate saved room on mount
  useEffect(() => {
    if (activeRoom && user) {
      supabase
        .from('rooms')
        .select('*')
        .eq('id', activeRoom.id)
        .eq('status', 'active')
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            console.log('Saved room expired, clearing...');
            setActiveRoom(null);
            localStorage.removeItem('antidistract_activeRoom');
            window.dispatchEvent(new CustomEvent('ROOM_STATE_CHANGED'));
          }
        });
    }
  }, [user]);

  // Fetch past rooms
  useEffect(() => {
    if (!user) return;
    const fetchPastRooms = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setPastRooms(data);
    };
    fetchPastRooms();
  }, [user, activeRoom]); // Refetch when room changes

  const handleCreateRoom = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code,
        host_id: user.id,
        name: `${user.user_metadata?.full_name || 'User'}'s Focus Room`,
        timer_duration: createDuration * 60,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating room:', error.message);
      return;
    }
    setActiveRoom(data);
    localStorage.setItem('antidistract_activeRoom', JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('ROOM_STATE_CHANGED'));
  };

  const handleJoinRoom = async (e) => {
    if (e) e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', joinCode.trim().toUpperCase())
      .eq('status', 'active')
      .single();

    if (error || !data) {
      alert('Room not found or inactive');
      setIsJoining(false);
      return;
    }

    setActiveRoom(data);
    localStorage.setItem('antidistract_activeRoom', JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('ROOM_STATE_CHANGED'));
    setIsJoining(false);
    setJoinCode('');
  };

  const handleLeaveRoom = async () => {
    if (activeRoom?.host_id === user.id) {
      // Mark room as ended so no one else can join and it disappears from active lobby
      await supabase.from('rooms').update({ status: 'ended' }).eq('id', activeRoom.id);
    }
    setActiveRoom(null);
    localStorage.removeItem('antidistract_activeRoom');
    localStorage.removeItem('antidistract_roomTimer');
    window.dispatchEvent(new CustomEvent('STOP_FOCUS_SESSION'));
    window.dispatchEvent(new CustomEvent('ROOM_STATE_CHANGED'));
  };

  const copyCode = () => {
    if (activeRoom?.code) {
      navigator.clipboard.writeText(activeRoom.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <header className='mb-8'>
        <h1 className='text-3xl md:text-4xl font-black tracking-tight' style={{ color: 'var(--text-primary)' }}>
          Focus <span style={{ color: 'var(--accent-color)' }}>Rooms</span>
        </h1>
        <p className='mt-2 text-sm' style={{ color: 'var(--text-secondary)' }}>
          Create private focus sessions with friends and stay accountable together.
        </p>
      </header>

      <AnimatePresence mode="wait">
        {activeRoom ? (
          /* ── ACTIVE ROOM VIEW ──────────────────────────────── */
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            {/* Share code banner */}
            <div className="mb-4 p-3 rounded-xl border border-border flex items-center justify-between gap-3" style={{ background: 'color-mix(in srgb, var(--accent-color) 6%, var(--card-bg))' }}>
              <div className="flex items-center gap-2">
                <Lock size={14} style={{ color: 'var(--accent-color)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Share this code with friends:
                </span>
                <span className="font-mono font-black text-sm tracking-widest" style={{ color: 'var(--accent-color)' }}>
                  {activeRoom.code}
                </span>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-border transition-all hover:bg-white/5"
              >
                {codeCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {codeCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Room */}
            <div style={{ height: 'calc(100vh - 260px)' }}>
              <LiveRoom room={activeRoom} user={user} onLeave={handleLeaveRoom} />
            </div>
          </motion.div>
        ) : (
          /* ── LOBBY — Create / Join / History ──────────────── */
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-10'>
              {/* Create Room */}
              <motion.div
                whileHover={{ y: -4 }}
                className='p-8 rounded-2xl flex flex-col'
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'color-mix(in srgb, var(--accent-color) 15%, transparent)' }}>
                  <Plus size={24} style={{ color: 'var(--accent-color)' }} />
                </div>
                <h3 className='text-lg font-black mb-1'>Create a Room</h3>
                <p className='text-xs mb-5' style={{ color: 'var(--text-secondary)' }}>
                  Start a private focus session. Share the code so friends can join.
                </p>

                <div className="flex gap-2 mb-4">
                  {[25, 45, 60, 90].map(mins => (
                    <button
                      key={mins}
                      onClick={() => setCreateDuration(mins)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${createDuration === mins
                        ? 'text-white border-accent shadow-lg'
                        : 'bg-white/5 text-secondary border-border hover:bg-white/10'
                        }`}
                      style={createDuration === mins ? { backgroundColor: 'var(--accent-color)', borderColor: 'var(--accent-color)' } : {}}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCreateRoom}
                  className="w-full px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
                  style={{ background: 'var(--accent-color)', color: '#fff' }}
                >
                  <Users size={16} /> Create {createDuration}m Session
                </button>
              </motion.div>

              {/* Join Room */}
              <motion.div
                whileHover={{ y: -4 }}
                className='p-8 rounded-2xl flex flex-col'
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'color-mix(in srgb, #38bdf8 15%, transparent)' }}>
                  <LogIn size={24} className="text-sky-400" />
                </div>
                <h3 className='text-lg font-black mb-1'>Join a Room</h3>
                <p className='text-xs mb-5' style={{ color: 'var(--text-secondary)' }}>
                  Enter a 6-character room code to join an active session.
                </p>

                <form onSubmit={handleJoinRoom} className="flex flex-col gap-3 mt-auto">
                  <input
                    type="text"
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm font-bold text-center tracking-[0.3em] focus:outline-none transition-colors"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <button
                    disabled={isJoining || joinCode.length < 6}
                    type="submit"
                    className="w-full px-6 py-3 rounded-xl text-sm font-bold transition-transform active:scale-95 disabled:opacity-40"
                    style={{ background: 'var(--accent-color)', color: '#fff' }}
                  >
                    {isJoining ? 'Joining...' : 'Join Session'}
                  </button>
                </form>
              </motion.div>
            </div>

            {/* Public Rooms — Coming Soon */}
            <div className="mb-10 p-6 rounded-2xl border-2 border-dashed border-border/40 bg-black/5 opacity-40 flex items-center gap-4">
              <Globe size={24} className="text-accent/50 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  Public Rooms
                  <span className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 bg-accent/20 text-accent rounded">Coming Soon</span>
                </h4>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>Browse public study groups by category.</p>
              </div>
            </div>

            {/* Past Room History */}
            {pastRooms.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl p-6"
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
              >
                <h3 className="text-sm font-black flex items-center gap-2 mb-4">
                  <History size={16} style={{ color: 'var(--accent-color)' }} /> Room History
                </h3>
                <div className="space-y-2">
                  {pastRooms.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-border/50">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{r.name}</p>
                          <p className="text-[10px] opacity-50">
                            {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {formatDuration(r.timer_duration)} • <span className="font-mono">{r.code}</span>
                          </p>
                        </div>
                      </div>
                      {r.status === 'active' && (
                        <button
                          onClick={() => {
                            setActiveRoom(r);
                            localStorage.setItem('antidistract_activeRoom', JSON.stringify(r));
                          }}
                          className="text-[10px] font-bold px-3 py-1 rounded-lg transition-all hover:bg-white/10"
                          style={{ color: 'var(--accent-color)' }}
                        >
                          Rejoin
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RoomsPage;
