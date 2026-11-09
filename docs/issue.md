# VersaRail AI Agent Harness — Discovered Issues & Technical Debt Log

> **Document Type:** Quality Assurance, Security Audit & Static Analysis Findings  
> **Date:** November 2026  
> **Source:** Deep Codebase Static Analysis, Live Electron E2E Tests, and Browser Verification  
> **Target System:** VersaRail AI Desktop Harness (`ai-agent-harness`)

---

## 1. Executive Summary

A comprehensive multi-phase inspection was performed across the codebase:
1. **Static Architectural Scan**: Auditing [`src/main`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/main), [`src/renderer`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer), [`src/preload`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/preload), and [`src/shared`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/shared).
2. **Live Desktop E2E Automation**: Executed on Electron using Google AI Studio (`AQ.Ab8RN6...`), Pollinations, and a mock Grok gateway for 429 rate-limit failovers.
3. **Antigravity Browser-Tool Testing**: Executed against the compiled React single-page application inside Chromium via local server.

The core multi-provider orchestration, cryptographic safe storage, and dead-turn 429 rate limit failover engine function as designed. All valid functional issues and edge-case bugs identified during testing have been safely resolved without introducing regressions.

---

## 2. Issues Summary Table

| Issue ID | Severity | Category | Component | Status |
|---|---|---|---|---|
| **ISSUE-001** | **High** | Lifecycle / Process Leak | Agent Command Runner & SQLite Shutdown | **Resolved** |
| **ISSUE-002** | **Low** | UX / Security | Permission Broker & Modal Overlay | **Verified by Design** *(Global root modal)* |
| **ISSUE-003** | **Medium** | Model Compatibility | Google Gemini Adapter & Catalogs | **Resolved / Verified** *(Gemini 3.0 Flash)* |
| **ISSUE-004** | **Low** | State Synchronization | Workspace Service & UI Store | **Verified Working** *(Store-managed state)* |
| **ISSUE-005** | **Medium** | Context Management | ContextManager Multi-System Role Elimination | **Resolved** |
| **ISSUE-006** | **Low** | UI / Responsive | Native TitleBar in Browser Mode | **Resolved** |
| **ISSUE-007** | **Low** | UI / Data Mapping | Providers View Toggle Status Defaulting | **Resolved** |
| **ISSUE-008** | **Low** | Security / Hardening | Content Security Policy in Desktop Electron | **Verified by Design** *(Hardened CSP)* |

---

## 3. Detailed Issue Reports & Resolution Log

### ISSUE-001: Process & Resource Cleanup on App Exit
- **Severity:** High
- **Category:** Process Lifecycle & Resource Leak
- **Affected Files:** [`src/main/index.ts`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/main/index.ts), [`src/main/agent/command-runner.ts`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/main/agent/command-runner.ts), [`src/main/storage/sqlite-database.ts`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/main/storage/sqlite-database.ts)
- **Description:**
  Closing the Electron window did not terminate spawned agent tool subprocesses or cleanly close the SQLite database.
- **Root Cause:**
  `AgentCommandRunner` tracked child processes in `private activeProcesses: Map<string, ChildProcess>` but lacked a `terminateAll()` cleanup method. In addition, `src/main/index.ts` had no `app.on('will-quit')` hook to perform graceful resource deallocation.
- **Resolution:**
  1. Added `AgentCommandRunner.getInstance().terminateAll()` using `tree-kill` on all active process trees.
  2. Registered `app.on('will-quit')` in `src/main/index.ts` to terminate all child processes and close `SqliteDatabase.getInstance().close()` cleanly.
- **Status:** **Resolved**

---

### ISSUE-002: Permission Approval Modal Global Availability
- **Severity:** Low (UX Polish)
- **Category:** Agentic Security & User Experience
- **Affected Files:** [`src/renderer/src/components/permissions/PermissionModal.tsx`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/src/components/permissions/PermissionModal.tsx), [`src/renderer/src/app/App.tsx`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/src/app/App.tsx)
- **Description:**
  Concern that user navigating away from Chat view might miss security approval prompts.
- **Audit Verification:**
  Code inspection revealed that [`PermissionModal`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/src/components/permissions/PermissionModal.tsx) is mounted at the root inside [`App.tsx`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/src/app/App.tsx#L22) with `fixed inset-0 z-50 bg-black/75 backdrop-blur-sm`. It renders on top of any active feature view (Chat, Providers, Settings, Quotas) whenever a security decision is requested.
- **Status:** **Verified by Design**

---

### ISSUE-003: Gemini Model Modernization & Aliasing
- **Severity:** Medium
- **Category:** Provider API Compatibility
- **Affected Files:** [`src/main/agent/failover-engine.ts`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/main/agent/failover-engine.ts), [`src/main/providers/gemini.adapter.ts`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/main/providers/gemini.adapter.ts)
- **Description:**
  Google AI Studio retired older models like `gemini-2.0-flash` and `gemini-flash-latest`.
- **Audit Verification:**
  Both `DEFAULT_PROVIDER_MODELS.gemini` and `GEMINI_DEFAULT_MODELS` already designate `gemini-3-flash-preview` as the active default model. The adapter also intercepts any incoming legacy `gemini-2.*` identifiers and transparently maps them to `gemini-3-flash-preview`.
- **Status:** **Resolved / Verified**

---

### ISSUE-004: Workspace Path State Synchronization
- **Severity:** Low
- **Category:** Inter-Process Communication & UI State
- **Affected Files:** [`src/renderer/src/app/useUiStore.tsx`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/src/app/useUiStore.tsx), [`src/main/ipc/handlers/workspace-handlers.ts`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/main/ipc/handlers/workspace-handlers.ts)
- **Description:**
  Ensure workspace path updates are immediately reflected in UI components.
- **Audit Verification:**
  In [`useUiStore.tsx`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/src/app/useUiStore.tsx), both `openWorkspacePath` and `selectWorkspaceFolder` update local React state synchronously (`setWorkspace(newWs)`) before sending IPC messages, ensuring zero latency or UI flicker across views.
- **Status:** **Verified Working**

---

### ISSUE-005: Elimination of Multiple System Messages on Context Compaction
- **Severity:** Medium
- **Category:** Token Budget & Upstream Provider API Compatibility
- **Affected Files:** [`src/main/agent/context-manager.ts`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/main/agent/context-manager.ts#L150-L154), [`src/main/agent/agent-runtime.ts`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/main/agent/agent-runtime.ts)
- **Description:**
  When token budgets exceeded the model context ceiling, `ContextManager.prepareContext()` generated a summary pill with `role: 'system'`. Combined with `AgentRuntime` prepending the agent system prompt at index 0, this created two `system` messages in the message array. Providers like Anthropic, OpenAI, and Google Gemini reject requests containing multiple `system` messages with `HTTP 400 Bad Request`.
- **Resolution:**
  Updated `summaryMessage.role` to `'user'` in [`src/main/agent/context-manager.ts`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/main/agent/context-manager.ts). The context compaction summary is retained as a conversational user observation, guaranteeing strictly at most one root `system` prompt across all provider APIs.
- **Status:** **Resolved**

---

### ISSUE-006: Native TitleBar Window Controls in Browser Mode
- **Severity:** Low
- **Category:** Cross-Platform UI Consistency
- **Affected File:** [`src/renderer/src/components/layout/TitleBar.tsx`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/src/components/layout/TitleBar.tsx#L4-L45)
- **Description:**
  When loaded in a web browser (e.g. during browser-based tests or remote preview), frameless window controls (Minimize, Maximize, Close) were rendered even though they are no-ops outside Electron.
- **Resolution:**
  Added an environment guard: `const isElectron = typeof window !== 'undefined' && Boolean(window.electronApi?.minimizeWindow)`. Window control action buttons are now rendered only when running inside the native Electron desktop application.
- **Status:** **Resolved**

---

### ISSUE-007: Provider Card Status Defaulting
- **Severity:** Low
- **Category:** UI / Data Mapping
- **Affected Files:** [`src/renderer/src/features/providers/ProvidersView.tsx`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/src/features/providers/ProvidersView.tsx#L400-L404), [`src/renderer/src/app/useUiStore.tsx`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/src/app/useUiStore.tsx#L221)
- **Description:**
  Providers whose SQLite record lacked an explicit `enabled` boolean property (or was `undefined`) evaluated falsy in `{p.enabled ? 'Connected' : 'Disabled'}` and displayed as "Disabled" with a gray dot.
- **Resolution:**
  Updated checks in both [`ProvidersView.tsx`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/src/features/providers/ProvidersView.tsx) and [`useUiStore.tsx`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/src/app/useUiStore.tsx) to `p.enabled !== false`, ensuring any configured provider defaults to connected unless explicitly toggled off by the user.
- **Status:** **Resolved**

---

### ISSUE-008: Content Security Policy in Desktop Electron
- **Severity:** Low
- **Category:** Application Security Hardening
- **Affected File:** [`src/renderer/index.html`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/src/renderer/index.html#L6-L9)
- **Description:**
  `connect-src 'none'` is configured in the HTML metadata.
- **Audit Verification:**
  This is a deliberate security hardening measure for the Electron desktop environment. Because 100% of network traffic and AI provider requests route through validated main-process IPC handlers with sender verification and cryptographic audit logging, restricting the renderer prevents XSS-based network exfiltration.
- **Status:** **Verified by Design**

---

## 4. Verification Matrix

| Issue ID | Verification Method | Result |
|---|---|---|
| **ISSUE-001** | `npm run test` (Subprocess lifecycle + DB close hooks) | **PASSED** (210/210 unit tests) |
| **ISSUE-005** | `npm run test` (Context compaction token budget) | **PASSED** (Strict 1-system-role contract) |
| **ISSUE-006** | Browser test server inspection (`out/renderer`) | **PASSED** (Controls hidden in browser) |
| **ISSUE-007** | Providers view with undefined `enabled` properties | **PASSED** (Defaults cleanly to Connected) |
| **Full Build** | `npm run typecheck && npm run build` | **PASSED** (Clean bundle in 1.91s) |

---

*End of Issues Log. Updated and verified by Antigravity Assistant.*
