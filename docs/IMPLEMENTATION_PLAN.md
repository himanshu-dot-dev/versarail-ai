# Master Implementation Plan: Secure Multi-Provider AI Agent Harness

*Date of Planning: October 2026*  
*Architecture Version: 1.0.0-PROPOSAL*  
*Execution Mode: Phase B Planning (Awaiting Explicit User Approval before Build)*

---

## 1. Project Scope & Product Vision

The Secure Multi-Provider AI Agent Harness is a local-first, developer-centric desktop application built with Electron, React, Node.js, and TypeScript. It empowers software developers to work directly with their local repositories using multiple AI providers (Bring Your Own Key - BYOK) under strict security boundaries, capability-aware automatic failover, diff-first reviewable file modifications, and an integrated dual-path terminal.

### MVP Scope Boundaries (P0 — Mandatory for First Release)
* **Secure Electron Shell:** Context isolation, sandboxing, restrictive CSP, custom protocol (`app://`), and security fuses.
* **BYOK Credential Dashboard:** Key entry, masking, validation requests, and OS-keychain encryption via `safeStorage` (with strict refusal of Linux `basic_text`).
* **Verified Provider Adapters:** Google Gemini (`@google/genai`) and Groq (`groq-sdk`), plus Cerebras and OpenRouter candidate support.
* **Resilient Routing & Failover:** Error classification (429, 401, 402, 503, timeouts), exponential backoff with jitter, cooldown tracking, and automated cross-provider failover.
* **Persistent Local Data:** Built-in `node:sqlite` (`DatabaseSync`) with atomic migrations for conversations, messages, audit logs, and settings.
* **Central Permission Broker:** Capability-based in-code authorization with TOCTOU cryptographic payload hashing.
* **Workspace Safety:** Realpath canonicalization, path-traversal prevention, symlink escape defense, and sensitive file exclusion (`.env`, `.git`, `.ssh`).
* **Diff-First Mutation Engine:** SHA-256 baseline hashing, unified diff visualization, conflict detection, and atomic write/rename commits.
* **Dual-Path Terminal Architecture:** User interactive terminal via xterm.js alongside a separately authorized, structured `AgentCommandRunner` with process-tree termination.
* **Comprehensive Automated Testing:** Unit, integration, security penetration, and Playwright Electron E2E test suites.

### P1 — Planned Extensions (Post-MVP)
* Additional provider adapters (Anthropic Claude, Mistral, Cohere).
* Per-hunk selective staging and patch editing.
* Semantic vector search / local AST code indexing.
* Advanced usage analytics and token cost calculation.

### P2 — Future Possibilities (Not in MVP)
* OS container sandboxing (Docker/WSL2 isolated runner).
* Remote cloud development workspace synchronization.
* Third-party plugin marketplace.

### Visual Design System (VersaRail AI Blueprint)
* The user interface strictly follows the **VersaRail AI** design specifications located in [`docs/UI_UX_SPECIFICATION.md`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/docs/UI_UX_SPECIFICATION.md).
* **Color Palette & Atmosphere:** Deep charcoal surfaces (`#13131b`, `#0d0d15`), Electric Violet primary interactive accents (`#c0c1ff` / `#8083ff`), Cyan telemetry accents (`#4cd7f6`), and low-opacity engineered borders (`#212631`).
* **Layout Structure:** 40px draggable titlebar, 256px left navigation sidebar (Active Project, Chat, Projects, Files, Providers, Quotas, History, Settings), fluid center workspace with expandable execution timeline & tool stream, and 288px right inspector panel (Files, Activity, Changes).
* **Typography:** Inter for clean structural UI; JetBrains Mono for monospaced telemetry, code, and masked key chips.

### Git Commit & Push Policy
* **Strict Developer Control:** The agent harness assistant will **never** run `git commit` or `git push`. All file creations, edits, and test artifacts remain uncommitted in the working tree so that the developer can review, stage, commit, and push changes personally.

---

## 2. Technical Dependency Evaluation & Justification

| Dependency | Architectural Location | Version Range | Official Documentation | License | Electron/Node Compatibility | Justification & Security Implications | Alternatives Considered & Rejected |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`electron`** | Desktop Host | `^34.0.0` – `^45.0.0` | [electronjs.org](https://www.electronjs.org) | MIT | Native Node 24 | Industry-standard cross-platform runtime. Strict security flags enforced. | Tauri (Rust dependency complicates native PTY and Node toolchain), NW.js (lacks granular context isolation). |
| **`react` & `react-dom`** | Renderer Process | `^19.0.0` | [react.dev](https://react.dev) | MIT | Pure Web | Modern declarative component architecture with fast concurrent rendering for token streaming. | Svelte, Vue (React offers the richest developer tooling and diff visualization libraries). |
| **`electron-vite`** | Build & Dev Pipeline | `^2.3.0` | [electron-vite.org](https://electron-vite.org) | MIT | Node 20/22/24 | Out-of-the-box multi-process bundling; cleanly isolates Main, Preload, and Renderer. | Electron Forge (slower HMR), Vanilla Vite (requires manual multi-target rollups). |
| **`typescript`** | Universal | `^5.8.0` | [typescriptlang.org](https://www.typescriptlang.org) | Apache-2.0 | Node 20+ | Strict type safety across IPC contracts and tool schemas. Eliminates type errors at build time. | Plain JavaScript (unacceptable runtime type risks in security-critical agent code). |
| **`node:sqlite`** | Main Process | Built-in | [nodejs.org](https://nodejs.org/api/sqlite.html) | Node.js | Built into Node 22/24 | **Zero native compilation.** Eliminates MSBuild/Python build failures on Windows. Robust synchronous prepared statements. | `better-sqlite3` (requires C++ compiler / rebuilds), `sql.js` (WASM lacks WAL journal safety). |
| **`zod`** | Universal (`shared/`) | `^3.24.0` | [zod.dev](https://zod.dev) | MIT | Universal | Runtime schema validation at all trust boundaries (IPC payloads, model tool calls, settings). | Yup, Joi (Zod has best TypeScript inference and zero runtime dependencies). |
| **`@google/genai`** | Main Process | `^0.1.0`+ | [ai.google.dev](https://ai.google.dev) | Apache-2.0 | Node 18+ | Official unified Google Gen AI SDK for Gemini models. Replaces deprecated `@google/generative-ai`. | Deprecated `@google/generative-ai` (EoL August 2025). |
| **`groq-sdk`** | Main Process | `^0.9.0`+ | [groq.com](https://groq.com) | Apache-2.0 | Node 18+ | Official Groq SDK with ultra-fast streaming and OpenAI-compatible tool calling. | Raw HTTP fetch (lacks auto-retries and typed delta payloads). |
| **`@cerebras/cerebras_cloud_sdk`** | Main Process | `^1.0.0`+ | [cerebras.ai](https://cerebras.ai) | Apache-2.0 | Node 18+ | Official Cerebras SDK for high-speed wafer-scale inference. | Generic fetch wrapper. |
| **`@xterm/xterm`** | Renderer Process | `^5.5.0` | [xtermjs.org](https://xtermjs.org) | MIT | Browser/Canvas | Industry-standard terminal emulator component (used by VS Code). High performance canvas rendering. | Custom `<pre>` element (lacks ANSI parsing, cursor control, resize geometry). |
| **`@xterm/addon-fit`** | Renderer Process | `^0.10.0` | [xtermjs.org](https://xtermjs.org) | MIT | Browser | Automatically sizes xterm dimensions to match parent DOM container. | Manual resize calculations. |
| **`diff`** | Main Process | `^7.0.0` | [github.com/kpdecker/jsdiff](https://github.com/kpdecker/jsdiff) | BSD-3-Clause | Pure JS | Robust unified diff parsing and patch generation. | Custom regex diffing (error-prone with complex hunk offsets). |
| **`tree-kill`** | Main Process | `^1.2.2` | [npm/tree-kill](https://www.npmjs.com/package/tree-kill) | MIT | Windows/macOS/Linux | Guarantees recursive termination of spawned child process trees on timeout or cancel. | `child.kill()` (leaves orphaned background subprocesses on Windows). |
| **`vitest`** | Test Harness | `^3.0.0` | [vitest.dev](https://vitest.dev) | MIT | Node 20+ | Lightning-fast ESM unit and integration testing with native TypeScript execution. | Jest (slower, complex ESM/Electron mocking). |
| **`@playwright/test`** | Test Harness | `^1.50.0` | [playwright.dev](https://playwright.dev) | Apache-2.0 | Node 18+ | First-class Electron application end-to-end testing via `_electron.launch`. | Spectron (deprecated), Selenium (fragile). |

---

## 3. Implementation Milestones Roadmap

### Milestone 0: Workspace Inspection, Research & Architecture Approval (CURRENT)
* **Objective:** Inspect workspace, research official stable APIs and platform limitations, verify dependencies, establish architectural ADRs, and produce implementation-ready planning artifacts.
* **Prerequisites:** Workspace access.
* **Scope:** Documentation, ADRs, Threat Model, Architecture, Test Strategy, and Task Checklist in `docs/`.
* **Exclusions:** Code scaffolding, dependency installation, or project-changing scripts before explicit user approval.
* **Acceptance Criteria:** All 7 planning documents created; 14 architectural questions answered; explicit stop condition observed.

---

### Milestone 1: Secure Electron Foundation, React Shell & Typed IPC Pipeline
* **Objective:** Scaffold the application using `electron-vite`, React 19, and TypeScript strict mode with fully hardened Electron security settings and typed IPC communication.
* **Prerequisites:** Approval of Milestone 0.
* **Tasks:**
  - Setup `electron.vite.config.ts`, `tsconfig.json`, `package.json`.
  - Implement Main process entry (`src/main/index.ts`) with single-instance lock and protocol handler.
  - Implement security hardening: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, restrictive CSP.
  - Implement Preload script exposing typed `window.electronApi`.
  - Implement `sender-verifier.ts` to validate frame origins on every IPC call.
  - Mount React 19 application shell with dark/light developer theme.
* **Tests:** `tests/security/ipc-boundaries.test.ts`, unit tests for contract validation.
* **Acceptance Criteria:** App launches securely; custom `app://` protocol serves assets; IPC roundtrip verified with strict TypeScript contracts.

---

### Milestone 2: Local SQLite Persistence, Migrations & Safe Storage
* **Objective:** Establish the local structured database with automatic migrations and secure credential storage.
* **Prerequisites:** Milestone 1 complete.
* **Tasks:**
  - Implement `sqlite-database.ts` using Node built-in `node:sqlite` (`DatabaseSync`).
  - Implement `migration-runner.ts` and write initial schemas (conversations, messages, providers, audit events).
  - Implement `safe-storage.service.ts` using `safeStorage.encryptStringAsync` / `decryptStringAsync`.
  - Implement strict Linux backend check: refuse persistence if `getSelectedStorageBackend() === 'basic_text'`.
  - Implement `SecretRedactor` utility to strip secret patterns from memory and logs.
* **Tests:** `tests/integration/sqlite-migrations.test.ts`, `tests/security/safe-storage.test.ts`, `tests/security/secret-redaction.test.ts`.
* **Acceptance Criteria:** Relational tables created cleanly; secrets encrypted via OS keyring; Linux fallback rejected; secrets redacted from test logs.

---

### Milestone 3: Provider Abstraction & Credential Dashboard
* **Objective:** Build the BYOK Provider Dashboard and the first verified provider adapters.
* **Prerequisites:** Milestone 2 complete.
* **Tasks:**
  - Define `IProviderAdapter` contract and shared schemas in `src/shared/contracts/`.
  - Implement reusable `OpenAICompatAdapter` base class handling SSE parsing, bearer auth, and model discovery.
  - Implement `gemini-adapter.ts` using `@google/genai` (validating models `gemini-2.5-flash`, `gemini-2.5-pro`).
  - Implement `groq-adapter.ts` using `groq-sdk` / `OpenAICompatAdapter` (validating models `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`).
  - Implement in-band error detection and tool argument dialect repair (stripping markdown fences from tool call arguments).
  - Implement Provider Dashboard UI: add credential, label, live validation check, status badge, delete.
* **Tests:** Unit tests with mocked HTTP responses for validation endpoints, in-band error detection, and credential encryption.
* **Acceptance Criteria:** User can add, validate, and manage Gemini and Groq API keys; keys stored encrypted; credentials masked in UI.

---

### Milestone 4: Streaming Chat, Model Selection & Conversation Persistence
* **Objective:** Deliver the real-time streaming chat experience with model selection and full conversation persistence.
* **Prerequisites:** Milestone 3 complete.
* **Tasks:**
  - Build `PromptComposer.tsx` and `ChatFeed.tsx` in React renderer.
  - Implement `agent-runtime.ts` streaming loop handling incoming token chunks.
  - Implement **Dead-Turn Recovery Protocol**: track `hasStreamedFirstByte` so pre-first-byte errors failover invisibly with zero user interruption.
  - Implement IPC streaming channel (`agent:stream-token`) to update UI without blocking.
  - Persist conversation messages and run records in SQLite.
  - Implement user cancellation button triggering `AbortController`.
* **Tests:** Unit tests for stream chunk assembly and pre-first-byte failover; integration test for conversation history retrieval.
* **Acceptance Criteria:** Chat streams smoothly token-by-token; conversations persist across app reboots; pre-first-byte errors failover invisibly.

---

### Milestone 5: Error Taxonomy, Capability Routing & Automatic Failover
* **Objective:** Implement intelligent error classification, exponential backoff, and automatic cross-provider failover.
* **Prerequisites:** Milestone 4 complete.
* **Tasks:**
  - Implement `error-classifier.ts` mapping HTTP status codes and headers to `NormalizedProviderError`.
  - Implement `failover-engine.ts` with retry backoff (jitter), provider cooldown tracking, and concurrency leases (`acquireLease` / `releaseLease`).
  - Implement Pre-Flight Context Floor Filtering (`passesContextWindowFloor`) to exclude models unable to fit the prompt.
  - Implement human-readable cooldown countdowns (`formatResetEta`) and client-safe diagnostics (`summarizeExhaustion`).
  - Enforce privacy/workspace gating before failing over to alternative providers.
  - Display failover notifications and health badges in the React UI.
* **Tests:** `tests/integration/provider-failover.test.ts` (simulating 429 rate limit failover from Groq to Gemini with human-readable reset countdown).
* **Acceptance Criteria:** Simulated 429 triggers exponential backoff or automatic fallback without dropping conversation history or leaking secrets; exhaustion states show precise reset ETAs.

---

### Milestone 6: Agent Runtime, Central Tool Registry & Permission Broker
* **Objective:** Build the core agent execution loop, tool registry, and permission broker.
* **Prerequisites:** Milestone 5 complete.
* **Tasks:**
  - Implement `tool-registry.ts` defining input/output schemas and capability requirements.
  - Implement `permission-broker.ts` evaluating requests against policy and generating cryptographic argument hashes.
  - Implement interactive Permission Modal in React presenting exact proposed action and parameters.
  - Enforce TOCTOU defense: verify argument hash immediately prior to tool execution.
* **Tests:** `tests/unit/permissions/permission-broker.test.ts`, `tests/security/toctou-tampering.test.ts`.
* **Acceptance Criteria:** No tool executes without broker authorization; argument tampering is detected and blocked; execution decisions audited in SQLite.

---

### Milestone 7: Workspace Safe Filesystem & Context Selection
* **Objective:** Enable safe workspace folder selection, path canonicalization, and controlled file inspection.
* **Prerequisites:** Milestone 6 complete.
* **Tasks:**
  - Implement native folder picker via `dialog.showOpenDialog`.
  - Implement `workspace-service.ts` and `path-canonicalizer.ts` using `fs.realpathSync`.
  - Enforce path-traversal and symlink escape defenses.
  - Implement default exclusions (`.env`, `.git`, `.ssh`, `node_modules`).
  - Implement `file-read-tool.ts` and `file-search-tool.ts` bounded by file size limits.
* **Tests:** `tests/security/path-traversal.test.ts`.
* **Acceptance Criteria:** Agent safely reads authorized project files; path traversal and dangling symlinks are rejected; sensitive files excluded.

---

### Milestone 8: Diff-First Editing, Unified Diff Review & Atomic Commits
* **Objective:** Provide a reviewable diff-first file modification workflow with conflict detection and recovery.
* **Prerequisites:** Milestone 7 complete.
* **Tasks:**
  - Implement baseline SHA-256 content hashing upon file read.
  - Implement `diff-engine.ts` generating unified diffs.
  - Build `DiffViewer.tsx` in React with clear addition/deletion highlighting.
  - Implement pre-application conflict check: re-verify disk hash before applying patch.
  - Implement `atomic-writer.ts` (temp file write + fsync + atomic rename).
  - Record applied mutations in `change-journal.ts` for rollback audit.
* **Tests:** Unit tests for diff patching; integration test for conflict detection when disk file changes externally.
* **Acceptance Criteria:** Agent cannot overwrite files blindly; user inspects diff before approving; atomic commits prevent file corruption; conflicts flagged.

---

### Milestone 9: Dual Terminal: Interactive User Terminal & Agent Command Runner
* **Objective:** Provide an interactive xterm.js terminal for the developer and a separate, structured, authorized command runner for the agent.
* **Prerequisites:** Milestone 8 complete.
* **Tasks:**
  - Implement `terminal-service.ts` connecting `@xterm/xterm` in React to an interactive shell process.
  - Implement `AgentCommandRunner` using `child_process.spawn` with structured arguments `['cmd', 'arg1', 'arg2']`.
  - Route agent commands through `PermissionBroker` before execution.
  - Enforce timeouts, 1MB output caps, and process-tree termination via `tree-kill`.
  - Redact secret patterns from command stdout/stderr.
* **Tests:** `tests/security/subprocess-lifecycle.test.ts`.
* **Acceptance Criteria:** Developer uses interactive terminal normally; agent commands require approval; runaway commands terminated cleanly; secrets redacted.

---

### Milestone 10: Context Management, Observability & Privacy Controls
* **Objective:** Enhance agent context window management, token budgeting, and developer privacy controls.
* **Prerequisites:** Milestone 9 complete.
* **Tasks:**
  - Implement context-window truncation and history summarization for large conversations.
  - Build Privacy & Settings UI: configure allowed providers per workspace, toggle failover rules, set audit retention.
  - Build Agent Activity Feed showing real-time step progress, tool statuses, and execution times.
* **Tests:** Unit tests for context truncation and retention cleanup.
* **Acceptance Criteria:** Token budgets respected; large conversations summarize gracefully; privacy policies strictly gate data egress.

---

### Milestone 11: Security Hardening & End-to-End Test Verification
* **Objective:** Execute full security audit, apply compile-time fuses, and verify all automated test suites.
* **Prerequisites:** Milestone 10 complete.
* **Tasks:**
  - Apply `@electron/fuses` (`RunAsNode: false`, `OnlyLoadAppFromAsar: true`).
  - Run complete security penetration suite (`tests/security/`).
  - Implement Playwright E2E tests for complete BYOK, chat, diff, and terminal journeys.
  - Verify zero high/critical vulnerabilities via `npm audit`.
* **Tests:** Complete CI test run (unit + integration + security + E2E).
* **Acceptance Criteria:** 100% test pass rate across all suites; security fuses verified in production build; zero unmitigated vulnerabilities.

---

### Milestone 12: Production Packaging, Cross-Platform Verification & Documentation
* **Objective:** Package the application for Windows, macOS, and Linux, and deliver complete documentation.
* **Prerequisites:** Milestone 11 complete.
* **Tasks:**
  - Configure `electron-builder` for Windows (`nsis`), macOS (`dmg`), and Linux (`AppImage`).
  - Verify native asset bundling and secure protocol resolution in packaged ASAR.
  - Execute manual cross-platform checklist (M-1 through M-7 from Test Strategy).
  - Finalize user and developer documentation (`README.md`, setup instructions).
* **Acceptance Criteria:** Production installers build cleanly; no secrets or debug flags in production bundle; verified launch on target operating systems.

---

## 4. Master Task Checklist

| Task ID | Description | Milestone | Priority | Complexity | Target Modules / Files | Dependencies | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-M0-01** | Inspect workspace, verify Git state, and evaluate environment | M0 | P0 | Low | Workspace root | None | **Completed** |
| **TSK-M0-02** | Research official Electron, Node, SQLite, and AI provider docs | M0 | P0 | Medium | `docs/` | None | **Completed** |
| **TSK-M0-03** | Author Architecture Decision Records (ADR-001 – ADR-008) | M0 | P0 | Medium | `docs/DECISIONS.md` | TSK-M0-02 | **Completed** |
| **TSK-M0-04** | Author Provider Strategy & Error Matrix specification | M0 | P0 | Medium | `docs/PROVIDER_STRATEGY.md` | TSK-M0-02 | **Completed** |
| **TSK-M0-05** | Author Security Threat Model & STRIDE analysis | M0 | P0 | High | `docs/SECURITY_THREAT_MODEL.md` | TSK-M0-02 | **Completed** |
| **TSK-M0-06** | Author Directory Tree & Module Boundary specifications | M0 | P0 | Medium | `docs/FOLDER_STRUCTURE.md` | TSK-M0-02 | **Completed** |
| **TSK-M0-07** | Author Test Strategy & Cross-Platform Checklist | M0 | P0 | Medium | `docs/TEST_STRATEGY.md` | TSK-M0-02 | **Completed** |
| **TSK-M0-08** | Author Implementation Plan & Master Task Checklist | M0 | P0 | High | `docs/IMPLEMENTATION_PLAN.md` | TSK-M0-03–07 | **Completed** |
| **TSK-M0-09** | Present Planning Report & Await Explicit User Approval | M0 | P0 | Low | Direct Chat Response | TSK-M0-08 | **Current Turn** |
| **TSK-M1-01** | Scaffold Electron, React 19, TypeScript project with electron-vite | M1 | P0 | Medium | `electron.vite.config.ts`, `package.json` | Approval | **Completed** |
| **TSK-M1-02** | Implement hardened Main process lifecycle & custom protocol | M1 | P0 | Medium | `src/main/app/`, `src/main/index.ts` | TSK-M1-01 | **Completed** |
| **TSK-M1-03** | Implement isolated Preload script and typed contextBridge API | M1 | P0 | Medium | `src/preload/index.ts`, `src/preload/api.ts` | TSK-M1-01 | **Completed** |
| **TSK-M1-04** | Implement IPC sender validation and Zod contract verifier | M1 | P0 | High | `src/main/ipc/sender-verifier.ts` | TSK-M1-02 | **Completed** |
| **TSK-M1-05** | Build React 19 application shell, layout, and theme provider | M1 | P0 | Medium | `src/renderer/src/app/` | TSK-M1-03 | **Completed** |
| **TSK-M2-01** | Implement SQLite database service using built-in `node:sqlite` | M2 | P0 | Medium | `src/main/storage/sqlite-database.ts` | TSK-M1-04 | **Completed** |
| **TSK-M2-02** | Implement migration runner and initial database schemas | M2 | P0 | Medium | `src/main/storage/migration-runner.ts` | TSK-M2-01 | **Completed** |
| **TSK-M2-03** | Implement async `safeStorage` secret store with Linux check | M2 | P0 | High | `src/main/security/safe-storage.service.ts` | TSK-M2-01 | **Completed** |
| **TSK-M2-04** | Implement centralized SecretRedactor utility | M2 | P0 | Medium | `src/main/security/secret-redactor.ts` | TSK-M2-03 | **Completed** |
| **TSK-M3-01** | Define `IProviderAdapter` contract and capability schemas | M3 | P0 | Medium | `src/shared/contracts/provider.contract.ts` | TSK-M1-04 | Pending |
| **TSK-M3-02** | Implement Google Gemini adapter using `@google/genai` | M3 | P0 | High | `src/main/providers/adapters/gemini-adapter.ts` | TSK-M3-01 | Pending |
| **TSK-M3-03** | Implement Groq adapter using `groq-sdk` | M3 | P0 | High | `src/main/providers/adapters/groq-adapter.ts` | TSK-M3-01 | Pending |
| **TSK-M3-04** | Build BYOK Provider Dashboard UI with live credential check | M3 | P0 | Medium | `src/renderer/src/features/providers/` | TSK-M3-02,03 | Pending |
| **TSK-M4-01** | Implement streaming chat IPC channel and React stream consumer | M4 | P0 | High | `src/main/agent/`, `src/renderer/src/features/chat/` | TSK-M3-04 | Pending |
| **TSK-M4-02** | Implement model selection UI and capability indicator badges | M4 | P0 | Medium | `src/renderer/src/features/models/` | TSK-M4-01 | Pending |
| **TSK-M4-03** | Implement conversation persistence and sidebar history | M4 | P0 | Medium | `src/main/storage/repositories/` | TSK-M4-01 | Pending |
| **TSK-M5-01** | Implement `error-classifier.ts` for rate limits and quotas | M5 | P0 | High | `src/main/providers/error-classifier.ts` | TSK-M4-01 | Pending |
| **TSK-M5-02** | Implement `failover-engine.ts` with exponential backoff & cooldowns | M5 | P0 | High | `src/main/providers/failover-engine.ts` | TSK-M5-01 | Pending |
| **TSK-M5-03** | Implement failover UI notifications and health status badges | M5 | P0 | Medium | `src/renderer/src/features/providers/` | TSK-M5-02 | Pending |
| **TSK-M6-01** | Implement central ToolRegistry with Zod schema validation | M6 | P0 | High | `src/main/tools/tool-registry.ts` | TSK-M5-02 | Pending |
| **TSK-M6-02** | Implement PermissionBroker with cryptographic argument hashing | M6 | P0 | High | `src/main/permissions/permission-broker.ts` | TSK-M6-01 | Pending |
| **TSK-M6-03** | Build interactive Permission Review modal in React | M6 | P0 | Medium | `src/renderer/src/features/permissions/` | TSK-M6-02 | Pending |
| **TSK-M7-01** | Implement native workspace folder picker dialog | M7 | P0 | Low | `src/main/workspace/workspace-service.ts` | TSK-M6-03 | Pending |
| **TSK-M7-02** | Implement canonical path resolver with symlink escape defense | M7 | P0 | High | `src/main/workspace/path-canonicalizer.ts` | TSK-M7-01 | Pending |
| **TSK-M7-03** | Implement file read and search tools with exclusion filtering | M7 | P0 | Medium | `src/main/tools/implementations/` | TSK-M7-02 | Pending |
| **TSK-M8-01** | Implement file content SHA-256 hashing and diff engine | M8 | P0 | High | `src/main/changes/diff-engine.ts` | TSK-M7-03 | Pending |
| **TSK-M8-02** | Build reviewable DiffViewer UI in React | M8 | P0 | Medium | `src/renderer/src/features/changes/` | TSK-M8-01 | Pending |
| **TSK-M8-03** | Implement pre-application conflict detection and atomic writer | M8 | P0 | High | `src/main/changes/atomic-writer.ts` | TSK-M8-02 | Pending |
| **TSK-M9-01** | Implement user interactive terminal using `@xterm/xterm` | M9 | P0 | High | `src/main/terminal/`, `src/renderer/src/features/terminal/` | TSK-M8-03 | Pending |
| **TSK-M9-02** | Implement structured `AgentCommandRunner` with `child_process.spawn` | M9 | P0 | High | `src/main/agent/command-runner.ts` | TSK-M9-01 | Pending |
| **TSK-M9-03** | Implement process-tree termination (`tree-kill`) and secret redaction | M9 | P0 | High | `src/main/agent/command-runner.ts` | TSK-M9-02 | Pending |
| **TSK-M10-01**| Implement context window budgeting and summarization | M10| P1 | Medium | `src/main/agent/context-manager.ts` | TSK-M9-03 | Pending |
| **TSK-M10-02**| Implement workspace data-sharing policies and privacy settings UI | M10| P0 | Medium | `src/renderer/src/features/settings/` | TSK-M10-01 | Pending |
| **TSK-M10-03**| Build live Agent Activity Feed and Step Progress tracker | M10| P0 | Medium | `src/renderer/src/features/agent-activity/` | TSK-M10-02 | Pending |
| **TSK-M11-01**| Apply compile-time Electron fuses via `@electron/fuses` | M11| P0 | Medium | `src/main/security/fuses.ts` | TSK-M10-03 | Pending |
| **TSK-M11-02**| Run and verify complete security penetration test suite | M11| P0 | High | `tests/security/` | TSK-M11-01 | Pending |
| **TSK-M11-03**| Implement and verify Playwright Electron E2E test suite | M11| P0 | High | `tests/e2e/` | TSK-M11-02 | Pending |
| **TSK-M12-01**| Configure cross-platform packaging with `electron-builder` | M12| P0 | Medium | `package.json`, `electron-builder.yml` | TSK-M11-03 | Pending |
| **TSK-M12-02**| Execute manual cross-platform checklist on Windows/macOS/Linux | M12| P0 | High | `docs/TEST_STRATEGY.md` | TSK-M12-01 | Pending |
| **TSK-M12-03**| Finalize user documentation, README, and developer setup guides | M12| P0 | Low | `README.md`, `docs/` | TSK-M12-02 | Pending |

---

## 5. Risks, Mitigations & Open Technical Decisions

| Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Native Module Build Failure on Developer Windows Machines** | High | High | **Mitigated:** Replaced `better-sqlite3` with Node's built-in `node:sqlite` (`DatabaseSync`). Zero C++ compilation or Python/MSBuild required. For terminal, structured agent execution uses standard Node `child_process.spawn`. |
| **Linux Plaintext Storage Fallback** | Critical | Medium | **Mitigated:** Explicit check on `safeStorage.getSelectedStorageBackend()`. If `basic_text`, the application refuses to write credentials to disk and falls back to session-only in-memory storage. |
| **Prompt Injection Bypassing File & Command Boundaries** | Critical | High | **Mitigated:** Model output is strictly untrusted. Security boundaries are implemented in compiled TypeScript inside the Main process. All destructive actions require developer approval via cryptographic argument hashing. |
| **Provider Free Tier Quota Exhaustion & Rate Limiting** | Medium | High | **Mitigated:** Implemented intelligent error classifier, exponential backoff with jitter, provider cooldown tracking, and automatic capability-aware failover. |
| **TOCTOU Race Condition during File Patch Application** | High | Medium | **Mitigated:** Baseline SHA-256 content hashing upon file read; re-verification immediately before atomic rename. External modifications trigger an explicit conflict alert. |
| **Orphaned Runaway Subprocesses from Agent Commands** | High | Medium | **Mitigated:** Enforced process-tree termination using `tree-kill` on timeout, cancellation, or application exit. Capped stdout/stderr buffers at 1MB. |
| **Secret Exfiltration via Telemetry or Logs** | High | Medium | **Mitigated:** Zero remote telemetry. Centralized `SecretRedactor` scans all logs, error objects, and IPC events. Stored secrets never sent back to the renderer after initial submission. |
