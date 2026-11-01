import React from 'react'
import Icon from '../../components/common/Icon'
import { useUiStore } from '../../app/useUiStore'

export interface FileChangeBannerProps {
  summary?: string
  additions?: number
  deletions?: number
  onAccept?: () => void
  onReject?: () => void
  onOpenDiff?: () => void
  onRetry?: () => void
}

export const FileChangeBanner: React.FC<FileChangeBannerProps> = ({
  summary = '',
  additions = 0,
  deletions = 0,
  onAccept,
  onReject,
  onOpenDiff,
  onRetry
}) => {
  const { setInspectorTab, setInspectorOpen } = useUiStore()

  if (!summary && additions === 0 && deletions === 0) return null

  const handleReview = () => {
    setInspectorOpen(true)
    setInspectorTab('changes')
    onOpenDiff?.()
  }

  return (
    <div className="flex flex-col gap-space-sm">
      {/* File Change Summary Card */}
      <div className="bg-surface-container p-space-md rounded-xl flex items-center justify-between border border-outline-variant select-none">
        <div className="flex items-center gap-space-md">
          <Icon name="code_blocks" size={24} className="text-tertiary" />
          <div className="flex flex-col">
            <span className="text-body-md text-on-surface font-medium">{summary}</span>
            <span className="text-label-sm text-on-surface-variant font-mono">
              <span className="text-tertiary">+{additions}</span>{' '}
              <span className="text-error">-{deletions}</span> lines
            </span>
          </div>
        </div>

        <button
          onClick={handleReview}
          className="text-primary hover:underline text-label-md font-mono flex items-center gap-space-xs"
        >
          <span>[Review Changes]</span>
          <Icon name="arrow_forward" size={14} />
        </button>
      </div>

      {/* Decision Action Buttons */}
      <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
        <button
          onClick={onAccept}
          className="flex items-center gap-space-sm px-space-xl py-space-md rounded bg-primary text-on-primary font-medium text-body-md hover:opacity-90 transition-opacity shadow-sm"
        >
          <Icon name="check" size={18} />
          <span>Accept Changes</span>
        </button>

        <button
          onClick={onReject}
          className="flex items-center gap-space-sm px-space-xl py-space-md rounded bg-surface-container text-on-surface font-medium text-body-md hover:bg-surface-container-high transition-colors border border-outline-variant"
        >
          <Icon name="close" size={18} />
          <span>Reject Changes</span>
        </button>

        <button
          onClick={handleReview}
          className="flex items-center gap-space-sm px-space-lg py-space-md rounded bg-surface-container text-on-surface font-medium text-body-md hover:bg-surface-container-high transition-colors border border-outline-variant"
        >
          <Icon name="difference" size={18} />
          <span>Open Diff</span>
        </button>

        <button
          onClick={onRetry}
          className="flex items-center gap-space-sm px-space-lg py-space-md rounded bg-surface-container text-on-surface font-medium text-body-md hover:bg-surface-container-high transition-colors border border-outline-variant"
        >
          <Icon name="refresh" size={18} />
          <span>Retry</span>
        </button>
      </div>
    </div>
  )
}

export default FileChangeBanner

