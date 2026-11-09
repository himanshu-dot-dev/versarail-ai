import React, { useState, useMemo } from 'react'
import Icon from './Icon'

export interface DiffViewerProps {
  diffText: string
  filePath?: string
  maxHeight?: string
  className?: string
  onAccept?: () => void
  onReject?: () => void
}

interface ParsedDiffLine {
  type: 'header' | 'hunk' | 'add' | 'del' | 'context'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diffText,
  filePath,
  maxHeight = 'max-h-96',
  className = '',
  onAccept,
  onReject
}) => {
  const [copied, setCopied] = useState(false)

  // Parse unified diff into structured lines with line numbers and stats
  const { lines, additions, deletions, detectedFile } = useMemo(() => {
    const rawLines = diffText.split('\n')
    const result: ParsedDiffLine[] = []
    let adds = 0
    let dels = 0
    let file = filePath || ''

    let oldLine = 0
    let newLine = 0

    for (const line of rawLines) {
      if (line.startsWith('--- ') || line.startsWith('+++ ')) {
        result.push({ type: 'header', content: line })
        if (!file) {
          const match = line.match(/(?:a|b)\/(.+)$/)
          if (match) file = match[1]
        }
        continue
      }

      if (line.startsWith('diff --git') || line.startsWith('index ')) {
        result.push({ type: 'header', content: line })
        continue
      }

      const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (hunkMatch) {
        oldLine = parseInt(hunkMatch[1], 10)
        newLine = parseInt(hunkMatch[2], 10)
        result.push({ type: 'hunk', content: line })
        continue
      }

      if (line.startsWith('+')) {
        adds++
        result.push({
          type: 'add',
          content: line.slice(1),
          newLineNumber: newLine++
        })
        continue
      }

      if (line.startsWith('-')) {
        dels++
        result.push({
          type: 'del',
          content: line.slice(1),
          oldLineNumber: oldLine++
        })
        continue
      }

      // Context line
      const cleanContent = line.startsWith(' ') ? line.slice(1) : line
      result.push({
        type: 'context',
        content: cleanContent,
        oldLineNumber: oldLine > 0 ? oldLine++ : undefined,
        newLineNumber: newLine > 0 ? newLine++ : undefined
      })
    }

    return { lines: result, additions: adds, deletions: dels, detectedFile: file }
  }, [diffText, filePath])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diffText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className={`my-2 rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest font-mono shadow-xs select-text ${className}`}>
      {/* Diff Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-container-high/80 border-b border-outline-variant text-[11px] text-on-surface-variant select-none">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="compare" size={14} className="text-primary shrink-0" />
          <span className="font-semibold text-on-surface truncate">
            {detectedFile || 'Unified Diff'}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0 ml-1">
            {additions > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
                +{additions}
              </span>
            )}
            {deletions > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 font-semibold">
                -{deletions}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onReject && (
            <button
              type="button"
              onClick={onReject}
              className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Reject
            </button>
          )}
          {onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="px-3 py-1 rounded bg-primary hover:bg-primary-container text-on-primary text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
            >
              Apply Patch
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer text-[10.5px] border border-outline-variant/60"
            title="Copy raw diff"
          >
            <Icon name={copied ? 'check' : 'copy'} size={11} className={copied ? 'text-emerald-500' : ''} />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Diff Content Lines */}
      <div className={`overflow-x-auto overflow-y-auto ${maxHeight} text-xs leading-relaxed select-text`}>
        <table className="w-full border-collapse font-mono select-text">
          <tbody>
            {lines.map((l, idx) => {
              if (l.type === 'hunk') {
                return (
                  <tr key={idx} className="bg-surface-container-high/40 text-cyan-400 font-semibold select-none">
                    <td colSpan={3} className="px-3 py-1 text-[11px] font-mono border-y border-outline-variant/30">
                      {l.content}
                    </td>
                  </tr>
                )
              }

              if (l.type === 'header') {
                return (
                  <tr key={idx} className="bg-surface-container-lowest/80 text-on-surface-variant/60 select-none">
                    <td colSpan={3} className="px-3 py-0.5 text-[10.5px] font-mono italic">
                      {l.content}
                    </td>
                  </tr>
                )
              }

              const isAdd = l.type === 'add'
              const isDel = l.type === 'del'

              const rowClass = isAdd
                ? 'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500'
                : isDel
                ? 'bg-rose-500/10 text-rose-300 border-l-2 border-rose-500'
                : 'hover:bg-surface-container/30 text-on-surface/90'

              return (
                <tr key={idx} className={`${rowClass} transition-colors`}>
                  {/* Old line number */}
                  <td className="w-9 py-0.5 pr-1 text-right text-[10px] text-on-surface-variant/40 select-none font-mono">
                    {l.oldLineNumber || ''}
                  </td>
                  {/* New line number */}
                  <td className="w-9 py-0.5 pr-2 text-right text-[10px] text-on-surface-variant/40 select-none font-mono">
                    {l.newLineNumber || ''}
                  </td>
                  {/* Content line */}
                  <td className="py-0.5 pl-2 pr-4 font-mono select-text whitespace-pre text-[11.5px]">
                    <span className="inline-block w-3 select-none font-bold opacity-75">
                      {isAdd ? '+' : isDel ? '-' : ' '}
                    </span>
                    <span className="select-text">{l.content}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DiffViewer

