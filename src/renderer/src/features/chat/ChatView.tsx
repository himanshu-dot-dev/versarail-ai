import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useUiStore } from '../../app/useUiStore'
import WelcomeHero from '../workspace/WelcomeHero'
import PromptComposer from './PromptComposer'
import Icon from '../../components/common/Icon'
import { TodoDock } from './TodoDock'
import { DiffViewer } from '../../components/common/DiffViewer'
import { soundService } from '../../services/sound-service'

interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
  model?: string
  isStreaming?: boolean
  error?: string
}

interface InlineToken {
  type: 'text' | 'code' | 'bold' | 'italic' | 'bold_italic' | 'strikethrough' | 'link'
  value: string
  href?: string
}

const InlineFormattedText: React.FC<{ text: string }> = ({ text }) => {
  // Parse inline `code`, ***bold italic***, **bold**, *italic*, ~~strike~~, [links](url), <bracket-urls>, bare URLs
  const tokens = useMemo(() => {
    const inlineRegex =
      /(\[[^\]]+\]\(https?:\/\/[^\s\)]+\)|<https?:\/\/[^\s>]+>|https?:\/\/[^\s<>\)\]]+|`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*\s][^*]*\*)/g
    const res: InlineToken[] = []
    let last = 0
    let m: RegExpExecArray | null

    while ((m = inlineRegex.exec(text)) !== null) {
      if (m.index > last) {
        res.push({ type: 'text', value: text.slice(last, m.index) })
      }
      const raw = m[0]
      if (raw.startsWith('`') && raw.endsWith('`')) {
        res.push({ type: 'code', value: raw.slice(1, -1) })
      } else if (raw.startsWith('***') && raw.endsWith('***')) {
        res.push({ type: 'bold_italic', value: raw.slice(3, -3) })
      } else if (raw.startsWith('**') && raw.endsWith('**')) {
        res.push({ type: 'bold', value: raw.slice(2, -2) })
      } else if (raw.startsWith('~~') && raw.endsWith('~~')) {
        res.push({ type: 'strikethrough', value: raw.slice(2, -2) })
      } else if (raw.startsWith('*') && raw.endsWith('*')) {
        res.push({ type: 'italic', value: raw.slice(1, -1) })
      } else if (raw.startsWith('[') && raw.includes('](')) {
        const linkMatch = raw.match(/^\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)$/)
        if (linkMatch) {
          res.push({ type: 'link', value: linkMatch[1], href: linkMatch[2] })
        } else {
          res.push({ type: 'text', value: raw })
        }
      } else if (raw.startsWith('<http') && raw.endsWith('>')) {
        const href = raw.slice(1, -1)
        res.push({ type: 'link', value: href, href })
      } else if (raw.startsWith('http')) {
        let href = raw
        let trailing = ''
        if (href.endsWith('.') || href.endsWith(',') || href.endsWith(';')) {
          trailing = href.slice(-1)
          href = href.slice(0, -1)
        }
        res.push({ type: 'link', value: href, href })
        if (trailing) {
          res.push({ type: 'text', value: trailing })
        }
      } else {
        res.push({ type: 'text', value: raw })
      }
      last = m.index + raw.length
    }
    if (last < text.length) {
      res.push({ type: 'text', value: text.slice(last) })
    }
    return res
  }, [text])

  return (
    <span className="select-text cursor-text">
      {tokens.map((token, idx) => {
        if (token.type === 'code') {
          return (
            <code
              key={idx}
              className="px-1.5 py-0.5 rounded bg-surface-container-high text-primary font-mono text-[11px] select-text cursor-text border border-outline-variant/40 mx-0.5"
            >
              {token.value}
            </code>
          )
        }
        if (token.type === 'bold_italic') {
          return (
            <strong key={idx} className="font-bold italic text-on-surface select-text cursor-text">
              {token.value}
            </strong>
          )
        }
        if (token.type === 'bold') {
          return (
            <strong key={idx} className="font-semibold text-on-surface select-text cursor-text">
              {token.value}
            </strong>
          )
        }
        if (token.type === 'italic') {
          return (
            <em key={idx} className="italic text-on-surface/90 select-text cursor-text">
              {token.value}
            </em>
          )
        }
        if (token.type === 'strikethrough') {
          return (
            <del key={idx} className="line-through text-on-surface-variant/70 select-text cursor-text">
              {token.value}
            </del>
          )
        }
        if (token.type === 'link' && token.href) {
          return (
            <a
              key={idx}
              href={token.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline hover:text-primary/80 font-medium break-all inline-flex items-center gap-1 mx-0.5 underline-offset-2 transition-colors cursor-pointer"
              title={token.href}
            >
              <span>{token.value}</span>
              <Icon name="open_in_new" size={11} className="inline shrink-0 opacity-70" />
            </a>
          )
        }
        return (
          <span key={idx} className="select-text cursor-text">
            {token.value}
          </span>
        )
      })}
    </span>
  )
}

interface ListItem {
  type: 'bullet' | 'ordered' | 'task'
  indent: number
  text: string
  checked?: boolean
  number?: string
}

interface TextBlock {
  type: 'table' | 'quote' | 'alert' | 'heading' | 'list' | 'hr' | 'text'
  headers?: string[]
  alignments?: Array<'left' | 'center' | 'right'>
  rows?: string[][]
  lines?: string[]
  alertKind?: string
  content?: string
  level?: number
  items?: ListItem[]
}

function parseTableRow(line: string): string[] {
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
  return trimmed.split('|').map((c) => c.trim())
}

function parseTableAlignments(sepLine: string): Array<'left' | 'center' | 'right'> {
  return parseTableRow(sepLine).map((cell) => {
    const trimmed = cell.trim()
    const left = trimmed.startsWith(':')
    const right = trimmed.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    return 'left'
  })
}

function parseListItem(line: string): ListItem | null {
  // 1. Task Checklists: "- [ ] Task" or "- [x] Done"
  const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/)
  if (taskMatch) {
    return {
      type: 'task',
      indent: Math.floor(taskMatch[1].length / 2),
      checked: taskMatch[2].toLowerCase() === 'x',
      text: taskMatch[3]
    }
  }

  // 2. Unordered bullet lists: "- item", "* item", "+ item"
  const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/)
  if (bulletMatch) {
    return {
      type: 'bullet',
      indent: Math.floor(bulletMatch[1].length / 2),
      text: bulletMatch[2]
    }
  }

  // 3. Numbered / Ordered lists: "1. item"
  const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/)
  if (orderedMatch) {
    return {
      type: 'ordered',
      indent: Math.floor(orderedMatch[1].length / 2),
      number: orderedMatch[2],
      text: orderedMatch[3]
    }
  }

  return null
}

const ALERT_STYLES: Record<string, { title: string; icon: string; border: string; bg: string; text: string }> = {
  NOTE: { title: 'Note', icon: 'info', border: 'border-cyan-500/40', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  TIP: { title: 'Tip', icon: 'lightbulb', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  IMPORTANT: { title: 'Important', icon: 'priority_high', border: 'border-purple-500/40', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  WARNING: { title: 'Warning', icon: 'warning', border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  CAUTION: { title: 'Caution', icon: 'error', border: 'border-rose-500/40', bg: 'bg-rose-500/10', text: 'text-rose-400' },
  DANGER: { title: 'Danger', icon: 'error', border: 'border-rose-500/40', bg: 'bg-rose-500/10', text: 'text-rose-400' }
}

function parseTextBlocks(rawText: string): TextBlock[] {
  const lines = rawText.split('\n')
  const blocks: TextBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 1. Table Detection: Line contains '|' and next line is markdown table separator (|---|---|)
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])
    ) {
      const headers = parseTableRow(line)
      const alignments = parseTableAlignments(lines[i + 1])
      i += 2 // skip header and separator row
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().length > 0) {
        rows.push(parseTableRow(lines[i]))
        i++
      }
      blocks.push({ type: 'table', headers, alignments, rows })
      continue
    }

    // 2. Horizontal Rules: "---", "***", "___" (at least 3 characters)
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // 3. Blockquotes, GitHub-style Alerts, and Action Event Lines: Lines starting with '>'
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''))
        i++
      }

      // Check if it's a GitHub-style alert: > [!NOTE], > [!TIP], etc.
      const alertMatch = quoteLines[0]?.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER)\]\s*(.*)$/i)
      if (alertMatch) {
        const kind = alertMatch[1].toUpperCase()
        const firstLineRem = alertMatch[2]
        const rest = firstLineRem ? [firstLineRem, ...quoteLines.slice(1)] : quoteLines.slice(1)
        blocks.push({ type: 'alert', alertKind: kind, lines: rest })
      } else {
        blocks.push({ type: 'quote', lines: quoteLines })
      }
      continue
    }

    // 4. Headings: '#', '##', '###', '####'
    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/)
    if (headingMatch && line.trim().length > 0) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2]
      })
      i++
      continue
    }

    // 5. Lists (Bullet, Ordered, Task Checklists)
    const firstListItem = parseListItem(line)
    if (firstListItem) {
      const items: ListItem[] = [firstListItem]
      i++
      while (i < lines.length) {
        const nextItem = parseListItem(lines[i])
        if (nextItem) {
          items.push(nextItem)
          i++
        } else {
          break
        }
      }
      blocks.push({ type: 'list', items })
      continue
    }

    // 6. Normal paragraph / text lines: gather until special block starts
    const textLines: string[] = [line]
    i++
    while (
      i < lines.length &&
      !lines[i].trim().startsWith('>') &&
      !(
        lines[i].includes('|') &&
        i + 1 < lines.length &&
        /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])
      ) &&
      !lines[i].match(/^(#{1,4})\s+(.*)$/) &&
      !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
      !parseListItem(lines[i])
    ) {
      textLines.push(lines[i])
      i++
    }
    blocks.push({ type: 'text', content: textLines.join('\n') })
  }

  return blocks
}

const ToolExecutionBlock: React.FC<{ lines: string[] }> = ({ lines }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Strip raw emojis from historical logs or upstream raw streams
  const cleanLines = useMemo(() => {
    return lines.map((l) =>
      l
        .replace(/[⚙️✅❌🎯⚠️]/gu, '')
        .trim()
    )
  }, [lines])

  // 1. Task Complete Notice
  const taskCompleteLine = cleanLines.find((l) => l.includes('Task Complete:'))
  if (taskCompleteLine) {
    const summary = taskCompleteLine.replace(/.*Task Complete:\s*/i, '')
    return (
      <div className="my-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-2.5 shadow-2xs select-text">
        <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
          <Icon name="check_circle" size={14} className="text-emerald-400" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider font-mono">
            Task Complete
          </span>
          <span className="text-xs text-on-surface leading-relaxed">
            <InlineFormattedText text={summary} />
          </span>
        </div>
      </div>
    )
  }

  // 2. Safety Intervention
  const safetyLine = cleanLines.find((l) => l.includes('Safety Intervention:'))
  if (safetyLine) {
    const reason = safetyLine.replace(/.*Safety Intervention:\s*/i, '')
    return (
      <div className="my-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-2.5 shadow-2xs select-text">
        <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Icon name="security" size={14} className="text-amber-400" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider font-mono">
            Safety Intervention
          </span>
          <span className="text-xs text-on-surface leading-relaxed">
            <InlineFormattedText text={reason} />
          </span>
        </div>
      </div>
    )
  }

  // 3. Tool Execution Step (Replaces raw Action / Output emojis)
  const actionLine = cleanLines.find((l) => l.includes('Action:') || l.includes('Executing tool'))
  const outputLine = cleanLines.find((l) => l.includes('Output:'))

  if (actionLine || outputLine) {
    let toolName = ''
    if (actionLine) {
      const codeMatch = actionLine.match(/`([^`]+)`/)
      if (codeMatch) {
        toolName = codeMatch[1]
      } else {
        const toolMatch = actionLine.match(/tool\s+([a-zA-Z0-9_\-]+)/i)
        if (toolMatch) toolName = toolMatch[1]
      }
    }

    let toolIcon = 'build'
    const lowerName = toolName.toLowerCase()
    if (lowerName.includes('search')) toolIcon = 'search'
    else if (lowerName.includes('file') || lowerName.includes('read') || lowerName.includes('write')) toolIcon = 'description'
    else if (lowerName.includes('bash') || lowerName.includes('cmd') || lowerName.includes('exec') || lowerName.includes('terminal')) toolIcon = 'terminal'
    else if (lowerName.includes('git') || lowerName.includes('diff')) toolIcon = 'difference'

    let status: 'completed' | 'failed' | 'running' = 'running'
    if (outputLine) {
      if (outputLine.toLowerCase().includes('succeeded') || outputLine.toLowerCase().includes('success')) {
        status = 'completed'
      } else {
        status = 'failed'
      }
    }

    // Filter out redundant raw lines to keep card clean
    const detailLines = cleanLines.filter((l) => {
      const norm = l.replace(/\*\*/g, '').trim()
      if (norm.startsWith('Output: Execution succeeded')) return false
      if (norm.startsWith('Action: Executing tool') && toolName) return false
      return true
    })

    return (
      <div className="my-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest/90 overflow-hidden shadow-2xs select-text">
        <div className="flex items-center justify-between px-3.5 py-2 bg-surface-container-high/60 border-b border-outline-variant/30 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-surface-container-highest flex items-center justify-center text-primary shrink-0 border border-outline-variant/40">
              <Icon name={toolIcon} size={13} />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-on-surface text-[11.5px] truncate">
                Tool Action
              </span>
              {toolName && (
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-primary font-medium border border-outline-variant/40">
                  {toolName}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {status === 'completed' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Icon name="check" size={11} className="text-emerald-400" />
                Completed
              </span>
            )}
            {status === 'failed' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono bg-error/10 text-error border border-error/20">
                <Icon name="error" size={11} className="text-error" />
                Failed
              </span>
            )}
            {status === 'running' && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-mono bg-primary/10 text-primary border border-primary/20 animate-pulse">
                <Icon name="progress_activity" size={11} className="animate-spin text-primary" />
                Running...
              </span>
            )}

            {detailLines.length > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1 rounded hover:bg-surface-container text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer"
                title={isExpanded ? 'Collapse tool output' : 'Expand tool output'}
              >
                <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Details or error logs */}
        {detailLines.length > 0 && (isExpanded || status === 'failed') && (
          <div className="px-3.5 py-2 text-xs font-mono text-on-surface-variant flex flex-col gap-1 leading-relaxed bg-surface-container-lowest border-t border-outline-variant/20">
            {detailLines.map((line, idx) => (
              <div key={idx} className="select-text">
                <InlineFormattedText text={line} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 4. Default Blockquote styling
  return (
    <div className="my-1.5 px-3 py-1.5 rounded-r-lg border-l-2 border-primary/60 bg-surface-container-high/40 text-xs italic text-on-surface-variant select-text">
      {cleanLines.map((qLine, qIdx) => (
        <div key={qIdx} className="leading-snug select-text">
          <InlineFormattedText text={qLine} />
        </div>
      ))}
    </div>
  )
}

export const LiveThinkingIndicator: React.FC<{ modelName?: string }> = ({ modelName }) => {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      setSeconds(Math.max(0, (Date.now() - startTime) / 1000))
    }, 100)
    return () => clearInterval(timer)
  }, [])

  const phase = useMemo(() => {
    if (seconds < 1.8) return 'Analyzing query & active workspace context...'
    if (seconds < 4.2) return 'Synthesizing reasoning & planning tool sequence...'
    if (seconds < 8.0) return 'Formulating code response & diff operations...'
    return 'Finalizing stream & verifying outputs...'
  }, [seconds])

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-xl border border-primary/25 bg-surface-container-lowest/80 select-none animate-fade-in shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Icon name="psychology" size={14} className="animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-on-surface">Thinking</span>
              {modelName && (
                <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-surface-container text-on-surface-variant border border-outline-variant/40">
                  {modelName}
                </span>
              )}
            </div>
            <span className="text-[11px] text-on-surface-variant/80 font-sans truncate">
              {phase}
            </span>
          </div>
        </div>
        <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant/40 shrink-0">
          {seconds.toFixed(1)}s
        </span>
      </div>
      <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/80 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(95, Math.max(12, seconds * 14))}%` }}
        />
      </div>
    </div>
  )
}

const MessageContent: React.FC<{ text: string; isStreaming?: boolean }> = ({ text, isStreaming }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isThinkingOpen, setIsThinkingOpen] = useState(true)

  // Extract <think> reasoning if present
  const thinkMatch = text.match(/<think>([\s\S]*?)(?:<\/think>|$)/i)
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : ''
  const isReasoningActive = isStreaming && text.includes('<think>') && !text.includes('</think>')

  // Clean text from XML artifacts (think blocks, already handled todo tags)
  const cleanText = useMemo(() => {
    return text
      .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '')
      .replace(/<todo>[\s\S]*?<\/todo>/gi, '')
      .trim()
  }, [text])

  const parts = useMemo(() => {
    // Matches ```lang\ncode``` as well as streaming/unclosed ```lang\ncode
    const codeBlockRegex = /```([a-zA-Z0-9_\-\.\s]*?)\r?\n([\s\S]*?)(?:```|$)/g
    const result: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = codeBlockRegex.exec(cleanText)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', content: cleanText.slice(lastIndex, match.index) })
      }
      const lang = match[1]?.trim() || 'code'
      result.push({ type: 'code', lang, content: match[2].trimEnd() })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < cleanText.length) {
      result.push({ type: 'text', content: cleanText.slice(lastIndex) })
    }

    return result
  }, [cleanText])

  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="flex flex-col gap-2 select-text cursor-text">
      {/* 1. Collapsible Thinking Process disclosure for reasoning models */}
      {thinkContent && (
        <details
          open={isStreaming ? true : isThinkingOpen}
          onToggle={(e) => setIsThinkingOpen((e.target as HTMLDetailsElement).open)}
          className="my-1.5 rounded-xl border border-outline-variant/50 bg-surface-container-high/40 text-xs overflow-hidden group select-text"
        >
          <summary className="px-3.5 py-2 font-mono font-medium text-on-surface-variant flex items-center justify-between cursor-pointer hover:bg-surface-container-high/70 select-none">
            <div className="flex items-center gap-2">
              <Icon
                name="psychology"
                size={15}
                className={`text-primary ${isReasoningActive ? 'animate-pulse' : ''}`}
              />
              <span className="text-[11.5px] font-semibold text-primary">
                {isReasoningActive ? 'Reasoning in progress...' : 'Reasoning & Thought Process'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/70 font-mono">
              {isReasoningActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              )}
              <span>click to toggle</span>
            </div>
          </summary>
          <div className="p-3 border-t border-outline-variant/30 text-on-surface-variant/90 text-[11px] font-mono leading-relaxed bg-surface-container-lowest/50 whitespace-pre-wrap select-text max-h-80 overflow-y-auto">
            {thinkContent}
          </div>
        </details>
      )}

      {/* 2. Formatted Content Parts */}
      {parts.map((part, i) => {
        if (part.type === 'code') {
          // If code block is a unified diff, render interactive DiffViewer
          const isDiff =
            part.lang === 'diff' ||
            (part.content.includes('@@ -') &&
              (part.content.includes('\n+') || part.content.includes('\n-')))

          if (isDiff) {
            return (
              <DiffViewer
                key={i}
                diffText={part.content}
                className="my-2 shadow-xs"
              />
            )
          }

          const isCopied = copiedIndex === i
          const lineCount = part.content ? part.content.split('\n').length : 0
          return (
            <div
              key={i}
              className="my-2 rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest font-mono shadow-xs select-text"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-surface-container-high/80 border-b border-outline-variant text-[11px] text-on-surface-variant select-none">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase tracking-wider font-mono text-primary text-[10.5px]">
                    {part.lang}
                  </span>
                  {lineCount > 1 && (
                    <span className="text-[10px] text-on-surface-variant/70 font-mono">
                      {lineCount} lines
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode(part.content, i)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer text-[11px] font-mono border border-outline-variant/60 shadow-xs"
                  title="Copy code to clipboard"
                >
                  <Icon
                    name={isCopied ? 'check' : 'content_copy'}
                    size={12}
                    className={isCopied ? 'text-emerald-500' : 'text-on-surface-variant'}
                  />
                  <span className={isCopied ? 'text-emerald-500 font-medium' : ''}>
                    {isCopied ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-on-surface leading-relaxed select-text cursor-text text-xs font-mono bg-surface-container-lowest">
                <code className="select-text cursor-text">{part.content}</code>
              </pre>
            </div>
          )
        }

        // Render formatted text blocks (tables, lists, callouts, alerts, headings, and paragraphs)
        const textBlocks = parseTextBlocks(part.content)

        return (
          <div key={i} className="flex flex-col gap-2 select-text cursor-text leading-relaxed">
            {textBlocks.map((block, bIdx) => {
              // A. GFM Tables with alignment and responsive horizontal scroll
              if (block.type === 'table' && block.headers && block.rows) {
                return (
                  <div
                    key={bIdx}
                    className="overflow-x-auto my-2.5 rounded-xl border border-outline-variant/70 bg-surface-container-lowest/80 shadow-xs max-w-full"
                  >
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-outline-variant bg-surface-container-high/70 text-on-surface font-semibold">
                          {block.headers.map((header, hIdx) => {
                            const align = block.alignments?.[hIdx]
                            const alignClass =
                              align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
                            return (
                              <th
                                key={hIdx}
                                className={`px-3.5 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-on-surface select-text whitespace-nowrap ${alignClass}`}
                              >
                                <InlineFormattedText text={header} />
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/25">
                        {block.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-surface-container/40 transition-colors"
                          >
                            {block.headers!.map((_, cIdx) => {
                              const align = block.alignments?.[cIdx]
                              const alignClass =
                                align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
                              return (
                                <td
                                  key={cIdx}
                                  className={`px-3.5 py-2 text-on-surface-variant align-top leading-relaxed select-text ${alignClass}`}
                                >
                                  <InlineFormattedText text={row[cIdx] || ''} />
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }

              // B. Structured Lists (Bullets, Numbered, Checklists)
              if (block.type === 'list' && block.items) {
                return (
                  <div key={bIdx} className="flex flex-col gap-1.5 my-1.5">
                    {block.items.map((item, lIdx) => {
                      const plClass =
                        item.indent >= 2 ? 'pl-6' : item.indent === 1 ? 'pl-3' : 'pl-0'

                      if (item.type === 'task') {
                        return (
                          <div key={lIdx} className={`flex items-start gap-2 text-xs ${plClass}`}>
                            <input
                              type="checkbox"
                              checked={item.checked}
                              readOnly
                              className="mt-0.5 rounded border-outline-variant text-primary focus:ring-0 cursor-default pointer-events-none"
                            />
                            <span
                              className={`flex-1 select-text ${
                                item.checked ? 'line-through text-on-surface-variant/60' : 'text-on-surface'
                              }`}
                            >
                              <InlineFormattedText text={item.text} />
                            </span>
                          </div>
                        )
                      }

                      if (item.type === 'ordered') {
                        return (
                          <div key={lIdx} className={`flex items-start gap-2 text-xs ${plClass}`}>
                            <span className="font-mono text-primary text-[11px] font-semibold select-none min-w-[1.2rem]">
                              {item.number}.
                            </span>
                            <span className="text-on-surface flex-1 select-text">
                              <InlineFormattedText text={item.text} />
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div key={lIdx} className={`flex items-start gap-2 text-xs ${plClass}`}>
                          <span className="text-primary text-[12px] leading-none mt-1 select-none shrink-0">•</span>
                          <span className="text-on-surface flex-1 select-text">
                            <InlineFormattedText text={item.text} />
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              }

              // C. GitHub-style Alert Callouts ([!NOTE], [!TIP], [!WARNING], etc.)
              if (block.type === 'alert' && block.alertKind && block.lines) {
                const style = ALERT_STYLES[block.alertKind] || ALERT_STYLES.NOTE
                return (
                  <div
                    key={bIdx}
                    className={`my-2 p-3 rounded-xl border ${style.border} ${style.bg} flex flex-col gap-1.5 text-xs select-text shadow-2xs`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider">
                      <Icon name={style.icon} size={14} className={style.text} />
                      <span className={style.text}>{style.title}</span>
                    </div>
                    <div className="text-on-surface leading-relaxed pl-5 flex flex-col gap-1">
                      {block.lines.map((aLine, aIdx) => (
                        <div key={aIdx} className="select-text">
                          <InlineFormattedText text={aLine} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }

              // D. Tool Execution Steps & Blockquotes
              if (block.type === 'quote' && block.lines) {
                return <ToolExecutionBlock key={bIdx} lines={block.lines} />
              }

              // E. Headings (#, ##, ###, ####)
              if (block.type === 'heading' && block.content) {
                const headingClass =
                  block.level === 1
                    ? 'text-base font-bold text-on-surface mt-3 mb-1 pb-1 border-b border-outline-variant/30'
                    : block.level === 2
                      ? 'text-sm font-semibold text-on-surface mt-2 mb-0.5'
                      : block.level === 3
                        ? 'text-xs font-semibold text-on-surface mt-1.5 mb-0.5'
                        : 'text-xs font-medium uppercase tracking-wider text-on-surface-variant mt-1 mb-0.5'
                return (
                  <div key={bIdx} className={headingClass}>
                    <InlineFormattedText text={block.content} />
                  </div>
                )
              }

              // F. Horizontal Divider Rules
              if (block.type === 'hr') {
                return <hr key={bIdx} className="my-3 border-t border-outline-variant/40" />
              }

              // G. Standard Paragraph Text
              return (
                <div key={bIdx} className="whitespace-pre-wrap select-text cursor-text leading-relaxed">
                  <InlineFormattedText text={block.content || ''} />
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export const ChatView: React.FC = () => {
  const {
    setHasActiveRun,
    connectedModel,
    workspace,
    setActiveView,
    isInspectorOpen,
    toggleInspector,
    activeConversationId,
    conversations,
    startNewChat,
    loadConversations
  } = useUiStore()
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const activeConv = conversations.find((c) => c.id === activeConversationId)
  const [failoverNotice, setFailoverNotice] = useState<{
    from: string
    to: string
    reason: string
    isSilent: boolean
    resetEta?: string | null
  } | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])

  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages or tokens arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load existing conversation on mount or when active conversation changes
  useEffect(() => {
    setIsStreaming(false)
    setHasActiveRun(false)
    setActiveRunId(null)
    setFailoverNotice(null)

    if (window.electronApi?.getConversation) {
      window.electronApi
        .getConversation(activeConversationId)
        .then((res) => {
          if (res && res.messages && res.messages.length > 0) {
            setMessages(
              res.messages.map((m) => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                text: m.content,
                time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                model: m.modelId || undefined
              }))
            )
          } else {
            setMessages([])
          }
        })
        .catch((err) => {
          console.error('[ChatView] Failed to load conversation:', err)
          setMessages([])
        })
    } else {
      setMessages([])
    }
  }, [activeConversationId])

  // Setup streaming token listener
  useEffect(() => {
    if (!window.electronApi?.onStreamToken) return

    const unsubscribe = window.electronApi.onStreamToken((data) => {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1]
        if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.isStreaming) {
          return prev
        }

        if (data.error) {
          soundService.play('error')
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              text: lastMsg.text ? `${lastMsg.text}\n\n[Error: ${data.error}]` : `[Error: ${data.error}]`,
              isStreaming: false,
              error: data.error
            }
          ]
        }

        if (data.isComplete) {
          loadConversations()
          soundService.play('success')
          const finalText = lastMsg.text.trim()
            ? lastMsg.text
            : (data.error ? `[Error: ${data.error}]` : '[No response received from model. Upstream provider closed connection without emitting tokens.]')
          return [
            ...prev.slice(0, -1),
            {
              ...lastMsg,
              text: finalText,
              isStreaming: false
            }
          ]
        }

        return [
          ...prev.slice(0, -1),
          {
            ...lastMsg,
            text: lastMsg.text + data.delta
          }
        ]
      })

      if (data.isComplete || data.error) {
        setIsStreaming(false)
        setHasActiveRun(false)
        setActiveRunId(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Setup failover event listener
  useEffect(() => {
    if (!window.electronApi?.onFailoverEvent) return

    const unsubscribe = window.electronApi.onFailoverEvent((data) => {
      setFailoverNotice({
        from: `${data.fromProvider} (${data.fromModel})`,
        to: `${data.toProvider} (${data.toModel})`,
        reason: data.reason,
        isSilent: data.isSilent,
        resetEta: data.resetEta
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleSendPrompt = async (text: string) => {
    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsgId = `msg-${Date.now()}`
    const assistantMsgId = `msg-assistant-${Date.now()}`

    // Check if any provider is connected
    if (!connectedModel.isConnected || connectedModel.name === 'No Model Connected') {
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: 'user',
          text,
          time: userTime
        },
        {
          id: assistantMsgId,
          role: 'assistant',
          text: 'No AI provider is connected yet. Please navigate to AI Providers and add an API key (e.g. Google Gemini, Groq, Cerebras, or OmniRoute) to start generating responses.',
          time: userTime,
          isStreaming: false,
          error: 'No provider connected'
        }
      ])
      setIsStreaming(false)
      setHasActiveRun(false)
      return
    }

    // Optimistically add user message and streaming assistant placeholder
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text,
        time: userTime
      },
      {
        id: assistantMsgId,
        role: 'assistant',
        text: '',
        time: userTime,
        model: connectedModel.name,
        isStreaming: true
      }
    ])

    setIsStreaming(true)
    setHasActiveRun(true)

    try {
      if (window.electronApi?.sendPrompt) {
        // Resolve provider and model ID (support universal AI Agent auto-switch)
        const isAuto =
          connectedModel.providerId === 'auto' ||
          connectedModel.name.includes('(Auto') ||
          connectedModel.name.startsWith('auto/')
        const providerId = isAuto ? 'auto' : (connectedModel.providerId as string) || 'gemini'
        const modelId = isAuto ? (connectedModel.name.startsWith('auto/') ? connectedModel.name : 'auto/free') : connectedModel.name

        const result = await window.electronApi.sendPrompt({
          conversationId: activeConversationId,
          prompt: text,
          modelId,
          providerId,
          workspacePath: workspace.path
        })
        loadConversations()

        if (!result.success) {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              id: assistantMsgId,
              role: 'assistant',
              text: `Failed to initiate generation: ${result.error || 'Unknown error'}`,
              time: userTime,
              isStreaming: false,
              error: result.error
            }
          ])
          setIsStreaming(false)
          setHasActiveRun(false)
        } else if (result.runId) {
          setActiveRunId(result.runId)
        }
      } else {
        // Fallback local simulation if running in pure browser
        setTimeout(() => {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              id: assistantMsgId,
              role: 'assistant',
              text: `Simulated local response for: "${text}"`,
              time: userTime,
              isStreaming: false
            }
          ])
          setIsStreaming(false)
          setHasActiveRun(false)
        }, 1000)
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          id: assistantMsgId,
          role: 'assistant',
          text: `Request error: ${err.message}`,
          time: userTime,
          isStreaming: false,
          error: err.message
        }
      ])
      setIsStreaming(false)
      setHasActiveRun(false)
    }
  }

  const handleCancelRun = async () => {
    if (activeRunId && window.electronApi?.cancelRun) {
      await window.electronApi.cancelRun(activeRunId)
    }
    setIsStreaming(false)
    setHasActiveRun(false)
    setActiveRunId(null)
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.isStreaming) {
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            text: last.text + ' [Generation stopped by user]',
            isStreaming: false
          }
        ]
      }
      return prev
    })
  }

  const handleNewChat = () => {
    startNewChat()
    setMessages([])
    setIsStreaming(false)
    setActiveRunId(null)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-surface relative min-w-0 overflow-hidden font-sans">
      {/* Top Context Bar / Banner */}
      <div className="h-12 bg-surface-container-lowest flex items-center justify-between px-space-xl z-10 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-space-sm min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${isStreaming ? 'bg-primary animate-ping' : 'bg-emerald-500 animate-pulse'
              }`}
          />

          <span className="font-semibold text-on-surface text-xs truncate max-w-[240px]">
            {activeConv?.title || 'Chat'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono shrink-0 border border-outline-variant">
            {isStreaming ? 'Generating...' : 'Ready'}
          </span>
        </div>

        <div className="flex items-center gap-space-sm shrink-0">
          {isStreaming ? (
            <button
              onClick={handleCancelRun}
              className="flex items-center gap-space-xs px-space-md py-1 rounded bg-error/20 hover:bg-error text-error hover:text-on-error text-xs font-mono transition-colors border border-error/30"
              title="Stop Generation"
            >
              <Icon name="close" size={14} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-space-xs px-space-md py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-mono transition-colors border border-outline-variant"
              title="Start New Conversation"
            >
              <Icon name="add" size={14} />
              <span>New Chat</span>
            </button>
          )}

          {/* Files & Diffs Inspector Toggle */}
          <button
            onClick={toggleInspector}
            className={`flex items-center gap-space-xs px-space-md py-1 rounded text-xs font-mono transition-colors border cursor-pointer ${isInspectorOpen
              ? 'bg-primary text-on-primary border-primary shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant'
              }`}
            title="Toggle Workspace Files & Diffs Panel"
          >
            <Icon name="description" size={14} />
            <span>Files</span>
          </button>

          <button
            onClick={() => setActiveView('ai-providers')}
            className="flex items-center gap-space-xs px-space-md py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-mono transition-colors border border-outline-variant"
            title="Configure Models"
          >
            <Icon name="tune" size={14} />
            <span>Config</span>
          </button>
        </div>
      </div>

      {/* Scrollable Conversation Area */}
      <div className="flex-1 overflow-y-auto px-space-xl py-space-xl flex flex-col gap-space-xl">
        {messages.length === 0 ? (
          <WelcomeHero onStartPrompt={handleSendPrompt} />
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user'

            return (
              <div
                key={msg.id}
                className={`flex gap-space-lg ${isUser ? 'max-w-3xl' : 'max-w-4xl'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-outline-variant ${isUser ? 'bg-surface-container-high' : 'bg-primary text-on-primary shadow-sm'
                    }`}
                >
                  <Icon name={isUser ? 'person' : 'smart_toy'} size={18} />
                </div>

                <div className="flex flex-col gap-space-xs flex-1 min-w-0 select-text">
                  <div className="flex items-center gap-space-sm select-none">
                    <span className="font-headline-sm text-on-surface font-semibold text-xs">
                      {isUser ? 'You' : 'AI Agent'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-mono">{msg.time}</span>
                    {!isUser && msg.model && msg.model !== 'AI Agent' && (
                      <span className="text-[9.5px] text-on-surface-variant/70 font-mono bg-surface-container-high px-1.5 py-0.5 rounded border border-outline-variant/30">
                        {msg.model}
                      </span>
                    )}
                    {!isUser && isStreaming && msg.isStreaming && (
                      <span className="text-[10px] text-tertiary font-mono animate-pulse">
                        Streaming...
                      </span>
                    )}
                  </div>

                  <div
                    className={`text-body-md text-on-surface p-space-lg rounded-xl border border-outline-variant shadow-sm leading-relaxed text-xs select-text cursor-text ${
                      isUser ? 'bg-surface-container-lowest' : 'bg-surface-container'
                    } ${msg.error ? 'border-error/40 text-error' : ''}`}
                  >
                    {!isUser && msg.text && <TodoDock content={msg.text} />}
                    {msg.text ? (
                      <MessageContent text={msg.text} isStreaming={msg.isStreaming} />
                    ) : msg.isStreaming ? (
                      <LiveThinkingIndicator modelName={msg.model} />
                    ) : (
                      <span className="italic text-on-surface-variant">
                        [No response received from model]
                      </span>
                    )}
                    {!isUser && msg.isStreaming && msg.text && (
                      <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-outline-variant/30 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        <span className="text-[10px] text-primary/80 font-mono">
                          Generating response...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Failover Alert Pill */}
      {failoverNotice && (
        <div
          className={`mx-space-xl mb-2 px-space-md py-2 rounded-xl text-xs flex items-center justify-between border animate-fade-in ${failoverNotice.isSilent
            ? 'bg-secondary-container/40 border-secondary/40 text-on-surface'
            : 'bg-error-container/30 border-error/40 text-error'
            }`}
        >
          <div className="flex items-center gap-2">
            <Icon name="swap_horiz" size={16} className={failoverNotice.isSilent ? 'text-secondary' : 'text-error'} />
            <span>
              {failoverNotice.isSilent ? (
                <>
                  Seamless Failover: Switched from <strong className="font-mono">{failoverNotice.from}</strong> to{' '}
                  <strong className="font-mono">{failoverNotice.to}</strong> ({failoverNotice.reason})
                </>
              ) : (
                <>
                  Stream interrupted on <strong className="font-mono">{failoverNotice.from}</strong>: {failoverNotice.reason}
                </>
              )}
            </span>
          </div>
          <button
            onClick={() => setFailoverNotice(null)}
            className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Chat Composer Anchored at Bottom */}
      <PromptComposer onSend={handleSendPrompt} disabled={isStreaming} />
    </div>
  )
}

export default ChatView
