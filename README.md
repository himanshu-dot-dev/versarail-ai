# VersaRail AI Agent Harness

> A production-grade, local-first, developer-centric desktop AI agent workstation built with Electron 45, React 19, Node.js 24, and TypeScript.

---

## 🚦 Project Status & Milestone Roadmap

Current Progress: **7 of 13 Milestones Completed (54%)**  
Test Suite Baseline: **17 Test Files, 70 / 70 Tests Passing (100%)**  
TypeScript Typecheck: **Zero Errors across Node and Web targets**

| Milestone | Status | Description | Key Modules |
| :--- | :---: | :--- | :--- |
| **Milestone 0** | ✅ **Completed** | Inspection, Security Threat Model & Architectural Decisions | `docs/DECISIONS.md`, `docs/SECURITY_THREAT_MODEL.md` |
| **Milestone 1** | ✅ **Completed** | Hardened Electron Shell, Strict CSP, Preload & Typed IPC Bridge | `src/main/index.ts`, `src/preload/index.ts`, `src/main/ipc/` |
| **Milestone 2** | ✅ **Completed** | Local SQLite (`node:sqlite`) Migrations & OS Hardware SafeStorage Keyring | `src/main/storage/`, `src/main/security/safe-storage.service.ts` |
| **Milestone 3** | ✅ **Completed** | BYOK Engine (Gemini, Groq, Cerebras, OpenRouter), Tool Dialect Repair | `src/main/providers/`, `src/renderer/src/features/providers/` |
| **Milestone 4** | ✅ **Completed** | Real-Time Streaming Chat, Run Cancellation & Conversation History | `src/main/agent/agent-runtime.ts`, `src/renderer/src/features/chat/` |
| **Milestone 5** | ✅ **Completed** | Dead-Turn Pre-First-Byte Failover, Context Floor, In-Band Anomaly Detection | `src/main/agent/failover-engine.ts`, `src/main/agent/error-classifier.ts` |
| **Milestone 6** | ✅ **Completed** | Central Tool Registry, Permission Broker, TOCTOU Defenses & Approval Modal | `src/main/tools/`, `src/main/security/permission-broker.ts` |
| **Milestone 7** | ⏳ **NEXT UP** | Workspace Safe Filesystem, Path Canonicalization & Sensitive Exclusions | `src/main/workspace/` |
| **Milestone 8** | ⏳ Pending | Diff-First Editing, Unified Diff Review & Pre-Application Conflict Checks | `src/main/changes/`, `src/renderer/src/features/changes/` |
| **Milestone 9** | ⏳ Pending | Dual Integrated Terminal (Developer xterm.js + Agent Command Runner) | `src/main/terminal/`, `src/renderer/src/features/terminal/` |
| **Milestone 10** | ⏳ Pending | Context Window Management, History Truncation & Observability Feeds | `src/main/agent/context-manager.ts` |
| **Milestone 11** | ⏳ Pending | Electron Security Fuses, Penetration Testing & Full E2E Journey Tests | `tests/security/`, `@electron/fuses` |
| **Milestone 12** | ⏳ Pending | Multi-Platform Packaging (Windows `.exe`, macOS `.dmg`, Linux `.AppImage`) | `electron-builder` |

---

## 🛠️ Developer Commands

```bash
# Run complete test suite (unit, integration, security)
npm test

# Run TypeScript type check across Node (Main/Preload) and Web (Renderer)
npm run typecheck

# Build production bundle using electron-vite
npm run build

# Start local development shell
npm run dev
```

---

## 📜 Architectural Decisions & Security Constraints

- **Developer Git Rule:** **Never execute `git commit` or `git push` autonomously.** All changes remain uncommitted in the working tree for the developer to inspect and commit personally.
- **Zero Native Build Toolchains:** Uses Node 24's built-in `node:sqlite` (`DatabaseSync`) and native `fetch`. Do NOT install C++ addons (`better-sqlite3`, `node-pty`) requiring python/MSBuild.
- **100% Offline Local SVGs:** Uses local Lucide vector components in `Icon.tsx`. Never load remote Google Font CDN stylesheets or font ligatures.
- **OS Hardware Encryption:** API keys are encrypted with OS Keychain via Electron `safeStorage`. Linux `basic_text` fallback is rejected with an in-memory session alert.
- **TOCTOU Defense:** Tool arguments are bound to a deterministic SHA-256 canonical JSON hash (`computePayloadHash`). Any argument tampering between approval and execution raises `ToctouTamperingError` and aborts immediately.

---

## 📚 Architectural Documentation

All detailed specifications are maintained in the [`docs/`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/docs/) directory:
- [`docs/IMPLEMENTATION_PLAN.md`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/docs/IMPLEMENTATION_PLAN.md) — Master implementation plan and task checklist.
- [`docs/DECISIONS.md`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/docs/DECISIONS.md) — Architecture Decision Records (ADR-001 through ADR-010).
- [`docs/SECURITY_THREAT_MODEL.md`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/docs/SECURITY_THREAT_MODEL.md) — Threat vectors, TOCTOU defenses, and IPC sandboxing.
- [`docs/PROVIDER_STRATEGY.md`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/docs/PROVIDER_STRATEGY.md) — Free-tier multi-provider routing and token budgeting.
- [`docs/UI_UX_SPECIFICATION.md`](file:///c:/Users/hs521/Desktop/Devlopment/ai-agent-harness/docs/UI_UX_SPECIFICATION.md) — VersaRail AI design tokens, layout hierarchy, and theme styles.

