# AntiDistract 🎯

An open-source, privacy-first, ADHD-friendly focus ecosystem designed to intercept distractions at their source and help users hit hyperfocus. The project is a unified system composed of a powerful Chrome Extension and a React Web Dashboard.

---

## 🏗️ Architecture Overview

The AntiDistract ecosystem operates on a decoupled frontend architecture backed by a serverless sync and intelligence engine.

- **Frontend Client 1 (Chrome Extension):** Handles local blocking, DOM manipulation, sensory regulation (ambient audio), and session tracking inside the browser globally via Manifest V3.
- **Frontend Client 2 (Web Dashboard):** A React/Vite Single Page Application (SPA) providing visual analytics, the AI Study Coach chat, Kanban planners, and live Focus Rooms.
- **State Synchronization (`useGlobalExtensionSync`):** The dashboard completely bypasses complex backend state by directly communicating with the Chrome Extension via `chrome.runtime.sendMessage()`. Starting a focus timer in the dashboard instantly locks the browser globally.
- **Backend (Supabase):** Handles user authentication, global profile persistence, real-time channels for Focus Rooms, and Postgres tables.
- **Intelligence Layer (Supabase Edge Functions):** Hosts the Gemini 2.5 Flash Lite engine (with 3.5 fallback) for parsing user tasks and generating actionable schedules without keeping API keys in the client.

---

## ✨ Features & Implementation

### 1. The Chrome Extension
- **Smart DOM Interception:** Instead of just blacklisting entire sites, `blocker.css` and granular content scripts actively hide algorithmic traps (like Instagram Reels or YouTube Shorts) while keeping educational variants active.
- **Zero-Willpower Hard Redirects:** Attempting to brute-force visit blacklisted URLs during an active timer instantly triggers a `<blocked.html>` intercept screen.
- **Sensory Regulation:** An invisible background audio engine streams local ambient noise (Forest, Brown Noise, Lofi) directly from the extension to drown out chaos without needing external tabs.
- **Dynamic AI Scanning:** Integration with the AI coach allows the extension to dynamically read DOMs and aggressively intercept time-sinks dynamically without needing manually maintained whitelists.

### 2. The Focus Dashboard
- **Kanban Board & Daily Agenda:** A drag-and-drop interactive task planner syncing dates seamlessly with the active day.
- **Focus Rooms (Body Doubling):** Users join live rooms using Supabase Realtime Channels to see active timers of other working peers, enforcing accountability.
- **The Dopamine Visualizer:** Dashboard stats explicitly graph total focus hours and consecutive streaks.

### 3. The AI Study Coach (Executive Function Engine)
- **Problem:** ADHD brains experience paralysis when looking at massive goals.
- **Implementation:** The user tells the AI "I need to learn React in a week." Gemini evaluates their profile (e.g. daily focus capacity constraints) and shatters the goal into heavily structured 25-minute chronological chunks, distributing them automatically into their Kanban/Daily planner.
- **State Memory:** The chat strips out raw JSON metadata so conversational history is readable, but the system retains roadmap context for edits.

---

## 🛠️ Dependencies & Frameworks Used

**Frontend (Dashboard):**
- **React 18** + **Vite:** High performance, fast HMR web compilation.
- **Tailwind CSS:** Utility-first styling for themes.
- **Framer Motion:** Heavy use of fluid, organic animations to create a premium, gamified aesthetic.
- **Lucide React:** Iconography.

**Frontend (Extension):**
- **Manifest V3:** Adheres to modern security/efficiency paradigms using background Service Workers.

**Backend & Intelligence:**
- **Supabase:** PostgreSQL base, PostgREST API, Auth, and Realtime Channels.
- **Deno (Supabase Edge Functions):** Executes the `coach-chat` AI pipeline securely.
- **Gemini 2.5 Flash Lite API:** The heavily prompt-engineered core of the AI Study Coach.

---

## 📖 Development Process

1. **Local Foundation:** Began with local pure state blocking using simple Chrome extension APIs.
2. **Dashboard Unification:** Built the React SPA and bridged it to the extension so the extension acts as the primary "truth" layer.
3. **Hardening Real-time Infrastructure:** Built the Focus Rooms utilizing WebSockets via Supabase Realtime, tackling race conditions between active global floating timers and local room timers.
4. **AI Intelligence Engine:** Wrote serverless Deno Edge Functions hooking into Gemini. Implemented strict prompt-engineering pipelines requiring JSON outputs, complete with dynamic fallback arrays (from 2.5 to 3.5 Lite) to mitigate high traffic `429 Quota Exhausted` errors.
5. **Polishing:** Heavily refined the CSS themes and framer interactions to prevent "UX friction" that causes ADHD users to abandon tools.

---

## 🚀 Installation Instructions

### Prerequisites
- Node.js (v18+)
- Supabase CLI installed locally (optional, for DB migrations)
- A Supabase Project & Gemini API Key.

### Step 1: Web Dashboard setup
```bash
git clone https://github.com/aditijaiswall/anti-distract
cd studywithme/website
npm install
```

Create a `.env` in the `website` root:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_POLAR_PRO_CHECKOUT_URL=your_billing_provider_url
```

Run local dev:
```bash
npm run dev
```

### Step 2: Chrome Extension Setup
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer Mode** residing in the top right.
3. Click "Load unpacked" and select the `extension` folder from the root of this project.
4. Pin the extension to your toolbar.

### Step 3: Backend & Edge Functions (Optional)
If deploying your own instance:
```bash
npx supabase link --project-ref your_project_ref
npx supabase db push
npx supabase secrets set GEMINI_API_KEY=your_gemini_key
npx supabase functions deploy coach-chat
```

---

## 🔮 Future Roadmap

- **Voice Command AI Integration:** Users will be able to hit a microphone and audibly brain-dump "I forgot to do math homework," and the AI Coach will ingest, schedule, and sync it.
- **Desktop Electron App Wrapper:** To allow blocking of non-browser applications (e.g., Discord or Games) using explicit OS-level intercepts.
- **Mobile Companion Application:** Integrating with iOS Screen Time API to keep stats synced while away from the terminal.
