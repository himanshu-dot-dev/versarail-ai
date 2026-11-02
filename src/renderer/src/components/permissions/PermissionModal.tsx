import React, { useState, useEffect } from 'react'
import { PermissionRequestDTO, PermissionResponseDTO, PermissionScope } from '@shared/domain/models'
import Icon from '../common/Icon'
import { soundService } from '../../services/sound-service'

export interface PermissionModalProps {
  onRequestResolved?: (response: PermissionResponseDTO) => void
}

export const PermissionModal: React.FC<PermissionModalProps> = ({ onRequestResolved }) => {
  const [requests, setRequests] = useState<PermissionRequestDTO[]>([])
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (!window.electronApi?.onPermissionRequest) return

    const unsubscribe = window.electronApi.onPermissionRequest((request) => {
      soundService.play('alert')
      setRequests((prev) => {
        // Avoid duplicate requestId in queue
        if (prev.some((r) => r.requestId === request.requestId)) return prev
        return [...prev, request]
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const currentRequest = requests[0]

  if (!currentRequest) {
    return null
  }

  const handleDecision = async (decision: 'allow' | 'deny', scope: PermissionScope = 'once'): Promise<void> => {
    const payload: PermissionResponseDTO = {
      requestId: currentRequest.requestId,
      decision,
      rememberScope: scope
    }

    try {
      if (window.electronApi?.respondPermission) {
        await window.electronApi.respondPermission(payload)
      }
      onRequestResolved?.(payload)
    } catch (err) {
      console.error('[PermissionModal] Failed to submit permission decision:', err)
    } finally {
      // Remove handled request from queue
      setRequests((prev) => prev.filter((r) => r.requestId !== currentRequest.requestId))
    }
  }

  const copyPayloadHash = (): void => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(currentRequest.payloadHash)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const getRiskBadge = (risk: PermissionRequestDTO['riskLevel']): { label: string; className: string } => {
    switch (risk) {
      case 'critical':
        return {
          label: 'Critical Risk',
          className: 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
        }
      case 'high':
        return {
          label: 'High Risk',
          className: 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
        }
      case 'medium':
        return {
          label: 'Medium Risk',
          className: 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
        }
      case 'low':
      default:
        return {
          label: 'Low Risk',
          className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
        }
    }
  }

  const riskBadge = getRiskBadge(currentRequest.riskLevel)
  const shortHash = `${currentRequest.payloadHash.slice(0, 8)}...${currentRequest.payloadHash.slice(-8)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-high border border-outline-variant/40 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden text-on-surface">
        {/* Header with Risk & Capability Badges */}
        <div className="px-6 pt-5 pb-4 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary border border-outline-variant/40">
              <Icon name="shield" size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-on-surface flex items-center gap-2">
                Action Approval Required
                {requests.length > 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono">
                    1 of {requests.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-on-surface-variant">The AI agent is requesting permission to execute an operation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/30">
              {currentRequest.capability}
            </span>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${riskBadge.className}`}>
              {riskBadge.label}
            </span>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-sans">
          {/* Action Title & Description */}
          <div className="space-y-1">
            <div className="text-sm font-semibold text-on-surface">{currentRequest.title}</div>
            <div className="text-xs text-on-surface-variant leading-relaxed">{currentRequest.description}</div>
          </div>

          {/* Target File or Command Preview */}
          {currentRequest.command && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Command</span>
              <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 font-mono text-xs text-cyan-300 break-all select-all flex items-center justify-between gap-2">
                <span>{currentRequest.command} {currentRequest.args?.join(' ')}</span>
              </div>
            </div>
          )}

          {currentRequest.targetPath && !currentRequest.command && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Target Path</span>
              <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 font-mono text-xs text-on-surface break-all select-all">
                {currentRequest.targetPath}
              </div>
            </div>
          )}

          {/* Diff Preview if present */}
          {currentRequest.diffPreview && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Diff Preview</span>
              <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 font-mono text-xs overflow-x-auto max-h-48 text-emerald-300 whitespace-pre">
                {currentRequest.diffPreview}
              </div>
            </div>
          )}

          {/* Cryptographic TOCTOU Tamper-Proof Badge */}
          <div className="bg-surface-container/60 rounded-xl p-3 border border-outline-variant/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Icon name="lock" size={14} className="text-primary shrink-0" />
              <div className="truncate">
                <span className="text-on-surface-variant mr-1.5">Payload Hash (TOCTOU guard):</span>
                <span className="font-mono text-primary font-medium" title={currentRequest.payloadHash}>
                  {shortHash}
                </span>
              </div>
            </div>
            <button
              onClick={copyPayloadHash}
              type="button"
              className="text-xs px-2 py-1 rounded bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1 shrink-0"
              title="Copy full SHA-256 payload hash"
            >
              <Icon name={isCopied ? 'check' : 'copy'} size={12} />
              <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-surface-container-lowest/80 border-t border-outline-variant/20 flex items-center justify-end gap-2.5">
          <button
            onClick={() => handleDecision('deny')}
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex items-center gap-1.5"
          >
            <Icon name="close" size={14} />
            <span>Deny</span>
          </button>

          <button
            onClick={() => handleDecision('allow', 'session')}
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-medium bg-surface-container hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 hover:border-primary/40 transition-all"
          >
            Allow for Session
          </button>

          <button
            onClick={() => handleDecision('allow', 'once')}
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-container text-on-primary transition-all shadow-md flex items-center gap-1.5"
          >
            <Icon name="check" size={14} />
            <span>Allow Once</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default PermissionModal

