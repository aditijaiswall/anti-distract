// This script runs on the AntiDistract Dashboard (antidistract-website.vercel.app)
// It catches the login session from React and hands it to the extension.



window.addEventListener('STUDY_WITH_ME_SYNC', (event) => {
  const session = event.detail.session;
  if (session) {
    try {
      if (!chrome?.runtime?.sendMessage) throw new Error("Extension Context Invalid");
      chrome.runtime.sendMessage({
        type: 'SYNC_USER',
        session: session
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('⚠️ Bridge Disconnected. Please refresh the page to reconnect.');
        } else {
          // Session bridged successfully
        }
      });
    } catch (error) {
      console.warn('⚠️ Bridge offline. Please hard-refresh this page (F5) to restart the extension context.');
    }
  }
});

// Listen for requests for local extension data (like distractions)
window.addEventListener('REQUEST_EXTENSION_DATA', () => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['distractions'], (data) => {
      window.dispatchEvent(new CustomEvent('EXTENSION_DATA_RESPONSE', {
        detail: data
      }));
    });
  }
});
window.addEventListener('REQUEST_THEME', () => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['activeTheme'], (data) => {
      window.dispatchEvent(new CustomEvent('THEME_RESPONSE', {
        detail: data.activeTheme || 'default'
      }));
    });
  }
});
// Announce that the bridge is ready in case the React app had already loaded and requested data
window.dispatchEvent(new CustomEvent('EXTENSION_BRIDGE_READY'));

if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.activeTheme) {
      window.dispatchEvent(new CustomEvent('THEME_RESPONSE', {
        detail: changes.activeTheme.newValue || 'default'
      }));
    }

    // Auto-push scan data changes to website whenever they change in extension
    if (areaName === 'local' && (changes.aiScansUsed || changes.subscriptionTier || changes.scanLimitReached)) {
      chrome.storage.local.get(
        ['aiScansUsed', 'aiScansDate', 'subscriptionTier', 'scanLimitReached'],
        (data) => {
          window.dispatchEvent(new CustomEvent('SCAN_DATA_RESPONSE', { detail: data }));
        }
      );
    }
  });

  window.addEventListener('UPDATE_EXTENSION_THEME', (event) => {
    const newTheme = event.detail;
    if (newTheme) {
      chrome.storage.local.set({ activeTheme: newTheme });
    }
  });

  // ── Bidirectional Scan Data Sync ──────────────────────────────────────────

  // Website → Extension: push Supabase Realtime updates into extension storage
  window.addEventListener('UPDATE_SCAN_DATA', (event) => {
    chrome.storage.local.set(event.detail);
  });

  // Extension → Website: respond to scan data requests
  window.addEventListener('REQUEST_SCAN_DATA', () => {
    chrome.storage.local.get(
      ['aiScansUsed', 'aiScansDate', 'subscriptionTier', 'scanLimitReached'],
      (data) => {
        window.dispatchEvent(new CustomEvent('SCAN_DATA_RESPONSE', { detail: data }));
      }
    );
  });

  // Website → Extension: Sync today's tasks lists
  window.addEventListener('SYNC_PLANNER_TASKS', (event) => {
    if (event.detail) {
      chrome.storage.local.set({ dailyTargets: event.detail });
    }
  });

  // Website → Extension: Start a focus session (triggered from Focus Rooms)
  window.addEventListener('START_FOCUS_SESSION', (event) => {
    const { duration, goal } = event.detail || {};
    if (!duration) return;
    chrome.storage.local.set({
      remainingTime: duration,
      goal: goal || 'Focus Room Session'
    }, () => {
      chrome.runtime.sendMessage({ type: 'START_TIMER' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('⚠️ Failed to start timer from bridge:', chrome.runtime.lastError.message);
        } else {
          // Timer started
        }
      });
    });
  });

  // Website → Extension: Stop a focus session (triggered when leaving a Focus Room)
  window.addEventListener('STOP_FOCUS_SESSION', () => {
    chrome.runtime.sendMessage({ type: 'RESET_TIMER' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('⚠️ Failed to stop timer from bridge:', chrome.runtime.lastError.message);
      }
    });
  });
}
