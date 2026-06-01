// Shared UI Components for AntiDistract

const AntiDistractUI = {
  _escapeHTML: function (str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  getWidgetHTML: function () {
    return `
      <div class="swm-widget-bg"></div>
      <div class="swm-widget-content">
        <div class="swm-goal"></div>
        <div class="swm-timer">00:25:00</div>
      </div>
      <div class="swm-drag-handle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
          <circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
        </svg>
      </div>
      <div class="swm-resize-handle"></div>
    `;
  },

  showPauseOverlay: function (goal, remainingTime, onResume, onEnd) {
    const existing = document.getElementById('swm-pause-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'swm-pause-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', system-ui, sans-serif;
    `;

    const minutes = Math.floor(remainingTime / 60);

    overlay.innerHTML = `
      <div style="
          background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
          padding: 40px;
          border-radius: 24px;
          text-align: center;
          border: 1px solid rgba(76, 175, 80, 0.3);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          max-width: 420px;
          width: 90%;
      ">
          <div style="font-size: 56px; margin-bottom: 20px;">⏸️</div>
          <h2 style="font-size: 24px; margin: 0 0 12px 0; color: #e0e0e0; font-weight: 700;">Session Paused</h2>
          <p style="font-size: 16px; color: #aaa; margin-bottom: 8px;">You have <strong style="color: #4CAF50;">${minutes} minutes</strong> remaining</p>
          <p style="font-size: 14px; color: #888; margin-bottom: 32px;">Goal: <strong style="color: white;">"${this._escapeHTML(goal)}"</strong></p>
          
          <div style="display: flex; gap: 16px;">
              <button id="swm-continue-btn" style="
                  flex: 1;
                  padding: 14px;
                  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                  color: white;
                  border: none;
                  border-radius: 12px;
                  font-weight: 700;
                  font-size: 16px;
                  cursor: pointer;
              ">Resume</button>
              
              <button id="swm-end-btn" style="
                  flex: 1;
                  padding: 14px;
                  background: transparent;
                  color: #e0e0e0;
                  border: 1px solid #444;
                  border-radius: 12px;
                  font-weight: 600;
                  font-size: 16px;
                  cursor: pointer;
              ">Finish early</button>
          </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('swm-continue-btn').onclick = () => {
      overlay.remove();
      if (onResume) onResume();
    };

    document.getElementById('swm-end-btn').onclick = () => {
      overlay.remove();
      if (onEnd) onEnd();
    };
  },

  removePauseOverlay: function () {
    const existing = document.getElementById('swm-pause-overlay');
    if (existing) existing.remove();
  },

  showCompletionOverlay: function (goal, duration) {
    const overlay = document.createElement('div');
    overlay.id = 'swm-completion-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: swmFadeIn 0.4s ease-out;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    `;

    overlay.innerHTML = `
      <style>
        @keyframes swmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes swmPopIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .swm-completion-card {
          background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
          padding: 48px;
          border-radius: 28px;
          text-align: center;
          border: 1px solid rgba(76, 175, 80, 0.4);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(76, 175, 80, 0.15);
          max-width: 480px;
          width: 90%;
          animation: swmPopIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .swm-completion-emoji { font-size: 80px; margin-bottom: 24px; display: block; }
        .swm-completion-title { font-size: 32px; font-weight: 800; color: #4CAF50; margin: 0 0 16px 0; }
        .swm-completion-text { font-size: 18px; color: #e0e0e0; margin-bottom: 8px; line-height: 1.5; }
        .swm-completion-goal { font-size: 16px; color: #888; margin-bottom: 36px; font-style: italic; }
        .swm-completion-btn {
          padding: 16px 40px;
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          color: white;
          border: none;
          border-radius: 14px;
          font-weight: 700;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }
        .swm-completion-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4); }
      </style>
      <div class="swm-completion-card">
        <span class="swm-completion-emoji">🎉</span>
        <h1 class="swm-completion-title">Session Complete!</h1>
        <p class="swm-completion-text">You crushed your <strong>${this._escapeHTML(String(duration))} minute</strong> focus session.</p>
        <p class="swm-completion-goal">Goal: "${this._escapeHTML(goal)}"</p>
        <button class="swm-completion-btn" id="swm-completion-close">Awesome!</button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('swm-completion-close').onclick = () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(() => overlay.remove(), 300);
    };
  },

  showAIBlockOverlay: function (goal, reasoning, confidence, isReddit, isYouTube, onRecheck, onBack) {
    const existing = document.getElementById('fg-block-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'fg-block-overlay';

    // Apply a universal top margin (70px) so the user can always access the top nav / search bar
    const insetRule = 'top: 70px; left: 0; right: 0; bottom: 0;';

    overlay.style.cssText = `
        position: fixed; top: 70px; left: 0; right: 0; bottom: 0;
        height: calc(100vh - 70px);
        background: rgba(10, 10, 10, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
        overflow-y: auto;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
    `;

    overlay.innerHTML = `
        <div style="
            max-width: 520px; width: 90%;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 16px; padding: 40px;
            text-align: center; color: #e0e0e0;
            box-shadow: 0 20px 40px rgba(0,0,0,0.8);
            display: flex; flex-direction: column; gap: 24px;
        ">
            <div>
                <div style="
                    width: 48px; height: 48px; 
                    background: rgba(255, 82, 82, 0.1); 
                    border: 1px solid rgba(255, 82, 82, 0.3);
                    border-radius: 12px; margin: 0 auto 16px; 
                    display: flex; align-items: center; justify-content: center;
                ">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff5252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                </div>
                <h2 style="
                    margin: 0; font-size: 1.5rem; color: #fff; font-weight: 700;
                    letter-spacing: -0.5px;
                ">Focus Blocked</h2>
                <p style="margin: 8px 0 0; color: #888; font-size: 0.95rem;">
                    This page conflicts with your active session goal.
                </p>
            </div>

            <div style="
                background: #0a0a0a; border: 1px solid #222;
                border-radius: 12px; padding: 16px; text-align: left;
            ">
                <p style="
                    font-size: 0.75rem; text-transform: uppercase; 
                    letter-spacing: 0.5px; color: #4CAF50; 
                    font-weight: 700; margin: 0 0 8px;
                ">Active Goal</p>
                <p style="margin: 0; color: #fff; font-weight: 500; font-size: 1rem;">
                    "${this._escapeHTML(goal)}"
                </p>
            </div>

            <div style="
                background: rgba(255,82,82,0.05); border: 1px solid rgba(255,82,82,0.15);
                border-radius: 12px; padding: 16px; text-align: left;
            ">
                <p style="
                    font-size: 0.75rem; text-transform: uppercase; 
                    letter-spacing: 0.5px; color: #ff5252; 
                    font-weight: 700; margin: 0 0 8px;
                ">AI Analysis</p>
                <p style="margin: 0; color: #e0e0e0; font-size: 0.95rem; line-height: 1.5;">
                    ${this._escapeHTML(reasoning)}
                </p>
                ${confidence !== null ? '<p style="color:#666;font-size:0.75rem;margin:8px 0 0;font-weight:500;">Confidence: ' + Math.round(confidence * 100) + '%</p>' : ''}
            </div>

            <div style="display:flex; flex-direction:column; gap:12px; margin-top: 8px;">
                <textarea id="fg-justification-input" placeholder="Justify relevance... (e.g. 'I am researching design patterns for my project')" style="
                    width: 100%; padding: 14px; font-size: 0.95rem; font-family: inherit;
                    background: #0a0a0a; color: white;
                    border: 1px solid #333; border-radius: 10px;
                    resize: vertical; min-height: 60px; outline: none; box-sizing: border-box;
                    transition: all 0.2s ease;
                " onfocus="this.style.borderColor='#4CAF50'" onblur="this.style.borderColor='#333'"></textarea>

                <button id="fg-btn-claim" style="
                    width: 100%; padding: 14px; font-size: 0.95rem; font-weight: 600;
                    background: linear-gradient(135deg, #4CAF50, #00C853);
                    color: white; border: none; border-radius: 10px; cursor: pointer;
                    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
                    transition: all 0.2s ease;
                ">Submit Justification</button>

                <button id="fg-btn-back" style="
                    width: 100%; padding: 14px; font-size: 0.95rem; font-weight: 500;
                    background: transparent; color: #aaa;
                    border: 1px solid #333; border-radius: 10px; cursor: pointer;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='#111'; this.style.color='#fff'" onmouseleave="this.style.background='transparent'; this.style.color='#aaa'">← Close Tab</button>
            </div>

            <p style="color: #444; font-size: 0.75rem; margin: 0; font-weight: 500; letter-spacing: 0.5px;">
                FOCUSGUARD PREMIUM • GEMINI AI
            </p>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('fg-btn-back').onclick = () => {
      if (onBack) onBack();
    };

    const claimBtn = document.getElementById('fg-btn-claim');
    const inputField = document.getElementById('fg-justification-input');

    claimBtn.onmouseenter = () => { claimBtn.style.opacity = '0.9'; };
    claimBtn.onmouseleave = () => { claimBtn.style.opacity = '1'; };
    claimBtn.onclick = async () => {
      const justification = inputField.value.trim();
      if (!justification) {
        inputField.style.borderColor = '#ff7070';
        inputField.focus();
        return;
      }
      claimBtn.textContent = '⏳ Evaluating...';
      claimBtn.disabled = true;
      inputField.disabled = true;
      if (onRecheck) await onRecheck(justification);
    };
  },

  showScanningNotice: function (message) {
    this.removeScanningNotice();
    const el = document.createElement('div');
    el.id = 'fg-ai-notice';
    el.style.cssText = `
        position: fixed; bottom: 24px; right: 24px;
        background: rgba(20,20,60,0.97); color: #c8d6ff;
        padding: 12px 20px; border-radius: 12px;
        font-family: system-ui, sans-serif; font-size: 13px;
        z-index: 2147483647; border: 1px solid rgba(100,120,255,0.5);
        display: flex; align-items: center; gap: 10px;
        box-shadow: 0 4px 20px rgba(0,0,70,0.5);
        animation: fg-fadein 0.3s ease;
    `;
    el.innerHTML = `<span style="font-size:16px;">🤖</span> ${message}`;
    document.body.appendChild(el);

    if (!document.getElementById('fg-anim-style')) {
      const s = document.createElement('style');
      s.id = 'fg-anim-style';
      s.textContent = `
            @keyframes fg-fadein { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
            @keyframes fg-spin   { to { transform: rotate(360deg); } }
        `;
      document.head.appendChild(s);
    }
  },

  removeScanningNotice: function () {
    document.getElementById('fg-ai-notice')?.remove();
  },

  removeBlockOverlay: function () {
    document.getElementById('fg-block-overlay')?.remove();
  }
};
