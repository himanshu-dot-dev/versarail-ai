/**
 * VersaRail AI Agent Harness - Sound Cue Player
 * Plays subtle feedback sounds inspired by Kilo Code for task completion,
 * permission alerts, and operation errors.
 */

import alertSound from '../assets/audio/alert-01.wav'
import successSound from '../assets/audio/yup-01.wav'
import errorSound from '../assets/audio/nope-01.wav'
import clickSound from '../assets/audio/bip-bop-01.wav'

export type SoundEffectType = 'alert' | 'success' | 'error' | 'click'

const SOUND_MAP: Record<SoundEffectType, string> = {
  alert: alertSound,
  success: successSound,
  error: errorSound,
  click: clickSound
}

class SoundService {
  private static instance: SoundService | null = null
  private audioElements: Map<SoundEffectType, HTMLAudioElement> = new Map()
  private enabled: boolean = true

  private constructor() {
    if (typeof window !== 'undefined') {
      try {
        for (const [type, url] of Object.entries(SOUND_MAP)) {
          const audio = new Audio(url)
          audio.volume = 0.4
          this.audioElements.set(type as SoundEffectType, audio)
        }
      } catch (err) {
        console.warn('[SoundService] Audio not supported in this environment:', err)
      }
    }
  }

  public static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService()
    }
    return SoundService.instance
  }

  public play(type: SoundEffectType): void {
    if (!this.enabled) return
    const audio = this.audioElements.get(type)
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(() => {
        // Autoplay policy or sound blocked; ignore silently
      })
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  public isEnabled(): boolean {
    return this.enabled
  }
}

export const soundService = SoundService.getInstance()

