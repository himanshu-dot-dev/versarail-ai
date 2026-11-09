import { describe, it, expect } from 'vitest'

describe('Chat Formatting, Diffs & Tool Feedback Craftsmanship', () => {
  it('strips legacy raw emojis from tool execution output', () => {
    const rawAction = '> ⚙️ **Action:** Executing tool `web_search`...\n> ✅ **Output:** Execution succeeded'
    const cleaned = rawAction.replace(/[⚙️✅❌🎯⚠️]/gu, '').trim()

    expect(cleaned).not.toContain('⚙️')
    expect(cleaned).not.toContain('✅')
    expect(cleaned).toContain('**Action:** Executing tool `web_search`...')
    expect(cleaned).toContain('**Output:** Execution succeeded')
  })

  it('correctly parses tool name from Action lines', () => {
    const actionLine = '**Action:** Executing tool `read_file`...'
    const codeMatch = actionLine.match(/`([^`]+)`/)
    expect(codeMatch).not.toBeNull()
    expect(codeMatch![1]).toBe('read_file')
  })

  it('correctly maps tool types to clean developer icons without emojis', () => {
    function getToolIcon(toolName: string): string {
      const lower = toolName.toLowerCase()
      if (lower.includes('search')) return 'search'
      if (lower.includes('file') || lower.includes('read') || lower.includes('write')) return 'description'
      if (lower.includes('bash') || lower.includes('cmd') || lower.includes('exec') || lower.includes('terminal')) return 'terminal'
      if (lower.includes('git') || lower.includes('diff')) return 'difference'
      return 'build'
    }

    expect(getToolIcon('web_search')).toBe('search')
    expect(getToolIcon('read_file')).toBe('description')
    expect(getToolIcon('write_file')).toBe('description')
    expect(getToolIcon('execute_command')).toBe('terminal')
    expect(getToolIcon('git_diff')).toBe('difference')
    expect(getToolIcon('custom_tool')).toBe('build')
  })

  it('identifies unified diffs for interactive DiffViewer presentation', () => {
    const gitDiff = `--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
 import React from 'react'
+import Icon from './Icon'
 console.log('ready')`

    const isDiff = gitDiff.includes('@@ -') && (gitDiff.includes('\n+') || gitDiff.includes('\n-'))
    expect(isDiff).toBe(true)

    // Verify chunk stats
    const additions = (gitDiff.match(/^\+[^+]/gm) || []).length
    const deletions = (gitDiff.match(/^-[^-]/gm) || []).length
    expect(additions).toBe(1)
    expect(deletions).toBe(0)
  })

  it('extracts <think> tags for live reasoning stream visualization', () => {
    const rawStreamingText = `<think>
1. Need to inspect existing files.
2. Will execute read_file for package.json.
</think>
Here is the analyzed project configuration:`

    const thinkMatch = rawStreamingText.match(/<think>([\s\S]*?)(?:<\/think>|$)/i)
    expect(thinkMatch).not.toBeNull()
    expect(thinkMatch![1]).toContain('1. Need to inspect existing files.')

    const cleanText = rawStreamingText
      .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '')
      .trim()
    expect(cleanText).toBe('Here is the analyzed project configuration:')
  })

  it('heals legacy 5-element allowedProviders lists automatically', () => {
    const legacyFive = ['gemini', 'groq', 'cerebras', 'openrouter', 'custom']
    const allProviders = [
      'gemini', 'groq', 'cerebras', 'openrouter', 'custom', 'nvidia',
      'mistral', 'huggingface', 'cohere', 'deepseek', 'cloudflare',
      'pollinations', 'kilo'
    ]

    const isLegacyFiveOnly =
      legacyFive.length === 5 &&
      ['gemini', 'groq', 'cerebras', 'openrouter', 'custom'].every((p) => legacyFive.includes(p))

    const healed = isLegacyFiveOnly ? allProviders : legacyFive
    expect(healed).toContain('pollinations')
    expect(healed).toContain('kilo')
    expect(healed.length).toBe(13)
  })

  it('preserves user explicit provider intent over background egress whitelist', () => {
    const selectedProvider = 'pollinations'
    const allowedProviders = ['gemini', 'groq'] // Pollinations not in background whitelist
    const isPreferred = selectedProvider === 'pollinations'
    const isAutoPolicy = false
    const isKeyless = true

    // Under the new rule: explicit preference is never blocked by the background egress whitelist
    const isBlocked = !isPreferred && !(isAutoPolicy && isKeyless) && !allowedProviders.includes(selectedProvider)
    expect(isBlocked).toBe(false)
  })

  it('strips internal XML tool_call blocks from user-visible chat responses', () => {
    const rawAiOutput = `I will start by listing your files:
<tool_call>
{"name": "list_directory", "arguments": {"path": "."}}
</tool_call>
Here are the files I found in your project.`

    const clean = rawAiOutput
      .replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, '')
      .replace(/<function=[^>]*>[\s\S]*?(?:<\/function>|$)/gi, '')
      .trim()

    expect(clean).not.toContain('<tool_call>')
    expect(clean).not.toContain('list_directory')
    expect(clean).toContain('I will start by listing your files:')
    expect(clean).toContain('Here are the files I found in your project.')
  })
})

