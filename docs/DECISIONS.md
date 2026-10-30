# Architecture Decision Records (ADRs)

| ADR ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| **ADR-001** | Build Tooling & Multi-Process Bundling (`electron-vite`) | Accepted | 2026-10-29 |
| **ADR-002** | Local Persistence Engine: Node.js Built-in `node:sqlite` (`DatabaseSync`) | Accepted | 2026-10-29 |
| **ADR-003** | Provider Adapter Architecture: Unified Interface with Official & OpenAI-Compatible Clients | Accepted | 2026-10-29 |
| **ADR-004** | Dual Terminal Architecture: Interactive PTY vs. Structured Agent Command Runner | Accepted | 2026-10-29 |
| **ADR-005** | Credential Security: Electron `safeStorage` Async API with Plaintext Fallback Refusal | Accepted | 2026-10-29 |
| **ADR-006** | Diff-First Mutation Engine: Content-Hashed Unified Diffs & Atomic Commits | Accepted | 2026-10-29 |
| **ADR-007** | Permission Broker: Capability-Based, In-Code Authorization with TOCTOU Protection | Accepted | 2026-10-29 |
| **ADR-008** | Electron Security Hardening: Context Isolation, Restrictive CSP, Fuses, and Custom Protocol | Accepted | 2026-10-29 |
| **ADR-009** | Dead-Turn Stream Integrity & Transparent Pre-First-Byte Failover | Accepted | 2026-10-30 |
| **ADR-010** | Universal OpenAI-Compatible Base Adapter & In-Band Error Detection | Accepted | 2026-10-30 |

---

## ADR-001: Build Tooling & Multi-Process Bundling (`electron-vite`)

### Context
Electron applications consist of three distinct runtime environments:
1. **Main Process** (Node.js runtime, privileged OS access)
2. **Preload Scripts** (Isolated Node/Chromium bridge, narrow `contextBridge`)
3. **Renderer Process** (Chromium web environment, React DOM, sandboxed)

Traditional bundlers (Webpack, standard Vite with complex plugin chains, Electron Forge) often mix configuration concerns, create module boundary leaks (e.g. leaking Node packages into the browser bundle), or introduce slow development reload cycles.

### Decision
Adopt **`electron-vite`** with React and TypeScript.
- Uses `electron.vite.config.ts` with distinct configurations for `main`, `preload`, and `renderer`.
- Automatically externalizes Node.js built-in modules and runtime native dependencies in `main` and `preload` via `externalizeDepsPlugin`.
- Enables lightning-fast HMR in the React renderer without restarting the main process.
- Produces clean, isolated build artifacts in `out/main`, `out/preload`, and `out/renderer`.

### Consequences & Trade-offs
- **Pros:** Fast build times, zero configuration collision between browser and Node environments, out-of-the-box TypeScript support.
- **Cons:** Configuration is tied to `electron-vite` conventions; custom Rollup plugins must be declared in their respective process targets.

---

## ADR-002: Local Persistence Engine: Node.js Built-in `node:sqlite` (`DatabaseSync`)

### Context
Desktop developer tools require fast, relational, structured local persistence for conversations, messages, provider configuration metadata, tool audit logs, and permission policies.
Historically, Electron applications used third-party native C++ addons such as `better-sqlite3` or `sqlite3`. However:
1. Native C++ addons require matching Node/Electron ABIs via `@electron/rebuild`.
2. Windows host machines lacking Visual Studio C++ Build Tools and Python will fail during `npm install` or native module compilation.
3. Node.js 22+ and 24+ embed **`node:sqlite`** natively with `DatabaseSync`, compiled directly into the Node binary distributed with Electron.

### Decision
Use **`node:sqlite` (`DatabaseSync`)** in the Electron Main process for all structured relational data persistence, paired with a custom lightweight migration runner.

### Alternatives Considered
- `better-sqlite3`: Rejected due to native compilation dependencies (`node-gyp`, MSBuild, Python) that cause build fragility on developer machines lacking C++ toolchains.
- `sql.js` (WASM SQLite): Pure JavaScript/WASM, but requires manual memory management, lacks write-ahead logging (WAL), and writes entire database buffers on save, risking data corruption during sudden desktop app termination.
- Flat JSON files: Unsuitable for concurrent access, transactional safety, indexing, or structured relational audit logging.

### Consequences & Trade-offs
- **Pros:** Zero native compilation or rebuild requirements; 100% portable across Windows, macOS, and Linux; built directly into Node/Electron; synchronous prepared statements prevent race conditions in main process state transitions.
- **Cons:** Synchronous execution blocks the event loop if queries are massive; mitigated by keeping schema indexed, database file local (NVMe/SSD), and offloading heavy queries to a Worker Thread if ever required.

---

## ADR-003: Provider Adapter Architecture: Unified Interface with Official & OpenAI-Compatible Clients

### Context
The application must support multiple AI providers (Google Gemini, Groq, Cerebras, OpenRouter, and custom endpoints) with automatic failover, capability detection, model discovery, rate limit backoff, and granular error classification.
Adopting high-level monolithic agent frameworks (such as LangChain or unmanaged Vercel AI SDK wrappers) would abstract away HTTP status codes, raw `Retry-After` headers, and low-level stream lifecycle hooks required for deterministic failover.

### Decision
Implement a custom, strongly typed **`IProviderAdapter`** contract in the Main Process.
- Each provider implements:
  - `id`: Unique identifier (e.g., `gemini`, `groq`, `cerebras`, `openrouter`)
  - `capabilities`: Explicit capability flags (context limits, tool calling, streaming, structured outputs)
  - `validateCredential(key: string)`: Live API authentication check
  - `listModels(key: string)`: Dynamic model discovery and metadata retrieval
  - `streamChat(request, callbacks, signal)`: Native token and tool-call streaming
  - `mapError(error)`: Maps provider-specific exceptions to `NormalizedProviderError` (e.g. `RateLimitExceeded`, `QuotaExhausted`, `AuthenticationFailed`, `ContextLengthExceeded`)
- Provider adapters use the official `@google/genai` SDK for Gemini, and official or lightweight OpenAI-compatible clients for Groq, Cerebras, and OpenRouter.

### Consequences & Trade-offs
- **Pros:** Full visibility into HTTP headers (`x-ratelimit-*`, `retry-after`), total control over tool-argument stream chunk assembly, zero unnecessary runtime dependencies, easy addition of new providers.
- **Cons:** Requires maintaining provider error mappings and schema adapters internally.

---

## ADR-004: Dual Terminal Architecture: Interactive PTY vs. Structured Agent Command Runner

### Context
Developers need an interactive terminal shell (e.g., PowerShell, bash, zsh) to run their own commands freely. Simultaneously, the AI agent needs to execute terminal commands (e.g., running tests, inspecting git status, building packages) under strict permission review.
Attempting to merge these into a single shared terminal session creates critical security vulnerabilities:
1. Prompt injection could silently send escape sequences or commands into the user's active session.
2. Background agent output would collide with interactive user keystrokes.
3. Parsing command exit codes and output from an interactive PTY buffer is non-deterministic.

### Decision
Strictly separate the terminal subsystem into two distinct architectures:
1. **User Interactive Terminal (`UserTerminalService`):**
   - Integrates `@xterm/xterm` in the React frontend with Fit and WebLinks addons.
   - Connected to an interactive shell in the Main process via IPC streaming.
   - Designed for human developer typing; never accepts programmatic injection from the AI model.
2. **Agent Command Runner (`AgentCommandRunner`):**
   - Uses structured execution (`executable`, `args[]`, `cwd`, sanitized `env`, `timeoutMs`).
   - Routes every command through the `PermissionBroker` before execution.
   - Employs Node's `child_process.spawn` (not raw `exec` shell string expansion) wherever possible to prevent shell injection.
   - Enforces execution timeouts, output buffer caps (e.g. 1MB max), process tree termination (`tree-kill`), and strict exit-code capture.
   - Redacts detected secret patterns from output before returning to model context or writing audit logs.

### Consequences & Trade-offs
- **Pros:** Eliminates silent command injection; deterministic agent output capture; independent lifecycle management.
- **Cons:** Agent cannot directly interact with ncurses/TUI prompts without dedicated input handling.

---

## ADR-005: Credential Security: Electron `safeStorage` Async API with Plaintext Fallback Refusal

### Context
API keys provided by developers (BYOK) are high-value credentials. They must never be saved in plaintext JSON files, SQLite tables, or exposed to the renderer.
Electron provides `safeStorage`, which wraps OS-level cryptographic primitives:
- Windows: DPAPI (Data Protection API)
- macOS: Keychain Access
- Linux: Secret Service / Keyring (`kwallet`, `gnome-libsecret`)
On Linux, if no keyring daemon is running, Electron silently falls back to a hardcoded plaintext password (`basic_text`), rendering encryption illusory.

### Decision
1. Implement a trusted `SecretStorageService` in the Main Process using the asynchronous `safeStorage.encryptStringAsync()` and `safeStorage.decryptStringAsync()` APIs.
2. Store encrypted blobs in a dedicated secure store; never expose decrypted keys to the Renderer Process.
3. **Strict Linux Fallback Refusal:** During initialization, call `safeStorage.getSelectedStorageBackend()`. If it returns `basic_text`, refuse to persist keys to disk. Prompt the user to either configure a desktop keyring or use Session-Only in-memory credentials.
4. Redact credential patterns from all application logs, error payloads, and renderer events.

### Consequences & Trade-offs
- **Pros:** Leverages native OS hardware-backed cryptographic hardware where available; prevents plaintext leakage; enforces uncompromising security on Linux.
- **Cons:** Users on minimal Linux window managers without a keyring must provide keys per session or install `gnome-keyring`/`kwallet`.

---

## ADR-006: Diff-First Mutation Engine: Content-Hashed Unified Diffs & Atomic Commits

### Context
When an AI agent modifies codebase files, blind writes or whole-file overwrites create high risks of data loss, destructive race conditions, or silent overwrites of concurrent user edits.

### Decision
Implement a mandatory, reviewable diff-first pipeline:
1. **Pre-read & Hash:** The agent reads the target file; the system computes a SHA-256 hash of the content and records the file metadata.
2. **Patch Generation:** The agent proposes a unified diff or targeted hunk modifications.
3. **Pre-Application Conflict Check:** Before presenting the diff or applying it, the system re-reads the disk file. If the current hash does not match the baseline hash (file modified externally), a conflict is flagged and the patch is aborted.
4. **Interactive Review:** The user reviews side-by-side or unified diffs in the React UI with clear visual indicators of additions, deletions, and context.
5. **Atomic Application:** Approved patches are applied using atomic write operations (write to temporary sibling file + fsync + atomic rename) to eliminate partial-write corruption.
6. **Change Journal:** Every applied mutation is logged to a local SQLite change journal with the previous content hash, enabling rollback/recovery even in non-Git repositories.

### Consequences & Trade-offs
- **Pros:** Guarantees zero silent overwrites; full developer transparency; atomic crash safety; auditable change log.
- **Cons:** Requires explicit user approval for each hunk/file mutation unless the user has explicitly configured an automated policy for a specific session scope.

---

## ADR-007: Permission Broker: Capability-Based, In-Code Authorization with TOCTOU Protection

### Context
Prompt injection is an inherent property of Large Language Models. Model system prompts ("You must never access files outside the project") cannot serve as security boundaries. Security must be enforced in compiled application code.
Furthermore, Time-of-Check to Time-of-Use (TOCTOU) bugs occur if an approval is granted for an operation, but the underlying parameters (file path, command string, patch content) are mutated before execution.

### Decision
Implement a centralized, trusted `PermissionBroker` in the Main Process:
- Every privileged tool invocation creates an immutable `PermissionRequest` with a cryptographically secure random ID, capability tag (e.g., `fs:read`, `fs:write`, `cmd:exec`), normalized target path, and argument payload hash.
- Approvals are cryptographically tied to the exact payload hash. If arguments change, the approval token is invalid.
- Path operations must resolve to real canonical paths (`fs.realpathSync`) inside the registered workspace root, rejecting path traversal (`../`), symlink escapes, and null-byte injections.
- Default policy is **Least Privilege / Ask Every Time** for destructive operations (`fs:write`, `cmd:exec`).

### Consequences & Trade-offs
- **Pros:** Non-bypassable security; immune to prompt injection attacks; resistant to TOCTOU tampering.
- **Cons:** Requires well-designed UX so permission dialogs remain informative without causing developer approval fatigue.

---

## ADR-008: Electron Security Hardening: Context Isolation, Restrictive CSP, Fuses, and Custom Protocol

### Context
Electron applications are vulnerable to remote code execution (RCE) if renderer security controls are misconfigured or untrusted web content is loaded into privileged contexts.

### Decision
Apply all 19 recommendations from the official Electron Security Guide and flip compile-time fuses:
1. `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`.
2. Restrictive Content Security Policy (CSP):
   ```
   default-src 'none';
   script-src 'self';
   style-src 'self' 'unsafe-inline';
   img-src 'self' data:;
   font-src 'self';
   connect-src 'none';
   ```
   *(All provider requests are dispatched exclusively from the Main Process, so the Renderer requires zero external `connect-src`).*
3. Register a secure custom privileged protocol (`app://`) to serve production renderer assets instead of the dangerous `file://` protocol.
4. Flip Electron fuses via `@electron/fuses`:
   - `RunAsNode: false`
   - `EnableNodeOptionsEnvironmentVariable: false`
   - `EnableNodeCliInspectArguments: false`
   - `OnlyLoadAppFromAsar: true`
   - `EnableEmbeddedAsarIntegrityValidation: true`
5. Strict navigation & new-window policy: Block all in-app navigation and open verified HTTPS links exclusively in the default external system browser via `shell.openExternal`.

### Consequences & Trade-offs
- **Pros:** Eliminates XSS-to-RCE vectors; blocks unauthorized protocol abuse; protects application binary integrity.
- **Cons:** Requires routing all external network operations through Main IPC channels; inline scripts are strictly prohibited.

---

## ADR-009: Dead-Turn Stream Integrity & Transparent Pre-First-Byte Failover

### Context
When auto-failover is triggered during streaming chat, a critical architectural challenge arises:
If the primary provider fails (e.g. rate limit 429, first-byte timeout, or network disconnect) *before any token has been delivered to the user*, the request can be retried with the secondary provider completely invisibly.
However, if tokens have *already* been rendered on screen, silently rerouting the entire prompt to a second model would cause duplicated responses, jarring layout shifts, or conflicting tool calls.

### Decision
Adopt a **Two-Phase Stream Turn-Integrity Protocol**:
1. **Phase 1: Pre-First-Byte (Transparent Dead-Turn Recovery):**
   - The stream manager tracks `hasStreamedFirstByte: boolean`.
   - If an error (HTTP 429, timeout, network failure, or in-band error) occurs before the first chunk is emitted to the IPC channel, the engine cancels the failed stream and immediately dispatches the request to the next eligible fallback model in the chain.
   - The user experiences zero interruption or error notifications—the failover is completely transparent.
2. **Phase 2: Post-First-Byte (Explicit Stream Interruption):**
   - If a stream breaks *after* tokens have started rendering, the stream manager halts and displays an inline recovery pill:
     `"Stream interrupted (Groq 429). [Resume with Gemini 2.5] [Retry]"`
   - Clicking Resume passes the partial generation and conversation context to the fallback provider without duplicating previous text.

### Consequences & Trade-offs
- **Pros:** 100% seamless failover for 95%+ of rate-limit cases (which happen at the handshake/dispatch stage); zero risk of text scrambling or duplicated tool execution.
- **Cons:** Requires buffering the first chunk before committing the stream to the UI view.

---

## ADR-010: Universal OpenAI-Compatible Base Adapter & In-Band Error Detection

### Context
The vast majority of modern fast AI providers (Groq, Cerebras, OpenRouter, DeepSeek, Together, Mistral, and local Ollama) adhere to the standard OpenAI `/v1/chat/completions` API specification with Server-Sent Events (`data: {...}`).
However, free and community endpoints frequently introduce two major failure modes:
1. **In-Band Errors:** Returning HTTP 200 OK while returning an error message in the payload (e.g., `"insufficient credits"`, `"rate limit exceeded"`, or `"model overloaded"`).
2. **Tool-Call Dialect Quirks:** Emitting markdown-fenced JSON or trailing syntax errors in tool arguments.

### Decision
Implement a shared **`OpenAICompatAdapter`** base class in `src/main/providers/` that:
1. Handles standard SSE event parsing, auth headers, and model discovery (`GET /models`).
2. Implements **In-Band Anomaly Detection**: inspects the initial completion chunk for credit/rate-limit error signatures and reclassifies them as retryable errors.
3. Implements **Tool Call Argument Repair**: sanitizes markdown code fences (````json ... ````) and minor JSON formatting errors before forwarding arguments to the central permission broker.
4. Allows concrete providers (Groq, Cerebras, OpenRouter, Ollama) to inherit all streaming, tool assembly, and error handling with under 30 lines of provider-specific configuration.

### Consequences & Trade-offs
- **Pros:** Drastically reduces code duplication; adding new OpenAI-compatible providers becomes trivial; robustly protects against free-tier in-band error false positives.
- **Cons:** Minor overhead from running regex checks on the first chunk of a response.
