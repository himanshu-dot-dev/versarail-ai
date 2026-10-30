# Folder Structure & Module Boundaries

*Date of Verification: October 2026*  
*Status: Engineering Specification*

---

## 1. Complete Proposed Directory Tree

The application is structured cleanly around process boundaries (`main`, `preload`, `renderer`) and a universal contract layer (`shared`).

```
ai-agent-harness/
├── .gitattributes
├── .gitignore
├── electron.vite.config.ts        # electron-vite configuration (main, preload, renderer)
├── package.json                   # Dependencies, scripts, and build metadata
├── tsconfig.json                  # Root TypeScript project references
├── tsconfig.node.json             # TypeScript config for Main & Preload
├── tsconfig.web.json              # TypeScript config for React Renderer
│
├── docs/                          # Architectural and project documentation
│   ├── ARCHITECTURE.md            # System architecture, process boundaries, Mermaid diagrams
│   ├── DECISIONS.md               # Architecture Decision Records (ADRs)
│   ├── FOLDER_STRUCTURE.md        # This file: Directory layout and module import boundaries
│   ├── IMPLEMENTATION_PLAN.md     # Scope, milestones, task checklist, acceptance criteria
│   ├── PROVIDER_STRATEGY.md       # Provider adapters, models, error mappings, rate limits
│   ├── SECURITY_THREAT_MODEL.md   # STRIDE analysis, attack scenarios, security controls
│   └── TEST_STRATEGY.md           # Testing levels, quality gates, fixtures, and CI
│
├── src/
│   ├── main/                      # Electron Main Process (Privileged Node.js 24)
│   │   ├── index.ts               # Application entry point & single-instance lock
│   │   ├── app/                   # App lifecycle, menu, window management, auto-recovery
│   │   │   ├── app-lifecycle.ts
│   │   │   ├── window-manager.ts
│   │   │   └── protocol-handler.ts
│   │   ├── ipc/                   # Validated IPC handlers and sender verifiers
│   │   │   ├── ipc-router.ts
│   │   │   ├── sender-verifier.ts
│   │   │   └── handlers/          # Modular IPC domain handlers
│   │   │       ├── provider-handlers.ts
│   │   │       ├── agent-handlers.ts
│   │   │       ├── permission-handlers.ts
│   │   │       ├── workspace-handlers.ts
│   │   │       ├── terminal-handlers.ts
│   │   │       └── diff-handlers.ts
│   │   ├── security/              # Security enforcement, safeStorage, redaction
│   │   │   ├── safe-storage.service.ts
│   │   │   ├── secret-redactor.ts
│   │   │   ├── session-security.ts
│   │   │   └── fuses.ts
│   │   ├── permissions/           # Central Permission Broker
│   │   │   ├── permission-broker.ts
│   │   │   ├── permission-evaluator.ts
│   │   │   └── permission-store.ts
│   │   ├── providers/             # Provider Adapters & Failover Engine
│   │   │   ├── provider-router.ts
│   │   │   ├── failover-engine.ts
│   │   │   ├── health-tracker.ts
│   │   │   ├── error-classifier.ts
│   │   │   └── adapters/
│   │   │       ├── base-adapter.ts
│   │   │       ├── gemini-adapter.ts
│   │   │       ├── groq-adapter.ts
│   │   │       ├── cerebras-adapter.ts
│   │   │       ├── openrouter-adapter.ts
│   │   │       └── custom-endpoint-adapter.ts
│   │   ├── agent/                 # Agent Runtime & Execution Loop
│   │   │   ├── agent-runtime.ts
│   │   │   ├── context-manager.ts
│   │   │   ├── command-runner.ts
│   │   │   └── execution-limits.ts
│   │   ├── tools/                 # Central Tool Registry & Implementations
│   │   │   ├── tool-registry.ts
│   │   │   ├── base-tool.ts
│   │   │   └── implementations/
│   │   │       ├── file-read-tool.ts
│   │   │       ├── file-search-tool.ts
│   │   │       ├── file-propose-tool.ts
│   │   │       ├── file-patch-tool.ts
│   │   │       ├── git-status-tool.ts
│   │   │       └── terminal-command-tool.ts
│   │   ├── workspace/             # Canonical Path Validation & Filesystem Safety
│   │   │   ├── workspace-service.ts
│   │   │   ├── path-canonicalizer.ts
│   │   │   └── exclusion-filter.ts
│   │   ├── terminal/              # User Interactive Terminal (PTY / Stream Bridge)
│   │   │   ├── terminal-service.ts
│   │   │   └── pty-session.ts
│   │   ├── changes/               # Diff Engine, Atomic Writes & Recovery Journal
│   │   │   ├── diff-engine.ts
│   │   │   ├── atomic-writer.ts
│   │   │   └── change-journal.ts
│   │   ├── storage/               # Structured Relational SQLite Store
│   │   │   ├── sqlite-database.ts
│   │   │   ├── migration-runner.ts
│   │   │   ├── migrations/        # SQL schema migration files
│   │   │   │   ├── 001_initial_schema.sql
│   │   │   │   └── 002_provider_health.sql
│   │   │   └── repositories/
│   │   │       ├── conversation-repository.ts
│   │   │       ├── message-repository.ts
│   │   │       ├── audit-repository.ts
│   │   │       └── settings-repository.ts
│   │   └── logging/               # Structured Logger with Secret Redaction
│   │       └── app-logger.ts
│   │
│   ├── preload/                   # Sandboxed Preload Script (Isolated Bridge)
│   │   ├── index.ts               # contextBridge.exposeInMainWorld
│   │   └── api.ts                 # Strongly typed window.electronApi implementation
│   │
│   ├── renderer/                  # Sandboxed Chromium UI (React 19 + TypeScript)
│   │   ├── index.html             # Renderer entry HTML with strict CSP meta tag
│   │   ├── src/
│   │   │   ├── main.tsx           # React root mounting
│   │   │   ├── app/               # App layout shell, routing, titlebar
│   │   │   │   ├── App.tsx
│   │   │   │   ├── Layout.tsx
│   │   │   │   └── TitleBar.tsx
│   │   │   ├── features/          # Self-contained feature UI domains
│   │   │   │   ├── chat/          # Streaming chat view, composer, message list
│   │   │   │   │   ├── ChatFeed.tsx
│   │   │   │   │   ├── MessageItem.tsx
│   │   │   │   │   ├── PromptComposer.tsx
│   │   │   │   │   └── TokenStreamView.tsx
│   │   │   │   ├── providers/     # BYOK Dashboard, key entry, health badges
│   │   │   │   │   ├── ProviderDashboard.tsx
│   │   │   │   │   ├── CredentialForm.tsx
│   │   │   │   │   └── HealthBadge.tsx
│   │   │   │   ├── models/        # Model selection and capability filtering
│   │   │   │   │   └── ModelSelector.tsx
│   │   │   │   ├── conversations/ # Sidebar conversation history
│   │   │   │   │   └── ConversationList.tsx
│   │   │   │   ├── agent-activity/# Live agent actions and tool step progress
│   │   │   │   │   ├── ActivityFeed.tsx
│   │   │   │   │   └── StepProgress.tsx
│   │   │   │   ├── permissions/   # Review modals and authorization dialogs
│   │   │   │   │   ├── PermissionModal.tsx
│   │   │   │   │   └── CommandReviewCard.tsx
│   │   │   │   ├── workspace/     # Workspace folder picker and tree view
│   │   │   │   │   ├── WorkspaceSelector.tsx
│   │   │   │   │   └── FileTree.tsx
│   │   │   │   ├── terminal/      # xterm.js interactive terminal component
│   │   │   │   │   ├── TerminalPanel.tsx
│   │   │   │   │   └── TerminalTabs.tsx
│   │   │   │   ├── changes/       # Unified & side-by-side diff review panel
│   │   │   │   │   ├── DiffViewer.tsx
│   │   │   │   │   └── HunkReviewControls.tsx
│   │   │   │   └── settings/      # Privacy, routing policies, data retention
│   │   │   │       ├── SettingsView.tsx
│   │   │   │       └── PrivacySettings.tsx
│   │   │   ├── components/        # Reusable UI primitives (buttons, modals, badges)
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   └── CodeBlock.tsx
│   │   │   ├── hooks/             # Custom React hooks (IPC listeners, shortcuts)
│   │   │   │   ├── useElectronApi.ts
│   │   │   │   ├── useStreamListener.ts
│   │   │   │   └── useKeyboardShortcuts.ts
│   │   │   ├── state/             # Zustand application state stores
│   │   │   │   ├── conversation-store.ts
│   │   │   │   ├── provider-store.ts
│   │   │   │   ├── workspace-store.ts
│   │   │   │   └── terminal-store.ts
│   │   │   └── styles/            # CSS Modules / Global theme styles
│   │   │       ├── theme.css
│   │   │       └── globals.css
│   │
│   └── shared/                    # Universal Contracts, Schemas & Constants
│       ├── contracts/             # TypeScript interfaces for IPC & Providers
│       │   ├── api-contract.ts    # window.electronApi definition
│       │   ├── provider.contract.ts
│       │   ├── agent.contract.ts
│       │   └── terminal.contract.ts
│       ├── schemas/               # Zod validation schemas for all boundaries
│       │   ├── provider.schema.ts
│       │   ├── agent.schema.ts
│       │   ├── permission.schema.ts
│       │   ├── tool.schema.ts
│       │   └── diff.schema.ts
│       ├── domain/                # Shared business entities & type aliases
│       │   ├── models.ts
│       │   ├── errors.ts
│       │   └── permissions.ts
│       ├── events/                # Event channel constant strings
│       │   └── ipc-channels.ts
│       └── constants/             # Application constants and default configs
│           └── defaults.ts
│
└── tests/                         # Comprehensive Automated Test Suites
    ├── unit/                      # Fast in-memory unit tests
    │   ├── providers/
    │   ├── permissions/
    │   ├── diff/
    │   └── workspace/
    ├── integration/               # Multi-component integration tests
    │   ├── provider-failover.test.ts
    │   ├── sqlite-migrations.test.ts
    │   └── agent-tool-loop.test.ts
    ├── security/                  # Dedicated security penetration tests
    │   ├── path-traversal.test.ts
    │   ├── prompt-injection.test.ts
    │   ├── toctou-tampering.test.ts
    │   ├── ipc-boundaries.test.ts
    │   └── secret-redaction.test.ts
    └── e2e/                       # End-to-end Electron tests (Playwright)
        ├── byok-workflow.spec.ts
        ├── chat-streaming.spec.ts
        ├── diff-approval.spec.ts
        └── terminal-session.spec.ts
```

---

## 2. Module Responsibilities & Boundary Enforcement Rules

To prevent architectural drift and security leaks, the codebase enforces strict directional dependency rules:

```
[shared/] <--- [renderer/]
   ^   ^
   |   |
   |   +------ [preload/]
   |
   +---------- [main/]
```

### Mandatory Import Boundary Rules

1. **`src/shared/` is Universal and Pure:**
   - Must NOT import anything from `src/main`, `src/preload`, or `src/renderer`.
   - Must NOT depend on Node.js built-ins (`fs`, `path`, `child_process`) or DOM APIs.
   - May depend only on validation libraries (e.g. `zod`).

2. **`src/renderer/` is Pure Browser Code:**
   - Must NOT import anything from `src/main` or `src/preload`.
   - Must NOT import `electron` or any Node.js module (`fs`, `crypto`, `os`).
   - Interacts with the backend exclusively through `window.electronApi`.
   - Enforced via ESLint rule: `no-restricted-imports: ['fs', 'path', 'child_process', 'electron']`.

3. **`src/preload/` is the Minimal Bridge:**
   - Must NOT import business logic from `src/main`.
   - Imports contract types and Zod schemas from `src/shared`.
   - Exposes only explicit, typed functions on `window.electronApi`.

4. **`src/main/` is the Privileged Orchestrator:**
   - May import from Node.js built-ins, Electron main modules, and `src/shared`.
   - Must NOT import from `src/renderer`.
   - Organizes domain logic into isolated services with dependency injection.

---

## 3. Code Organization & Naming Conventions

* **Files & Directories:** `kebab-case.ts` (e.g., `permission-broker.ts`, `safe-storage.service.ts`).
* **React Components:** `PascalCase.tsx` (e.g., `DiffViewer.tsx`, `ProviderDashboard.tsx`).
* **Interfaces & Contracts:** Prefixed with `I` where distinguishing contracts (e.g., `IProviderAdapter`, `IToolDefinition`), otherwise descriptive noun phrases (e.g., `PermissionRequest`, `ModelDescriptor`).
* **Zod Schemas:** Suffix with `Schema` (e.g., `ProviderCredentialSchema`, `ToolInvocationSchema`).
* **Constants & Enums:** `SCREAMING_SNAKE_CASE` or string unions for strict type narrowing.
