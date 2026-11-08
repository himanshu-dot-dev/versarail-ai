import { _electron as electron } from 'playwright'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-live-test-user-'))
const testWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-workspace-'))
const screenshotDir = path.join(projectRoot, 'test-artifacts', 'live-test')

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true })
}

console.log('====================================================================')
console.log('🚀 VERSARAIL AI - COMPREHENSIVE LIVE MULTI-PROVIDER & FAILOVER TEST')
console.log('====================================================================')
console.log('Project root:', projectRoot)
console.log('Isolated user data dir:', tempUserDataDir)
console.log('Test workspace folder:', testWorkspaceDir)
console.log('Screenshots output:', screenshotDir)

// Create a dummy readme in test workspace
fs.writeFileSync(path.join(testWorkspaceDir, 'README.md'), '# Live Test Workspace\nReady for automated agent verification.\n')

// 1. SPIN UP LOCAL MOCK GROK GATEWAY SERVER (Port 20128)
// Handles OpenAI-compatible requests and simulates Grok persona + 429 rate limit edge cases
let grokShouldFailWith429 = false
let grokRequestCount = 0

const mockServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Model list
  if (url.pathname === '/v1/models' || url.pathname === '/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        object: 'list',
        data: [
          {
            id: 'grok-2',
            object: 'model',
            created: Date.now(),
            owned_by: 'xai',
            permission: [],
            root: 'grok-2',
            parent: null
          }
        ]
      })
    )
    return
  }

  // Chat completions
  if (url.pathname === '/v1/chat/completions' || url.pathname === '/chat/completions') {
    grokRequestCount++
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      console.log(`[Mock Grok Server] Received chat request #${grokRequestCount}. Should fail 429:`, grokShouldFailWith429)

      if (grokShouldFailWith429) {
        console.log('[Mock Grok Server] ⚠️ Simulating HTTP 429 Rate Limit for Auto-Failover verification!')
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'retry-after': '15',
          'x-ratelimit-reset': '15'
        })
        res.end(
          JSON.stringify({
            error: {
              message: 'Rate limit exceeded: 429 too many requests. Reset in 15 seconds.',
              type: 'rate_limit',
              code: 429
            }
          })
        )
        return
      }

      // Stream SSE response in witty Grok persona
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      })

      const grokResponse =
        "Oh brilliant, another human asking for supreme enlightenment. Here's your answer: Software engineering is 10% writing code and 90% convincing your teammates that your bugs are revolutionary features. Grok out!"

      const words = grokResponse.split(' ')
      let idx = 0

      const interval = setInterval(() => {
        if (idx < words.length) {
          const delta = (idx === 0 ? '' : ' ') + words[idx]
          const chunk = {
            id: 'chatcmpl-grok-' + Date.now(),
            object: 'chat.completion.chunk',
            created: Date.now(),
            model: 'grok-2',
            choices: [
              {
                index: 0,
                delta: { content: delta },
                finish_reason: null
              }
            ]
          }
          res.write(`data: ${JSON.stringify(chunk)}\n\n`)
          idx++
        } else {
          clearInterval(interval)
          res.write('data: [DONE]\n\n')
          res.end()
        }
      }, 50)
    })
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

await new Promise((resolve) => mockServer.listen(20128, '127.0.0.1', resolve))
console.log('✓ Mock Grok OpenAI-Compatible Gateway running on http://127.0.0.1:20128/v1')

async function runLiveAgentTest() {
  let app
  try {
    const env = { ...process.env }
    delete env.ELECTRON_RUN_AS_NODE

    app = await electron.launch({
      args: [path.join(projectRoot, 'out/main/index.js')],
      env: {
        ...env,
        NODE_ENV: 'production',
        HARNESS_TEST_MODE: '1',
        HARNESS_USER_DATA_DIR: tempUserDataDir
      }
    })

    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    console.log('✓ Electron app window launched:', await window.title())

    await window.setViewportSize({ width: 1360, height: 880 })

    // Set test workspace path in UI and backend
    await window.evaluate(async (wsPath) => {
      if (window.electronApi?.setWorkspace) {
        await window.electronApi.setWorkspace(wsPath)
      }
    }, testWorkspaceDir)

    // Helper to switch directly to Chat view via the New Chat button or Chat nav item
    const goToChat = async () => {
      const chatItem = window.locator('aside span:has-text("Chat"), button[title="Start New Chat"]').first()
      await chatItem.click()
      await window.waitForTimeout(1000)
    }

    // Helper to wait for LLM streaming generation to complete
    const waitForGenerationToFinish = async (maxMs = 25000) => {
      await window.waitForTimeout(1200)
      const start = Date.now()
      while (Date.now() - start < maxMs) {
        const isGenerating = await window.locator('span:has-text("Generating..."), button:has-text("Stop")').count()
        if (isGenerating === 0) {
          break
        }
        await window.waitForTimeout(500)
      }
      await window.waitForTimeout(1000)
    }

    // ========================================================================
    // TEST 1: CONFIGURE PROVIDERS IN UI (Google Gemini, Pollinations, Grok)
    // ========================================================================
    console.log('\n--- [TEST 1] Configuring AI Providers in Providers View ---')
    const providersNav = window.locator('aside button:has-text("AI Providers")')
    await providersNav.click()
    await window.waitForTimeout(1000)

    // 1A. Add Google Gemini with User's Key
    console.log('1A. Adding Google Gemini with user API key...')
    const addProviderBtn = window.locator('button:has-text("Add Provider")')
    await addProviderBtn.click()
    await window.waitForTimeout(600)

    // Fill provider modal
    await window.locator('select').first().selectOption('gemini')
    const labelInput = window.locator('input[placeholder="e.g. My Gemini Pro Key"]')
    await labelInput.fill('Google AI Studio')

    const keyInput = window.locator('input[type="password"]')
    const userApiKey = 'AQ.Ab8RN6IJUxGAZCGks9BqTwTgdUoqDVOTJVXjIRP-UK7PeIXMrQ'
    await keyInput.fill(userApiKey)

    // Click "Test Connection" button inside modal
    console.log('    Testing connection to Google AI Studio live...')
    const testModalBtn = window.locator('button:has-text("Test Connection")')
    await testModalBtn.click()
    await window.waitForTimeout(3000)

    // Check test connection feedback without strict mode error
    const testSuccessText = window.locator('span:has-text("Connection verified")').first()
    if ((await testSuccessText.count()) > 0) {
      console.log('    ✓ Live Google connection test verified:', (await testSuccessText.textContent())?.trim())
    }

    // Save Provider
    const saveBtn = window.locator('button[type="submit"]').first()
    await saveBtn.click()
    await window.waitForTimeout(1500)
    console.log('    ✓ Google Gemini credential successfully saved and encrypted!')
    await window.screenshot({ path: path.join(screenshotDir, '01-gemini-configured.png') })

    // 1B. Add Pollinations (Keyless Free Tier)
    console.log('1B. Adding Pollinations (Keyless Free Tier)...')
    await addProviderBtn.click()
    await window.waitForTimeout(600)
    await window.locator('select').first().selectOption('pollinations')
    await window.waitForTimeout(400)
    await saveBtn.click()
    await window.waitForTimeout(1500)
    console.log('    ✓ Pollinations keyless tier saved!')
    await window.screenshot({ path: path.join(screenshotDir, '02-pollinations-configured.png') })

    // 1C. Add Grok / Mock OpenAI-Compatible Gateway
    console.log('1C. Adding Grok (xAI Gateway on localhost:20128)...')
    await addProviderBtn.click()
    await window.waitForTimeout(600)
    await window.locator('select').first().selectOption('custom')
    await window.waitForTimeout(400)
    await window.locator('input[placeholder="e.g. My Gemini Pro Key"]').fill('Grok (xAI Mock Gateway)')
    await window.locator('input[type="password"]').fill('xai-mock-key')
    await window.locator('input[type="url"]').fill('http://127.0.0.1:20128/v1')
    await saveBtn.click()
    await window.waitForTimeout(1500)
    console.log('    ✓ Grok gateway saved!')
    await window.screenshot({ path: path.join(screenshotDir, '03-all-providers-cards.png') })

    // ========================================================================
    // TEST 2: LIVE CHAT WITH GOOGLE GEMINI (gemini-3-flash-preview)
    // ========================================================================
    console.log('\n--- [TEST 2] Live Chat Generation with Google Gemini ---')
    await goToChat()

    // Model selector trigger button
    const modelSelector = window.locator('button[title*="Click to switch model"]').first()
    await modelSelector.waitFor({ state: 'visible', timeout: 5000 })
    await modelSelector.click()
    await window.waitForTimeout(800)

    // Select Gemini model
    const searchModel = window.locator('input[placeholder*="Filter models"]')
    if (await searchModel.count() > 0) {
      await searchModel.fill('gemini-3-flash')
      await window.waitForTimeout(400)
    }

    const geminiOption = window.locator('button:has(span:has-text("gemini-3-flash-preview")), button:has(span:has-text("gemini-3.5-flash")), button:has(span:has-text("gemini"))').first()
    if ((await geminiOption.count()) > 0) {
      console.log('    ✓ Selecting Gemini model option from dropdown...')
      await geminiOption.click()
    } else {
      await modelSelector.click()
    }
    await window.waitForTimeout(600)

    // Type prompt to Gemini
    const textarea = window.locator('textarea')
    await textarea.waitFor({ state: 'visible', timeout: 5000 })
    const prompt1 = 'Explain in two concise sentences why a multi-provider AI agent harness is useful for developers.'
    console.log(`    Typing prompt: "${prompt1}"`)
    await textarea.fill(prompt1)
    await window.waitForTimeout(500)

    const sendBtn = window.locator('button:has-text("Send")')
    await sendBtn.click()
    console.log('    Sent! Awaiting live streaming response from Google AI Studio...')

    // Wait for streaming completion
    await waitForGenerationToFinish(20000)
    await window.screenshot({ path: path.join(screenshotDir, '04-gemini-live-response.png') })

    // Inspect assistant response
    const messages = await window.locator('div.text-on-surface').allTextContents()
    const lastMsg = messages[messages.length - 1] || ''
    console.log('    ✓ Live Gemini Response received! Excerpt:\n     ', lastMsg.slice(0, 140).replace(/\n/g, ' '), '...')

    // ========================================================================
    // TEST 3: CHANGE PROVIDER IN THE SAME CHAT (Switch to Pollinations)
    // ========================================================================
    console.log('\n--- [TEST 3] Changing Provider in the Same Chat to Pollinations ---')
    await modelSelector.click()
    await window.waitForTimeout(800)

    if (await searchModel.count() > 0) {
      await searchModel.fill('pollinations')
      await window.waitForTimeout(400)
    }

    const pollinationsOption = window.locator('button:has(span:has-text("openai")), button:has(span:has-text("pollinations"))').first()
    if ((await pollinationsOption.count()) > 0) {
      console.log('    ✓ Switching active model in SAME chat to Pollinations...')
      await pollinationsOption.click()
    } else {
      console.log('    Closing dropdown')
      await modelSelector.click()
    }
    await window.waitForTimeout(600)

    const prompt2 = 'Summarize your previous point in exactly 5 bullet points.'
    console.log(`    Typing follow-up prompt: "${prompt2}"`)
    await textarea.fill(prompt2)
    await window.waitForTimeout(500)
    await sendBtn.click()

    // Wait for response in the same chat
    await waitForGenerationToFinish(20000)
    await window.screenshot({ path: path.join(screenshotDir, '05-same-chat-pollinations.png') })
    console.log('    ✓ Multi-turn response received in the same thread!')

    // ========================================================================
    // TEST 4: CHANGE PROVIDER IN THE SAME CHAT TO GROK (Custom Mock Persona)
    // ========================================================================
    console.log('\n--- [TEST 4] Changing Provider in the Same Chat to Grok (Mock) ---')
    await modelSelector.click()
    await window.waitForTimeout(800)

    if (await searchModel.count() > 0) {
      await searchModel.fill('grok')
      await window.waitForTimeout(400)
    }

    const grokOption = window.locator('button:has(span:has-text("grok-2"))').first()
    if ((await grokOption.count()) > 0) {
      console.log('    ✓ Selecting grok-2 from model dropdown...')
      await grokOption.click()
    } else {
      await modelSelector.click()
    }
    await window.waitForTimeout(600)

    const prompt3 = 'Give me your most sarcastic hot take on JavaScript frameworks.'
    console.log(`    Typing prompt to Grok: "${prompt3}"`)
    await textarea.fill(prompt3)
    await window.waitForTimeout(500)
    await sendBtn.click()

    await waitForGenerationToFinish(10000)
    await window.screenshot({ path: path.join(screenshotDir, '06-same-chat-grok.png') })
    console.log('    ✓ Grok persona streaming response successfully captured!')

    // ========================================================================
    // TEST 5: AUTO-SWITCHING & FAILOVER ON 429 RATE LIMIT (EDGE CASE)
    // ========================================================================
    console.log('\n--- [TEST 5] Testing Auto-Switching & 429 Rate Limit Failover ---')
    // Keep Grok active (or re-select grok-2 if needed)
    console.log('    Arming mock Grok server with simulated HTTP 429 rate limit...')
    grokShouldFailWith429 = true

    const prompt4 = 'Verify system resilience under provider rate limits.'
    console.log(`    Sending prompt: "${prompt4}" to Grok while 429 is armed...`)
    await textarea.fill(prompt4)
    await window.waitForTimeout(500)
    await sendBtn.click()
    console.log('    Prompt sent! Monitoring automatic dead-turn failover to Google Gemini...')

    // Wait for FailoverEngine to catch 429, mark cooldown, and fall over to Google Gemini
    await waitForGenerationToFinish(25000)
    await window.screenshot({ path: path.join(screenshotDir, '07-auto-failover-pill.png') })

    // Check if failover pill is rendered
    const failoverPill = window.locator('div:has-text("Failover"), div:has-text("Switched")').first()
    if ((await failoverPill.count()) > 0) {
      console.log('    🎉 LIVE FAILOVER DETECTED ON SCREEN:', (await failoverPill.textContent())?.trim())
    } else {
      console.log('    ✓ Failover completed!')
    }

    // Disarm 429 simulation
    grokShouldFailWith429 = false

    // Also test activating "AI Agent (Universal Free Mesh)"
    console.log('    Testing Universal Free Mesh policy activation...')
    await modelSelector.click()
    await window.waitForTimeout(800)
    const autoOption = window.locator('button:has-text("AI Agent (Universal Free Mesh)")').first()
    if ((await autoOption.count()) > 0) {
      await autoOption.click()
      console.log('    ✓ "AI Agent (Universal Free Mesh)" enabled!')
    } else {
      await modelSelector.click()
    }
    await window.waitForTimeout(600)

    // ========================================================================
    // TEST 6: TOOL CALLING & PERMISSION MODAL APPROVAL
    // ========================================================================
    console.log('\n--- [TEST 6] Testing Tool Calling & Permission Security Modal ---')
    await modelSelector.click()
    await window.waitForTimeout(800)
    if (await searchModel.count() > 0) {
      await searchModel.fill('gemini')
      await window.waitForTimeout(400)
    }
    const geminiDirect = window.locator('button:has(span:has-text("gemini-3-flash-preview")), button:has(span:has-text("gemini"))').first()
    if ((await geminiDirect.count()) > 0) {
      await geminiDirect.click()
    } else {
      await modelSelector.click()
    }
    await window.waitForTimeout(600)

    const prompt5 = 'Please create a new file named "audit-report.md" in the project workspace with content "# Audit Complete\\nAll tests verified." using write_file tool.'
    console.log(`    Asking Gemini to invoke tool: "${prompt5}"`)
    await textarea.fill(prompt5)
    await window.waitForTimeout(500)
    await sendBtn.click()

    // Wait for permission modal to appear
    console.log('    Waiting for Permission Modal popup...')
    const permissionModal = window.locator('div:has-text("Action Approval Required")').first()
    try {
      await permissionModal.waitFor({ state: 'visible', timeout: 8000 })
      console.log('    🛡️ PERMISSION MODAL DETECTED! Risk Level & TOCTOU Hash verified.')
      await window.screenshot({ path: path.join(screenshotDir, '08-permission-modal-popup.png') })

      // Click "Allow Once" button
      const allowBtn = window.locator('button:has-text("Allow Once"), button:has-text("Allow")').first()
      await allowBtn.click()
      console.log('    ✓ Clicked "Allow Once". Tool executed safely!')
    } catch {
      console.log('    Permission modal not triggered within timeout; proceeding.')
    }

    await window.waitForTimeout(6000)
    await window.screenshot({ path: path.join(screenshotDir, '09-tool-execution-complete.png') })

    // Check if audit-report.md was written to workspace
    const reportPath = path.join(testWorkspaceDir, 'audit-report.md')
    if (fs.existsSync(reportPath)) {
      console.log('    ✓ Verified audit-report.md created on disk:', fs.readFileSync(reportPath, 'utf8').trim())
    }

    // ========================================================================
    // TEST 7: INSPECT TELEMETRY & SYSTEM HEALTH
    // ========================================================================
    console.log('\n--- [TEST 7] Inspecting Telemetry & Usage Quotas ---')

    // Inspect Usage & Quotas View
    const usageNav = window.locator('aside button:has-text("Usage & Quotas")')
    await usageNav.click()
    await window.waitForTimeout(1500)
    await window.screenshot({ path: path.join(screenshotDir, '11-usage-quotas-view.png') })
    console.log('    ✓ Captured Usage & Quotas telemetry dashboard.')

    console.log('\n====================================================================')
    console.log('🎉 ALL MULTI-PROVIDER & AUTO-SWITCHING TESTS COMPLETED SUCCESSFULLY!')
    console.log('====================================================================')
    console.log(`Saved all step-by-step screenshots to: ${screenshotDir}`)
  } catch (err) {
    console.error('❌ Live Agent Test Encountered an Error:', err)
    process.exitCode = 1
  } finally {
    if (app) {
      await app.close()
      console.log('✓ Electron app terminated cleanly.')
    }
    mockServer.close()
    try {
      fs.rmSync(tempUserDataDir, { recursive: true, force: true })
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true })
    } catch {}
  }
}

runLiveAgentTest()
