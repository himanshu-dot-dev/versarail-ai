# VersaRail AI Agent Harness Desktop Workstation

> A production-grade, local-first, developer-centric desktop AI agent workstation built with Electron 45, React 19, Node.js 24, TypeScript (strict mode), and Tailwind CSS.

---

## 🚦 Project Status: 100% Completed (13 of 13 Milestones)

- **Automated Tests:** **31 Test Files, 144 / 144 Tests Passing (100% Green)** across Unit, Integration, Security, and E2E suites.
- **TypeScript Check:** **Zero errors** across Node (`tsconfig.node.json`) and Web (`tsconfig.web.json`).
- **Production Build:** Clean `electron-vite build` bundle with compile-time security fuses (`@electron/fuses`).

| Milestone | Status | Description | Core Artifacts |
| :--- | :---: | :--- | :--- |
| **Milestone 0** | ✅ **Completed** | Inspection, Security Threat Model & Architectural Decisions | [`docs/DECISIONS.md`](docs/DECISIONS.md), [`docs/SECURITY_THREAT_MODEL.md`](docs/SECURITY_THREAT_MODEL.md) |
| **Milestone 1** | ✅ **Completed** | Hardened Electron Shell, Strict CSP, Preload & Typed IPC Bridge | [`src/main/index.ts`](src/main/index.ts), [`src/preload/index.ts`](src/preload/index.ts), [`src/main/ipc/`](src/main/ipc/) |
| **Milestone 2** | ✅ **Completed** | Local SQLite (`node:sqlite`) Migrations & OS Hardware SafeStorage Keyring | [`src/main/storage/`](src/main/storage/), [`src/main/security/safe-storage.service.ts`](src/main/security/safe-storage.service.ts) |
| **Milestone 3** | ✅ **Completed** | BYOK Engine (Gemini, Groq, Cerebras, OpenRouter), Tool Dialect Repair | [`src/main/providers/`](src/main/providers/), [`src/renderer/src/features/providers/`](src/renderer/src/features/providers/) |
| **Milestone 4** | ✅ **Completed** | Real-Time Streaming Chat, Run Cancellation & Conversation Persistence | [`src/main/agent/agent-runtime.ts`](src/main/agent/agent-runtime.ts), [`src/renderer/src/features/chat/`](src/renderer/src/features/chat/) |
| **Milestone 5** | ✅ **Completed** | Dead-Turn Pre-First-Byte Failover, Context Floor, Live Health Badges | [`src/main/providers/failover-engine.ts`](src/main/providers/failover-engine.ts), [`error-classifier.ts`](src/main/providers/error-classifier.ts) |
| **Milestone 6** | ✅ **Completed** | Central Tool Registry, Permission Broker, TOCTOU Defenses & Approval Modal | [`src/main/tools/`](src/main/tools/), [`src/main/security/permission-broker.ts`](src/main/security/permission-broker.ts) |
| **Milestone 7** | ✅ **Completed** | Workspace Safe Filesystem, Path Canonicalization & Sensitive Exclusions | [`src/main/workspace/`](src/main/workspace/), [`tests/security/path-traversal.test.ts`](tests/security/path-traversal.test.ts) |
| **Milestone 8** | ✅ **Completed** | Diff-First Editing, Unified Diff Review & Pre-Application Conflict Checks | [`src/main/changes/`](src/main/changes/), [`src/renderer/src/features/changes/`](src/renderer/src/features/changes/) |
| **Milestone 9** | ✅ **Completed** | Dual Integrated Terminal (Developer xterm.js + Sandboxed Command Runner) | [`src/main/terminal/`](src/main/terminal/), [`src/main/agent/command-runner.ts`](src/main/agent/command-runner.ts) |
| **Milestone 10** | ✅ **Completed** | Context Window Budgeting, Auto-Summarization & Privacy Retention Purging | [`src/main/agent/context-manager.ts`](src/main/agent/context-manager.ts), [`SettingsView.tsx`](src/renderer/src/features/settings/SettingsView.tsx) |
| **Milestone 11** | ✅ **Completed** | Electron Security Fuses, Penetration Testing & Full E2E Journey Suites | [`src/main/security/fuses.ts`](src/main/security/fuses.ts), [`tests/e2e/`](tests/e2e/) |
| **Milestone 12** | ✅ **Completed** | Production Packaging, Cross-Platform Bundler & Architecture Docs | [`electron-builder.yml`](electron-builder.yml), [`scripts/after-pack.js`](scripts/after-pack.js) |

---

## 🏗️ Architecture & Core Innovations

```
                                  +------------------------------------+
                                  |     React 19 Renderer (UI Shell)   |
                                  |   - Dark VersaRail Design Tokens   |
                                  |   - 100% Offline Vector SVGs       |
                                  |   - DiffViewer & Terminal Panels   |
                                  +-----------------+------------------+
                                                    | (contextIsolation, sandbox)
                                                    v
                                  +------------------------------------+
                                  |     Preload Typed API Bridge       |
                                  |   (SenderVerifier & Zod Contracts) |
                                  +-----------------+------------------+
                                                    |
                                                    v
+-------------------------------------------------------------------------------------------------------+
|                                    Main Process (Node.js 24)                                          |
|                                                                                                       |
|  +------------------------+   +-------------------------+   +--------------------------------------+  |
|  |     Agent Runtime      |   |    Permission Broker    |   |           Workspace Engine           |  |
|  | - Streaming Chat Loop  |   | - Capability Checks     |   | - Realpath Canonicalization          |  |
|  | - Failover Engine      |   | - SHA-256 TOCTOU Guard  |   | - Traversal & Symlink Defense        |  |
|  | - Context Window Mgr   |   | - Interactive Review    |   | - Sensitive Exclusions (.env, .git)  |  |
|  +-----------+------------+   +------------+------------+   +-------------------+------------------+  |
|              |                             |                                    |                     |
|              v                             v                                    v                     |
|  +------------------------+   +-------------------------+   +--------------------------------------+  |
|  |   Multi-Provider BYOK  |   |    Dual Terminal Subsys |   |          Diff-First Engine           |  |
|  | - Gemini, Groq, Cereb. |   | - User interactive xterm|   | - Unified Patch Generation           |  |
|  | - In-Band Repair       |   | - Agent runner + tree-  |   | - Pre-Commit Disk Conflict Check     |  |
|  | - Cooldown ETAs        |   |   kill & redaction      |   | - Atomic Writer (fsync + rename)     |  |
|  +-----------+------------+   +-------------------------+   +--------------------------------------+  |
|              |                                                                                        |
|              +--------------------------+-------------------------------------------------------------+
|                                         |
|                                         v
|                     +---------------------------------------+
|                     |       Local SQLite Persistence        |
|                     |  - Node 24 Built-in (node:sqlite)     |
|                     |  - WAL Mode & Atomic Migrations       |
|                     |  - OS Hardware Keyring (safeStorage)  |
|                     +---------------------------------------+
+-------------------------------------------------------------------------------------------------------+
```

### 1. Zero Native Build Toolchains
- Uses Node.js 24's built-in `node:sqlite` (`DatabaseSync`) and native `fetch`.
- **Zero C++ compilation:** Eliminates MSBuild, Python, or node-gyp build failures on Windows.

### 2. OS Hardware SafeStorage Keyring
- API keys are encrypted with the host OS Keychain via Electron `safeStorage`.
- Plaintext API keys are never stored on disk or sent to the renderer process.
- Rejects Linux `basic_text` unencrypted salt fallback with an in-memory session alert.

### 3. TOCTOU (Time-of-Check to Time-of-Use) Cryptographic Defense
- Tool execution parameters are bound to a deterministic SHA-256 canonical payload hash.
- If tool arguments mutate between user review/approval and execution, the harness raises `ToctouTamperingError` and terminates immediately.

### 4. Dead-Turn Pre-First-Byte Failover
- If a provider triggers a rate limit (429), server error (503), or timeout *before* the first token renders on screen, the harness switches to a healthy fallback provider transparently.
- Once tokens are rendered, silent failover is prohibited to prevent stream corruption; instead, an interactive notice pill is displayed.

### 5. Diff-First Mutation Engine & Conflict Detection
- The agent cannot overwrite files blindly.
- Inspects target files, verifies baseline SHA-256 hashes, generates unified diffs for developer review, and commits atomically using temporary files and `fsync`.
- External file modifications during review trigger immediate conflict detection.

### 6. Dual-Path Terminal Architecture
- **Interactive Developer Terminal:** High-performance xterm.js canvas connected to the native system shell.
- **Agent Command Runner:** Sandboxed process execution using structured argument arrays, 1MB output caps, strict timeouts, secret pattern redaction, and recursive process-tree termination via `tree-kill`.

### 7. Compile-Time Security Fuses
- Packed binaries enforce Electron security fuses: `RunAsNode: false`, `OnlyLoadAppFromAsar: true`, `EnableNodeCliInspectArguments: false`, and `EnableEmbeddedAsarIntegrityValidation: true`.
- Zero external CDN dependencies; 100% offline local Lucide vector icons and typography.

---

## 🚀 Quick Start & Development

### Prerequisites
- Node.js >= 24.0.0
- npm >= 10.0.0

```bash
# Clone the repository
git clone https://github.com/himanshu-dot-dev/versarail-ai.git
cd versarail-ai

# Install dependencies (pure JS, zero native toolchain builds)
npm install

# Start local development workstation
npm run dev
```

---

## 🧪 Testing & Verification

```bash
# Run complete test suite (Unit, Integration, Security, E2E)
npm test

# Run TypeScript strict type check across all processes
npm run typecheck

# Build production bundle with electron-vite
npm run build

# Run specific test suites
npx vitest run tests/security/    # Security penetration tests
npx vitest run tests/e2e/         # End-to-end user journey tests
npx vitest run tests/unit/        # Unit test suites
```

---

## 📦 Multi-Platform Packaging

Packaged binaries are configured via `electron-builder.yml` and automatically flip security fuses via `scripts/after-pack.js`:

```bash
# Package for the current operating system
npm run package

# Build directory (unpacked for fast testing)
npm run package:dir

# Build Windows NSIS installer and portable executable
npm run package:win

# Build macOS DMG and ZIP with hardened runtime
npm run package:mac

# Build Linux AppImage and DEB package
npm run package:linux
```

---

## 🔒 Security Policies & Constraints

1. **User Git Control Policy:** The agent will **never** autonomously execute `git commit` or `git push`. All modifications remain in the working tree for the developer to inspect and stage personally.
2. **Offline-First:** All assets, fonts, and icons are bundled locally. The production renderer operates under `connect-src 'none'`.
3. **Least Privilege IPC:** Untrusted origins, frame sender spoofing, and unknown channels are rejected at the IPC boundary.

---

## 📚 Technical Documentation

- [`docs/DECISIONS.md`](docs/DECISIONS.md): Architecture Decision Records (ADR-001 through ADR-010).
- [`docs/SECURITY_THREAT_MODEL.md`](docs/SECURITY_THREAT_MODEL.md): Threat modeling, STRIDE analysis, and mitigations.
- [`docs/PROVIDER_STRATEGY.md`](docs/PROVIDER_STRATEGY.md): Free-tier provider routing, token budgeting, and concurrency leases.
- [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md): Multi-layer testing pyramid and manual platform checklist.
- [`docs/UI_UX_SPECIFICATION.md`](docs/UI_UX_SPECIFICATION.md): VersaRail AI visual design blueprint and layout structure.
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md): Completed 13-milestone implementation plan.

---

*Copyright © 2026 VersaRail AI. Built with precision and security.*
