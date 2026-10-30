# UI/UX Specification: VersaRail AI Desktop Design System

*Reference Source:* `C:\Users\hs521\Downloads\stitch_versarail_ai_agent_desktop\stitch_versarail_ai_agent_desktop`  
*Specification Date:* October 2026  
*Status:* Approved Visual Design Blueprint

---

## 1. Aesthetic Foundation & Brand Philosophy

The application embodies the **VersaRail AI** aesthetic—a high-density, authoritative, and focused developer workspace tailored for software engineers and systems architects.

### Core Visual Principles
1. **Zero Visual Friction:** Dark-mode workspace with deep charcoal backgrounds (`#13131b`, `#0d0d15`) engineered for long low-light engineering sessions without eye strain.
2. **Dense Information Architecture:** Compact 4px baseline grid (`space-xs` to `space-xl`) prioritizing code visibility, telemetry, and execution logs over decorative whitespace.
3. **Engineered Precision:** Tonal elevation layers and crisp, low-opacity borders (`#212631` / `#464554`) rather than blurry drop shadows.
4. **Focused Color Accents:**
   - **Electric Violet & Soft Indigo (`#c0c1ff` / `#8083ff` / `#6366F1`):** Primary interactive states, agent nodes, active tabs, and primary action buttons.
   - **Muted Cyan (`#4cd7f6` / `#06B6D4`):** Live telemetry, streaming indicators, completed timeline steps, and diff additions.
   - **Crimson & Amber (`#ffb4ab` / `#f59e0b`):** Security warnings, permission requests, rate limit cooldowns, and diff deletions.

---

## 2. Complete Design Tokens & Theme Variables

### Color Palette

```css
:root {
  /* Surfaces & Backgrounds */
  --color-surface: #13131b;
  --color-surface-dim: #13131b;
  --color-surface-bright: #393841;
  --color-surface-container-lowest: #0d0d15;
  --color-surface-container-low: #1b1b23;
  --color-surface-container: #1f1f27;
  --color-surface-container-high: #292932;
  --color-surface-container-highest: #34343d;

  /* Typography & Foreground */
  --color-on-surface: #e4e1ed;
  --color-on-surface-variant: #c7c4d7;
  --color-inverse-surface: #e4e1ed;
  --color-inverse-on-surface: #303038;

  /* Borders & Outlines */
  --color-outline: #908fa0;
  --color-outline-variant: #464554;
  --color-border-subtle: #212631;

  /* Primary Interactive Accents (Electric Violet) */
  --color-primary: #c0c1ff;
  --color-on-primary: #1000a9;
  --color-primary-container: #8083ff;
  --color-on-primary-container: #0d0096;
  --color-inverse-primary: #494bd6;

  /* Secondary Accents (Soft Indigo) */
  --color-secondary: #bdc2ff;
  --color-on-secondary: #131e8c;
  --color-secondary-container: #2f3aa3;
  --color-on-secondary-container: #a8afff;

  /* Tertiary Telemetry Accents (Cyan) */
  --color-tertiary: #4cd7f6;
  --color-on-tertiary: #003640;
  --color-tertiary-container: #009eb9;
  --color-on-tertiary-container: #002f38;

  /* Errors & Destructive Actions */
  --color-error: #ffb4ab;
  --color-on-error: #690005;
  --color-error-container: #93000a;
  --color-on-error-container: #ffdad6;
}
```

### Typography Scale

| Token | Family | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `headline-xl` | Inter | 28px | 600 (SemiBold)| 36px (-0.02em) | Page titles, hero banners |
| `headline-lg` | Inter | 22px | 600 (SemiBold)| 28px (-0.01em) | Modal titles, section headers |
| `headline-md` | Inter | 18px | 500 (Medium)  | 24px | Card headers, subsection titles |
| `headline-sm` | Inter | 15px | 500 (Medium)  | 20px | Navigation items, button text |
| `body-lg` | Inter | 14px | 400 (Regular) | 20px | Chat message body text |
| `body-md` | Inter | 13px | 400 (Regular) | 18px | Standard interface text, inputs |
| `body-sm` | Inter | 12px | 400 (Regular) | 16px | Helper text, secondary descriptions |
| `label-md` | JetBrains Mono | 12px | 500 (Medium)  | 16px (+0.02em)| Code labels, parameters, file paths |
| `label-sm` | JetBrains Mono | 11px | 500 (Medium)  | 14px (+0.02em)| Telemetry, latency, masked keys, badges |

---

## 3. Application Shell Architecture

```
+------------------------------------------------------------------------------------------------------+
| [Logo] VersaRail AI                                    (Custom Drag Titlebar: 40px)    [-] [口] [X] |
+------------------------+-------------------------------------------------------------+---------------+
| ACTIVE PROJECT         | CONTEXT BAR: Agent Execution: Auth Refactoring #842 [Logs]  | [Files][Act][Δ]
| [📁] versa-rail-core   |-------------------------------------------------------------| src/          |
|------------------------| CONVERSATION & TIMELINE VIEW:                               |   auth/       |
| 💬 Chat (Active)       | [User]: Refactor the auth module...                         |     authSvc.ts|
| 📁 Projects            |                                                             |     test.ts   |
| 📄 File Explorer       | [Claude 3.5 Sonnet]: Executing Agent Workflow...            |               |
| 🤖 AI Providers        | ├── Execution Timeline (5 steps) [4 Done, 1 Awaiting]        | Diff stats:   |
| 📊 Usage & Quotas      | ├── Tool Activity Stream (→ Read authService.ts...)         | +48  -12 lines|
| 📜 Task History        | └── Change Summary Banner: 2 files changed (+48 -12)        |               |
| ⚙️ Settings            |     [Accept Changes]  [Reject Changes]  [Open Diff]         | Memory: 412MB |
|------------------------|-------------------------------------------------------------| Ready         |
| 🟢 Claude (Connected)  | COMPOSER: [Ask agent to edit code, run tests...]            |               |
| [👤 Profile]           | [📎] [</>] [🤖 Model: Claude 3.5] [📁 Project]       [Send ->]|               |
+------------------------+-------------------------------------------------------------+---------------+
```

### Dimensions & Zones
1. **Window Titlebar (40px / `h-10`):**
   - Draggable region (`-webkit-app-region: drag`) with app mark and title.
   - Non-draggable window management buttons (`-webkit-app-region: no-drag`): Minimize, Maximize/Restore, Close.
2. **Left Navigation Sidebar (256px / `w-64`):**
   - Background: Deepest container (`surface-container-lowest` / `#0d0d15`).
   - Active Project card at top (`folder_open`, project name, `unfold_more`).
   - 7 Navigation items with active state pill in electric violet container (`bg-primary-container text-on-primary-container font-medium`).
   - Bottom status footer: Live connected model badge with glowing cyan pulse dot and user profile icon.
3. **Center Main Workspace (Fluid):**
   - Top Context Bar (48px / `h-12`): Active run title, pulse indicator, run ID tag, and quick action buttons (`Logs`, `Parameters`).
   - Center conversation area: User messages, assistant answers, collapsible task execution timeline, tool stream event logs, change summary banners, and action buttons.
   - Bottom Anchored Composer: Multi-line textarea, file attachment button, code snippet inserter, model dropdown chip, project dropdown chip, and high-visibility Send button.
4. **Right Inspector Panel (288px / `w-72`):**
   - 3-tab switcher: **Files**, **Activity**, **Changes**.
   - Tab 1 (`Files`): Directory tree with status indicators (`M` modified in cyan, `N` new in violet).
   - Tab 2 (`Activity`): Real-time timestamped event log with execution latencies.
   - Tab 3 (`Changes`): Patch hunk summaries with diff line counts and "View Diff Preview →".
   - Footer: Runtime memory telemetry and engine health status.

---

## 4. Specialized Screen Specifications

### A. Main Agent Workspace Chat (`versarail_ai_main_agent_workspace_chat`)
* **Execution Timeline:** An expandable tree showing multi-step workflows (e.g. 1. Inspecting files $\rightarrow$ 2. Reading modules $\rightarrow$ 3. Identifying issues $\rightarrow$ 4. Preparing patch $\rightarrow$ 5. Waiting for approval). Completed steps display green/cyan checkmarks with latency tags (`120ms`); active steps render a spinning progress indicator.
* **Tool Activity Stream:** Terminal-style log showing exact tool commands (`→ Read src/auth/authService.ts`, `→ Search src/ for references`).
* **File Change Summary Banner:** Highlights file mutation counts, additions/deletions (`+48 -12 lines`), and triggers the diff reviewer.
* **Decision Action Bar:**
  - `Accept Changes` (Primary electric violet button).
  - `Reject Changes` (Subtle secondary button).
  - `Open Diff` (Secondary button with diff icon).
  - `Retry` (Refresh button).

---

### B. AI Providers & Gateway Infrastructure (`versarail_ai_ai_providers`)
* **Header:** Title "AI Providers", subtitle "Connect your models. Control your usage and routing priorities.", and `+ Add Provider` button.
* **Active Routing Strategy Card:**
  - Ambient glowing background.
  - Strategy pill (e.g. "Dynamic Fallback").
  - Description: *"Primary execution routes through Google AI Studio with automatic failover to Groq on rate-limit or 5xx errors."*
  - Live Telemetry: Average latency (`248ms`), Success rate (`99.8%`), and `Configure` button.
* **Connected Endpoints Grid:**
  - Endpoint cards for Google AI Studio, Groq, Cerebras, OpenRouter, and Custom Endpoints.
  - Badges: `Cloud`, `Local`, `Connected` (with pulsing cyan dot).
  - Model tag (e.g. `gemini-2.5-flash`, `llama-3.3-70b-versatile`).
  - Masked API key (`••••••••x924`).
  - Action buttons: `Test Connection` (triggers live API ping) and an interactive toggle switch.

---

### C. Welcome & Empty Workspace State (`versarail_ai_welcome_empty_workspace`)
* **Hero Banner:** Ambient violet glow, VersaRail mark with status badge.
* **Heading:** *"Your AI. Your keys. Your workspace."*
* **Description:** *"Connect your preferred AI providers, maintain absolute control over local project files, and build with native desktop speed."*
* **Primary Actions:** Large `Open a Folder` and `Connect an AI Provider` buttons.
* **Prompt Discovery Box:** Terminal input box with sample prompt pills (*"Explain the structure of this project"*, *"Create a REST API with authentication"*, *"Review and improve the README"*).
* **3 Value Cards:**
  1. **Bring Your Own Key:** Direct provider access with zero intermediary markup.
  2. **Automatic Provider Fallback:** Seamlessly route requests to backup endpoints on rate limits.
  3. **Diff-First Safety:** Reviewable diffs and atomic writes before any file is touched.

---

### D. Settings & Preferences (`versarail_ai_settings`)
* **Layout:** Two-tier layout with secondary vertical category sidebar:
  - `General`: Startup behavior, default workspace, sound effects.
  - `AI Defaults`: Default model, temperature, max tokens, system prompt overrides.
  - `Providers`: Priority order, fallback threshold, timeout limits.
  - `Agent Permissions`: Permission modes (Ask every time, Allow low-risk reads), auto-approve rules.
  - `Appearance`: Theme selector, font scaling, density controls.
  - `Privacy & Security`: Data egress rules, secret redactor toggles, audit log retention.
  - `Advanced`: SQLite database vacuum, export conversations, clear local cache.
* **Engine Status Card:** Displays active VersaRail Engine version and build number.

---

### E. Task History & Usage Quotas (`versarail_ai_task_history` & `versarail_ai_usage_quotas`)
* **Task History:** Table/timeline of historical runs with filter tabs (`All`, `Completed`, `Failed`, `Cancelled`), displaying task name, target workspace, duration, tokens spent, tools invoked, and full replay action.
* **Usage Quotas:** Circular progress gauges showing token usage against provider free-tier/daily limits, error breakdown charts, and failover occurrence counts.

---

## 5. UI Component Implementation Mapping

When implementing these views in React 19 (`src/renderer/src/features/`), components will directly adopt these design tokens:

| Mockup View | Target React Component | Core Responsibilities |
| :--- | :--- | :--- |
| `main_agent_workspace_chat` | `features/chat/ChatFeed.tsx` & `PromptComposer.tsx` | Streaming message rendering, execution timeline, tool stream, diff action bar. |
| `ai_providers` | `features/providers/ProviderDashboard.tsx` & `HealthBadge.tsx` | Routing strategy banner, provider cards, test connection, key entry modal. |
| `welcome_empty_workspace` | `features/workspace/WelcomeHero.tsx` | Ambient hero banner, folder picker, prompt pills, feature cards. |
| `settings` | `features/settings/SettingsView.tsx` | Categorized preference panels, permission toggles, data retention controls. |
| `task_history` | `features/agent-activity/TaskHistoryView.tsx` | Historical run table, tool audit review, run replay. |
| `usage_quotas` | `features/models/UsageQuotasView.tsx` | Rate-limit gauges, token meters, cooldown countdown timers. |
| Right Inspector Panel | `components/InspectorPanel.tsx` | Tabbed sidebar: File tree (`M`/`N` tags), live activity events, diff hunk list. |

---

## 6. Iconography & Material Symbols

The design reference uses Google's **Material Symbols Outlined** font alongside Lucide icons for crisp 16px/18px glyphs:
- Navigation: `chat`, `folder`, `description`, `smart_toy`, `donut_large`, `history`, `settings`
- Window controls: `remove`, `square`, `close`
- Actions & Tools: `terminal`, `tune`, `check`, `close`, `difference`, `refresh`, `attach_file`, `code`, `send`
- Status: `check_circle` (filled), `progress_activity` (spinning), `bolt`, `route`, `hub`

