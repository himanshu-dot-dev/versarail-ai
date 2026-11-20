/**
 * VersaRail AI — Iron Man Living Atmosphere
 * Full-Viewport Stark Holographic HUD, Targeting Arcs, Pulse Waves & Nanotech Hex Mesh
 */

interface HudRing {
  r: number
  speed: number
  dash: number[]
  color: string
  width: number
}

interface HexNode {
  x: number
  y: number
  vy: number
  vx: number
  size: number
  alpha: number
  color: string
}

interface PulseWave {
  r: number
  maxR: number
  alpha: number
  speed: number
}

export class IronmanAtmosphere {
  private angle = 0
  private pulseTimer = 0
  private hudRings: HudRing[] = []
  private nanotechHexes: HexNode[] = []
  private pulseWaves: PulseWave[] = []

  public init(width: number, height: number): void {
    // Holographic Telemetry Rings: Center Reticles + Viewport-Spanning Arcs
    this.hudRings = [
      { r: 160, speed: 0.015, dash: [6, 10], color: 'rgba(6, 182, 212, 0.75)', width: 1.5 },
      { r: 210, speed: -0.010, dash: [20, 8, 4, 8], color: 'rgba(234, 179, 8, 0.65)', width: 1.8 },
      { r: 260, speed: 0.008, dash: [35, 15, 10, 15], color: 'rgba(6, 182, 212, 0.55)', width: 1.6 },
      { r: 340, speed: -0.006, dash: [50, 25, 15, 25], color: 'rgba(239, 68, 68, 0.45)', width: 1.5 },
      { r: 440, speed: 0.004, dash: [80, 40], color: 'rgba(6, 182, 212, 0.40)', width: 1.2 },
      { r: 560, speed: -0.003, dash: [100, 60, 20, 60], color: 'rgba(234, 179, 8, 0.35)', width: 1.2 }
    ]

    // Floating Nanotech Hexagonal Nodes Across Viewport
    this.nanotechHexes = []
    const hexCount = Math.max(35, Math.floor((width * height) / 22000))
    for (let i = 0; i < hexCount; i++) {
      const isGold = Math.random() < 0.6
      this.nanotechHexes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: -0.4 - Math.random() * 0.8,
        vx: (Math.random() - 0.5) * 0.3,
        size: 10 + Math.random() * 16,
        alpha: 0.25 + Math.random() * 0.50,
        color: isGold ? 'rgba(234, 179, 8, ' : 'rgba(6, 182, 212, '
      })
    }

    // Arc Reactor Radiating Pulse Waves
    this.pulseWaves = [
      { r: 80, maxR: Math.max(width, height) * 0.75, alpha: 0.6, speed: 2.2 },
      { r: 240, maxR: Math.max(width, height) * 0.75, alpha: 0.35, speed: 2.2 }
    ]
  }

  public update(
    width: number,
    height: number,
    _mouse: { x: number; y: number; active: boolean }
  ): void {
    this.angle += 0.012
    this.pulseTimer++

    // Update floating nanotech hexagons
    this.nanotechHexes.forEach((h) => {
      h.y += h.vy
      h.x += h.vx
      if (h.y < -30) {
        h.y = height + 30
        h.x = Math.random() * width
      }
      if (h.x < -30) h.x = width + 30
      if (h.x > width + 30) h.x = -30
    })

    // Update expanding arc reactor pulse waves
    this.pulseWaves.forEach((pw) => {
      pw.r += pw.speed
      pw.alpha = Math.max(0, 0.55 * (1 - pw.r / pw.maxR))
      if (pw.r >= pw.maxR) {
        pw.r = 40
        pw.alpha = 0.55
      }
    })
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    opacity: number,
    mouse?: { x: number; y: number; active: boolean }
  ): void {
    const effOpacity = Math.max(0.40, opacity)
    const cx = width / 2 + (mouse && mouse.active ? (mouse.x - width / 2) * 0.035 : 0)
    const cy = height / 2 + (mouse && mouse.active ? (mouse.y - height / 2) * 0.035 : 0)

    ctx.save()
    ctx.globalAlpha = effOpacity

    // 1. Floating Nanotech Hexagonal Mesh
    this.nanotechHexes.forEach((h) => {
      ctx.save()
      ctx.translate(h.x, h.y)
      ctx.strokeStyle = `${h.color}${h.alpha * effOpacity * 1.3})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (let s = 0; s < 6; s++) {
        const a = (s * Math.PI) / 3
        const px = Math.cos(a) * h.size
        const py = Math.sin(a) * h.size
        if (s === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()

      // Center glowing core dot on occasional hexes
      if (h.size > 18) {
        ctx.fillStyle = `${h.color}${h.alpha * effOpacity * 0.8})`
        ctx.beginPath()
        ctx.arc(0, 0, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    })

    // 2. Arc Reactor Expanding Pulse Wave Rings
    this.pulseWaves.forEach((pw) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.strokeStyle = `rgba(6, 182, 212, ${pw.alpha * effOpacity * 0.7})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(0, 0, pw.r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    })

    // 3. Holographic HUD Telemetry Reticles Framing Mask
    this.hudRings.forEach((ring, idx) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(this.angle * (idx % 2 === 0 ? 1 : -1) + idx)
      ctx.setLineDash(ring.dash)
      ctx.strokeStyle = ring.color
      ctx.lineWidth = ring.width
      ctx.beginPath()
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    })

    // 4. Central Mark III Helmet Framing Reticle & Diagnostics Brackets
    ctx.save()
    ctx.translate(cx, cy)
    ctx.strokeStyle = '#06b6d4'
    ctx.lineWidth = 1.8

    const bw = 175
    const bh = 220
    // Corner Targeting Brackets
    // Top-left
    ctx.beginPath()
    ctx.moveTo(-bw, -bh + 45)
    ctx.lineTo(-bw, -bh)
    ctx.lineTo(-bw + 45, -bh)
    ctx.stroke()

    // Top-right
    ctx.beginPath()
    ctx.moveTo(bw, -bh + 45)
    ctx.lineTo(bw, -bh)
    ctx.lineTo(bw - 45, -bh)
    ctx.stroke()

    // Bottom-left
    ctx.beginPath()
    ctx.moveTo(-bw, bh - 45)
    ctx.lineTo(-bw, bh)
    ctx.lineTo(-bw + 45, bh)
    ctx.stroke()

    // Bottom-right
    ctx.beginPath()
    ctx.moveTo(bw, bh - 45)
    ctx.lineTo(bw, bh)
    ctx.lineTo(bw - 45, bh)
    ctx.stroke()

    // Telemetry Diagnostics Monospace Text
    ctx.font = '10px "Fira Code", monospace'
    ctx.fillStyle = 'rgba(6, 182, 212, 0.85)'
    ctx.fillText('[ MARK III • IN-APP LOGO ACTIVE ]', -105, -bh - 14)
    ctx.fillText('STARK ARC: 100% • TELEMETRY ONLINE', -95, bh + 24)

    // Calibration Degree Ticks
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.55)'
    ctx.lineWidth = 1.2
    const ticks = 36
    for (let i = 0; i < ticks; i++) {
      const ta = (i * Math.PI * 2) / ticks
      const innerR = 250
      const outerR = i % 3 === 0 ? 264 : 257
      ctx.beginPath()
      ctx.moveTo(Math.cos(ta) * innerR, Math.sin(ta) * innerR)
      ctx.lineTo(Math.cos(ta) * outerR, Math.sin(ta) * outerR)
      ctx.stroke()
    }
    ctx.restore()

    // 5. Screen Corner Tactical HUD Brackets (Framing Chat Viewport)
    ctx.save()
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.55)'
    ctx.lineWidth = 1.5
    ctx.font = '9px "Fira Code", monospace'
    ctx.fillStyle = 'rgba(6, 182, 212, 0.65)'

    // Top-Left Screen Bracket
    ctx.beginPath()
    ctx.moveTo(24, 70)
    ctx.lineTo(24, 24)
    ctx.lineTo(70, 24)
    ctx.stroke()
    ctx.fillText('SYS.DIAG // MARK-III HUD', 30, 40)

    // Top-Right Screen Bracket
    ctx.beginPath()
    ctx.moveTo(width - 70, 24)
    ctx.lineTo(width - 24, 24)
    ctx.lineTo(width - 24, 70)
    ctx.stroke()
    ctx.fillText('ARC: 100%', width - 95, 40)

    // Bottom-Left Screen Bracket
    ctx.beginPath()
    ctx.moveTo(24, height - 70)
    ctx.lineTo(24, height - 24)
    ctx.lineTo(70, height - 24)
    ctx.stroke()
    ctx.fillText('STATUS: SECURE', 30, height - 34)

    // Bottom-Right Screen Bracket
    ctx.beginPath()
    ctx.moveTo(width - 70, height - 24)
    ctx.lineTo(width - 24, height - 24)
    ctx.lineTo(width - 24, height - 70)
    ctx.stroke()
    ctx.fillText('BYOK READY', width - 95, height - 34)

    ctx.restore()

    ctx.restore()
  }

  public destroy(): void {
    this.hudRings = []
    this.nanotechHexes = []
    this.pulseWaves = []
  }
}
