import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Users,
  Send,
  Play,
  Square,
  X,
  Crown,
} from 'lucide-react';
import { motion } from 'framer-motion';

const LiveRoom = ({ room, user, onLeave }) => {
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [remaining, setRemaining] = useState(room.timer_duration || 1500);
  const chatEndRef = useRef(null);
  const channelRef = useRef(null);
  const joinedAtRef = useRef(new Date().toISOString());
  const endTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Restore timer state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('antidistract_roomTimer');
      if (saved) {
        const { endTime, running, roomId } = JSON.parse(saved);
        if (roomId === room.id && running && endTime > Date.now()) {
          endTimeRef.current = endTime;
          setIsRunning(true);
        }
      }
    } catch { }
  }, [room.id]);

  // Timer tick — derive remaining from endTime
  useEffect(() => {
    if (isRunning && endTimeRef.current) {
      const tick = () => {
        const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setRemaining(left);
        if (left <= 0) {
          setIsRunning(false);
          endTimeRef.current = null;
          localStorage.removeItem('antidistract_roomTimer');
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
      tick(); // Run immediately
      timerIntervalRef.current = setInterval(tick, 1000);
      return () => {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      };
    } else {
      setRemaining(endTimeRef.current ? Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000)) : (room.timer_duration || 1500));
    }
  }, [isRunning, room.timer_duration]);

  // Start extension focus session for THIS participant
  const startExtensionSession = useCallback((durationSeconds) => {
    window.dispatchEvent(new CustomEvent('START_FOCUS_SESSION', {
      detail: { duration: durationSeconds, goal: `Focus Room: ${room.name}` }
    }));
  }, [room.name]);

  // Stop extension focus session
  const stopExtensionSession = useCallback(() => {
    window.dispatchEvent(new CustomEvent('STOP_FOCUS_SESSION'));
  }, []);

  useEffect(() => {
    // 1. Join Realtime Channel
    const channel = supabase.channel(`room:${room.code}`, {
      config: {
        presence: { key: user.id },
      },
    });
    channelRef.current = channel;

    // 2. Handle Presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const seen = new Map();
        Object.values(state).flat().forEach(p => {
          seen.set(p.user_id, p);
        });
        setParticipants(Array.from(seen.values()));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Join:', key, newPresences);
        // If host, rebroadcast timer for late joiners
        if (user.id === room.host_id && endTimeRef.current > Date.now()) {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'timer-update',
            payload: { isRunning: true, endTime: endTimeRef.current }
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Leave:', key, leftPresences);
      });

    // 3. Handle Timer Broadcasts (endTime-based)
    channel.on('broadcast', { event: 'timer-update' }, ({ payload }) => {
      if (payload.isRunning && payload.endTime) {
        endTimeRef.current = payload.endTime;
        setIsRunning(true);
        // Save to localStorage for persistence
        localStorage.setItem('antidistract_roomTimer', JSON.stringify({
          endTime: payload.endTime,
          running: true,
          roomId: room.id
        }));
        // Start extension focus session for this participant too
        const durationSecs = Math.max(0, Math.ceil((payload.endTime - Date.now()) / 1000));
        if (durationSecs > 0) {
          startExtensionSession(durationSecs);
        }
      } else {
        endTimeRef.current = null;
        setIsRunning(false);
        localStorage.removeItem('antidistract_roomTimer');
        stopExtensionSession();
      }
    });

    // 4. Fetch/Listen to Messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    };
    fetchMessages();

    const msgSubscription = supabase
      .channel(`room_messages:${room.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    // 5. Initial Presence Track
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          name: user.user_metadata?.full_name || user.email,
          avatar: user.user_metadata?.avatar_url,
          status: 'idle',
          joined_at: joinedAtRef.current
        });
      }
    });

    const handleBeforeUnload = () => {
      channel.untrack();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.removeChannel(channel);
      supabase.removeChannel(msgSubscription);
    };
  }, [room.id, room.code, user.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Host starts timer
  const handleStartTimer = () => {
    if (user.id !== room.host_id) return;
    const duration = room.timer_duration || 1500;
    const endTime = Date.now() + duration * 1000;
    endTimeRef.current = endTime;
    setIsRunning(true);

    // Save locally
    localStorage.setItem('antidistract_roomTimer', JSON.stringify({
      endTime, running: true, roomId: room.id
    }));

    // Start own extension session
    startExtensionSession(duration);

    // Broadcast to all participants
    channelRef.current?.send({
      type: 'broadcast',
      event: 'timer-update',
      payload: { isRunning: true, endTime }
    });
  };

  // Host stops timer
  const handleStopTimer = () => {
    if (user.id !== room.host_id) return;
    endTimeRef.current = null;
    setIsRunning(false);
    localStorage.removeItem('antidistract_roomTimer');
    stopExtensionSession();

    channelRef.current?.send({
      type: 'broadcast',
      event: 'timer-update',
      payload: { isRunning: false, endTime: null }
    });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('room_messages').insert({
      room_id: room.id,
      user_id: user.id,
      sender_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      content: newMessage.trim()
    });

    if (!error) setNewMessage('');
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isHost = user.id === room.host_id;

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-2xl border border-border" style={{ background: 'var(--card-bg)' }}>
      {/* Header */}
      <div className="p-4 border-b border-border" style={{ background: 'color-mix(in srgb, var(--accent-color) 4%, transparent)' }}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>
              {room.name || 'Group Focus'}
            </h3>
            <span className="text-[10px] font-mono opacity-60 flex items-center gap-1">
              <Crown size={10} className="text-yellow-500" /> {isHost ? 'Host' : 'Member'} • {room.code}
            </span>
          </div>
          <button
            onClick={onLeave}
            className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
          >
            <X size={16} />
          </button>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center gap-3 py-3 rounded-xl bg-black/10 border border-white/5">
          <div
            className="text-3xl font-black font-mono tracking-tighter"
            style={{
              color: remaining < 60 ? '#ff5252' : remaining < 300 ? '#FFA726' : 'var(--text-primary)'
            }}
          >
            {formatTime(remaining)}
          </div>
          {isHost && (
            <button
              onClick={isRunning ? handleStopTimer : handleStartTimer}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all shadow-lg active:scale-95"
              style={{
                background: isRunning ? 'var(--timer-sep)' : 'var(--accent-color)',
                color: '#fff'
              }}
            >
              {isRunning ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
              {isRunning ? 'Pause' : 'Start Focus'}
            </button>
          )}
          {!isHost && isRunning && (
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest animate-pulse">● Session Active</span>
          )}
        </div>
      </div>

      {/* Participants */}
      <div className="p-3 border-b border-border max-h-[140px] overflow-y-auto flex-shrink-0">
        <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 flex justify-between items-center" style={{ color: 'var(--text-secondary)' }}>
          Squad <span className="flex items-center gap-1"><Users size={10} /> {participants.length}</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {participants.map((p, idx) => (
            <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-border/50" title={p.name}>
              <div className="relative flex-shrink-0">
                {p.avatar ? (
                  <img src={p.avatar} className="w-5 h-5 rounded-full" alt="" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[8px]" style={{ background: 'var(--accent-color)' }}>
                    {(p.name || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border"
                  style={{ borderColor: 'var(--card-bg)', background: isRunning ? '#4caf50' : '#888' }}
                />
              </div>
              <span className="text-[10px] font-semibold truncate max-w-[80px]">{p.name?.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 && (
            <p className="text-center text-xs opacity-40 py-8">No messages yet. Say hi! 👋</p>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.user_id === user.id ? 'items-end' : 'items-start'}`}>
              {/* Sender name — show for others, skip for self */}
              {m.user_id !== user.id && participants.length > 2 && (
                <span className="text-[9px] font-semibold mb-0.5 px-1" style={{ color: 'var(--accent-color)' }}>
                  {m.sender_name || 'Anonymous'}
                </span>
              )}
              {m.user_id !== user.id && participants.length <= 2 && (
                <span className="text-[9px] font-semibold mb-0.5 px-1" style={{ color: 'var(--accent-color)' }}>
                  {m.sender_name || 'Anonymous'}
                </span>
              )}
              <div className={`max-w-[85%] px-3 py-1.5 rounded-xl text-xs ${m.user_id === user.id ? 'text-white' : 'bg-white/5 border border-border'
                }`} style={m.user_id === user.id ? { background: 'var(--accent-color)' } : { color: 'var(--text-primary)' }}>
                {m.content}
              </div>
              <span className="text-[8px] mt-0.5 opacity-40 px-1">
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-2 border-t border-border mt-auto">
          {isRunning ? (
            <div className="flex gap-1.5 p-1 bg-white/5 border border-border rounded-xl">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send a message..."
                className="flex-1 bg-transparent border-none px-2 py-1 text-xs focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
                disabled={!isRunning}
              />
              <button
                type="submit"
                disabled={!isRunning}
                className="p-1.5 rounded-lg hover:opacity-90 transition-opacity"
                style={{ background: 'var(--accent-color)', color: '#fff' }}
              >
                <Send size={14} />
              </button>
            </div>
          ) : (
            <div className="text-center py-2 px-4 rounded-xl text-xs font-bold" style={{ color: 'var(--text-secondary)', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
              Chat is disabled while timer is paused.
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LiveRoom;
