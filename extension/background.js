const SUPABASE_URL = 'https://jtnqrswupbjqobasrrjm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bnFyc3d1cGJqcW9iYXNycmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjI0MjUsImV4cCI6MjA4ODE5ODQyNX0.uE8kabu6gHQVwIEY6UgN0VmsZJhhkrvFWPu0HsvmMPM';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'https://antidistract-website.vercel.app' });
  }
  chrome.storage.local.set({
    remainingTime: 25 * 60,
    endTime: null,
    isRunning: false,
    activeSound: null,
    activeScene: 'forest',
    activeSceneUrl: chrome.runtime.getURL('assets/themes/forest_bg.png'),
    widgetEnabled: true,
    tunnelVisionEnabled: false,
    blockingEnabled: false,
    goal: '',
    completedSessions: [],
    totalSitesVisited: 0,
    focusTimeTotal: 0,
    interruptionsCount: 0,
    distractions: {},
    localInterruptions: [],
    userSession: null // Track if user is "logged in" for sync
  });

  // Schedule midnight scan-count reset
  chrome.alarms.create('midnightReset', {
    when: getNextMidnight(),
    periodInMinutes: 1440
  });
});

// Also schedule on browser startup in case alarm was lost
chrome.runtime.onStartup?.addListener(() => {
  chrome.alarms.create('midnightReset', {
    when: getNextMidnight(),
    periodInMinutes: 1440
  });
});

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

chrome.storage.local.get(['activeSound', 'isRunning'], (data) => {
  if (data.activeSound) {
    playAmbientSound(data.activeSound);
  }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'START_TIMER') {
    startTimer();
  } else if (message.type === 'STOP_TIMER') {
    stopTimer();
  } else if (message.type === 'RESET_TIMER') {
    resetTimer();
  } else if (message.type === 'SET_DURATION') {
    chrome.storage.local.set({ remainingTime: message.minutes * 60 });
  } else if (message.type === 'PLAY_SOUND') {
    playAmbientSound(message.sound);
  } else if (message.type === 'STOP_SOUND') {
    stopAmbientSound();
  } else if (message.type === 'SYNC_USER') {
    chrome.storage.local.set({ userSession: message.session }, () => {
      sendResponse({ status: 'success' });
    });
    return true; // Keep channel open for async response
  } else if (message.action === 'updateConfig') {
    if (message.key === 'tunnelMode') {
      toggleTunnelVision(message.value);
    } else if (message.key === 'aiMonitor') {
      chrome.storage.local.set({ aiMonitor: message.value });
    } else if (message.key === 'silencerMode' || message.key === 'grayscaleMode') {
      broadcastToTabs({ action: "updateMode", key: message.key, value: message.value });
      chrome.storage.local.set({ [message.key]: message.value });
    }
  } else if (message.action === 'fetchAI') {
    handleFetchAI(message.payload, message.token, sendResponse);
    return true; // Keep channel open for async response
  } else if (message.type === 'OFFSCREEN_READY') {
    isOffscreenReady = true;
    if (pendingSound) {
      const soundToPlay = pendingSound;
      pendingSound = null;
      setTimeout(() => playAmbientSound(soundToPlay), 500);
    }
  } else if (message.action === 'checkSiteAccess') {
    // Only block if a session is running AND blocking is enabled
    chrome.storage.local.get(['isRunning', 'blockingEnabled', 'allowedSites'], (data) => {
      const allowedSites = data.allowedSites || [];
      const alreadyAllowed = allowedSites.includes(message.hostname);
      if (!data.isRunning || !data.blockingEnabled || alreadyAllowed) {
        sendResponse({ allowed: true });
      } else {
        sendResponse({ allowed: false });
      }
    });
    return true;
  } else if (message.action === 'allowSiteForSession') {
    chrome.storage.local.get(['allowedSites'], (data) => {
      const allowedSites = data.allowedSites || [];
      if (!allowedSites.includes(message.hostname)) {
        allowedSites.push(message.hostname);
      }
      chrome.storage.local.set({ allowedSites }, () => {
        broadcastToTabs({ action: 'siteAccessGranted', hostname: message.hostname });
        sendResponse({ success: true });
      });
    });
    return true;
  } else if (message.type === 'ADD_PLANNER_TASK') {
    handleAddPlannerTask(message.text, sendResponse);
    return true;
  } else if (message.type === 'TOGGLE_PLANNER_TASK') {
    handleTogglePlannerTask(message.id, message.completed, message.status, sendResponse);
    return true;
  } else if (message.type === 'DELETE_PLANNER_TASK') {
    handleDeletePlannerTask(message.id, sendResponse);
    return true;
  } else if (message.type === 'GET_TODAY_PLANNER_TASKS') {
    handleGetTodayPlannerTasks(sendResponse);
    return true;
  }
});


let isOffscreenReady = false;
let pendingSound = null;


chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focusTimer') {
    handleSessionComplete();
  } else if (alarm.name === 'midnightReset') {
    chrome.storage.local.set({
      aiScansUsed: 0,
      aiScansDate: new Date().toISOString().split('T')[0],
      scanLimitReached: false
    });
  }
});

async function startTimer() {
  const data = await chrome.storage.local.get(['remainingTime']);
  const durationMs = data.remainingTime * 1000;
  const endTime = Date.now() + durationMs;

  await chrome.alarms.create('focusTimer', { when: endTime });
  await chrome.storage.local.set({
    isRunning: true,
    endTime: endTime,
    initialSessionDuration: data.remainingTime // Save the duration we're aiming for
  });
  broadcastToTabs({ type: 'HIDE_PAUSE_OVERLAY' });

  // Scan all existing tabs against blocked sites immediately
  scanExistingTabs();
}

/**
 * Scans all currently open tabs and redirects any that match blocked sites.
 * This catches tabs that were open BEFORE the session started.
 */
function scanExistingTabs() {
  chrome.storage.local.get(['blockingEnabled', 'blockedSites'], (data) => {
    if (!data.blockingEnabled) return;
    const blockedSites = data.blockedSites || ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'reddit.com', 'youtube.com', 'tiktok.com'];

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (!tab.url) return;
        try {
          const url = new URL(tab.url);
          const hostname = url.hostname.toLowerCase();

          // Skip internal/extension pages
          if (url.protocol === 'chrome-extension:' || url.protocol === 'chrome:') return;

          const isBlocked = blockedSites.some(site => {
            const s = site.toLowerCase();
            return hostname === s || hostname.endsWith('.' + s);
          });

          if (isBlocked) {
            chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('blocked.html') });
          }
        } catch (e) { /* skip invalid URLs */ }
      });
    });
  });
}

async function stopTimer() {
  await chrome.alarms.clear('focusTimer');
  const data = await chrome.storage.local.get(['isRunning', 'endTime', 'interruptionsCount']);

  if (data.isRunning && data.endTime) {
    const remaining = Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000));

    // Local Tracking for "Today" stats
    const intData = await chrome.storage.local.get(['localInterruptions']);
    const localInts = intData.localInterruptions || [];
    localInts.push(new Date().toISOString());

    await chrome.storage.local.set({
      remainingTime: remaining,
      localInterruptions: localInts
    });

    // Sync Interruption to Cloud
    const goalData = await chrome.storage.local.get(['goal']);
    const goal = goalData.goal || 'Focus Session';
    const syncData = await chrome.storage.local.get(['userSession']);
    if (syncData.userSession) {
      syncInterruptionToCloud(goal, syncData.userSession);
    }
    broadcastToTabs({ type: 'SESSION_PAUSED', remainingTime: remaining, goal: goal });
  }


  await chrome.storage.local.set({ isRunning: false, endTime: null, initialSessionDuration: null, allowedSites: [], aiMonitor: false });
}



async function resetTimer() {
  await stopTimer();
  await chrome.storage.local.set({ remainingTime: 25 * 60, isRunning: false, endTime: null, initialSessionDuration: null });
  broadcastToTabs({ type: 'HIDE_PAUSE_OVERLAY' });
}

async function handleSessionComplete() {
  const data = await chrome.storage.local.get(['goal', 'completedSessions', 'focusTimeTotal', 'initialSessionDuration']);
  await chrome.storage.local.set({ isRunning: false, endTime: null, initialSessionDuration: null });

  // Use the stored initial duration for accurate stats
  const duration = data.initialSessionDuration || 1500;
  const newSession = {
    goal: data.goal || 'Focus Session',
    timestamp: new Date().toISOString(),
    duration: duration
  };

  const sessions = data.completedSessions || [];
  sessions.push(newSession);

  await chrome.storage.local.set({
    completedSessions: sessions,
    focusTimeTotal: (data.focusTimeTotal || 0) + duration
  });

  // Sync to Cloud if user is logged in
  const syncData = await chrome.storage.local.get(['userSession']);
  if (syncData.userSession) {
    syncSessionToCloud(newSession, syncData.userSession);
  }

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/themes/forest_bg.png'),
    title: 'Session Complete!',
    message: `Great job! You finished: ${data.goal}`,
    priority: 2
  });

  broadcastToTabs({
    type: 'SESSION_COMPLETE',
    goal: data.goal || 'Focus Session',
    duration: duration
  });
}


// Site Blocker & Tracking
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;

  chrome.storage.local.get(['blockingEnabled', 'isRunning', 'blockedSites'], (data) => {
    if (data.blockingEnabled && data.isRunning) {
      try {
        const url = new URL(details.url);
        const hostname = url.hostname.toLowerCase();
        const blockedSites = data.blockedSites || ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'reddit.com', 'youtube.com', 'tiktok.com'];

        const isBlocked = blockedSites.some(site => {
          const s = site.toLowerCase();
          return hostname === s || hostname.endsWith('.' + s);
        });

        if (isBlocked) {
          const blockedUrl = chrome.runtime.getURL('blocked.html');
          chrome.tabs.update(details.tabId, { url: blockedUrl });
        }
      } catch (e) {
        console.error(e);
      }
    }
  });
});

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    chrome.storage.local.get(['distractions', 'isRunning'], (data) => {
      if (data.isRunning) {
        try {
          const url = new URL(details.url);
          const hostname = url.hostname.toLowerCase();

          const distractions = data.distractions || {};
          distractions[hostname] = (distractions[hostname] || 0) + 1;

          chrome.storage.local.set({ distractions });
        } catch (e) {
          console.error(e);
        }
      }
    });
  }
});

async function playAmbientSound(sound) {
  await setupOffscreenDocument('offscreen.html');

  if (!isOffscreenReady) {
    pendingSound = sound;
    return;
  }

  chrome.runtime.sendMessage({ type: 'PLAY_AUDIO', target: 'offscreen', sound })
    .catch((err) => {
      isOffscreenReady = false;
      pendingSound = sound;
      setupOffscreenDocument('offscreen.html');
    });
  chrome.storage.local.set({ activeSound: sound });
}




async function stopAmbientSound() {
  chrome.runtime.sendMessage({ type: 'STOP_AUDIO', target: 'offscreen' }).catch(() => { });
  chrome.storage.local.set({ activeSound: null });
}

async function setupOffscreenDocument(path) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    // Document exists, check if it responds
    try {
      const response = await chrome.runtime.sendMessage({ type: 'PING', target: 'offscreen' });
      if (response && response.status === 'ready') {
        isOffscreenReady = true;
        return;
      }
    } catch (e) {
      // Not responding, recreate
      console.error('Offscreen document not responding, recreating...');
    }
  }

  await chrome.offscreen.createDocument({
    url: path,
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Handling audio playback.'
  }).catch(err => {
    if (!err.message.includes('Only a single offscreen document may be created')) {
      throw err;
    }
  });
}


// Sync session to Supabase
async function syncSessionToCloud(session) {
  const user = await getFreshSession();
  if (!user) return;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/study_sessions`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${user.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: user.user.id,
        goal: session.goal,
        duration: session.duration,
        timestamp: session.timestamp
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cloud Sync Failed. Status:', response.status, 'Error:', errorText);
    } else {
      // Sync successful
    }
  } catch (error) {
    console.error('⚠️ Cloud Sync Connection Error:', error);
  }
}

// Sync interruption to Supabase
async function syncInterruptionToCloud(goal, user) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/study_interruptions`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${user.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: user.user.id,
        goal_at_time: goal,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.error('Cloud Interruption Sync Failed:', await response.text());
    } else {
      // Interruption sync successful
    }
  } catch (error) {
    console.error('Interruption Sync Error:', error);
  }
}


// Message handler for user sync is now at the top

function broadcastToTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, message).catch((err) => { });
    });
  });
}

// Tunnel Vision Logic
async function toggleTunnelVision(enabled) {
  const queryOptions = { active: true, lastFocusedWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);

  if (enabled) {
    if (!tab) return;
    await chrome.storage.local.set({ originalWindowId: tab.windowId });

    chrome.windows.create({
      tabId: tab.id,
      type: 'popup',
      state: 'fullscreen'
    });
  } else {
    const { originalWindowId } = await chrome.storage.local.get("originalWindowId");
    if (originalWindowId && tab) {
      try {
        await chrome.tabs.move(tab.id, { windowId: originalWindowId, index: -1 });
        chrome.windows.update(originalWindowId, { focused: true });
      } catch (e) {
        chrome.windows.create({ tabId: tab.id, type: 'normal' });
      }
    } else if (tab) {
      chrome.windows.create({ tabId: tab.id, type: 'normal' });
    }
  }
}

async function handleFetchAI(payload, token, sendResponse) {
  try {
    const userSessionData = await chrome.storage.local.get(['userSession']);
    let user = userSessionData.userSession;

    if (!user || !user.refresh_token) {
      sendResponse({ status: 401, ok: false, data: { error: 'Not authenticated. Please visit the dashboard and login.' } });
      return;
    }

    // ALWAYS refresh token first — Supabase access_tokens expire in ~1hr
    let accessToken = user.access_token;
    try {
      const refreshRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify({ refresh_token: user.refresh_token })
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        accessToken = refreshData.access_token;

        // Update stored session with fresh tokens
        const updatedSession = {
          ...user,
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || user.refresh_token,
          expires_at: refreshData.expires_at,
          expires_in: refreshData.expires_in
        };
        await chrome.storage.local.set({ userSession: updatedSession });
      } else {
        console.error('[Background] Token refresh failed:', refreshRes.status);
        sendResponse({ status: 401, ok: false, data: { error: 'Session expired. Please visit the dashboard, log out, and log back in.' } });
        return;
      }
    } catch (refreshErr) {
      console.error('[Background] Token refresh error:', refreshErr.message);
      sendResponse({ status: 401, ok: false, data: { error: 'Session refresh failed. Please log out and back in on the dashboard.' } });
      return;
    }

    // Now call the Edge Function with the freshest token we have
    const response = await fetch(`${SUPABASE_URL}/functions/v1/check-ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Background] Edge Function error:', response.status, errorData);
      sendResponse({ status: response.status, ok: false, data: errorData });
      return;
    }

    const data = await response.json();
    sendResponse({ status: response.status, ok: true, data: data });
  } catch (err) {
    console.error('[Background] Fetch AI Error:', err);
    sendResponse({ status: 500, ok: false, data: { error: err.message } });
  }
}

// ── PLANNER SYNC HELPERS ────────────────────────────────────────────────────

async function getFreshSession() {
  const userSessionData = await chrome.storage.local.get(['userSession']);
  const user = userSessionData.userSession;

  if (!user || !user.refresh_token) {
    return null;
  }

  try {
    const refreshRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({ refresh_token: user.refresh_token })
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      const updatedSession = {
        ...user,
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || user.refresh_token,
        expires_at: refreshData.expires_at,
        expires_in: refreshData.expires_in
      };
      await chrome.storage.local.set({ userSession: updatedSession });
      return updatedSession;
    } else {
      console.error('[Background] Token refresh failed:', refreshRes.status);
      return null;
    }
  } catch (err) {
    console.error('[Background] Failed to refresh session token:', err.message);
  }
  return user;
}

function getTodayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
  return { start, end };
}

async function syncPlannerTasksFromSupabase() {
  const session = await getFreshSession();
  if (!session || !session.user) return [];

  const { start, end } = getTodayBounds();
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/planner_tasks?user_id=eq.${session.user.id}&due_date=gte.${start}&due_date=lte.${end}&order=due_date.asc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${session.access_token}`
        }
      }
    );

    if (res.ok) {
      const dbTasks = await res.json();
      const dailyTargets = dbTasks.map(t => ({
        id: t.id,
        text: t.name,
        completed: !!t.completed,
        status: t.status
      }));
      await chrome.storage.local.set({ dailyTargets });
      return dailyTargets;
    } else {
      console.error('Failed to fetch tasks from Supabase:', await res.text());
    }
  } catch (err) {
    console.error('Error fetching planner tasks:', err);
  }
  return [];
}

async function handleAddPlannerTask(text, sendResponse) {
  const session = await getFreshSession();
  if (!session) {
    sendResponse({ success: false, error: 'Not authenticated' });
    return;
  }
  try {
    // Use midnight of today (all-day task) — matches website TaskModal format
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const payload = {
      user_id: session.user.id,
      name: text,
      due_date: todayMidnight.toISOString(),
      estimated_minutes: 25,
      priority: 'medium',
      status: 'todo',
      completed: false,
      recurring_rule: { type: null, is_all_day: true }
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/planner_tasks`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const tasks = await syncPlannerTasksFromSupabase();
      sendResponse({ success: true, tasks });
    } else {
      sendResponse({ success: false, error: await res.text() });
    }
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

async function handleTogglePlannerTask(taskId, completed, status, sendResponse) {
  const session = await getFreshSession();
  if (!session) {
    sendResponse({ success: false, error: 'Not authenticated' });
    return;
  }
  try {
    const payload = {
      completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      status: status
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/planner_tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const tasks = await syncPlannerTasksFromSupabase();
      sendResponse({ success: true, tasks });
    } else {
      sendResponse({ success: false, error: await res.text() });
    }
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

async function handleDeletePlannerTask(taskId, sendResponse) {
  const session = await getFreshSession();
  if (!session) {
    sendResponse({ success: false, error: 'Not authenticated' });
    return;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/planner_tasks?id=eq.${taskId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (res.ok) {
      const tasks = await syncPlannerTasksFromSupabase();
      sendResponse({ success: true, tasks });
    } else {
      sendResponse({ success: false, error: await res.text() });
    }
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

async function handleGetTodayPlannerTasks(sendResponse) {
  const tasks = await syncPlannerTasksFromSupabase();
  sendResponse({ success: !!tasks, tasks });
}
