/**
 * VersaRail AI Agent Harness - electron-builder afterPack Hook
 * Automatically flips compile-time security fuses on packaged executable binaries.
 */

const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses')
const path = require('path')
const fs = require('fs')

exports.default = async function afterPack(context) {
  const ext = {
    darwin: '.app',
    win32: '.exe',
    linux: ''
  }[context.electronPlatformName]

  const isMac = context.electronPlatformName === 'darwin'
  const executableName = context.packager.appInfo.productFilename

  let electronBinaryPath
  if (isMac) {
    electronBinaryPath = path.join(
      context.appOutDir,
      `${executableName}.app`,
      'Contents',
      'MacOS',
      executableName
    )
  } else {
    electronBinaryPath = path.join(context.appOutDir, `${executableName}${ext}`)
  }

  if (!fs.existsSync(electronBinaryPath)) {
    console.warn(`[Security] Target binary not found for fuse flipping: ${electronBinaryPath}`)
    return
  }

  console.log(`[Security] Flipping compile-time Electron fuses on: ${electronBinaryPath}`)

  await flipFuses(electronBinaryPath, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: isMac,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true
  })

  console.log('[Security] Electron compile-time fuses flipped successfully.')
}

