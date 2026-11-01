import { describe, it, expect } from 'vitest'
import {
  ThinkTagStreamFilter,
  extractThinkTags
} from '../../../src/main/providers/utils/think-tags'

describe('ThinkTagStreamFilter & Think Tag Extraction', () => {
  it('filters <think>...</think> during streaming without emitting reasoning as content', () => {
    const filter = new ThinkTagStreamFilter()

    // 1. Chunk with opening <think>
    const r1 = filter.processChunk('Hello! <think>Let me reason about this step by step.')
    expect(r1.contentDelta).toBe('Hello! ')
    expect(r1.thoughtDelta).toBe('Let me reason about this step by step.')

    // 2. Chunk in the middle of thinking
    const r2 = filter.processChunk(' It is a complex math equation.')
    expect(r2.contentDelta).toBeUndefined()
    expect(r2.thoughtDelta).toBe(' It is a complex math equation.')

    // 3. Chunk with closing </think>
    const r3 = filter.processChunk(' Solved!</think>The answer is 42.')
    expect(r3.thoughtDelta).toBe(' Solved!')
    expect(r3.contentDelta).toBe('The answer is 42.')

    const r4 = filter.flush()
    expect(r4.contentDelta).toBeUndefined()
  })

  it('handles partial tags across chunk boundaries seamlessly', () => {
    const filter = new ThinkTagStreamFilter()

    // Split "<think>" across chunks: "<thi" then "nk>"
    const r1 = filter.processChunk('Initial text <thi')
    expect(r1.contentDelta).toBe('Initial text ')

    const r2 = filter.processChunk('nk>Reasoning now...')
    expect(r2.thoughtDelta).toBe('Reasoning now...')

    // Split "</think>" across chunks: "</thi" then "nk>"
    const r3 = filter.processChunk(' finishing</thi')
    expect(r3.thoughtDelta).toBe(' finishing')

    const r4 = filter.processChunk('nk>Final answer.')
    expect(r4.contentDelta).toBe('Final answer.')
  })

  it('correctly extracts thinking and clean content in static text', () => {
    const raw = '<think>I need to check the user query.</think>Here is the response.'
    const result = extractThinkTags(raw)

    expect(result.thought).toBe('I need to check the user query.')
    expect(result.content).toBe('Here is the response.')
    expect(result.isThinking).toBe(false)
  })

  it('detects unclosed thinking when generation is interrupted mid-thought', () => {
    const raw = '<think>I am still actively thinking about'
    const result = extractThinkTags(raw)

    expect(result.thought).toBe('I am still actively thinking about')
    expect(result.content).toBe('')
    expect(result.isThinking).toBe(true)
  })
})

