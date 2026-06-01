const PROD_URL = 'https://antidistract-website.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
  const openDashboard = () => {
    chrome.storage.local.get(['activeTheme'], (data) => {
      const theme = data.activeTheme || 'default';
      chrome.tabs.create({ url: `${PROD_URL}?theme=${encodeURIComponent(theme)}` });
    });
  };

  const timerDisplay = document.getElementById('timer-display');
  const goalInput = document.getElementById('goal-input');
  const actionBtn = document.getElementById('main-action-btn');
  const resetBtn = document.getElementById('reset-session-btn');
  const durationCards = document.querySelectorAll('.duration-card');
  const socialTrigger = document.getElementById('social-media-trigger');
  const tunnelToggle = document.getElementById('tunnel-vision-toggle');
  const blockToggle = document.getElementById('block-toggle');
  const aiMonitorToggle = document.getElementById('ai-monitor-toggle');
  const silencerToggle = document.getElementById('silencer-toggle');
  const grayscaleToggle = document.getElementById('grayscale-toggle');
  const roomJoinInput = document.getElementById('room-join-input');
  const joinBtn = document.getElementById('btn-join-room');
  const createBtn = document.getElementById('btn-create-room');
  const rejoinContainer = document.getElementById('rejoin-container');
  const rejoinPill = document.getElementById('rejoin-pill');
  const rejoinCodeDisplay = document.getElementById('rejoin-code');

  let selectedDuration = 25;

  // Load initial state
  chrome.storage.local.get(['remainingTime', 'isRunning', 'goal', 'tunnelVisionEnabled', 'blockingEnabled', 'aiMonitor', 'silencerMode', 'grayscaleMode', 'endTime', 'activeScene', 'activeSound', 'activeTheme', 'blockedSites', 'userSession', 'lastRoomCode', 'aiScansUsed', 'aiScansDate', 'subscriptionTier', 'scanLimitReached'], (data) => {
    updateTimerDisplay(data.remainingTime || 1500);
    updateActionBtn(data.isRunning, data.endTime);
    goalInput.value = data.goal || '';
    tunnelToggle.checked = !!data.tunnelVisionEnabled;
    blockToggle.checked = !!data.blockingEnabled;
    if (aiMonitorToggle) aiMonitorToggle.checked = !!data.aiMonitor;
    // Defer UI-only state update (doesn't touch storage)
    setTimeout(() => setAiMonitorState(!!data.isRunning), 0);

    if (silencerToggle) silencerToggle.checked = !!data.silencerMode;
    if (grayscaleToggle) grayscaleToggle.checked = !!data.grayscaleMode;

    // Initialize Theme
    const initTheme = data.activeTheme || 'default';
    document.body.dataset.theme = initTheme;
    document.querySelectorAll('.color-chip').forEach(c => c.classList.toggle('active', c.dataset.theme === initTheme));



    if (data.lastRoomCode && rejoinContainer) {
      rejoinContainer.style.display = 'block';
      rejoinCodeDisplay.innerText = data.lastRoomCode;
    }

    // Cloud Status and Account UI Update
    const cloudStatus = document.getElementById('cloud-status');
    const accountView = document.getElementById('account-view');
    const accountEmail = document.getElementById('account-email');
    const accountAvatar = document.getElementById('account-avatar');

    if (cloudStatus) {
      if (data.userSession) {
        cloudStatus.classList.add('synced');
        cloudStatus.title = `Sync Status: Connected as ${data.userSession.user.email}`;
      } else {
        cloudStatus.classList.remove('synced');
        cloudStatus.title = 'Sync Status: Local Only (Click to Login)';
      }

      cloudStatus.addEventListener('click', () => {
        openDashboard();
      });
    }

    if (accountView) {
      if (data.userSession) {
        accountView.style.display = 'flex';
        accountEmail.innerText = data.userSession.user.email;
        accountAvatar.innerText = data.userSession.user.email[0].toUpperCase();

        // Render usage card based on subscription tier
        renderUsageCard(data.subscriptionTier || 'free', data.aiScansUsed || 0, data.aiScansDate, data.scanLimitReached);

      } else {
        accountView.style.display = 'none';
      }
    }

    if (data.activeScene) {
      document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.scene === data.activeScene) opt.classList.add('active');
      });
    }

    if (data.activeTheme) {
      document.body.dataset.theme = data.activeTheme;
      document.querySelectorAll('.color-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.theme === data.activeTheme);
      });
    }

    if (data.activeSound) {
      updateSoundsUI(data.activeSound);
    } else {
      updateSoundsUI(null);
    }

    // Site Blocker Initialization
    const defaultSites = ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'reddit.com', 'youtube.com', 'tiktok.com'];
    const blockedSites = data.blockedSites || defaultSites;
    if (!data.blockedSites) chrome.storage.local.set({ blockedSites });
    renderBlockedSites(blockedSites);
  });

  // Site Blocker Logic
  const siteInput = document.getElementById('blocked-site-input');
  const addSiteBtn = document.getElementById('add-site-btn');
  const siteListContainer = document.getElementById('blocked-sites-list');

  function renderBlockedSites(sites) {
    siteListContainer.innerHTML = '';
    sites.forEach(site => {
      const tag = document.createElement('div');
      tag.className = 'blocked-site-tag';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = site;
      const removeSpan = document.createElement('span');
      removeSpan.className = 'remove-site';
      removeSpan.dataset.site = site;
      removeSpan.textContent = '\u00d7';
      tag.appendChild(nameSpan);
      tag.appendChild(removeSpan);
      siteListContainer.appendChild(tag);
    });
  }

  function sanitizeDomain(input) {
    let domain = input.trim().toLowerCase();

    // Remove protocol (http, https)
    if (domain.includes('://')) {
      domain = domain.split('://')[1];
    }

    // Remove port, path, or query
    domain = domain.split('/')[0].split(':')[0].split('?')[0];

    // Remove 'www.' prefix if present
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }

    return domain;
  }

  addSiteBtn.addEventListener('click', () => {
    let site = sanitizeDomain(siteInput.value);
    if (site) {
      chrome.storage.local.get(['blockedSites'], (data) => {
        const sites = data.blockedSites || [];
        if (!sites.includes(site)) {
          sites.push(site);
          chrome.storage.local.set({ blockedSites: sites }, () => {
            renderBlockedSites(sites);
            siteInput.value = '';
          });
        }
      });
    }
  });

  siteListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-site')) {
      const siteToRemove = e.target.dataset.site;
      chrome.storage.local.get(['blockedSites'], (data) => {
        const sites = (data.blockedSites || []).filter(s => s !== siteToRemove);
        chrome.storage.local.set({ blockedSites: sites }, () => {
          renderBlockedSites(sites);
        });
      });
    }
  });

  // --- LIVE ROOMS LOGIC ---
  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      const code = roomJoinInput.value.trim().toUpperCase();
      if (code.length === 6) {
        chrome.storage.local.set({ lastRoomCode: code }, () => {
          chrome.tabs.create({ url: `${PROD_URL}?room=${code}` });
        });
      }
    });

    roomJoinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') joinBtn.click();
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: `${PROD_URL}?action=create_room` });
    });
  }

  if (rejoinPill) {
    rejoinPill.addEventListener('click', () => {
      const code = rejoinCodeDisplay.innerText;
      if (code) {
        chrome.tabs.create({ url: `${PROD_URL}?room=${code}` });
      }
    });
  }
  // ------------------------

  // Color Theme Selection
  const colorChips = document.querySelectorAll('.color-chip');
  colorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const theme = chip.dataset.theme;
      document.body.dataset.theme = theme;
      colorChips.forEach(c => c.classList.toggle('active', c === chip));
      chrome.storage.local.set({ activeTheme: theme });
    });
  });

  // --- Sound UI helpers (defined early so they can be used in storage.onChanged) ---
  const soundOptions = document.querySelectorAll('.sound-option');
  const soundToggleBtn = document.getElementById('sound-play-toggle');

  function updateSoundsUI(activeSound) {
    soundOptions.forEach(opt => {
      opt.classList.remove('active');
      if (opt.dataset.sound === activeSound) opt.classList.add('active');
    });
    if (activeSound) {
      soundToggleBtn.innerText = 'Stop Music';
      soundToggleBtn.style.display = 'block';
    } else {
      soundToggleBtn.style.display = 'none';
    }
  }

  // ── Usage Card Renderer ──────────────────────────────────────────────────
  // Renders the scan usage bar + badge consistently for both Free and Pro tiers
  function renderUsageCard(tier, scansUsed, scansDate, limitReached) {
    const badge = document.getElementById('account-badge');
    const usageLabel = document.getElementById('usage-label');
    const usageBar = document.getElementById('usage-bar-fill');
    const upgradeLink = document.getElementById('upgrade-link');

    const isPro = tier === 'pro';
    const maxScans = isPro ? 200 : 10;

    // Reset daily count if it's a new day
    const today = new Date().toISOString().split('T')[0];
    const used = (scansDate !== today) ? 0 : scansUsed;
    const remaining = Math.max(0, maxScans - used);
    const percent = Math.min(100, (remaining / maxScans) * 100);

    // Badge
    if (badge) {
      badge.className = `account-badge ${isPro ? 'premium' : ''}`;
      badge.textContent = isPro ? '✦ Pro' : 'Free';
    }

    // Bar fill color: green → orange → red as usage climbs
    if (usageBar) {
      usageBar.style.width = `${percent}%`;
      usageBar.style.background = percent > 50
        ? 'var(--accent-color)'
        : percent > 20
          ? '#f59e0b'
          : '#ef4444';
    }

    // Label
    if (usageLabel) {
      usageLabel.textContent = `${remaining} / ${maxScans} AI scans left today`;
    }

    // Upgrade link: show for free users, especially when limit is near/hit
    if (upgradeLink) {
      if (!isPro) {
        upgradeLink.style.display = 'inline';
        upgradeLink.title = 'Upgrade to Pro for 200 scans/day';
        upgradeLink.onclick = (e) => {
          e.preventDefault();
          chrome.storage.local.get(['activeTheme'], (d) => {
            chrome.tabs.create({ url: `${PROD_URL}/settings?tab=billing` });
          });
        };
      } else {
        upgradeLink.style.display = 'none';
      }
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.remainingTime && !changes.remainingTime.newValue) return;
    if (changes.remainingTime) updateTimerDisplay(changes.remainingTime.newValue);

    if (changes.isRunning || changes.endTime) {
      chrome.storage.local.get(['isRunning', 'endTime'], (data) => {
        updateActionBtn(data.isRunning, data.endTime);
      });
    }

    if (changes.isRunning !== undefined) {
      const running = changes.isRunning.newValue;
      setAiMonitorState(running);
    }

    if (changes.activeSound !== undefined) {
      updateSoundsUI(changes.activeSound.newValue || null);
    }

    if (changes.activeTheme !== undefined) {
      const theme = changes.activeTheme.newValue || 'default';
      document.body.dataset.theme = theme;
      colorChips.forEach(c => c.classList.toggle('active', c.dataset.theme === theme));
    }

    if (changes.aiScansUsed !== undefined || changes.subscriptionTier !== undefined || changes.scanLimitReached !== undefined) {
      chrome.storage.local.get(['aiScansUsed', 'aiScansDate', 'subscriptionTier', 'scanLimitReached'], (d) => {
        renderUsageCard(d.subscriptionTier || 'free', d.aiScansUsed || 0, d.aiScansDate, d.scanLimitReached);
      });
    }

    if (changes.dailyTargets !== undefined) {
      renderDailyTargets(changes.dailyTargets.newValue || []);
    }
  });

  // Goal Update
  goalInput.addEventListener('input', (e) => {
    chrome.storage.local.set({ goal: e.target.value });
  });

  // Duration Selection
  durationCards.forEach(card => {
    card.addEventListener('click', () => {
      durationCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedDuration = parseInt(card.dataset.time);
      chrome.runtime.sendMessage({ type: 'SET_DURATION', minutes: selectedDuration });
    });
  });

  // Accordions
  const accordions = document.querySelectorAll('.accordion-item');
  accordions.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Optional: close other accordions
      accordions.forEach(acc => acc.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // Scene Selection
  const themeOptions = document.querySelectorAll('.theme-option');
  themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      themeOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      const scene = option.dataset.scene;

      // Map scenes to internal extension assets
      const sceneFiles = {
        'forest': 'assets/themes/forest_bg.png',
        'cafe': 'assets/themes/cafe_bg.png',
        'rain': 'assets/themes/rain_bg.png',
        'library': 'assets/themes/library_bg.png',
        'space': 'assets/themes/space_bg.png'
      };

      const sceneUrl = chrome.runtime.getURL(sceneFiles[scene]);

      chrome.storage.local.set({
        activeScene: scene,
        activeSceneUrl: sceneUrl
      });
    });
  });

  // Sound Selection (soundOptions & updateSoundsUI defined above)
  soundOptions.forEach(option => {
    option.addEventListener('click', () => {
      const sound = option.dataset.sound;
      // Immediate visual feedback
      updateSoundsUI(sound);
      chrome.storage.local.set({ activeSound: sound });
      chrome.runtime.sendMessage({ type: 'PLAY_SOUND', sound });
    });
  });

  soundToggleBtn.addEventListener('click', () => {
    updateSoundsUI(null);
    chrome.storage.local.set({ activeSound: null });
    chrome.runtime.sendMessage({ type: 'STOP_SOUND' });
  });

  // Tunnel Vision Toggle
  tunnelToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ tunnelVisionEnabled: enabled });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_TUNNEL_VISION', enabled });
      }
    });
  });

  // Block Toggle
  blockToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ blockingEnabled: e.target.checked });
  });

  const aiMonitorHint = document.getElementById('ai-monitor-hint');

  function setAiMonitorState(isRunning) {
    if (!aiMonitorToggle) return;
    if (!isRunning) {
      // UI-only: grey out and uncheck. Storage is updated by background.js.
      aiMonitorToggle.checked = false;
      aiMonitorToggle.disabled = true;
      aiMonitorToggle.closest('label').style.opacity = '0.4';
    } else {
      aiMonitorToggle.disabled = false;
      aiMonitorToggle.closest('label').style.opacity = '1';
    }
  }

  if (aiMonitorToggle) {
    aiMonitorToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        chrome.storage.local.get(['isRunning', 'goal'], (data) => {
          if (!data.isRunning || !data.goal) {
            e.target.checked = false;
            if (aiMonitorHint) {
              aiMonitorHint.style.display = 'block';
              setTimeout(() => { aiMonitorHint.style.display = 'none'; }, 4000);
            }
          } else {
            if (aiMonitorHint) aiMonitorHint.style.display = 'none';
            chrome.storage.local.set({ aiMonitor: true });
            chrome.runtime.sendMessage({ action: 'updateConfig', key: 'aiMonitor', value: true });
          }
        });
      } else {
        if (aiMonitorHint) aiMonitorHint.style.display = 'none';
        chrome.storage.local.set({ aiMonitor: false });
        chrome.runtime.sendMessage({ action: 'updateConfig', key: 'aiMonitor', value: false });
      }
    });
  }


  if (silencerToggle) {
    silencerToggle.addEventListener('change', (e) => {
      chrome.runtime.sendMessage({ action: 'updateConfig', key: 'silencerMode', value: e.target.checked });
    });
  }

  if (grayscaleToggle) {
    grayscaleToggle.addEventListener('change', (e) => {
      chrome.runtime.sendMessage({ action: 'updateConfig', key: 'grayscaleMode', value: e.target.checked });
    });
  }

  // Main Action (Start/Stop)
  actionBtn.addEventListener('click', () => {
    chrome.storage.local.get(['isRunning', 'goal'], (data) => {
      if (data.isRunning) {
        chrome.runtime.sendMessage({ type: 'STOP_TIMER' });
      } else {
        const goal = data.goal || goalInput.value;
        if (!goal || goal.trim() === '') {
          goalInput.focus();
          return;
        }
        chrome.runtime.sendMessage({ type: 'START_TIMER' });
      }
    });
  });

  resetBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESET_TIMER' });
  });

  // View Switching
  const views = document.querySelectorAll('.view');
  const tabItems = document.querySelectorAll('.tab-item');

  function switchView(viewId) {
    views.forEach(v => v.style.display = 'none');
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.style.display = 'flex';

    tabItems.forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById(`nav-${viewId.split('-')[0]}`);
    if (activeTab) activeTab.classList.add('active');

    if (viewId === 'dashboard-view') {
      loadDashboardData();
    }
  }

  document.getElementById('nav-focus').addEventListener('click', () => switchView('focus-view'));
  document.getElementById('nav-dashboard').addEventListener('click', () => switchView('dashboard-view'));

  async function loadDashboardData() {
    chrome.storage.local.get(['completedSessions', 'localInterruptions', 'interruptionsCount', 'distractions', 'dailyTargets', 'userSession'], async (data) => {
      const goalsHit = document.getElementById('stat-goals');
      const interruptions = document.getElementById('stat-interruptions');

      if (data.userSession && data.userSession.user) {
        try {
          const userId = data.userSession.user.id;
          const SUPABASE_URL = 'https://jtnqrswupbjqobasrrjm.supabase.co';
          const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bnFyc3d1cGJqcW9iYXNycmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjI0MjUsImV4cCI6MjA4ODE5ODQyNX0.uE8kabu6gHQVwIEY6UgN0VmsZJhhkrvFWPu0HsvmMPM';

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isoDate = today.toISOString();

          // Fetch Sessions
          const sessionsRes = await fetch(`${SUPABASE_URL}/rest/v1/study_sessions?user_id=eq.${userId}&timestamp=gte.${isoDate}&select=id`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${data.userSession.access_token || SUPABASE_KEY}` }
          });
          const sessionsData = await sessionsRes.json();

          // Fetch Interruptions
          const interruptionsRes = await fetch(`${SUPABASE_URL}/rest/v1/study_interruptions?user_id=eq.${userId}&timestamp=gte.${isoDate}&select=id`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${data.userSession.access_token || SUPABASE_KEY}` }
          });
          const interruptionsData = await interruptionsRes.json();

          if (goalsHit) goalsHit.innerText = sessionsData.length || 0;
          if (interruptions) interruptions.innerText = interruptionsData.length || 0;
        } catch (e) {
          console.error('Error fetching synced stats:', e);
          fallbackLocalStats(data, goalsHit, interruptions);
        }
      } else {
        fallbackLocalStats(data, goalsHit, interruptions);
      }

      // 2. Distractions
      const distList = document.getElementById('distractions-list');
      const distractions = data.distractions || {};
      const sortedDist = Object.entries(distractions)
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .slice(0, 5); // Top 5

      if (distList) {
        if (sortedDist.length > 0) {
          distList.innerHTML = sortedDist.map(([domain, count]) => `
            <div class="distraction-item">
              <span class="distraction-domain">${domain}</span>
              <span class="distraction-count">${count}</span>
            </div>
          `).join('');
        } else {
          distList.innerHTML = '<p class="empty-state small">No distractions recorded yet.</p>';
        }
      }

      // 3. Targets
      renderDailyTargets(data.dailyTargets || []);
      if (data.userSession && data.userSession.user) {
        chrome.runtime.sendMessage({ type: 'GET_TODAY_PLANNER_TASKS' }, (response) => {
          if (response && response.success && response.tasks) {
            renderDailyTargets(response.tasks);
          }
        });
      }
    });
  }

  function fallbackLocalStats(data, goalsHit, interruptions) {
    const isToday = (dateString) => {
      if (!dateString) return false;
      const d = new Date(dateString);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    };

    const todaySessions = (data.completedSessions || []).filter(s => isToday(s.timestamp));

    let todayIntsCount = (data.localInterruptions || []).filter(ts => isToday(ts)).length;
    if (todayIntsCount === 0 && data.interruptionsCount > 0) {
      todayIntsCount = data.interruptionsCount;
    }

    if (goalsHit) goalsHit.innerText = todaySessions.length;
    if (interruptions) interruptions.innerText = todayIntsCount;
  }

  // Daily Targets Logic
  const targetInput = document.getElementById('target-input');
  const addTargetBtn = document.getElementById('add-target-btn');
  const clearTargetsBtn = document.getElementById('clear-targets-btn');
  const targetsList = document.getElementById('targets-list');

  function renderDailyTargets(targets) {
    if (!targetsList) return;
    if (targets.length > 0) {
      targetsList.innerHTML = targets.map((t, index) => {
        // Migration/Sanity check: handle string items or object items
        const isObject = typeof t === 'object' && t !== null;
        const text = isObject ? t.text : t;
        const completed = isObject ? !!t.completed : false;

        return `
          <div class="target-item ${completed ? 'is-completed' : ''}">
            <div class="target-main" data-index="${index}">
              <span class="target-check">${completed ? '✓' : '○'}</span>
              <span class="target-text ${completed ? 'completed' : ''}">${text}</span>
            </div>
            <span class="delete-target" data-index="${index}">&times;</span>
          </div>
        `;
      }).join('');
    } else {
      targetsList.innerHTML = '<p class="empty-state small">No targets set for today.</p>';
    }
  }

  if (addTargetBtn && targetInput) {
    addTargetBtn.addEventListener('click', () => {
      const text = targetInput.value.trim();
      if (text) {
        chrome.storage.local.get(['dailyTargets', 'userSession'], (data) => {
          if (data.userSession && data.userSession.user) {
            chrome.runtime.sendMessage({ type: 'ADD_PLANNER_TASK', text }, (response) => {
              if (response && response.success) {
                targetInput.value = '';
              } else {
                // local fallback
                const targets = data.dailyTargets || [];
                targets.push({ text, completed: false });
                chrome.storage.local.set({ dailyTargets: targets }, () => {
                  targetInput.value = '';
                });
              }
            });
          } else {
            const targets = data.dailyTargets || [];
            targets.push({ text, completed: false });
            chrome.storage.local.set({ dailyTargets: targets }, () => {
              targetInput.value = '';
            });
          }
        });
      }
    });

    targetInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTargetBtn.click();
    });
  }

  if (clearTargetsBtn) {
    clearTargetsBtn.addEventListener('click', () => {
      chrome.storage.local.get(['dailyTargets', 'userSession'], (data) => {
        if (data.userSession && data.userSession.user) {
          const targets = data.dailyTargets || [];
          const deletePromises = targets
            .filter(t => typeof t === 'object' && t !== null && t.id)
            .map(t => {
              return new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: 'DELETE_PLANNER_TASK', id: t.id }, resolve);
              });
            });
          Promise.all(deletePromises).then(() => {
            chrome.storage.local.set({ dailyTargets: [] });
          });
        } else {
          chrome.storage.local.set({ dailyTargets: [] });
        }
      });
    });
  }

  if (targetsList) {
    targetsList.addEventListener('click', (e) => {
      // Toggle Completion
      const targetMain = e.target.closest('.target-main');
      if (targetMain) {
        const index = parseInt(targetMain.dataset.index);
        chrome.storage.local.get(['dailyTargets', 'userSession'], (data) => {
          const targets = data.dailyTargets || [];
          if (index < 0 || index >= targets.length) return;
          const target = targets[index];
          const isObject = typeof target === 'object' && target !== null;
          const currentCompleted = isObject ? !!target.completed : false;
          const newCompleted = !currentCompleted;
          const newStatus = newCompleted ? 'completed' : 'todo';

          if (data.userSession && data.userSession.user && isObject && target.id) {
            chrome.runtime.sendMessage({
              type: 'TOGGLE_PLANNER_TASK',
              id: target.id,
              completed: newCompleted,
              status: newStatus
            }, (response) => {
              if (!response || !response.success) {
                console.error('Failed to toggle task in cloud:', response?.error);
              }
            });
          } else {
            if (typeof targets[index] === 'string') {
              targets[index] = { text: targets[index], completed: newCompleted };
            } else {
              targets[index].completed = newCompleted;
            }
            chrome.storage.local.set({ dailyTargets: targets });
          }
        });
        return;
      }

      // Delete Target
      if (e.target.classList.contains('delete-target')) {
        const index = parseInt(e.target.dataset.index);
        chrome.storage.local.get(['dailyTargets', 'userSession'], (data) => {
          const targets = data.dailyTargets || [];
          if (index < 0 || index >= targets.length) return;
          const target = targets[index];
          const isObject = typeof target === 'object' && target !== null;

          if (data.userSession && data.userSession.user && isObject && target.id) {
            chrome.runtime.sendMessage({
              type: 'DELETE_PLANNER_TASK',
              id: target.id
            }, (response) => {
              if (!response || !response.success) {
                console.error('Failed to delete task in cloud:', response?.error);
              }
            });
          } else {
            targets.splice(index, 1);
            chrome.storage.local.set({ dailyTargets: targets });
          }
        });
      }
    });
  }

  function updateTimerDisplay(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');

    const hBox = document.getElementById('timer-h');
    const mBox = document.getElementById('timer-m');
    const sBox = document.getElementById('timer-s');

    if (hBox) hBox.innerText = h;
    if (mBox) mBox.innerText = m;
    if (sBox) sBox.innerText = s;
  }

  let uiTimerInterval;

  function updateActionBtn(isRunning, endTime) {
    if (isRunning) {
      actionBtn.innerText = 'Stop Focus Session';
      actionBtn.classList.add('running');
      resetBtn.style.display = 'block';
      timerDisplay.style.display = 'flex';

      const updateTimer = () => {
        if (endTime) {
          const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
          updateTimerDisplay(remaining);
          if (remaining <= 0 && uiTimerInterval) {
            clearInterval(uiTimerInterval);
            uiTimerInterval = null;
          }
        }
      };

      // Run once immediately
      updateTimer();

      // Start local UI timer only if not already running
      if (!uiTimerInterval) {
        uiTimerInterval = setInterval(updateTimer, 100);
      }
    } else {
      actionBtn.innerText = 'Start Focus Session';
      actionBtn.classList.remove('running');
      resetBtn.style.display = 'none';
      timerDisplay.style.display = 'none';
      if (uiTimerInterval) {
        clearInterval(uiTimerInterval);
        uiTimerInterval = null;
      }
    }
  }

  // Dashboard Navigation
  const viewAnalysisBtn = document.querySelector('#dashboard-view .secondary-btn.full-width');
  if (viewAnalysisBtn) {
    viewAnalysisBtn.addEventListener('click', () => {
      openDashboard();
    });
  }
});
