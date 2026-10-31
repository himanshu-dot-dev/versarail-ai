/**
 * VersaRail AI Agent Harness - Path Canonicalizer & Filesystem Security
 * Implements strict realpath containment, path traversal prevention, symlink escape defense,
 * and integration with the ExclusionFilter.
 */

import * as fs from 'fs'
import * as path from 'path'
import { ExclusionFilter } from './exclusion-filter'

export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AccessDeniedError'
    Object.setPrototypeOf(this, AccessDeniedError.prototype)
  }
}

export class PathTraversalError extends AccessDeniedError {
  constructor(message: string = 'Path traversal attempt detected: target is outside workspace root') {
    super(message)
    this.name = 'PathTraversalError'
    Object.setPrototypeOf(this, PathTraversalError.prototype)
  }
}

export class SymlinkEscapeError extends PathTraversalError {
  constructor(message: string = 'Symlink escape detected: symbolic link resolves outside workspace root') {
    super(message)
    this.name = 'SymlinkEscapeError'
    Object.setPrototypeOf(this, SymlinkEscapeError.prototype)
  }
}

export class SensitiveFileExclusionError extends AccessDeniedError {
  constructor(message: string = 'Access denied: Target matches sensitive file or directory exclusion') {
    super(message)
    this.name = 'SensitiveFileExclusionError'
    Object.setPrototypeOf(this, SensitiveFileExclusionError.prototype)
  }
}

export interface ResolvePathOptions {
  mustExist?: boolean
  allowExclusions?: boolean
}

export class PathCanonicalizer {
  /**
   * Normalizes drive letter on Windows so that comparisons are consistent.
   */
  private static normalizeDriveLetter(p: string): string {
    if (process.platform === 'win32' && /^[a-zA-Z]:/.test(p)) {
      return p[0].toUpperCase() + p.slice(1)
    }
    return p
  }

  /**
   * Canonicalizes and validates the workspace root path.
   * Ensures the directory exists and resolves any initial symlinks or junctions.
   */
  public static canonicalizeRoot(rootPath: string): string {
    if (!rootPath || typeof rootPath !== 'string') {
      throw new Error('Workspace root path must be a non-empty string')
    }

    if (rootPath.includes('\0')) {
      throw new PathTraversalError('Null byte detected in workspace root path')
    }

    if (!fs.existsSync(rootPath)) {
      throw new Error(`Workspace root path does not exist: "${rootPath}"`)
    }

    const stat = fs.statSync(rootPath)
    if (!stat.isDirectory()) {
      throw new Error(`Workspace root path is not a directory: "${rootPath}"`)
    }

    const real = fs.realpathSync(rootPath)
    return this.normalizeDriveLetter(real)
  }

  /**
   * Checks whether targetPath is strictly contained within workspaceRoot using fs.realpathSync.
   * Follows Threat Model Scenario 2 specification:
   *   const realRoot = fs.realpathSync(workspaceRoot);
   *   const realTarget = fs.realpathSync(targetPath);
   *   const relative = path.relative(realRoot, realTarget);
   *   return !relative.startsWith('..') && !path.isAbsolute(relative);
   */
  public static isContained(workspaceRoot: string, targetPath: string): boolean {
    try {
      const realRoot = this.canonicalizeRoot(workspaceRoot)
      const realTarget = this.normalizeDriveLetter(fs.realpathSync(targetPath))
      const relative = path.relative(realRoot, realTarget)
      return !relative.startsWith('..') && !path.isAbsolute(relative)
    } catch {
      return false
    }
  }

  /**
   * Validates an untrusted path against workspace boundaries:
   * 1. Rejects null-byte injections.
   * 2. Resolves path relative to canonical workspace root.
   * 3. Performs lexical traversal check.
   * 4. Resolves realpath via fs.realpathSync, checking for symlink escapes.
   * 5. Enforces containment within workspace root.
   * 6. Checks against ExclusionFilter.
   * Returns the canonical absolute path.
   */
  public static resolveSafePath(
    workspaceRoot: string,
    untrustedPath: string,
    options: ResolvePathOptions = {}
  ): string {
    if (untrustedPath === null || untrustedPath === undefined || typeof untrustedPath !== 'string') {
      throw new Error('Untrusted path must be a string')
    }

    // 1. Check for null byte poisoning
    if (untrustedPath.includes('\0')) {
      throw new PathTraversalError('Null byte detected in path')
    }

    // 2. Canonicalize workspace root
    const canonicalRoot = this.canonicalizeRoot(workspaceRoot)

    // 3. Resolve target path
    const targetCandidate = path.isAbsolute(untrustedPath)
      ? path.resolve(untrustedPath)
      : path.resolve(canonicalRoot, untrustedPath)

    const normalizedTarget = this.normalizeDriveLetter(targetCandidate)

    // 4. Lexical check: relative path before resolving symlinks
    const lexicalRel = path.relative(canonicalRoot, normalizedTarget)
    if (lexicalRel.startsWith('..') || path.isAbsolute(lexicalRel)) {
      throw new PathTraversalError(
        `Path traversal attempt detected: target "${untrustedPath}" escapes workspace root`
      )
    }

    // 5. Inspect filesystem state (symlink / realpath resolution)
    let lstat: fs.Stats | null = null
    try {
      lstat = fs.lstatSync(normalizedTarget)
    } catch {
      // Path does not exist yet on disk
    }

    let realTarget: string

    if (lstat) {
      if (lstat.isSymbolicLink()) {
        try {
          realTarget = this.normalizeDriveLetter(fs.realpathSync(normalizedTarget))
        } catch {
          // Dangling symlink: check destination link target
          try {
            const rawLink = fs.readlinkSync(normalizedTarget)
            const resolvedDangling = path.isAbsolute(rawLink)
              ? path.resolve(rawLink)
              : path.resolve(path.dirname(normalizedTarget), rawLink)
            const danglingRel = path.relative(canonicalRoot, this.normalizeDriveLetter(resolvedDangling))
            if (danglingRel.startsWith('..') || path.isAbsolute(danglingRel)) {
              throw new SymlinkEscapeError(
                `Symlink escape detected: dangling symlink points outside workspace: ${rawLink}`
              )
            }
          } catch (e: any) {
            if (e instanceof SymlinkEscapeError) throw e
          }
          throw new Error(`Dangling symlink cannot be resolved: "${untrustedPath}"`)
        }

        // Verify realpath of symlink target is strictly contained
        const symlinkRel = path.relative(canonicalRoot, realTarget)
        if (symlinkRel.startsWith('..') || path.isAbsolute(symlinkRel)) {
          throw new SymlinkEscapeError(
            `Symlink escape detected: symbolic link "${untrustedPath}" resolves outside workspace root to "${realTarget}"`
          )
        }
      } else {
        // Regular file or directory exists
        realTarget = this.normalizeDriveLetter(fs.realpathSync(normalizedTarget))
        const containmentRel = path.relative(canonicalRoot, realTarget)
        if (containmentRel.startsWith('..') || path.isAbsolute(containmentRel)) {
          throw new PathTraversalError(
            `Path traversal attempt detected: target "${untrustedPath}" resolves outside workspace root to "${realTarget}"`
          )
        }
      }
    } else {
      // Target does not exist on disk
      if (options.mustExist) {
        throw new Error(`File or directory does not exist: "${untrustedPath}"`)
      }

      // Check closest existing ancestor directory for symlink escapes
      let currentDir = path.dirname(normalizedTarget)
      let foundAncestor = false

      while (currentDir !== path.dirname(currentDir)) {
        if (fs.existsSync(currentDir)) {
          const realAncestor = this.normalizeDriveLetter(fs.realpathSync(currentDir))
          const ancestorRel = path.relative(canonicalRoot, realAncestor)
          if (ancestorRel.startsWith('..') || path.isAbsolute(ancestorRel)) {
            throw new PathTraversalError(
              `Path traversal attempt detected: ancestor directory of "${untrustedPath}" escapes workspace root`
            )
          }
          foundAncestor = true
          break
        }
        currentDir = path.dirname(currentDir)
      }

      if (!foundAncestor) {
        throw new PathTraversalError(
          `Path traversal attempt detected: no valid ancestor inside workspace root for "${untrustedPath}"`
        )
      }

      realTarget = normalizedTarget
    }

    // 6. Exclusion filter verification
    if (!options.allowExclusions) {
      const relFromRoot = path.relative(canonicalRoot, realTarget)
      const baseName = path.basename(realTarget)

      // Check relative path, basename, and original untrusted input
      const checkRel = ExclusionFilter.isExcluded(relFromRoot)
      if (checkRel.excluded) {
        throw new SensitiveFileExclusionError(
          `Access denied: Target matches sensitive exclusion: ${checkRel.reason}`
        )
      }

      const checkBase = ExclusionFilter.isExcluded(baseName)
      if (checkBase.excluded) {
        throw new SensitiveFileExclusionError(
          `Access denied: Target matches sensitive exclusion: ${checkBase.reason}`
        )
      }

      const checkUntrusted = ExclusionFilter.isExcluded(untrustedPath)
      if (checkUntrusted.excluded) {
        throw new SensitiveFileExclusionError(
          `Access denied: Target matches sensitive exclusion: ${checkUntrusted.reason}`
        )
      }
    }

    return realTarget
  }
}

