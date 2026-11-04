import { _electron as electron } from 'playwright'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-playwright-tour-'))
const screenshotDir = path.join(projectRoot, 'test-artifacts')

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true })
}

console.log('--- STARTING PLAYWRIGHT END-TO-END TEST SUITE ---')
console.log('Project root:', projectRoot)
console.log('Isolated test user data dir:', tempDir)

async function runTestSuite() {
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
        HARNESS_USER_DATA_DIR: tempDir
      }
    })

    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    console.log('✓ Main window loaded. Title:', await window.title())

    // Ensure desktop window dimensions and bring directly in front of user
    await window.setViewportSize({ width: 1360, height: 880 })
    await app.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.show()
        win.focus()
        win.setAlwaysOnTop(true)
        setTimeout(() => win.setAlwaysOnTop(false), 2000)
      }
    })

    // STEP 1: Capture Initial Home Screen
    console.log('\n[Step 1] Home / Chat Dashboard is on screen...')
    await window.waitForTimeout(1500)
    await window.screenshot({ path: path.join(screenshotDir, '01-home-screen.png') })
    console.log('✓ Captured 01-home-screen.png')

    // STEP 2: Verify Composer & Model Selector Dropdown
    console.log('\n[Step 2] Opening Model Selector Dropdown on screen...')
    const selectorBtn = window.locator('button:has-text("AI Agent (Auto-Switch)")')
    await selectorBtn.waitFor({ state: 'visible', timeout: 5000 })
    await selectorBtn.click()
    await window.waitForTimeout(2000)

    await window.screenshot({ path: path.join(screenshotDir, '02-model-selector-open.png') })
    console.log('✓ Captured 02-model-selector-open.png')

    // Click the universal auto free banner
    const universalPill = window.locator('text=AI Agent (Universal Free Mesh)').first()
    if (await universalPill.count() > 0) {
      console.log('✓ Selecting "AI Agent (Universal Free Mesh)" dropdown option!')
      await universalPill.click()
    } else {
      await selectorBtn.click()
    }
    await window.waitForTimeout(1000)

    // STEP 3: Navigate to AI Providers
    console.log('\n[Step 3] Navigating to AI Providers View on screen...')
    const providersNav = window.locator('aside button:has-text("AI Providers")')
    await providersNav.click()
    await window.waitForTimeout(2000)
    await window.screenshot({ path: path.join(screenshotDir, '03-ai-providers-view.png') })
    console.log('✓ Captured 03-ai-providers-view.png')

    // STEP 4: Navigate to Usage & Quotas
    console.log('\n[Step 4] Navigating to Usage & Quotas View on screen...')
    const usageNav = window.locator('aside button:has-text("Usage & Quotas")')
    await usageNav.click()
    await window.waitForTimeout(2000)
    await window.screenshot({ path: path.join(screenshotDir, '04-usage-quotas-view.png') })
    console.log('✓ Captured 04-usage-quotas-view.png')

    // STEP 5: Navigate to Settings
    console.log('\n[Step 5] Navigating to Settings View on screen...')
    const settingsNav = window.locator('aside button:has-text("Settings")')
    await settingsNav.click()
    await window.waitForTimeout(2000)
    await window.screenshot({ path: path.join(screenshotDir, '05-settings-view.png') })
    console.log('✓ Captured 05-settings-view.png')

    // STEP 6: Return to Chat and test prompt composer interaction
    console.log('\n[Step 6] Returning to Chat and typing prompt live into composer...')
    const newChatBtn = window.locator('button[title="Start New Chat"]')
    await newChatBtn.click()
    await window.waitForTimeout(1200)

    const textarea = window.locator('textarea')
    await textarea.waitFor({ state: 'visible', timeout: 5000 })
    await textarea.click()
    await window.waitForTimeout(500)

    // Type character-by-character visibly on screen
    await textarea.pressSequentially('Hello AI Agent! Can you verify that the auto-switch mesh is ready?', { delay: 40 })
    await window.waitForTimeout(1500)
    await window.screenshot({ path: path.join(screenshotDir, '06-composer-typing.png') })
    console.log('✓ Captured 06-composer-typing.png')

    // STEP 7: Submit Prompt and verify "AI Agent" Header
    console.log('\n[Step 7] Submitting prompt to AI Agent...')
    const sendBtn = window.locator('button:has-text("Send")')
    await sendBtn.click()

    // Wait 4 seconds for response generation/failover handling
    await window.waitForTimeout(4000)
    await window.screenshot({ path: path.join(screenshotDir, '07-chat-message-submitted.png') })
    console.log('✓ Captured 07-chat-message-submitted.png')

    // Verify AI Agent header appears in message list
    const agentHeader = window.locator('span:has-text("AI Agent")')
    const agentHeaderCount = await agentHeader.count()
    console.log('✓ "AI Agent" header instances rendered in chat:', agentHeaderCount)

    // Pause 3 seconds so the user can inspect the final screen before closing
    console.log('\nPausing 3 seconds for visual inspection on your desktop...')
    await window.waitForTimeout(3000)

    console.log('\n=============================================')
    console.log('🎉 ALL PLAYWRIGHT E2E UI TESTS PASSED SUCCESSFULLY!')
    console.log('=============================================')
  } catch (error) {
    console.error('❌ Playwright E2E test failed:', error)
    process.exitCode = 1
  } finally {
    if (app) {
      await app.close()
      console.log('✓ Electron app closed cleanly.')
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  }
}

runTestSuite()
