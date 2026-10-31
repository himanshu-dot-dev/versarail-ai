import React, { useState } from 'react'
import Icon from '../../components/common/Icon'
import { UnifiedDiffResultDTO } from '@shared/schemas/diff.schema'

export interface DiffViewerProps {
  diff: UnifiedDiffResultDTO | null
  onApply?: () => void
  onReject?: () => void
  onRefresh?: () => void
  isApplying?: boolean
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  onApply,
  onReject,
  onRefresh,
  isApplying = false
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')

  if (!diff) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-space-xl text-on-surface-variant text-xs gap-space-sm select-none">
        <Icon name="difference" size={32} className="text-on-surface-variant/40" />
        <p className="font-medium text-on-surface">No Pending Diffs</p>
        <p className="text-[11px] text-on-surface-variant">
          When the AI agent proposes file edits, the unified diff will appear here for review.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-container-lowest overflow-hidden select-none font-sans border-l border-outline-variant/20">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-space-md py-space-sm border-b border-surface-container-high bg-surface-container-low shrink-0">
        <div className="flex items-center gap-space-sm min-w-0">
          <Icon name="description" size={16} className="text-primary shrink-0" />
          <span className="font-mono text-xs font-semibold text-on-surface truncate">
            {diff.filePath}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container text-tertiary font-mono text-[10px] font-bold">
            +{diff.additions}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-surface-container text-error font-mono text-[10px] font-bold">
            -{diff.deletions}
          </span>
        </div>

        <div className="flex items-center gap-space-sm">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface-container rounded-lg p-0.5 border border-outline-variant/30 text-[11px]">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                viewMode === 'unified'
                  ? 'bg-primary-container text-on-primary-container shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                viewMode === 'split'
                  ? 'bg-primary-container text-on-primary-container shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Split
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              title="Refresh / Re-verify Conflict"
            >
              <Icon name="refresh" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* External Modification Conflict Alert */}
      {diff.hasConflict && (
        <div className="px-space-md py-2 bg-error-container/40 border-b border-error/30 flex items-center gap-space-sm text-xs text-error shrink-0">
          <Icon name="warning" size={16} className="text-error shrink-0" />
          <div className="flex flex-col">
            <span className="font-semibold">Conflict Detected (Stale Read)</span>
            <span className="text-[11px] opacity-90">
              {diff.conflictReason ||
                'Target file was modified externally since baseline read. Applying patch would cause silent overwrite.'}
            </span>
          </div>
        </div>
      )}

      {/* Baseline Metadata Chip Bar */}
      <div className="flex items-center justify-between px-space-md py-1 bg-surface-container-high/40 border-b border-surface-container-high text-[10px] font-mono text-on-surface-variant shrink-0">
        <span>Baseline SHA-256: {diff.baselineSha256.slice(0, 16)}...</span>
        <span>Hunks: {diff.hunks.length}</span>
      </div>

      {/* Diff Content Scroller */}
      <div className="flex-1 overflow-auto p-space-sm font-mono text-xs leading-5">
        {diff.hunks.length === 0 ? (
          <div className="p-space-lg text-center text-on-surface-variant">
            Identical content — no textual changes detected.
          </div>
        ) : (
          diff.hunks.map((hunk, hIdx) => (
            <div key={`hunk-${hIdx}`} className="mb-space-md border border-outline-variant/20 rounded-lg overflow-hidden">
              {/* Hunk Header */}
              <div className="px-space-md py-1 bg-surface-container text-primary font-mono text-[11px] font-semibold border-b border-outline-variant/20">
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </div>

              {/* Hunk Lines */}
              <div className="bg-surface-container-lowest divide-y divide-surface-container-high/20">
                {hunk.lines.map((line, lIdx) => {
                  const isAdd = line.type === 'add'
                  const isDelete = line.type === 'delete'

                  return (
                    <div
                      key={`l-${lIdx}`}
                      className={`flex items-start text-[11px] px-2 py-0.5 ${
                        isAdd
                          ? 'bg-tertiary/10 text-tertiary'
                          : isDelete
                          ? 'bg-error/10 text-error'
                          : 'text-on-surface-variant/90'
                      }`}
                    >
                      {/* Old Line Number */}
                      <span className="w-10 text-right pr-2 text-on-surface-variant/40 shrink-0 select-none">
                        {line.oldLineNumber ?? ''}
                      </span>
                      {/* New Line Number */}
                      <span className="w-10 text-right pr-3 text-on-surface-variant/40 shrink-0 select-none">
                        {line.newLineNumber ?? ''}
                      </span>
                      {/* Diff Sign */}
                      <span className="w-4 font-bold select-none shrink-0">
                        {isAdd ? '+' : isDelete ? '-' : ' '}
                      </span>
                      {/* Line Text */}
                      <span className="flex-1 whitespace-pre-wrap break-all font-mono">
                        {line.content || ' '}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Actions Footer */}
      {(onApply || onReject) && (
        <div className="p-space-md border-t border-surface-container-high bg-surface-container-low flex items-center justify-between shrink-0">
          <div className="flex items-center gap-space-sm text-[11px] text-on-surface-variant font-mono">
            <span>TOCTOU Verified</span>
          </div>

          <div className="flex items-center gap-space-sm">
            {onReject && (
              <button
                onClick={onReject}
                disabled={isApplying}
                className="flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-xs transition-colors border border-outline-variant/30"
              >
                <Icon name="close" size={14} />
                <span>Reject</span>
              </button>
            )}

            {onApply && (
              <button
                onClick={onApply}
                disabled={diff.hasConflict || isApplying}
                className={`flex items-center gap-1.5 px-space-lg py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                  diff.hasConflict
                    ? 'bg-surface-container-high text-on-surface-variant/50 cursor-not-allowed border border-outline-variant/30'
                    : 'bg-primary text-on-primary hover:opacity-90'
                }`}
                title={diff.hasConflict ? 'Cannot apply: External conflict detected' : 'Apply patch atomically'}
              >
                <Icon name="check" size={14} />
                <span>{isApplying ? 'Applying...' : 'Apply Patch'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DiffViewer

