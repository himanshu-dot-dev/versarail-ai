/**
 * VersaRail AI Agent Harness - Crash-Safe Atomic Writer
 * Writes files via temporary sibling files, flushes disk buffers via fsync,
 * and performs atomic file replacement to eliminate partial-write corruption.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { randomUUID } from 'crypto'

export class AtomicWriter {
  /**
   * Writes content to a file atomically:
   * 1. Creates parent directory if it does not exist.
   * 2. Writes to temporary sibling file on the same volume (.target.<uuid>.tmp).
   * 3. Calls fsync to ensure buffers are physically written to non-volatile storage.
   * 4. Closes file handle.
   * 5. Atomically renames temp file to destination path.
   * 6. Cleans up temp file on failure.
   */
  public static async writeAtomic(
    targetPath: string,
    content: string | Buffer
  ): Promise<void> {
    const dir = path.dirname(targetPath)
    await fs.mkdir(dir, { recursive: true })

    const tempPath = path.join(dir, `.${path.basename(targetPath)}.${randomUUID()}.tmp`)
    let fileHandle: fs.FileHandle | null = null

    try {
      fileHandle = await fs.open(tempPath, 'w')
      const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : content
      await fileHandle.write(buffer, 0, buffer.length, 0)

      // Ensure write buffers are committed to persistent disk hardware
      await fileHandle.sync()
      await fileHandle.close()
      fileHandle = null

      // Atomic rename with Windows retry tolerance
      await this.atomicRename(tempPath, targetPath)
    } catch (err) {
      if (fileHandle) {
        try {
          await fileHandle.close()
        } catch {
          // Ignore handle close error on failure
        }
      }
      try {
        await fs.unlink(tempPath)
      } catch {
        // Ignore unlink error if temp file does not exist
      }
      throw err
    }
  }

  /**
   * Atomically renames a source file to destination, retrying briefly on Windows if busy.
   */
  private static async atomicRename(
    srcPath: string,
    destPath: string,
    maxRetries = 3
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fs.rename(srcPath, destPath)
        return
      } catch (err: any) {
        if (
          attempt < maxRetries &&
          (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES')
        ) {
          // Brief pause on Windows file-locking retry
          await new Promise((resolve) => setTimeout(resolve, 50 * attempt))
          continue
        }
        throw err
      }
    }
  }
}

