import React, { useState } from 'react'
import Icon from '../../components/common/Icon'

export interface TimelineStep {
  id: string
  title: string
  duration?: string
  status: 'completed' | 'in_progress' | 'waiting_approval' | 'pending' | 'failed'
}

export interface ExecutionTimelineProps {
  steps?: TimelineStep[]
  runId?: string
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  steps = []
}) => {
  const [isOpen, setIsOpen] = useState(true)

  if (!steps || steps.length === 0) return null

  const completedCount = steps.filter((s) => s.status === 'completed').length
  const awaitingCount = steps.filter((s) => s.status === 'waiting_approval').length

  return (
    <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md border border-outline-variant/30 select-none">
      {/* Expandable Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex items-center gap-space-sm">
          <Icon name="account_tree" size={18} className="text-primary" />
          <span className="text-headline-sm text-on-surface font-medium">
            Execution Timeline ({steps.length} steps)
          </span>
        </div>

        <div className="flex items-center gap-space-sm">
          <span className="text-label-sm text-tertiary font-mono">
            {completedCount} Completed{awaitingCount > 0 ? `, ${awaitingCount} Awaiting` : ''}
          </span>
          <Icon
            name={isOpen ? 'expand_less' : 'expand_more'}
            size={18}
            className="text-on-surface-variant transition-transform"
          />
        </div>
      </div>

      {/* Steps List */}
      {isOpen && (
        <div className="flex flex-col gap-space-sm pt-space-xs">
          {steps.map((step) => {
            const isCompleted = step.status === 'completed'
            const isWaiting = step.status === 'waiting_approval'
            const isInProgress = step.status === 'in_progress'

            return (
              <div
                key={step.id}
                className={`flex items-center justify-between p-space-sm rounded transition-colors ${
                  isWaiting
                    ? 'bg-primary-container/20 border border-primary-container/40'
                    : 'bg-surface-container/50 border border-outline-variant/10'
                }`}
              >
                <div className="flex items-center gap-space-sm">
                  {isCompleted && (
                    <Icon name="check_circle" size={16} className="text-tertiary" filled />
                  )}
                  {isWaiting && (
                    <Icon name="progress_activity" size={16} className="text-primary animate-spin" />
                  )}
                  {isInProgress && (
                    <Icon name="sync" size={16} className="text-tertiary animate-spin" />
                  )}
                  {step.status === 'pending' && (
                    <Icon name="radio_button_unchecked" size={16} className="text-outline" />
                  )}

                  <span
                    className={`text-body-md ${
                      isWaiting ? 'text-primary font-medium' : 'text-on-surface'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                <span
                  className={`text-label-sm font-mono ${
                    isWaiting ? 'text-primary font-medium' : 'text-on-surface-variant'
                  }`}
                >
                  {step.duration}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ExecutionTimeline

