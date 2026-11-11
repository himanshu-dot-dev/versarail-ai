# VersaRail AI

> A local-first desktop AI coding & multi-provider workstation built with Electron 45, React 19, TypeScript, Tailwind CSS, and Node.js 24 (`node:sqlite`).

VersaRail AI brings multiple cloud, free-tier, and local AI providers into a single desktop workspace where you can chat with your codebase, review diff-first file edits, approve commands safely, and track per-provider token capacity and usage locally.

---

## ✨ What VersaRail AI Does

### 1. Multi-Provider Chat & Automatic Failover
- **13 Supported Provider Adapters**: Google Gemini, Groq, Cerebras, OpenRouter, Mistral, NVIDIA NIM, Cohere, DeepSeek, Cloudflare Workers AI, Hugging Face, Custom OpenAI-compatible endpoints (e.g., Ollama / LM Studio), plus keyless Pollinations & Kilo Gateway.
- **Auto-Switch Free Mesh (`AI Agent`)**: Automatically rotates across healthy configured providers and falls back transparently if an upstream endpoint hits rate limits (`429`) or transient server errors (`5xx`) before streaming starts.
- **OS-Encrypted Credentials**: API keys are encrypted on disk using your operating system's keyring via Electron `safeStorage` (DPAPI on Windows, Keychain on macOS, Secret Service on Linux) and never exposed in plaintext to the renderer UI.

### 2. Per-Provider & Per-Model Token Calculator (`Usage & Quotas`)
- **Monthly Free-Tier Budget Aggregation**: Calculates your combined monthly free-tier token headroom across enabled API keys while deduplicating shared account pools (`gemini::ai-studio`, `cerebras::shared`, `openrouter::free`, etc.).
- **Actual Usage Tracking**: Captures upstream prompt/completion token counts (`usageMetadata` / OpenAI SSE `include_usage`) with automatic local estimation fallback (`token_usage_logs` in SQLite), showing 24-hour and monthly input/output totals and remaining free capacity per provider and per model.
- **Live Provider Health**: Surfaces active cooldown timers, rate-limit states, and failover status per endpoint.

### 3. Workspace-Aware Coding Agent (`Chat`)
- **Built-In Developer Tools**: `read_file`, `write_file`, `edit_file`, `list_directory`, `file_search`, `execute_command`, `web_search`, and `task_complete`.
- **Interactive Workspace Controls**: Open any local folder, reference files directly with `@` mentions, inspect workspace files/activity/pending changes in the right-hand Inspector, and manage multiple conversations persisted in SQLite.

### 4. Security-First Execution Boundaries
- **Permission Broker & TOCTOU Protection**: File writes/deletes and shell commands pass through capability authorization bound to a SHA-256 payload hash (`PermissionBroker`), blocking tampered parameters between approval and execution.
- **Diff-First File Safety**: Computes unified diffs and conflict checks before touching workspace files, with canonical path checks and sensitive-file exclusions (`.env`, `.git`, `.ssh`).
- **Hardened Electron Shell**: Sandboxed renderer (`contextIsolation: true`, `nodeIntegration: false`, `connect-src 'none'` in production), strict IPC origin verification (`SenderVerifier`) + Zod validation, bundled offline Lucide SVG icons (zero CDN requests), and compile-time Electron security fuses (`@electron/fuses`).

---

## 🖥️ Inside the App

| View | Purpose |
| :--- | :--- |
| **Chat** | Multi-conversation AI agent workspace with tool execution, `@` file mentions, streaming markdown/code diffs, and inspector panel. |
| **AI Providers** | Add, edit, test, enable/disable provider API keys and custom endpoints with masked key display and live connection health. |
| **Usage & Quotas** | Monthly free-tier token budget calculator across providers/models, 24h & monthly token breakdown, and endpoint health status. |
| **Settings** | Theme selection, workspace provider privacy allowlist, data retention / SQLite database purge, and app diagnostics. |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** `>= 24.0.0` (uses built-in `node:sqlite` — **no Python, MSBuild, or native C++ addons required**)
- **npm** `>= 10.0.0`

### Install & Run Locally
```bash
git clone https://github.com/himanshu-dot-dev/versarail-ai.git
cd versarail-ai

npm install
npm run dev
```

### Build & Verify
```bash
# TypeScript strict check (Main, Preload, Shared, Renderer)
npm run typecheck

# Run full Vitest suite (Unit, Integration, Security, Bundle tests)
npm test

# Build production Electron bundle into out/
npm run build
```

### Packaging Desktop Installers
Configured via [`electron-builder.yml`](electron-builder.yml) and [`scripts/after-pack.js`](scripts/after-pack.js) (make sure `electron-builder` is installed before running):
```bash
npm run package:dir    # Unpacked directory build for local verification
npm run package:win    # Windows NSIS installer + Portable (.exe)
npm run package:mac    # macOS DMG + ZIP (x64 & arm64)
npm run package:linux  # Linux AppImage + DEB
```

---

## 📁 Project Structure

```
src/
├── main/        # Electron main process (SQLite storage, safeStorage, providers, failover, agent tools, IPC)
├── preload/     # Context-isolated window.electronApi bridge
├── renderer/    # React 19 + Tailwind CSS UI (Chat, AI Providers, Usage & Quotas, Settings)
└── shared/      # Shared TypeScript domain DTOs, IPC channel constants, and Zod schemas
tests/           # Vitest unit, integration, security, and production bundle test suites
resources/       # App icons & macOS entitlements
scripts/         # Post-pack Electron security fuse script
```

---

## 📚 Additional Technical Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Electron process boundaries and execution architecture.
- [`docs/SECURITY_THREAT_MODEL.md`](docs/SECURITY_THREAT_MODEL.md) — Threat model, trust boundaries, and security controls.

---

*Copyright © 2026 VersaRail AI.*
