let widget;
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let initialWidth;
let initialHeight;
let isResizing = false;
let resizerInitialX;
let resizerInitialY;
let xOffset = 0;
let yOffset = 0;

function createWidget() {
  const existing = document.getElementById('study-with-me-widget');
  if (existing) existing.remove();

  widget = document.createElement('div');
  widget.id = 'study-with-me-widget';
  widget.innerHTML = AntiDistractUI.getWidgetHTML();
  document.body.appendChild(widget);

  const dragHandle = widget.querySelector('.swm-drag-handle');
  dragHandle.addEventListener('mousedown', dragStart);

  const resizeHandle = widget.querySelector('.swm-resize-handle');
  resizeHandle.addEventListener('mousedown', resizeStart);

  document.addEventListener('mousemove', (e) => {
    drag(e);
    resize(e);
  });
  document.addEventListener('mouseup', () => {
    dragEnd();
    resizeEnd();
  });

  updateWidgetState();
}

function createTunnelVision() {
  let tv = document.getElementById('study-with-me-tunnel-vision');
  if (!tv) {
    tv = document.createElement('div');
    tv.id = 'study-with-me-tunnel-vision';
    document.body.appendChild(tv);
  }
  return tv;
}

let widgetTimerInterval;

function updateWidgetState() {
  chrome.storage.local.get([
    'remainingTime', 'widgetEnabled', 'goal', 'isRunning', 'activeSceneUrl',
    'widgetWidth', 'widgetHeight', 'widgetX', 'widgetY', 'tunnelVisionEnabled', 'endTime', 'activeTheme'
  ], (data) => {
    const isVisible = data.widgetEnabled && data.isRunning;

    if (widget) {
      widget.style.display = isVisible ? 'block' : 'none';
      widget.dataset.theme = data.activeTheme || 'default';

      if (data.activeSceneUrl) {
        widget.querySelector('.swm-widget-bg').style.backgroundImage = `url(${data.activeSceneUrl})`;
      }

      // Handle Timer Sync
      if (isVisible && data.endTime) {
        const updateTimer = () => {
          const remaining = Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000));
          const h = Math.floor(remaining / 3600).toString().padStart(2, '0');
          const m = Math.floor((remaining % 3600) / 60).toString().padStart(2, '0');
          const s = (remaining % 60).toString().padStart(2, '0');
          const timerEl = widget.querySelector('.swm-timer');
          if (timerEl) {
            timerEl.innerText = `${h}:${m}:${s}`;
            if (remaining < 300) {
              timerEl.style.color = '#ff5252';
            } else if (remaining < 600) {
              timerEl.style.color = '#FFA726';
            } else {
              timerEl.style.color = ''; // Reset to theme default
            }
          }
          if (remaining <= 0 && widgetTimerInterval) {
            clearInterval(widgetTimerInterval);
            widgetTimerInterval = null;
          }
        };

        // Run once immediately
        updateTimer();

        // Only start a new interval if one isn't already running
        if (!widgetTimerInterval) {
          widgetTimerInterval = setInterval(updateTimer, 1000);
        }
      } else {
        if (widgetTimerInterval) {
          clearInterval(widgetTimerInterval);
          widgetTimerInterval = null;
        }
        const time = data.remainingTime || 1500;
        const h = Math.floor(time / 3600).toString().padStart(2, '0');
        const m = Math.floor((time % 3600) / 60).toString().padStart(2, '0');
        const s = (time % 60).toString().padStart(2, '0');
        const timerEl = widget.querySelector('.swm-timer');
        if (timerEl) timerEl.innerText = `${h}:${m}:${s}`;
      }

      const goalEl = widget.querySelector('.swm-goal');
      goalEl.innerText = data.goal || '';
      goalEl.style.display = data.goal ? 'block' : 'none';
      if (data.widgetWidth) widget.style.width = data.widgetWidth + 'px';
      if (data.widgetHeight) widget.style.height = data.widgetHeight + 'px';
      if (!isDragging) {
        if (data.widgetX !== undefined) xOffset = data.widgetX;
        if (data.widgetY !== undefined) yOffset = data.widgetY;
        widget.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
      }
    }

    // Update Tunnel Vision
    const tv = createTunnelVision();
    if (data.tunnelVisionEnabled) {
      tv.classList.add('active');
    } else {
      tv.classList.remove('active');
    }
  });
}

// Msg Listener
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TOGGLE_TUNNEL_VISION') {
    const tv = createTunnelVision();
    if (message.enabled) {
      tv.classList.add('active');
    } else {
      tv.classList.remove('active');
    }
  } else if (message.type === 'SESSION_COMPLETE') {
    showCompletionMessage(message.goal, Math.floor(message.duration / 60));
  } else if (message.type === 'SESSION_PAUSED') {
    showContinuePrompt(message.goal, message.remainingTime);
  } else if (message.type === 'HIDE_PAUSE_OVERLAY') {
    if (AntiDistractUI.removePauseOverlay) {
      AntiDistractUI.removePauseOverlay();
    }
  }
});

function showContinuePrompt(goal, remainingTime) {
  AntiDistractUI.showPauseOverlay(goal, remainingTime,
    () => { chrome.runtime.sendMessage({ type: 'START_TIMER' }); },
    () => { chrome.runtime.sendMessage({ type: 'RESET_TIMER' }); }
  );
}


function showCompletionMessage(goal, duration) {
  AntiDistractUI.showCompletionOverlay(goal, duration);
}


// Dragging
function dragStart(e) {
  if (e.target.closest('.swm-drag-handle')) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    isDragging = true;
    widget.classList.add('dragging');
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }
}
function drag(e) {
  if (isDragging) {
    xOffset = e.clientX - initialX;
    yOffset = e.clientY - initialY;
    widget.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
  }
}
function dragEnd() {
  if (isDragging) {
    isDragging = false;
    widget.classList.remove('dragging');
    document.body.style.userSelect = '';
    chrome.storage.local.set({ widgetX: xOffset, widgetY: yOffset });
  }
}

// Resizing
function resizeStart(e) {
  isResizing = true;
  resizerInitialX = e.clientX;
  resizerInitialY = e.clientY;
  initialWidth = widget.offsetWidth;
  initialHeight = widget.offsetHeight;
  document.body.style.userSelect = 'none';
  e.preventDefault();
}
function resize(e) {
  if (isResizing) {
    const newWidth = initialWidth + (e.clientX - resizerInitialX);
    const newHeight = initialHeight + (e.clientY - resizerInitialY);
    if (newWidth >= 150) widget.style.width = newWidth + 'px';
    if (newHeight >= 80) widget.style.height = newHeight + 'px';
  }
}
function resizeEnd() {
  if (isResizing) {
    isResizing = false;
    document.body.style.userSelect = '';
    chrome.storage.local.set({ widgetWidth: widget.offsetWidth, widgetHeight: widget.offsetHeight });
  }
}

chrome.storage.onChanged.addListener(() => updateWidgetState());

if (document.readyState === 'complete') {
  createWidget();
} else {
  window.addEventListener('load', createWidget);
}
