/**
 * Think Tag (<think>...</think>) Extractor
 *
 * Reasoning frontier models (DeepSeek R1, Qwen 2.5 Max, Kimi, GLM 4.7 Flash)
 * often serialize their internal thought process directly inside completion text
 * bounded by <think> and </think>.
 *
 * This utility separates thinking content from the final user response so that
 * raw thought processes do not pollute chat output while remaining observable.
 */

export interface ThinkExtractionResult {
  thought?: string
  content: string
  isThinking: boolean
}

export class ThinkTagStreamFilter {
  private insideThink = false
  private buffer = ''

  /**
   * Process an incoming token chunk from a streaming LLM response
   */
  public processChunk(chunk: string): { thoughtDelta?: string; contentDelta?: string } {
    if (!chunk) return {}

    this.buffer += chunk
    let thoughtDelta = ''
    let contentDelta = ''

    while (this.buffer.length > 0) {
      if (!this.insideThink) {
        const startIdx = this.buffer.indexOf('<think>')
        if (startIdx === -1) {
          // Check for partial opening tag at the end of buffer (e.g. "<thi")
          const lastLt = this.buffer.lastIndexOf('<')
          if (lastLt !== -1 && '<think>'.startsWith(this.buffer.slice(lastLt))) {
            contentDelta += this.buffer.slice(0, lastLt)
            this.buffer = this.buffer.slice(lastLt)
            break
          } else {
            contentDelta += this.buffer
            this.buffer = ''
            break
          }
        } else {
          // Emit content before <think>
          contentDelta += this.buffer.slice(0, startIdx)
          this.insideThink = true
          this.buffer = this.buffer.slice(startIdx + '<think>'.length)
        }
      } else {
        const endIdx = this.buffer.indexOf('</think>')
        if (endIdx === -1) {
          // Check for partial closing tag at the end of buffer (e.g. "</thi")
          const lastLt = this.buffer.lastIndexOf('<')
          if (lastLt !== -1 && '</think>'.startsWith(this.buffer.slice(lastLt))) {
            thoughtDelta += this.buffer.slice(0, lastLt)
            this.buffer = this.buffer.slice(lastLt)
            break
          } else {
            thoughtDelta += this.buffer
            this.buffer = ''
            break
          }
        } else {
          // Emit thought before </think>
          thoughtDelta += this.buffer.slice(0, endIdx)
          this.insideThink = false
          this.buffer = this.buffer.slice(endIdx + '</think>'.length)
        }
      }
    }

    return {
      thoughtDelta: thoughtDelta.length > 0 ? thoughtDelta : undefined,
      contentDelta: contentDelta.length > 0 ? contentDelta : undefined
    }
  }

  /**
   * Flush any remaining buffered characters at the end of the stream
   */
  public flush(): { thoughtDelta?: string; contentDelta?: string } {
    if (!this.buffer) return {}
    const remaining = this.buffer
    this.buffer = ''
    if (this.insideThink) {
      return { thoughtDelta: remaining }
    }
    return { contentDelta: remaining }
  }
}

/**
 * Static think tag extraction for non-streaming or fully buffered responses
 */
export function extractThinkTags(rawText: string): ThinkExtractionResult {
  if (!rawText) return { content: '', isThinking: false }

  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi
  const thoughts: string[] = []
  let match: RegExpExecArray | null

  while ((match = thinkRegex.exec(rawText)) !== null) {
    if (match[1]) {
      thoughts.push(match[1].trim())
    }
  }

  // Check if unclosed <think> tag exists (e.g. mid-generation)
  const unclosedIdx = rawText.lastIndexOf('<think>')
  const closedIdx = rawText.lastIndexOf('</think>')
  const isCurrentlyThinking = unclosedIdx > closedIdx

  let cleanedContent = rawText.replace(thinkRegex, '')
  if (isCurrentlyThinking && unclosedIdx !== -1) {
    const trailingThought = rawText.slice(unclosedIdx + '<think>'.length)
    thoughts.push(trailingThought.trim())
    cleanedContent = rawText.slice(0, unclosedIdx)
  }

  return {
    thought: thoughts.length > 0 ? thoughts.join('\n\n') : undefined,
    content: cleanedContent.trim(),
    isThinking: isCurrentlyThinking
  }
}

