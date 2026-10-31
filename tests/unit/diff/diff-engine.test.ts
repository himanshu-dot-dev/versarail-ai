import { describe, it, expect } from 'vitest'
import { DiffEngine, PatchApplicationError } from '../../../src/main/changes/diff-engine'

describe('DiffEngine - Unified Diff Generation & Patch Application', () => {
  it('computes deterministic SHA-256 hashes for content', () => {
    const text = 'hello world'
    const hash1 = DiffEngine.computeSha256(text)
    const hash2 = DiffEngine.computeSha256(text)
    expect(hash1).toBe(hash2)
    expect(hash1).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')
  })

  it('detects identical content and returns hasChanges false', () => {
    const content = 'const x = 1;\nconsole.log(x);\n'
    const diff = DiffEngine.createUnifiedDiff({
      filePath: 'test.ts',
      originalContent: content,
      newContent: content
    })

    expect(diff.hasChanges).toBe(false)
    expect(diff.additions).toBe(0)
    expect(diff.deletions).toBe(0)
    expect(diff.hunks.length).toBe(0)
    expect(diff.baselineSha256).toBe(diff.newSha256)
  })

  it('generates structured unified diff with line additions and deletions', () => {
    const original = 'line 1\nline 2\nline 3\n'
    const proposed = 'line 1\nline 2 modified\nline 3\nline 4 added\n'

    const diff = DiffEngine.createUnifiedDiff({
      filePath: 'sample.txt',
      originalContent: original,
      newContent: proposed
    })

    expect(diff.hasChanges).toBe(true)
    expect(diff.filePath).toBe('sample.txt')
    expect(diff.additions).toBe(2) // 'line 2 modified' and 'line 4 added'
    expect(diff.deletions).toBe(1) // 'line 2'
    expect(diff.hunks.length).toBeGreaterThan(0)

    const firstHunk = diff.hunks[0]
    expect(firstHunk.lines.some((l) => l.type === 'add')).toBe(true)
    expect(firstHunk.lines.some((l) => l.type === 'delete')).toBe(true)
    expect(firstHunk.lines.some((l) => l.type === 'context')).toBe(true)
  })

  it('applies patch cleanly to original content', () => {
    const original = 'apple\nbanana\ncherry\n'
    const modified = 'apple\nblueberry\ncherry\ndate\n'

    const diff = DiffEngine.createUnifiedDiff({
      filePath: 'fruits.txt',
      originalContent: original,
      newContent: modified
    })

    const patched = DiffEngine.applyPatch(original, diff.patch)
    expect(patched).toBe(modified)
  })

  it('throws PatchApplicationError when applying incompatible patch', () => {
    const original = 'alpha\nbeta\ngamma\n'
    const modified = 'alpha\nbeta\ndelta\n'

    const diff = DiffEngine.createUnifiedDiff({
      filePath: 'greek.txt',
      originalContent: original,
      newContent: modified
    })

    const completelyDifferentText = 'one\ntwo\nthree\nfour\n'
    expect(() => DiffEngine.applyPatch(completelyDifferentText, diff.patch)).toThrow(
      PatchApplicationError
    )
  })
})

