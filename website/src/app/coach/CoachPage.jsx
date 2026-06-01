import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Send, Mic, MicOff, Sparkles, Check, X, ChevronRight,
    Calendar, Clock, Flag, Trash2, GripVertical, Loader2,
    Sun, Moon, Sunset, Coffee, Brain, Zap, Target, BookOpen, RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { format, addDays } from 'date-fns';

// ─── Onboarding Wizard ─────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
    {
        key: 'daily_focus_hours',
        title: 'How many hours can you study daily?',
        subtitle: 'Be honest — we\'ll schedule around your real capacity.',
        type: 'slider',
        min: 1, max: 8, default: 3,
        format: (v) => `${v} hour${v > 1 ? 's' : ''}`
    },
    {
        key: 'peak_time',
        title: 'When do you focus best?',
        subtitle: 'We\'ll schedule harder tasks during your peak.',
        type: 'chips',
        options: [
            { value: 'morning', label: 'Morning', icon: <Sun size={18} /> },
            { value: 'afternoon', label: 'Afternoon', icon: <Sunset size={18} /> },
            { value: 'evening', label: 'Evening', icon: <Moon size={18} /> },
            { value: 'night', label: 'Night Owl', icon: <Coffee size={18} /> },
        ],
        default: 'morning'
    },
    {
        key: 'focus_level',
        title: 'How would you rate your focus ability?',
        subtitle: 'This helps us pace your roadmap.',
        type: 'chips',
        options: [
            { value: 'beginner', label: 'Building Habits', icon: <Target size={18} /> },
            { value: 'intermediate', label: 'Decent Focus', icon: <Brain size={18} /> },
            { value: 'advanced', label: 'Deep Worker', icon: <Zap size={18} /> },
        ],
        default: 'intermediate'
    },
    {
        key: 'study_style',
        title: 'How do you prefer to work?',
        subtitle: 'Structured plans vs. flexible goals.',
        type: 'chips',
        options: [
            { value: 'structured', label: 'Structured', icon: <Calendar size={18} /> },
            { value: 'flexible', label: 'Flexible', icon: <BookOpen size={18} /> },
            { value: 'intensive', label: 'Intensive Sprints', icon: <Sparkles size={18} /> },
        ],
        default: 'structured'
    }
];

const OnboardingWizard = ({ onComplete, initialProfile }) => {
    const [step, setStep] = useState(0);
    const [profile, setProfile] = useState({
        daily_focus_hours: initialProfile?.daily_focus_hours || 3,
        peak_time: initialProfile?.peak_time || 'morning',
        focus_level: initialProfile?.focus_level || 'intermediate',
        study_style: initialProfile?.study_style || 'structured',
    });

    const currentStep = ONBOARDING_STEPS[step];

    const handleNext = () => {
        if (step < ONBOARDING_STEPS.length - 1) {
            setStep(step + 1);
        } else {
            onComplete(profile);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto"
        >
            {/* Progress */}
            <div className="flex gap-2 mb-8">
                {ONBOARDING_STEPS.map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 h-1.5 rounded-full transition-all duration-300"
                        style={{
                            background: i <= step ? 'var(--accent-color)' : 'var(--border-color)',
                        }}
                    />
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="mb-2 text-xs font-black uppercase tracking-widest" style={{ color: 'var(--accent-color)' }}>
                        Step {step + 1} of {ONBOARDING_STEPS.length}
                    </div>
                    <h2 className="text-2xl font-black mb-2">{currentStep.title}</h2>
                    <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>{currentStep.subtitle}</p>

                    {currentStep.type === 'slider' && (
                        <div className="space-y-4">
                            <div className="text-4xl font-black text-center" style={{ color: 'var(--accent-color)' }}>
                                {currentStep.format(profile[currentStep.key])}
                            </div>
                            <input
                                type="range"
                                min={currentStep.min}
                                max={currentStep.max}
                                value={profile[currentStep.key]}
                                onChange={(e) => setProfile({ ...profile, [currentStep.key]: parseInt(e.target.value) })}
                                className="w-full accent-current"
                                style={{ accentColor: 'var(--accent-color)' }}
                            />
                            <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <span>{currentStep.min}h</span>
                                <span>{currentStep.max}h</span>
                            </div>
                        </div>
                    )}

                    {currentStep.type === 'chips' && (
                        <div className="grid grid-cols-2 gap-3">
                            {currentStep.options.map((opt) => {
                                const isActive = profile[currentStep.key] === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => setProfile({ ...profile, [currentStep.key]: opt.value })}
                                        className="p-4 rounded-2xl border text-left transition-all duration-200"
                                        style={{
                                            background: isActive ? 'color-mix(in srgb, var(--accent-color) 12%, transparent)' : 'var(--card-bg)',
                                            borderColor: isActive ? 'var(--accent-color)' : 'var(--border-color)',
                                            transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span style={{ color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)' }}>{opt.icon}</span>
                                            <span className="text-sm font-bold">{opt.label}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="flex gap-3 mt-10">
                {step > 0 && (
                    <button
                        onClick={() => setStep(step - 1)}
                        className="px-6 py-3 rounded-xl border text-sm font-bold transition-all hover:bg-white/5"
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        Back
                    </button>
                )}
                <button
                    onClick={handleNext}
                    className="flex-1 py-3 rounded-xl text-sm font-black transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ background: 'var(--accent-color)', color: '#fff' }}
                >
                    {step === ONBOARDING_STEPS.length - 1 ? (
                        <><Sparkles size={16} /> Let's Go</>
                    ) : (
                        <>Continue <ChevronRight size={16} /></>
                    )}
                </button>
            </div>
        </motion.div>
    );
};

// ─── Draft Roadmap Card ─────────────────────────────────────────────────────

const DraftTaskCard = ({ task, index, onUpdate, onDelete }) => {
    const priorityColors = {
        low: '#22c55e',
        medium: '#f59e0b',
        high: '#ef4444',
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-start gap-3 p-4 rounded-2xl border transition-all group"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
            <div className="text-xs font-black w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'color-mix(in srgb, var(--accent-color) 12%, transparent)', color: 'var(--accent-color)' }}>
                {index + 1}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
                <input
                    className="w-full bg-transparent text-sm font-bold focus:outline-none"
                    style={{ color: 'var(--text-primary)' }}
                    value={task.name}
                    onChange={(e) => onUpdate({ ...task, name: e.target.value })}
                />
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} style={{ color: 'var(--text-secondary)' }} />
                        <input
                            type="date"
                            className="bg-transparent text-xs focus:outline-none"
                            style={{ color: 'var(--text-secondary)' }}
                            value={task.date}
                            onChange={(e) => onUpdate({ ...task, date: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock size={12} style={{ color: 'var(--text-secondary)' }} />
                        <input
                            type="number"
                            className="bg-transparent text-xs w-12 focus:outline-none"
                            style={{ color: 'var(--text-secondary)' }}
                            value={task.estimated_minutes}
                            onChange={(e) => onUpdate({ ...task, estimated_minutes: parseInt(e.target.value) || 25 })}
                        />
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>min</span>
                    </div>
                    <select
                        className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
                        style={{ color: priorityColors[task.priority] }}
                        value={task.priority}
                        onChange={(e) => onUpdate({ ...task, priority: e.target.value })}
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
            </div>

            <button
                onClick={() => onDelete(task.id)}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                style={{ color: 'var(--text-secondary)' }}
            >
                <Trash2 size={14} />
            </button>
        </motion.div>
    );
};

// ─── Main Coach Page ────────────────────────────────────────────────────────

const CoachPage = ({ user }) => {
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [chatMessages, setChatMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [draftRoadmap, setDraftRoadmap] = useState(null);
    const [isPushing, setIsPushing] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const chatEndRef = useRef(null);
    const recognitionRef = useRef(null);

    // ─── Load Profile ──────────────────────────
    useEffect(() => {
        if (!user) return;
        loadProfile();
    }, [user]);

    const loadProfile = async () => {
        setProfileLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_study_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                setProfile(null);
                setShowOnboarding(true);
            } else if (data) {
                setProfile(data);
                setShowOnboarding(false);
                // Load saved chat history
                await loadChatHistory(data);
            }
        } catch (err) {
            console.error('Error loading profile:', err);
            setShowOnboarding(true);
        } finally {
            setProfileLoading(false);
        }
    };

    // ─── Persistent Chat Memory ─────────────────
    const cleanRawJSON = (text) => {
        if (!text) return '';
        let cleaned = text
            .replace(/<roadmap>[\s\S]*?(?:<\/roadmap>|$)/g, '')
            .replace(/<single_task>[\s\S]*?(?:<\/single_task>|$)/g, '')
            .replace(/<today_task>[\s\S]*?(?:<\/today_task>|$)/g, '');

        const nakedMatch = cleaned.match(/(\[\s*\{[\s\S]*\}\s*(?:\]|$))/);
        if (nakedMatch && (nakedMatch[1].startsWith('{') || nakedMatch[1].startsWith('['))) {
            cleaned = cleaned.replace(nakedMatch[1], '');
            cleaned = cleaned.replace(/\[\s*\]/, '');
        }
        return cleaned.trim();
    };

    const loadChatHistory = async (profileData) => {
        const { data: savedMsgs } = await supabase
            .from('coach_conversations')
            .select('role, content')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(50);

        if (savedMsgs && savedMsgs.length > 0) {
            setChatMessages(savedMsgs);
        } else {
            setChatMessages([{
                role: 'assistant',
                content: `Hey! 👋 I'm your AI Study Coach. You can tell me a goal like **"Learn React in 45 days"** and I'll build a roadmap for you.\n\nI'll schedule tasks based on your **${profileData.daily_focus_hours}h/day** capacity and your **${profileData.peak_time}** peak time.\n\nWhat would you like to learn?`
            }]);
        }
    };

    const saveMessage = async (role, content) => {
        await supabase.from('coach_conversations').insert({
            user_id: user.id,
            role,
            content,
        });
    };

    const clearChatHistory = async () => {
        await supabase.from('coach_conversations').delete().eq('user_id', user.id);
        setChatMessages([{
            role: 'assistant',
            content: `Chat cleared! 🧹 What would you like to learn next?`
        }]);
    };

    // ─── Load existing planner tasks for calendar-aware context ──
    const getExistingTasksSummary = async () => {
        const { data: tasks } = await supabase
            .from('planner_tasks')
            .select('name, due_date, estimated_minutes, priority, status, completed')
            .eq('user_id', user.id)
            .gte('due_date', new Date().toISOString())
            .order('due_date', { ascending: true })
            .limit(60);

        if (!tasks || tasks.length === 0) return '';

        // Group tasks by day and calculate load
        const dayMap = {};
        tasks.forEach(t => {
            const dayKey = format(new Date(t.due_date), 'yyyy-MM-dd (EEE, MMM d)');
            if (!dayMap[dayKey]) dayMap[dayKey] = { tasks: [], totalMin: 0 };
            dayMap[dayKey].tasks.push(t);
            dayMap[dayKey].totalMin += (t.estimated_minutes || 25);
        });

        const maxDailyMin = (profile?.daily_focus_hours || 3) * 60;
        const lines = Object.entries(dayMap).map(([day, info]) => {
            const freeMin = Math.max(0, maxDailyMin - info.totalMin);
            const taskNames = info.tasks.map(t => `${t.name}${t.completed ? ' ✓done' : ''}`).join(', ');
            return `  ${day}: ${info.totalMin}min used / ${maxDailyMin}min capacity (${freeMin}min free) → [${taskNames}]`;
        });

        return `\n\nUSER'S CURRENT CALENDAR (respect this! Do NOT add tasks to days that are full):
Daily capacity: ${maxDailyMin} min/day
${lines.join('\n')}
RULES: Only assign tasks to days with enough free capacity. Skip days that are full. If user says \"continue\", start from the next available free day.`;
    };

    // ─── Save Profile ──────────────────────────
    const handleOnboardingComplete = async (profileData) => {
        try {
            const payload = {
                id: user.id,
                ...profileData,
            };

            const { error } = await supabase
                .from('user_study_profiles')
                .upsert(payload, { onConflict: 'id' });

            if (error) throw error;
            setProfile(profileData);
            setShowOnboarding(false);
            setChatMessages([{
                role: 'assistant',
                content: `Awesome! I know you now 🧠\n\n• **${profileData.daily_focus_hours}h/day** study capacity\n• Peak focus: **${profileData.peak_time}**\n• Style: **${profileData.study_style}**\n\nTell me a goal and I'll create your roadmap! Try: *"Learn Python in 30 days"*`
            }]);
        } catch (err) {
            console.error('Error saving profile:', err);
        }
    };

    // ─── Voice Input ───────────────────────────
    const toggleVoice = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join('');
            setInputText(transcript);
        };

        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    };

    // ─── Send Message to AI ────────────────────
    const handleSend = async () => {
        if (!inputText.trim() || isThinking) return;

        const userMsg = { role: 'user', content: inputText.trim() };
        setChatMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsThinking(true);
        await saveMessage('user', userMsg.content);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const existingTasksContext = await getExistingTasksSummary();
            const nowStr = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

            const systemPrompt = `You are an AI Study Coach for AntiDistract productivity app.
The current local date and time is: ${nowStr}. Use this to resolve relative dates like "tomorrow" or "next tuesday".

The user's study profile:
- Daily capacity: ${profile.daily_focus_hours} hours/day
- Peak focus time: ${profile.peak_time}
- Focus level: ${profile.focus_level}
- Study style: ${profile.study_style}${existingTasksContext}

PERSONALIZATION RULES:
- ANALYZE the existing tasks above. If the user asks about a topic they already have tasks for, acknowledge their progress and continue from where they left off.
- If tasks from a DIFFERENT topic exist, respect those.
- Reference their completed tasks encouragingly.

INSTRUCTIONS:
1. If the user describes a learning goal, you MUST output the complete, FULL roadmap formatted cleanly in Markdown (with headings, bullet points, etc.) so they can see everything they will learn at a glance.
2. At the VERY END of your response, export ALL the tasks into a JSON array inside a <roadmap> tag to be scheduled into their planner:
<roadmap>
[{"name":"Task title","estimated_minutes":60,"priority":"high"},...]
</roadmap>
- DO NOT INCLUDE ANY DATES OR OFFSETS IN THE JSON. The app will automatically schedule them based on the user's calendar capacity!
- estimated_minutes should respect the user's daily capacity (${profile.daily_focus_hours * 60} min/day max)
- Add rest days every 6th day (output a "Rest & Review" task)
- Keep each task bite-sized (25-60 min)
- Output ALL tasks for the full roadmap.
- Keep task names very short (under 40 chars).
3. If the user asks a general question, just chat helpfully. Don't include <roadmap> tags.
4. If the user wants to schedule a single specific task or meeting at a specific date/time, return a <single_task> tag with the exact ISO date string: 
<single_task>{"name":"Meeting with Aryan","due_date":"2026-06-05T15:00:00","estimated_minutes":60,"priority":"medium"}</single_task>`;

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...chatMessages.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: userMsg.content }
                    ]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Edge Function error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            const aiText = data.response || data.reasoning || data.content || '';
            await saveMessage('assistant', aiText);
            await processAIResponse(aiText);

        } catch (err) {
            console.error('Coach AI error:', err);
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ Connection Error: ${err.message}`
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const processAIResponse = async (aiText) => {
        // Check for roadmap JSON (allow missing closing tag if truncated)
        // Fallback: If AI forgets <roadmap> tag entirely, try to find a raw JSON array block.
        const roadmapMatch = aiText.match(/<roadmap>([\s\S]*?)(?:<\/roadmap>|$)/)
            || aiText.match(/(\[\s*\{[\s\S]*\}\s*(?:\]|$))/);

        const singleTaskMatch = aiText.match(/<single_task>([\s\S]*?)(?:<\/single_task>|$)/) || aiText.match(/<today_task>([\s\S]*?)(?:<\/today_task>|$)/);

        // Clean the display text
        let displayText = aiText
            .replace(/<roadmap>[\s\S]*?(?:<\/roadmap>|$)/g, '')
            .replace(/<single_task>[\s\S]*?(?:<\/single_task>|$)/g, '')
            .replace(/<today_task>[\s\S]*?(?:<\/today_task>|$)/g, '');

        if (roadmapMatch) {
            // Remove the raw JSON fallback from display text if the tags were missing
            if (roadmapMatch[1].startsWith('{') || roadmapMatch[1].startsWith('[')) {
                displayText = displayText.replace(roadmapMatch[1], '');
                displayText = displayText.replace(/\[\s*\]/, ''); // remove any leftover empty brackets
            }
            displayText = displayText.trim();

            let tasks = [];
            try {
                tasks = JSON.parse(roadmapMatch[1]);
            } catch (e) {
                console.warn('Roadmap JSON was truncated or malformed, extracting partial tasks...');
                // Fallback: extract whatever valid { ... } task objects survive the cut-off
                const objects = roadmapMatch[1].match(/\{[^}]+\}/g) || [];
                tasks = objects.map(obj => {
                    try { return JSON.parse(obj); } catch { return null; }
                }).filter(Boolean);
            }

            if (Array.isArray(tasks) && tasks.length > 0) {
                // FETCH CALENDAR to dynamically assign dates
                const { data: existingTasks } = await supabase
                    .from('planner_tasks')
                    .select('due_date, estimated_minutes, completed')
                    .eq('user_id', user.id)
                    .gte('due_date', new Date().toISOString())
                    .order('due_date', { ascending: true });

                const maxDailyMin = (profile?.daily_focus_hours || 3) * 60;

                // Find start date:
                // If there are uncompleted tasks, start on the day AFTER the last uncompleted task.
                // Otherwise start today.
                let startDate = new Date();
                startDate.setHours(0, 0, 0, 0);

                if (existingTasks) {
                    const uncompleted = existingTasks.filter(t => !t.completed);
                    if (uncompleted.length > 0) {
                        const lastUncompletedDate = new Date(uncompleted[uncompleted.length - 1].due_date);
                        if (lastUncompletedDate >= startDate) {
                            startDate = addDays(lastUncompletedDate, 1);
                        }
                    }
                }

                // Now simulate calendar capacity from startDate onwards
                let currentDate = startDate;
                let currentDayUsage = 0;

                // Rehydrate usage for the start date if we are starting today/etc
                if (existingTasks) {
                    const dateStr = format(currentDate, 'yyyy-MM-dd');
                    currentDayUsage = existingTasks
                        .filter(t => format(new Date(t.due_date), 'yyyy-MM-dd') === dateStr)
                        .reduce((sum, t) => sum + (t.estimated_minutes || 25), 0);
                }

                const draftTasks = tasks.map((t, i) => {
                    let taskMins = t.estimated_minutes || 25;

                    // If task doesn't fit in current day, move to next day
                    if (currentDayUsage > 0 && currentDayUsage + taskMins > maxDailyMin) {
                        currentDate = addDays(currentDate, 1);
                        currentDayUsage = 0;
                    }

                    currentDayUsage += taskMins;

                    return {
                        id: `draft-${i}`,
                        name: t.name,
                        date: format(currentDate, 'yyyy-MM-dd'),
                        estimated_minutes: taskMins,
                        priority: t.priority || 'medium',
                    };
                });
                setDraftRoadmap(draftTasks);
                displayText = displayText || '✨ I\'ve generated your roadmap! Review the tasks below, edit anything you want, then hit **Approve & Push** to add them to your planner.';
            }
        }

        if (singleTaskMatch) {
            try {
                const task = JSON.parse(singleTaskMatch[1]);
                await pushSingleTask(task);
                // Notification only
            } catch (e) {
                console.error('Failed to parse single task:', e);
            }
        }

        setChatMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    };

    // ─── Push Single Task ──────────────────────
    const pushSingleTask = async (task) => {
        let taskDate = new Date();
        if (task.due_date) {
            taskDate = new Date(task.due_date);
        } else {
            taskDate.setHours(0, 0, 0, 0);
        }

        await supabase.from('planner_tasks').insert({
            user_id: user.id,
            name: task.name,
            due_date: taskDate.toISOString(),
            estimated_minutes: task.estimated_minutes || 25,
            priority: task.priority || 'medium',
            status: 'todo',
            completed: false,
        });
    };

    // ─── Push Draft Roadmap ────────────────────
    const handleApproveRoadmap = async () => {
        if (!draftRoadmap || isPushing) return;
        setIsPushing(true);

        try {
            const tasks = draftRoadmap.map(t => ({
                user_id: user.id,
                name: t.name,
                due_date: new Date(t.date + 'T00:00:00').toISOString(),
                estimated_minutes: t.estimated_minutes,
                priority: t.priority,
                status: 'todo',
                completed: false,
            }));

            const { error } = await supabase.from('planner_tasks').insert(tasks);
            if (error) throw error;

            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `🎉 **${tasks.length} tasks** have been pushed to your planner! Check the Planner or Kanban page to see them.\n\nYour roadmap is live — let's crush it! 💪`
            }]);
            setDraftRoadmap(null);

            // Sync today's tasks to extension
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            const { data: todayTasks } = await supabase
                .from('planner_tasks')
                .select('*')
                .eq('user_id', user.id)
                .gte('due_date', todayStart.toISOString())
                .lte('due_date', todayEnd.toISOString());

            if (todayTasks) {
                window.dispatchEvent(new CustomEvent('SYNC_PLANNER_TASKS', {
                    detail: todayTasks.map(t => ({ id: t.id, text: t.name, completed: !!t.completed, status: t.status }))
                }));
            }
        } catch (err) {
            console.error('Error pushing roadmap:', err);
        } finally {
            setIsPushing(false);
        }
    };

    // ─── Draft update/delete handlers ──────────
    const updateDraftTask = (index, updated) => {
        setDraftRoadmap(prev => prev.map((t, i) => i === index ? updated : t));
    };
    const deleteDraftTask = (id) => {
        setDraftRoadmap(prev => prev.filter(t => t.id !== id));
    };

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isThinking]);

    // ─── Loading state ─────────────────────────
    if (profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-color)' }} />
            </div>
        );
    }

    // ─── Onboarding ────────────────────────────
    if (showOnboarding) {
        return (
            <div className="min-h-[70vh] flex flex-col justify-center">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'color-mix(in srgb, var(--accent-color) 12%, transparent)' }}>
                        <Bot size={28} style={{ color: 'var(--accent-color)' }} />
                    </div>
                    <h1 className="text-3xl font-black mb-2">Meet Your AI Coach</h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Let me learn about your study habits so I can create the perfect roadmap.
                    </p>
                </div>
                <OnboardingWizard onComplete={handleOnboardingComplete} initialProfile={profile} />
            </div>
        );
    }

    // ─── Main Chat + Roadmap UI ────────────────
    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b mb-6" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'color-mix(in srgb, var(--accent-color) 12%, transparent)' }}>
                            <Bot size={20} style={{ color: 'var(--accent-color)' }} />
                        </div>
                        AI Coach
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Tell me your goals and I'll build your study roadmap.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={clearChatHistory}
                        className="px-4 py-2 rounded-xl border text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-1.5"
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        <RotateCcw size={12} /> Clear Chat
                    </button>
                    <button
                        onClick={() => setShowOnboarding(true)}
                        className="px-4 py-2 rounded-xl border text-xs font-bold transition-all hover:bg-white/5"
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        Edit Profile
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4" style={{ scrollbarWidth: 'thin' }}>
                {chatMessages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className="max-w-[75%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed"
                            style={msg.role === 'user'
                                ? { background: 'var(--accent-color)', color: '#fff', borderRadius: '20px 20px 4px 20px' }
                                : { background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '20px 20px 20px 4px' }
                            }
                        >
                            <div dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
                        </div>
                    </motion.div>
                ))}

                {isThinking && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="px-5 py-3.5 rounded-2xl border flex items-center gap-2"
                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                            <Loader2 className="animate-spin" size={14} style={{ color: 'var(--accent-color)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Thinking...</span>
                        </div>
                    </motion.div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* Draft Roadmap Review */}
            <AnimatePresence>
                {draftRoadmap && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="border-t pt-4 mt-2 max-h-[40vh] overflow-y-auto"
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-black flex items-center gap-2">
                                <Sparkles size={14} style={{ color: 'var(--accent-color)' }} />
                                Draft Roadmap — {draftRoadmap.length} tasks
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDraftRoadmap(null)}
                                    className="px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-white/5 transition-all flex items-center gap-1"
                                    style={{ borderColor: 'var(--border-color)' }}
                                >
                                    <X size={12} /> Discard
                                </button>
                                <button
                                    onClick={handleApproveRoadmap}
                                    disabled={isPushing}
                                    className="px-4 py-1.5 rounded-lg text-xs font-black transition-all hover:opacity-90 flex items-center gap-1"
                                    style={{ background: 'var(--accent-color)', color: '#fff' }}
                                >
                                    {isPushing ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
                                    {isPushing ? 'Pushing...' : 'Approve & Push'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {draftRoadmap.map((task, i) => (
                                <DraftTaskCard
                                    key={task.id}
                                    task={task}
                                    index={i}
                                    onUpdate={(updated) => updateDraftTask(i, updated)}
                                    onDelete={deleteDraftTask}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Bar */}
            <div className="pt-4 border-t mt-auto" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 p-2 rounded-2xl border transition-all focus-within:border-accent"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={toggleVoice}
                        className="p-2.5 rounded-xl transition-all"
                        style={{
                            background: isListening ? 'var(--accent-color)' : 'transparent',
                            color: isListening ? '#fff' : 'var(--text-secondary)',
                        }}
                        title="Voice input"
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>

                    <input
                        type="text"
                        className="flex-1 bg-transparent text-sm focus:outline-none py-2"
                        style={{ color: 'var(--text-primary)' }}
                        placeholder={isListening ? 'Listening...' : 'Tell me your study goal...'}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />

                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isThinking}
                        className="p-2.5 rounded-xl transition-all disabled:opacity-30"
                        style={{ background: 'var(--accent-color)', color: '#fff' }}
                    >
                        <Send size={16} />
                    </button>
                </div>
                {isListening && (
                    <div className="flex items-center gap-2 mt-2 ml-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Recording...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Simple Markdown Formatter ───────────────────────────────────────────────

function formatMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;font-size:12px">$1</code>')
        .replace(/\n/g, '<br/>');
}

export default CoachPage;
