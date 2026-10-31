import React from 'react'
import { UiProvider, useUiStore } from './useUiStore'
import { viewRegistry } from './viewRegistry'
import { TitleBar } from '../components/layout/TitleBar'
import { Sidebar } from '../components/layout/Sidebar'
import { InspectorPanel } from '../components/layout/InspectorPanel'
import { ChatView } from '../features/chat/ChatView'
import { PermissionModal } from '../components/permissions/PermissionModal'

const ShellContent: React.FC = () => {
  const { activeView } = useUiStore()

  // Dynamic view resolution from registry
  const currentViewDef = viewRegistry.get(activeView) || viewRegistry.get('chat')
  const ActiveComponent = currentViewDef?.component || ChatView
  const hasInspector = !!currentViewDef?.hasInspector

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface font-body-md text-on-surface flex flex-col selection:bg-primary/20">
      {/* Global Action Permission Approval Modal */}
      <PermissionModal />

      {/* Native-style Frameless Titlebar */}
      <TitleBar />

      {/* Main Workspace Area (Sidebar + Active View + Optional Inspector) */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Active Feature View */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto bg-surface">
          <ActiveComponent />
        </main>

        {/* Optional Right-hand Inspector Panel */}
        {hasInspector && <InspectorPanel />}
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  return (
    <UiProvider>
      <ShellContent />
    </UiProvider>
  )
}
