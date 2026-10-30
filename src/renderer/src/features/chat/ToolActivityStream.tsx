import React from 'react'
import Icon from '../../components/common/Icon'

export interface ToolActivityItem {
  id: string
  action: string
  target: string
  timestamp?: string
}

export interface ToolActivityStreamProps {
  activities?: ToolActivityItem[]
}

export const ToolActivityStream: React.FC<ToolActivityStreamProps> = ({
  activities = [
    { id: '1', action: 'Read', target: 'src/auth/authService.ts' },
    { id: '2', action: 'Search', target: 'src/ for authentication references' },
    { id: '3', action: 'Edit', target: 'src/auth/authService.ts' },
    { id: '4', action: 'Create', target: 'src/auth/authService.test.ts' }
  ]
}) => {
  return (
    <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs font-mono text-label-sm text-on-surface-variant border border-outline-variant/30 select-none">
      <div className="flex items-center gap-space-sm text-on-surface font-sans font-medium text-body-sm pb-1 border-b border-surface-container-high/60">
        <Icon name="terminal" size={14} className="text-tertiary" />
        <span>Tool Activity Stream</span>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        {activities.map((item) => (
          <div key={item.id} className="flex items-center gap-space-sm pl-space-sm py-0.5">
            <span className="text-tertiary font-bold">→</span>
            <span>
              {item.action} <code className="text-on-surface bg-surface-container px-1 py-0.5 rounded font-mono">{item.target}</code>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ToolActivityStream

