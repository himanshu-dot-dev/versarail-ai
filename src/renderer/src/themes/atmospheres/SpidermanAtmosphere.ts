/**
 * VersaRail AI — Spider-Man Living Atmosphere
 * Full White Silk Web Canopy + Realistic Hanging & Retracting Spiders
 */

interface DewDrop {
  x: number
  y: number
  r: number
  alpha: number
}

interface Spider {
  anchorX: number
  anchorY: number
  x: number
  y: number
  targetY: number
  state: 'idle_above' | 'descending' | 'hanging' | 'ascending'
  stateTimer: number
  hangDuration: number
  swayAngle: number
  swaySpeed: number
  swayAmp: number
  twitchTimer: number
  bodySize: number
}

interface WebSpoke {
  x: number
  y: number
  angle: number
}

interface WebNetwork {
  origin: { x: number; y: number }
  spokes: WebSpoke[]
  rings: { x: number; y: number }[][]
}

interface BridgeSilk {
  x1: number
  y1: number
  x2: number
  y2: number
  sag: number
}

export class SpidermanAtmosphere {
  private webNetworks: WebNetwork[] = []
  private bridgeSilkLines: BridgeSilk[] = []
  private spiders: Spider[] = []
  private dewDrops: DewDrop[] = []

  public init(width: number, height: number): void {
    this.webNetworks = []
    this.bridgeSilkLines = []
    this.spiders = []
    this.dewDrops = []

    // 1. Generate Multiple Interconnected Real White Spider Webs Covering the Viewport
    const anchors = [
      // Top Left Corner Web (Dense White Silk)
      { x: 0, y: 0, rMax: Math.max(width, height) * 0.70, aStart: 0, aEnd: Math.PI / 2, spokes: 13, rings: 11 },
      // Top Right Corner Web (Dense White Silk)
      { x: width, y: 0, rMax: Math.max(width, height) * 0.70, aStart: Math.PI / 2, aEnd: Math.PI, spokes: 13, rings: 11 },
      // Top Center Ceiling Canopy Web
      { x: width * 0.5, y: -20, rMax: Math.min(width, height) * 0.75, aStart: Math.PI * 0.12, aEnd: Math.PI * 0.88, spokes: 15, rings: 10 },
      // Mid Left Web Anchor
      { x: 0, y: height * 0.45, rMax: Math.min(width, height) * 0.50, aStart: -Math.PI * 0.35, aEnd: Math.PI * 0.35, spokes: 9, rings: 8 },
      // Mid Right Web Anchor
      { x: width, y: height * 0.45, rMax: Math.min(width, height) * 0.50, aStart: Math.PI * 0.65, aEnd: Math.PI * 1.35, spokes: 9, rings: 8 },
      // Bottom Left Web Anchor
      { x: 0, y: height, rMax: Math.min(width, height) * 0.60, aStart: -Math.PI / 2, aEnd: 0, spokes: 10, rings: 8 },
      // Bottom Right Web Anchor
      { x: width, y: height, rMax: Math.min(width, height) * 0.60, aStart: Math.PI, aEnd: Math.PI * 1.5, spokes: 10, rings: 8 }
    ]

    anchors.forEach((anchor) => {
      const spokePoints: WebSpoke[] = []
      for (let s = 0; s < anchor.spokes; s++) {
        const frac = s / (anchor.spokes - 1)
        const angle = anchor.aStart + frac * (anchor.aEnd - anchor.aStart)
        const len = anchor.rMax * (0.85 + Math.random() * 0.3)
        spokePoints.push({
          x: anchor.x + Math.cos(angle) * len,
          y: anchor.y + Math.sin(angle) * len,
          angle
        })
      }

      // Catenary drooping concentric rings (Real White Silk)
      const ringLines: { x: number; y: number }[][] = []
      for (let r = 1; r <= anchor.rings; r++) {
        const rFactor = r / anchor.rings
        const pts: { x: number; y: number }[] = []
        for (let s = 0; s < anchor.spokes; s++) {
          const sp = spokePoints[s]
          const ptX = anchor.x + (sp.x - anchor.x) * rFactor
          const ptY = anchor.y + (sp.y - anchor.y) * rFactor
          pts.push({ x: ptX, y: ptY })

          // Glinting dew drops along silk threads
          if (Math.random() < 0.42) {
            this.dewDrops.push({
              x: ptX + (Math.random() - 0.5) * 5,
              y: ptY + (Math.random() - 0.5) * 5,
              r: 0.9 + Math.random() * 1.8,
              alpha: 0.50 + Math.random() * 0.45
            })
          }
        }
        ringLines.push(pts)
      }

      this.webNetworks.push({
        origin: { x: anchor.x, y: anchor.y },
        spokes: spokePoints,
        rings: ringLines
      })
    })

    // 2. Structural Gossamer Bridge Silk Lines Connecting across Viewport
    this.bridgeSilkLines = [
      { x1: 0, y1: height * 0.18, x2: width, y2: height * 0.15, sag: 25 },
      { x1: 0, y1: height * 0.38, x2: width * 0.65, y2: 0, sag: 32 },
      { x1: width, y1: height * 0.40, x2: width * 0.35, y2: 0, sag: 32 },
      { x1: width * 0.1, y1: height * 0.72, x2: width * 0.9, y2: height * 0.68, sag: 22 },
      { x1: 0, y1: height * 0.80, x2: width * 0.45, y2: height, sag: 20 },
      { x1: width, y1: height * 0.80, x2: width * 0.55, y2: height, sag: 20 }
    ]

    // 3. Hanging Spiders (Descent -> Hang & Sway -> Ascend)
    // Initialize with spider 0 already hanging and spider 1 descending so the user immediately sees them!
    const spiderSlots = [
      { x: width * 0.18, targetY: 180 + Math.random() * 80, initialY: 180, state: 'hanging' as const, timer: 320 },
      { x: width * 0.82, targetY: 230 + Math.random() * 90, initialY: 70, state: 'descending' as const, timer: 280 },
      { x: width * 0.38, targetY: 260 + Math.random() * 110, initialY: -30, state: 'idle_above' as const, timer: 90 },
      { x: width * 0.64, targetY: 210 + Math.random() * 90, initialY: -30, state: 'idle_above' as const, timer: 210 }
    ]

    spiderSlots.forEach((slot) => {
      this.spiders.push({
        anchorX: slot.x,
        anchorY: -10,
        x: slot.x,
        y: slot.initialY,
        targetY: slot.targetY,
        state: slot.state,
        stateTimer: slot.timer,
        hangDuration: 280 + Math.random() * 320,
        swayAngle: (Math.random() - 0.5) * 0.05,
        swaySpeed: 0.016 + Math.random() * 0.012,
        swayAmp: 0.06 + Math.random() * 0.04,
        twitchTimer: Math.floor(Math.random() * 100),
        bodySize: 11 + Math.random() * 3
      })
    })
  }

  public update(
    width: number,
    height: number,
    mouse: { x: number; y: number; active: boolean }
  ): void {
    const now = performance.now()

    this.spiders.forEach((sp) => {
      sp.swayAngle = Math.sin(now * 0.001 * (sp.swaySpeed * 100)) * sp.swayAmp
      sp.twitchTimer++

      // Mouse startles hanging spider -> climbs back up into ceiling
      if (mouse.active && (sp.state === 'hanging' || sp.state === 'descending')) {
        const dist = Math.hypot(sp.x - mouse.x, sp.y - mouse.y)
        if (dist < 130) {
          sp.state = 'ascending'
          sp.swayAmp = 0.22
        }
      }

      if (sp.state === 'idle_above') {
        sp.y = -35
        sp.stateTimer--
        if (sp.stateTimer <= 0) {
          sp.state = 'descending'
          sp.targetY = 160 + Math.random() * (height * 0.42)
        }
      } else if (sp.state === 'descending') {
        if (sp.y < sp.targetY) {
          sp.y += 1.4
        } else {
          sp.state = 'hanging'
          sp.stateTimer = sp.hangDuration
        }
      } else if (sp.state === 'hanging') {
        sp.stateTimer--
        if (sp.stateTimer <= 0) {
          sp.state = 'ascending'
        }
      } else if (sp.state === 'ascending') {
        if (sp.y > -30) {
          sp.y -= 1.8
        } else {
          sp.state = 'idle_above'
          sp.stateTimer = 100 + Math.random() * 180
        }
      }

      const lineLen = Math.max(0, sp.y - sp.anchorY)
      sp.x = sp.anchorX + Math.sin(sp.swayAngle) * lineLen
    })
  }

  public render(
    ctx: CanvasRenderingContext2D,
    _width: number,
    _height: number,
    opacity: number
  ): void {
    ctx.save()
    // Ensure webs are crisply visible even when global atmosphere opacity is moderate
    ctx.globalAlpha = Math.max(0.40, opacity)

    // 1. Render Full White Structural Gossamer Bridge Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = 1.4
    this.bridgeSilkLines.forEach((br) => {
      ctx.beginPath()
      ctx.moveTo(br.x1, br.y1)
      const midX = (br.x1 + br.x2) / 2
      const midY = (br.y1 + br.y2) / 2 + br.sag
      ctx.quadraticCurveTo(midX, midY, br.x2, br.y2)
      ctx.stroke()
    })

    // 2. Render Real White Silk Web Networks Across Viewport
    this.webNetworks.forEach((net) => {
      // Spokes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)'
      ctx.lineWidth = 1.15
      net.spokes.forEach((sp) => {
        ctx.beginPath()
        ctx.moveTo(net.origin.x, net.origin.y)
        ctx.lineTo(sp.x, sp.y)
        ctx.stroke()
      })

      // Concentric Sagging Spiral Rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)'
      ctx.lineWidth = 1.3
      net.rings.forEach((ring) => {
        ctx.beginPath()
        for (let i = 0; i < ring.length - 1; i++) {
          const p1 = ring[i]
          const p2 = ring[i + 1]
          const midX = (p1.x + p2.x) / 2
          const midY = (p1.y + p2.y) / 2 + 5.5
          if (i === 0) ctx.moveTo(p1.x, p1.y)
          ctx.quadraticCurveTo(midX, midY, p2.x, p2.y)
        }
        ctx.stroke()
      })
    })

    // 3. Render Glinting Dew Drops
    this.dewDrops.forEach((dew) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, dew.alpha * 1.3)})`
      ctx.beginPath()
      ctx.arc(dew.x, dew.y, dew.r, 0, Math.PI * 2)
      ctx.fill()
    })

    // 4. Render Hanging Spiders & Vertical White Silk Threads
    this.spiders.forEach((sp) => {
      if (sp.y <= -20) return

      // Pure White Silk Strand
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(sp.anchorX, sp.anchorY)
      ctx.lineTo(sp.x, sp.y)
      ctx.stroke()

      // Hanging Spider
      ctx.save()
      ctx.translate(sp.x, sp.y)
      ctx.rotate(sp.swayAngle * 2 + Math.PI) // Head downward

      const sz = sp.bodySize
      const twitch = Math.sin(sp.twitchTimer * 0.1) * 2

      // 8 Curved Jointed Legs in Resting Stance
      ctx.strokeStyle = '#18181f'
      ctx.lineWidth = 1.8

      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath()
        ctx.moveTo(side * 3, -2)
        ctx.quadraticCurveTo(side * (sz * 1.2), -sz * 1.5, side * (sz * 0.8) + side * twitch, -sz * 2.2)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(side * 4, 1)
        ctx.quadraticCurveTo(side * (sz * 1.4), -sz * 0.8, side * (sz * 1.3), -sz * 1.6)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(side * 3.5, 5)
        ctx.quadraticCurveTo(side * (sz * 1.3), sz * 0.8, side * (sz * 0.7), sz * 1.8)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(side * 2.5, 8)
        ctx.quadraticCurveTo(side * (sz * 0.9), sz * 1.5, side * 2, sz * 2.4)
        ctx.stroke()
      }

      // Abdomen
      ctx.fillStyle = '#1c1518'
      ctx.strokeStyle = '#2d1e22'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(0, 7, sz * 0.55, sz * 0.8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Crimson spider dorsal mark
      ctx.fillStyle = 'rgba(225, 29, 72, 0.85)'
      ctx.beginPath()
      ctx.moveTo(-2, 5)
      ctx.lineTo(2, 5)
      ctx.lineTo(0, 9)
      ctx.closePath()
      ctx.fill()

      // Cephalothorax
      ctx.fillStyle = '#111217'
      ctx.beginPath()
      ctx.ellipse(0, -3, sz * 0.42, sz * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Pedipalps
      ctx.strokeStyle = '#18181f'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(-2, -6)
      ctx.lineTo(-4, -9)
      ctx.moveTo(2, -6)
      ctx.lineTo(4, -9)
      ctx.stroke()

      // Glinting spider eyes
      ctx.fillStyle = '#38bdf8'
      ctx.fillRect(-1.5, -6, 1, 1)
      ctx.fillRect(0.5, -6, 1, 1)

      ctx.restore()
    })

    ctx.restore()
  }

  public destroy(): void {
    this.webNetworks = []
    this.bridgeSilkLines = []
    this.spiders = []
    this.dewDrops = []
  }
}
