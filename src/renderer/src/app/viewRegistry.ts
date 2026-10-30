import React from 'react'
import { ChatView } from '../features/chat/ChatView'
import { ProjectsView } from '../features/workspace/ProjectsView'
import { FileExplorerView } from '../features/workspace/FileExplorerView'
import { ProvidersView } from '../features/providers/ProvidersView'
import { UsageQuotasView } from '../features/usage-quotas/UsageQuotasView'
import { TaskHistoryView } from '../features/task-history/TaskHistoryView'
import { SettingsView } from '../features/settings/SettingsView'

export interface ViewDefinition {
  id: string
  label: string
  icon: string
  hasInspector?: boolean
  badge?: string
  description?: string
  component: React.ComponentType
}

class ViewRegistry {
  private views: Map<string, ViewDefinition> = new Map()
  private order: string[] = []

  public register(definition: ViewDefinition): void {
    if (this.views.has(definition.id)) {
      console.warn(`[ViewRegistry] View ${definition.id} is already registered. Overwriting.`)
    } else {
      this.order.push(definition.id)
    }
    this.views.set(definition.id, definition)
  }

  public get(id: string): ViewDefinition | undefined {
    return this.views.get(id)
  }

  public getAll(): ViewDefinition[] {
    return this.order.map((id) => this.views.get(id)!).filter(Boolean)
  }
}

export const viewRegistry = new ViewRegistry()

// Register default VersaRail views in canonical sidebar order
viewRegistry.register({
  id: 'chat',
  label: 'Chat',
  icon: 'chat',
  hasInspector: true,
  component: ChatView
})

viewRegistry.register({
  id: 'projects',
  label: 'Projects',
  icon: 'folder',
  component: ProjectsView
})

viewRegistry.register({
  id: 'file-explorer',
  label: 'File Explorer',
  icon: 'description',
  component: FileExplorerView
})

viewRegistry.register({
  id: 'ai-providers',
  label: 'AI Providers',
  icon: 'smart_toy',
  component: ProvidersView
})

viewRegistry.register({
  id: 'usage-quotas',
  label: 'Usage & Quotas',
  icon: 'donut_large',
  component: UsageQuotasView
})

viewRegistry.register({
  id: 'task-history',
  label: 'Task History',
  icon: 'history',
  component: TaskHistoryView
})

viewRegistry.register({
  id: 'settings',
  label: 'Settings',
  icon: 'settings',
  component: SettingsView
})
