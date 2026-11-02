import React, { useState } from 'react'
import { CheckCircle2, Circle, ListTodo, ChevronDown, ChevronUp } from 'lucide-react'

export interface TodoItem {
  id: string
  text: string
  completed: boolean
}

interface TodoDockProps {
  content: string
}

export function parseTodos(text: string): TodoItem[] {
  const match = text.match(/<todo>([\s\S]*?)<\/todo>/i)
  if (!match) return []

  const rawList = match[1]
  const lines = rawList.split('\n')
  const items: TodoItem[] = []

  let index = 0
  for (const line of lines) {
    const trimmed = line.trim()
    const taskMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.*)$/)
    if (taskMatch) {
      items.push({
        id: `todo-${index++}`,
        completed: taskMatch[1].toLowerCase() === 'x',
        text: taskMatch[2].trim()
      })
    }
  }

  return items
}

export const TodoDock: React.FC<TodoDockProps> = ({ content }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [localTodos, setLocalTodos] = useState<TodoItem[]>(() => parseTodos(content))

  // Sync if content changes
  React.useEffect(() => {
    const parsed = parseTodos(content)
    if (parsed.length > 0) {
      setLocalTodos(parsed)
    }
  }, [content])

  if (localTodos.length === 0) return null

  const completedCount = localTodos.filter((t) => t.completed).length
  const progressPct = Math.round((completedCount / localTodos.length) * 100)

  const toggleTodo = (id: string) => {
    setLocalTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  return (
    <div className="my-3 rounded-lg border border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden text-sm">
      <div
        className="flex items-center justify-between px-3 py-2 bg-muted/40 cursor-pointer select-none border-b border-border/40 hover:bg-muted/60 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2 text-foreground font-medium">
          <ListTodo className="w-4 h-4 text-primary" />
          <span>Agent Task Goals</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
            {completedCount}/{localTodos.length} ({progressPct}%)
          </span>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-1.5">
          {localTodos.map((todo) => (
            <div
              key={todo.id}
              onClick={() => toggleTodo(todo.id)}
              className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors group"
            >
              {todo.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
              )}
              <span
                className={`text-xs ${
                  todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                }`}
              >
                {todo.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

