import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Play, Square, Users } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const FloatingChat = ({ user }) => {
    const location = useLocation();
    const isRoomsPage = location.pathname.startsWith('/rooms');
    const [activeRoom, setActiveRoom] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);

    const [participants, setParticipants] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [remaining, setRemaining] = useState(1500);

    const chatEndRef = useRef(null);
    const channelRef = useRef(null);
    const joinedAtRef = useRef(new Date().toISOString());
    const endTimeRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const msgSubscriptionRef = useRef(null);

    // Sync active room state
    useEffect(() => {
        const fetchRoom = () => {
            try {
                const saved = localStorage.getItem('antidistract_activeRoom');
                const parsed = saved ? JSON.parse(saved) : null;
                setActiveRoom(parsed);
                if (!parsed) setIsOpen(false);
            } catch { setActiveRoom(null); }
        };
        fetchRoom();

        // Listen for room changes from other components
        window.addEventListener('ROOM_STATE_CHANGED', fetchRoom);
        return () => window.removeEventListener('ROOM_STATE_CHANGED', fetchRoom);
    }, []);

    // Restore timer state from localStorage upon navigation
    useEffect(() => {
        if (!activeRoom) return;
        try {
            const saved = localStorage.getItem('antidistract_roomTimer');
            if (saved) {
                const { endTime, running, roomId } = JSON.parse(saved);
                if (roomId === activeRoom.id && running && endTime > Date.now()) {
                    endTimeRef.current = endTime;
                    setIsRunning(true);
                    return;
                }
            }
            // If strictly no valid timer found, ensure it is visually paused/reset
            endTimeRef.current = null;
            setIsRunning(false);
        } catch { }
    }, [activeRoom, isRoomsPage]);

    // Timer tick
    useEffect(() => {
        if (!activeRoom) return;
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
            tick();
            timerIntervalRef.current = setInterval(tick, 1000);
            return () => clearInterval(timerIntervalRef.current);
        } else {
            setRemaining(endTimeRef.current ? Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000)) : (activeRoom.timer_duration || 1500));
        }
    }, [isRunning, activeRoom]);

    const startExtensionSession = useCallback((durationSeconds) => {
        window.dispatchEvent(new CustomEvent('START_FOCUS_SESSION', {
            detail: { duration: durationSeconds, goal: `Focus Room: ${activeRoom?.name}` }
        }));
    }, [activeRoom]);

    const stopExtensionSession = useCallback(() => {
        window.dispatchEvent(new CustomEvent('STOP_FOCUS_SESSION'));
    }, []);

    // Realtime subscription setup
    useEffect(() => {
        if (!activeRoom || !user || isRoomsPage) return;
        setMessages([]);
        setUnreadCount(0);
        joinedAtRef.current = new Date().toISOString();

        const channel = supabase.channel(`room:${activeRoom.code}`, {
            config: { presence: { key: user.id } },
        });
        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const seen = new Map();
                Object.values(state).flat().forEach(p => seen.set(p.user_id, p));
                setParticipants(Array.from(seen.values()));
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                if (user.id === activeRoom.host_id && endTimeRef.current > Date.now()) {
                    channelRef.current?.send({
                        type: 'broadcast',
                        event: 'timer-update',
                        payload: { isRunning: true, endTime: endTimeRef.current }
                    });
                }
            })
            .on('broadcast', { event: 'timer-update' }, ({ payload }) => {
                if (payload.isRunning && payload.endTime) {
                    endTimeRef.current = payload.endTime;
                    setIsRunning(true);
                    localStorage.setItem('antidistract_roomTimer', JSON.stringify({
                        endTime: payload.endTime, running: true, roomId: activeRoom.id
                    }));
                    const durationSecs = Math.max(0, Math.ceil((payload.endTime - Date.now()) / 1000));
                    if (durationSecs > 0) startExtensionSession(durationSecs);
                } else {
                    endTimeRef.current = null;
                    setIsRunning(false);
                    localStorage.removeItem('antidistract_roomTimer');
                    stopExtensionSession();
                }
            });

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('room_messages')
                .select('*')
                .eq('room_id', activeRoom.id)
                .order('created_at', { ascending: true })
                .limit(50);
            if (data) setMessages(data);
        };
        fetchMessages();

        msgSubscriptionRef.current = supabase
            .channel(`room_messages_float:${activeRoom.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
                setIsOpen(prev => {
                    if (!prev) setUnreadCount(c => c + 1);
                    return prev;
                });
            })
            .subscribe();

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: user.id,
                    name: user.user_metadata?.full_name || user.email,
                    status: 'idle',
                    joined_at: joinedAtRef.current
                });
            }
        });

        return () => {
            supabase.removeChannel(channel);
            if (msgSubscriptionRef.current) supabase.removeChannel(msgSubscriptionRef.current);
        };
    }, [activeRoom, user, isRoomsPage]);

    useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setUnreadCount(0);
        }
    }, [messages, isOpen]);

    // Host starts timer
    const handleStartTimer = () => {
        if (user.id !== activeRoom.host_id) return;
        const duration = activeRoom.timer_duration || 1500;
        const endTime = Date.now() + duration * 1000;
        endTimeRef.current = endTime;
        setIsRunning(true);
        localStorage.setItem('antidistract_roomTimer', JSON.stringify({ endTime, running: true, roomId: activeRoom.id }));
        startExtensionSession(duration);
        channelRef.current?.send({ type: 'broadcast', event: 'timer-update', payload: { isRunning: true, endTime } });
    };

    // Host stops timer
    const handleStopTimer = () => {
        if (user.id !== activeRoom.host_id) return;
        endTimeRef.current = null;
        setIsRunning(false);
        localStorage.removeItem('antidistract_roomTimer');
        stopExtensionSession();
        channelRef.current?.send({ type: 'broadcast', event: 'timer-update', payload: { isRunning: false, endTime: null } });
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeRoom) return;

        const { error } = await supabase.from('room_messages').insert({
            room_id: activeRoom.id,
            user_id: user.id,
            sender_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
            content: newMessage.trim()
        });
        if (error) {
            console.error(error);
            alert("Failed to send: " + error.message);
        } else {
            setNewMessage('');
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Dispatch layout event when panel toggles to trigger 70/30 split screen
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('CHAT_PANEL_TOGGLED', { detail: isOpen }));
    }, [isOpen]);

    if (!activeRoom || isRoomsPage) return null;

    return (
        <>
            {/* Floating Toggle Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border-2 border-transparent z-50 transition-colors"
                style={{ background: 'var(--card-bg)', borderColor: isOpen ? 'var(--accent-color)' : 'var(--border-color)', color: 'var(--accent-color)' }}
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </motion.button>

            {/* Slide-out Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-screen w-full sm:w-[30%] min-w-[320px] max-w-[400px] shadow-2xl z-40 flex flex-col border-l"
                        style={{ background: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
                    >
                        {/* Widget Area (Top 20%) */}
                        <div className="flex-shrink-0 p-6 border-b flex flex-col items-center justify-center gap-4" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)', height: '22%' }}>
                            <div
                                className="text-5xl font-black font-mono tracking-tighter"
                                style={{ color: remaining < 60 ? '#ff5252' : remaining < 300 ? '#FFA726' : 'var(--text-primary)' }}
                            >
                                {formatTime(remaining)}
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border flex items-center gap-1" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)', background: 'var(--bg-color)' }}>
                                    <Users size={12} /> {participants.length}
                                </span>

                                {user.id === activeRoom.host_id && (
                                    <button
                                        onClick={isRunning ? handleStopTimer : handleStartTimer}
                                        className="flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-transform shadow-lg active:scale-95"
                                        style={{ background: isRunning ? 'var(--timer-sep)' : 'var(--accent-color)', color: '#fff' }}
                                    >
                                        {isRunning ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                        {isRunning ? 'Pause' : 'Start Focus'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Chat Area (Bottom 80%) */}
                        <div className="flex-1 flex flex-col min-h-0 bg-black/5">
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
                                {messages.length === 0 && (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-xs opacity-40 font-medium">No messages yet. Say hi! 👋</p>
                                    </div>
                                )}
                                {messages.map((m, idx) => (
                                    <div key={idx} className={`flex flex-col ${m.user_id === user.id ? 'items-end' : 'items-start'}`}>
                                        {m.user_id !== user.id && (
                                            <span className="text-[10px] font-bold mb-1 px-1" style={{ color: 'var(--accent-color)' }}>
                                                {m.sender_name || 'Anonymous'}
                                            </span>
                                        )}
                                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[13px] ${m.user_id === user.id ? 'text-white shadow-md' : 'shadow-sm'
                                            }`} style={{
                                                background: m.user_id === user.id ? 'var(--accent-color)' : 'var(--card-bg)',
                                                color: m.user_id !== user.id ? 'var(--text-primary)' : '#fff',
                                                border: m.user_id !== user.id ? '1px solid var(--border-color)' : 'none'
                                            }}>
                                            {m.content}
                                        </div>
                                        <span className="text-[9px] mt-1 opacity-40 px-1 font-mono">
                                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <form onSubmit={sendMessage} className="p-3 border-t" style={{ borderColor: 'var(--border-color)', background: 'var(--card-bg)' }}>
                                {isRunning ? (
                                    <div className="flex gap-2 p-1.5 rounded-xl border focus-within:border-accent transition-colors" style={{ background: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Message squad..."
                                            className="flex-1 bg-transparent border-none px-3 py-1.5 text-sm focus:outline-none"
                                            style={{ color: 'var(--text-primary)' }}
                                            disabled={!isRunning}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!isRunning}
                                            className="w-10 h-10 rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95 flex-shrink-0"
                                            style={{ background: 'var(--accent-color)', color: '#fff' }}
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-2 px-4 rounded-xl text-xs font-bold" style={{ color: 'var(--text-secondary)', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                                        Chat is disabled while timer is paused.
                                    </div>
                                )}
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default FloatingChat;
