import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import Icon from '../../components/common/Icon'

export interface TerminalPanelProps {
  onClose?: () => void
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const termInstanceRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!terminalRef.current) return

    // 1. Initialize xterm instance with VersaRail theme
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 12,
      fontFamily: 'JetBrains Mono, Menlo, Consolas, monospace',
      lineHeight: 1.2,
      theme: {
        background: '#13131b',
        foreground: '#c0c1ff',
        cursor: '#4cd7f6',
        cursorAccent: '#13131b',
        selectionBackground: 'rgba(128, 131, 255, 0.25)',
        black: '#13131b',
        red: '#ff6b8b',
        green: '#4cd7f6',
        yellow: '#fcd34d',
        blue: '#8083ff',
        magenta: '#c0c1ff',
        cyan: '#4cd7f6',
        white: '#e2e8f0',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#818cf8',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      }
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)
    fitAddon.fit()

    termInstanceRef.current = term
    fitAddonRef.current = fitAddon

    let activeSessionId: string | null = null
    let unsubscribeData: (() => void) | undefined

    // 2. Spawn backend interactive terminal session
    if (window.electronApi?.createTerminalSession) {
      window.electronApi
        .createTerminalSession()
        .then(({ sessionId: id }) => {
          activeSessionId = id
          setSessionId(id)
          setIsConnected(true)

          // 3. Listen for terminal output data from main process
          unsubscribeData = window.electronApi.onTerminalData((event) => {
            if (event.sessionId === id) {
              term.write(event.data)
            }
          })

          // 4. Forward keystrokes to main process
          term.onData((data) => {
            window.electronApi.writeTerminal(id, data)
          })

          // Initial resize sync
          window.electronApi.resizeTerminal(id, term.cols, term.rows)
        })
        .catch((err) => {
          term.write(`\r\n\x1b[31m[Terminal Error] Failed to launch interactive shell: ${err.message}\x1b[0m\r\n`)
        })
    } else {
      term.write('\r\n\x1b[33m[Dev Note] Running in browser mock mode. No native shell attached.\x1b[0m\r\n$ ')
    }

    // 5. Handle window resizing
    const handleResize = () => {
      try {
        fitAddon.fit()
        if (activeSessionId && window.electronApi?.resizeTerminal) {
          window.electronApi.resizeTerminal(activeSessionId, term.cols, term.rows)
        }
      } catch {
        // Ignore resize during DOM detach
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      unsubscribeData?.()
      if (activeSessionId && window.electronApi?.closeTerminal) {
        window.electronApi.closeTerminal(activeSessionId)
      }
      term.dispose()
    }
  }, [])

  const handleClear = () => {
    termInstanceRef.current?.clear()
  }

  return (
    <div className="flex flex-col h-full w-full bg-surface-container-lowest border-t border-border-subtle select-none overflow-hidden">
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-space-md py-1 bg-surface-container border-b border-border-subtle shrink-0 text-xs">
        <div className="flex items-center gap-space-sm">
          <Icon name="terminal" size={14} className="text-primary shrink-0" />
          <span className="font-mono text-[11px] font-semibold text-on-surface">
            Developer Interactive Shell
          </span>
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-tertiary' : 'bg-on-surface-variant'
              }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
          <span className="text-[10px] text-on-surface-variant font-mono hidden sm:inline">
            (Isolated from AI Agent injection)
          </span>
        </div>

        <div className="flex items-center gap-space-xs">
          <button
            onClick={handleClear}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-[11px] font-mono"
            title="Clear Terminal Output"
          >
            Clear
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              title="Close Terminal"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* xterm.js DOM Mount Element */}
      <div
        ref={terminalRef}
        className="flex-1 w-full h-full p-space-xs overflow-hidden font-mono"
        style={{ minHeight: '140px' }}
      />
    </div>
  )
}

export default TerminalPanel

