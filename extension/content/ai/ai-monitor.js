/**
 * ============================================================
 *  FocusGuard — AI Monitor Module (PREMIUM)
 *  content/ai/ai-monitor.js
 *
 *  Loaded BEFORE platform scripts (see manifest.json).
 *  Exposes window.aiMonitor with:
 *    - checkAndBlock(goal, videoData)  → runs AI check, blocks page if off-topic
 *    - recheck(goal, videoData)        → re-run AI check after user disputes (unblocks if AI agrees)
 * ============================================================
 */

(() => {
    if (window !== window.top) return;

    // ── Auth state ──────────────────────────────────
    let _token = null;

    // Load on init and stay in sync
    function _refreshToken() {
        if (!chrome.runtime?.id) return; // Prevent extension context invalidation errors
        chrome.storage.local.get(['userSession'], ({ userSession }) => {
            const newToken = userSession?.access_token || null;
            if (newToken !== _token) {
                _token = newToken;
            }
        });
    }

    _refreshToken(); // Load on init

    // Polling is removed for production; relying purely on storage.onChanged for performance (prevents hundreds of intervals per user)

    if (chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.userSession !== undefined) {
                const userSession = changes.userSession.newValue;
                _token = userSession?.access_token || null;
            }
        });
    }

    // ── isAvailable ─────────────────────────────────
    function isAvailable() {
        return !!_token;
    }

    // ── Token refresh ────────────────────────────────

    async function _tryRefreshToken() {
        _refreshToken();
        return new Promise(r => setTimeout(() => r(!!_token), 1500));
    }

    // ── Core fetch function (proxied through background) ──
    async function _fetchAI(goal, videoData, isRetry = false, userJustification = '') {
        return new Promise((resolve, reject) => {
            const payload = {
                goal,
                videoTitle: videoData.title || '',
                videoChannel: videoData.channel || '',
                videoDescription: videoData.description || '',
                url: videoData.url || window.location.href,
                userJustification
            };

            if (!chrome.runtime?.id) {
                return reject(new Error('Extension context invalidated'));
            }

            chrome.runtime.sendMessage({
                action: 'fetchAI',
                token: _token,
                payload
            }, async (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[AI Monitor] Extension connection error:', chrome.runtime.lastError);
                    return reject(new Error('Background script disconnected'));
                }

                if (!response) {
                    return reject(new Error('No response from background'));
                }

                const { status, ok, data } = response;

                if (status === 401 && !isRetry) {
                    const refreshed = await _tryRefreshToken();
                    if (refreshed) {
                        try {
                            const retryRes = await _fetchAI(goal, videoData, true);
                            return resolve(retryRes);
                        } catch (err) {
                            return reject(err);
                        }
                    }
                    console.error('[AI Monitor] Refresh failed — user needs to sign in again');
                    return reject(new Error('Session expired. Please sign in again from the extension popup.'));
                }

                // ── Daily scan limit reached (429 from server) ──
                if (status === 429 && data?.limitReached) {
                    const tier = data.tier || 'free';
                    const used = data.scansUsed || 0;
                    const limit = data.scanLimit || 10;
                    console.error(`[AI Monitor] Scan limit reached: ${used}/${limit} (${tier} tier)`);

                    // Store limit state locally so popup can show it immediately
                    chrome.storage.local.set({
                        aiScansUsed: used,
                        aiScansDate: new Date().toISOString().split('T')[0],
                        subscriptionTier: tier,
                        scanLimitReached: true
                    });

                    // Show a non-blocking upgrade notice (not a full block overlay)
                    _showScanningNotice(
                        tier === 'free'
                            ? `⚡ Free scan limit reached (${used}/${limit}). Upgrade to Pro for 200 scans/day.`
                            : `AI scan limit reached for today (${used}/${limit}).`
                    );
                    setTimeout(_removeScanningNotice, 8000);

                    return resolve({ used: false, limitReached: true, tier, scansUsed: used, scanLimit: limit });
                }

                if (!ok) {
                    console.error('[AI Monitor] Backend error response:', data);
                    return reject(new Error(data.detail || data.error || `HTTP ${status}`));
                }

                // ── Sync usage from server response (authoritative) ──
                if (data._usage) {
                    chrome.storage.local.set({
                        aiScansUsed: data._usage.scansUsed,
                        aiScansDate: new Date().toISOString().split('T')[0],
                        subscriptionTier: data._usage.tier,
                        scanLimitReached: false
                    });
                } else {
                    // Fallback: increment locally
                    chrome.storage.local.get(['aiScansUsed', 'aiScansDate'], (res) => {
                        const today = new Date().toISOString().split('T')[0];
                        let used = res.aiScansDate !== today ? 0 : (res.aiScansUsed || 0);
                        chrome.storage.local.set({
                            aiScansUsed: used + 1,
                            aiScansDate: today,
                            scanLimitReached: false
                        });
                    });
                }
                // ───────────────────────────────────────────────

                resolve(data);
            });
        });
    }

    // ── Scanning notice (small bottom-right badge) ──
    function _showScanningNotice(message) {
        AntiDistractUI.showScanningNotice(message);
    }

    function _removeScanningNotice() {
        AntiDistractUI.removeScanningNotice();
    }

    // ── Full-screen block overlay ────────────────────
    function _showBlockOverlay(goal, videoData, aiResult, onRecheck) {
        _removeBlockOverlay();

        // Pause video immediately
        document.querySelector('video')?.pause();

        const isReddit = window.location.hostname.includes('reddit.com');
        const isYouTube = window.location.hostname.includes('youtube.com');
        const confidence = aiResult?.confidence ?? null;
        const reasoning = aiResult?.reasoning ?? 'This page does not appear related to your goal.';

        AntiDistractUI.showAIBlockOverlay(goal, reasoning, confidence, isReddit, isYouTube, onRecheck, () => {
            window.location.href = 'https://www.google.com';
        });
    }

    function _removeBlockOverlay() {
        AntiDistractUI.removeBlockOverlay();
    }

    // ── Public API ───────────────────────────────────

    /**
     * Run AI check. If off-topic, block the full page.
     * @param {string} goal
     * @param {{ title, channel, description }} videoData
     */
    async function checkAndBlock(goal, videoData) {
        // Always re-read token fresh from storage
        return new Promise((resolve) => {
            if (!chrome.runtime?.id) return resolve({ used: false, error: 'Context invalidated' });
            chrome.storage.local.get(['userSession'], async ({ userSession }) => {
                _token = userSession?.access_token || null;

                if (!_token) {
                    console.warn('[AI Monitor] No auth token — visit the AntiDistract dashboard to log in.');
                    // Show a non-intrusive hint instead of silently failing
                    _showScanningNotice('AI Monitor: Please open the dashboard to sync your login.');
                    setTimeout(_removeScanningNotice, 5000);
                    resolve({ used: false });
                    return;
                }

                _showScanningNotice('AI Monitor scanning video...');
                try {
                    const result = await _fetchAI(goal, videoData);
                    _removeScanningNotice();

                    if (!result.isRelevant) {
                        _showBlockOverlay(goal, videoData, result, (just) => recheck(goal, videoData, just));
                    } else {
                        // If it is relevant (e.g. user navigated to a useful search result),
                        // actively remove the block overlay if it exists from a previous page
                        _removeBlockOverlay();
                    }

                    resolve({ used: true, isRelevant: result.isRelevant, result });
                } catch (err) {
                    _removeScanningNotice();
                    console.error('[AI Monitor] Error:', err.message);
                    resolve({ used: false, error: err.message });
                }
            });
        });
    }

    // Local cache to prevent immediate re-blocking on SPAs after user justifies a page
    const _justifiedUrls = new Set();

    /**
     * Re-check after user disputes the AI block.
     * Unblocks only if AI now agrees the content is relevant.
     */
    async function recheck(goal, videoData, userJustification = '') {
        _showScanningNotice('Evaluating justification...');
        try {
            const result = await _fetchAI(goal, videoData, false, userJustification);
            _removeScanningNotice();

            console.log('[AI Monitor] Re-check result:', result.isRelevant ? '✅ JUSTIFICATION ACCEPTED — UNBLOCKED' : '❌ JUSTIFICATION REJECTED — STILL BLOCKED');

            if (result.isRelevant) {
                // Add to local whitelist so the SPA mutation observer doesn't immediately re-block it
                _justifiedUrls.add(window.location.href);
                _removeBlockOverlay();
            } else {
                // Update overlay with new reasoning
                _showBlockOverlay(goal, videoData, result, (just) => recheck(goal, videoData, just));
            }
        } catch (err) {
            _removeScanningNotice();
            console.error('[AI Monitor] Re-check error:', err.message);
        }
    }

    // ── Attach to window ─────────────────────────────
    window.aiMonitor = {
        isAvailable,
        checkAndBlock,
        recheck
    };



    // ── Auto-scan for ALL Sites ──────────
    const hostname = window.location.hostname;
    const isYouTube = hostname.includes('youtube.com');

    // Skip extension pages, localhost dashboard, and chrome:// pages
    const skipSites = ['localhost', '127.0.0.1', 'chrome.google.com', 'extensions'];
    let shouldSkip = skipSites.some(s => hostname.includes(s)) || location.protocol === 'chrome-extension:';

    // Specifically skip Google homepage (where people just want to type a search)
    if (hostname.includes('google.com') && (window.location.pathname === '/' || window.location.pathname === '/webhp')) {
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('q')) {
            shouldSkip = true; // No search query, just the homepage
        }
    }

    if (!shouldSkip) {
        let lastScannedUrlForSession = null;
        let currentSessionGoal = null;

        const runPlatformScan = () => {
            if (_justifiedUrls.has(window.location.href)) return;
            if (!chrome.runtime?.id) return; // Safety check

            chrome.storage.local.get(['aiMonitor', 'isRunning', 'currentGoal', 'activeSession', 'goal'], (result) => {
                if (!result.aiMonitor) return;
                if (!result.isRunning) return; // Only scan during an active session
                const goal = result.currentGoal || result.activeSession?.goal || result.goal;
                if (!goal) return;

                // Prevent duplicate scans for the exact same URL and goal
                if (lastScannedUrlForSession === window.location.href && currentSessionGoal === goal) {
                    return;
                }

                lastScannedUrlForSession = window.location.href;
                currentSessionGoal = goal;



                // Enhanced Context Extraction for YouTube
                let title = document.title;
                let description = "";

                if (isYouTube) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const searchQuery = urlParams.get('search_query');
                    if (searchQuery) {
                        description = `YouTube Search Query: ${searchQuery}`;
                    }

                    // Check if we are on a channel page
                    if (window.location.pathname.startsWith('/@') || window.location.pathname.includes('/channel/')) {
                        const channelName = document.querySelector('ytd-channel-name yt-formatted-string')?.textContent ||
                            document.querySelector('#channel-name')?.textContent || "";
                        description += ` | Viewing YouTube Channel: ${channelName}`;
                    }
                }

                if (!description) {
                    const mainTextEl = document.querySelector('main, [role="main"], article, .feed, #stream, #content');
                    description = mainTextEl?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 1000) ||
                        document.body.textContent.replace(/\s+/g, ' ').trim().slice(0, 1000);
                }

                const pageData = {
                    title: title,
                    channel: hostname,
                    description: description,
                    url: window.location.href
                };

                console.log('[AI Monitor] Sending to Gemini:', pageData);

                checkAndBlock(goal, pageData).catch(err => {
                    console.error('[AI Monitor] Auto-scan error:', err);
                });
            });
        };

        // 1. Initial Scan on page load
        setTimeout(runPlatformScan, 800);

        // 2. Continuous Scan on SPA Navigation (debounced to avoid 429s on rapid searches)
        let lastUrl = location.href;
        let scanDebounceTimer = null;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;

                // Reset dedup cache so every URL change gets a fresh scan
                lastScannedUrlForSession = null;

                if (_justifiedUrls.has(location.href)) {
                    return;
                }

                // Remove any existing block overlay immediately on navigation
                _removeBlockOverlay();

                // Debounce: cancel pending scan if user navigates again quickly
                clearTimeout(scanDebounceTimer);

                // Only show the notice and run scan if a session is actively running
                chrome.storage.local.get(['aiMonitor', 'isRunning'], (result) => {
                    if (!result.aiMonitor || !result.isRunning) return;

                    _showScanningNotice('Scanning new page...');

                    scanDebounceTimer = setTimeout(() => {
                        runPlatformScan();
                    }, 700); // 700ms debounce — fires after user stops navigating
                });
            }
        }).observe(document.body, { subtree: true, childList: true });

        // 3. Scan when returning to an already-open tab OR when session starts
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                runPlatformScan();
            }
        });

        chrome.storage.onChanged.addListener((changes) => {
            if (changes.aiMonitor && changes.aiMonitor.newValue === true) {
                if (document.visibilityState === 'visible') {
                    runPlatformScan();
                }
            }
            if (changes.isRunning) {
                if (changes.isRunning.newValue === true) {
                    // Scan immediately — no visibility gate. Pre-existing tabs
                    // need to scan when a session starts, even if backgrounded.
                    // The dedup cache prevents redundant API calls.
                    runPlatformScan();
                } else {
                    _removeBlockOverlay();
                    lastScannedUrlForSession = null;
                    currentSessionGoal = null;
                }
            }
        });
    }
})();
