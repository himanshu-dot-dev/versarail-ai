import { _electron as electron } from 'playwright'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'versarail-readme-assets-'))
const assetsDir = path.join(projectRoot, 'docs', 'assets')

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
}

// Copy icon to docs/assets
fs.copyFileSync(
  path.join(projectRoot, 'resources', 'icon.png'),
  path.join(assetsDir, 'icon.png')
)

async function capture() {
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
    await window.setViewportSize({ width: 1440, height: 900 })

    await app.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.show()
        win.focus()
      }
    })

    await window.waitForTimeout(2000)

    // 1. Capture Dark Theme Main Screen
    console.log('Capturing dark theme main screen...')
    await window.screenshot({ path: path.join(assetsDir, 'versarail_screenshot_dark.png') })
    console.log('✓ Captured versarail_screenshot_dark.png')

    // 2. Capture AI Providers View
    console.log('Navigating to AI Providers...')
    const providersBtn = window.locator('aside button:has-text("AI Providers")')
    if (await providersBtn.count() > 0) {
      await providersBtn.click()
    } else {
      await window.locator('aside span:text-is("AI Providers")').click()
    }
    await window.waitForTimeout(1500)
    await window.screenshot({ path: path.join(assetsDir, 'versarail_providers.png') })
    console.log('✓ Captured versarail_providers.png')

    // 3. Capture Usage & Quotas View
    console.log('Navigating to Usage & Quotas...')
    const quotasBtn = window.locator('aside button:has-text("Usage & Quotas")')
    if (await quotasBtn.count() > 0) {
      await quotasBtn.click()
    } else {
      await window.locator('aside span:text-is("Usage & Quotas")').click()
    }
    await window.waitForTimeout(1500)
    await window.screenshot({ path: path.join(assetsDir, 'versarail_quotas.png') })
    console.log('✓ Captured versarail_quotas.png')

    // 4. Navigate to Settings and switch to Light Mode
    console.log('Navigating to Settings...')
    const settingsBtn = window.locator('aside button:has-text("Settings")')
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click()
    } else {
      await window.locator('aside span:text-is("Settings")').click()
    }
    await window.waitForTimeout(1500)

    console.log('Switching to Light Mode...')
    const lightModeBtn = window.locator('text=Light Mode').first()
    await lightModeBtn.click()
    await window.waitForTimeout(1500)

    // 5. Navigate back to Chat to capture Light Theme Main Screen
    console.log('Navigating back to Chat in Light Mode...')
    const chatBtn = window.locator('button[title="Start New Chat"]')
    if (await chatBtn.count() > 0) {
      await chatBtn.click()
    } else {
      await window.locator('aside span:text-is("Chat")').click()
    }
    await window.waitForTimeout(2000)

    await window.screenshot({ path: path.join(assetsDir, 'versarail_screenshot_light.png') })
    console.log('✓ Captured versarail_screenshot_light.png')

    console.log('All screenshots captured successfully!')
  } catch (err) {
    console.error('Error during asset capture:', err)
    process.exitCode = 1
  } finally {
    if (app) {
      await app.close()
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  }
}

capture()
