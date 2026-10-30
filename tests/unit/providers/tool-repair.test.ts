import { describe, it, expect } from 'vitest'
import { repairToolArguments } from '../../../src/main/providers/utils/tool-repair'

describe('Tool Call Argument Repair', () => {
  it('strips markdown code fences from JSON arguments', () => {
    const markdownWrapped = '```json\n{"path": "src/index.ts", "content": "export default {}"}\n```'
    const repaired = repairToolArguments(markdownWrapped)
    expect(repaired).not.toContain('```')
    const parsed = JSON.parse(repaired)
    expect(parsed.path).toBe('src/index.ts')
  })

  it('strips trailing commas in malformed JSON', () => {
    const trailingComma = '{"path": "src/index.ts", "count": 42,}'
    const repaired = repairToolArguments(trailingComma)
    const parsed = JSON.parse(repaired)
    expect(parsed.count).toBe(42)
  })

  it('leaves clean JSON unmodified', () => {
    const clean = '{"command": "npm test", "timeoutMs": 5000}'
    const repaired = repairToolArguments(clean)
    expect(repaired).toBe(clean)
  })

  it('returns empty object string for empty or null inputs', () => {
    expect(repairToolArguments('')).toBe('{}')
    expect(repairToolArguments(null as any)).toBe('{}')
  })
})

