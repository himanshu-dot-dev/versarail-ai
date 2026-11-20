/**
 * VersaRail AI — Batman Living Atmosphere
 * Craig Reynolds Boids Swarm + Real Anatomical Bats with Scalloped Wings
 */

interface Bat {
  x: number
  y: number
  vx: number
  vy: number
  maxSpeed: number
  wingspan: number
  wingCycle: number
  wingSpeed: number
  isGliding: boolean
  glideTimer: number
  depthAlpha: number
}

interface FogMote {
  x: number
  y: number
  radius: number
  vx: number
  alpha: number
}

export class BatmanAtmosphere {
  private bats: Bat[] = []
  private fogMotes: FogMote[] = []
  private spotlightAngle = 0

  public init(width: number, height: number): void {
    this.bats = []
    this.fogMotes = []
    const batCount = 45

    for (let i = 0; i < batCount; i++) {
      this.bats.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        maxSpeed: 3.5 + Math.random() * 2.2,
        wingspan: 14 + Math.random() * 18,
        wingCycle: Math.random() * Math.PI * 2,
        wingSpeed: 0.16 + Math.random() * 0.1,
        isGliding: false,
        glideTimer: Math.random() * 60,
        depthAlpha: 0.4 + Math.random() * 0.6
      })
    }

    for (let f = 0; f < 35; f++) {
      this.fogMotes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 50 + Math.random() * 130,
        vx: (Math.random() - 0.5) * 0.35,
        alpha: 0.04 + Math.random() * 0.07
      })
    }
  }

  public update(
    width: number,
    height: number,
    mouse: { x: number; y: number; active: boolean }
  ): void {
    this.spotlightAngle += 0.005

    const neighborDist = 95
    const bats = this.bats

    bats.forEach((b) => {
      let sepX = 0
      let sepY = 0
      let aliX = 0
      let aliY = 0
      let cohX = 0
      let cohY = 0
      let neighbors = 0

      bats.forEach((other) => {
        if (other === b) return
        const dx = b.x - other.x
        const dy = b.y - other.y
        const dist = Math.hypot(dx, dy)

        if (dist > 0 && dist < neighborDist) {
          sepX += dx / dist / dist
          sepY += dy / dist / dist
          aliX += other.vx
          aliY += other.vy
          cohX += other.x
          cohY += other.y
          neighbors++
        }
      })

      if (neighbors > 0) {
        aliX /= neighbors
        aliY /= neighbors
        cohX = (cohX / neighbors - b.x) * 0.005
        cohY = (cohY / neighbors - b.y) * 0.005

        b.vx += sepX * 20 + aliX * 0.045 + cohX
        b.vy += sepY * 20 + aliY * 0.045 + cohY
      }

      // Mouse Repulsion (Bats scatter realistically)
      if (mouse.active) {
        const mdx = b.x - mouse.x
        const mdy = b.y - mouse.y
        const mDist = Math.hypot(mdx, mdy)
        if (mDist < 160) {
          const force = (160 - mDist) / 160
          b.vx += (mdx / mDist) * force * 5.5
          b.vy += (mdy / mDist) * force * 5.5
          b.isGliding = false
        }
      }

      // Speed clamp
      const speed = Math.hypot(b.vx, b.vy)
      if (speed > b.maxSpeed) {
        b.vx = (b.vx / speed) * b.maxSpeed
        b.vy = (b.vy / speed) * b.maxSpeed
      }

      b.x += b.vx
      b.y += b.vy

      // Alternating Gliding vs Flapping
      b.glideTimer--
      if (b.glideTimer <= 0) {
        b.isGliding = !b.isGliding
        b.glideTimer = b.isGliding ? 25 + Math.random() * 45 : 40 + Math.random() * 70
      }

      if (!b.isGliding) {
        b.wingCycle += b.wingSpeed * (speed / b.maxSpeed + 0.6)
      }

      // Screen wrapping
      if (b.x < -40) b.x = width + 40
      if (b.x > width + 40) b.x = -40
      if (b.y < -40) b.y = height + 40
      if (b.y > height + 40) b.y = -40
    })

    this.fogMotes.forEach((fog) => {
      fog.x += fog.vx
      if (fog.x < -fog.radius) fog.x = width + fog.radius
      if (fog.x > width + fog.radius) fog.x = -fog.radius
    })
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    opacity: number
  ): void {
    ctx.save()
    // Maintain cinematic atmosphere visibility
    const effOpacity = Math.max(0.40, opacity)
    ctx.globalAlpha = effOpacity

    // 1. Gotham Spotlight Volumetric Beam
    const spotlightX = width / 2 + Math.sin(this.spotlightAngle) * (width * 0.32)
    const grad = ctx.createRadialGradient(spotlightX, 0, 20, spotlightX, height * 0.70, width * 0.60)
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.32)')
    grad.addColorStop(0.35, 'rgba(245, 158, 11, 0.12)')
    grad.addColorStop(0.75, 'rgba(245, 158, 11, 0.02)')
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // 2. Gotham Fog Motes
    this.fogMotes.forEach((fog) => {
      const fogGrad = ctx.createRadialGradient(fog.x, fog.y, 0, fog.x, fog.y, fog.radius)
      fogGrad.addColorStop(0, `rgba(30, 34, 50, ${fog.alpha * effOpacity * 1.4})`)
      fogGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = fogGrad
      ctx.beginPath()
      ctx.arc(fog.x, fog.y, fog.radius, 0, Math.PI * 2)
      ctx.fill()
    })

    // 3. Draw Real Anatomical Bats with Scalloped Wings
    this.bats.forEach((b) => {
      const angle = Math.atan2(b.vy, b.vx)
      const flap = b.isGliding ? 0.2 : Math.sin(b.wingCycle)
      const span = b.wingspan

      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(angle)
      ctx.globalAlpha = Math.min(1, b.depthAlpha * effOpacity * 1.25)

      // Tactical Carbon Body + Glowing Bat-Signal Amber Rim
      ctx.fillStyle = '#1a1d29'
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.90)'
      ctx.lineWidth = 1.2

      ctx.beginPath()
      ctx.moveTo(span * 0.35, 0)

      // Left Ear
      ctx.lineTo(span * 0.38, -span * 0.18)
      ctx.lineTo(span * 0.22, -span * 0.12)

      // Left Wing Forearm & Tip
      const lTipX = -span * 0.2
      const lTipY = -span * 1.6 * flap
      ctx.quadraticCurveTo(span * 0.1, -span * 0.8 * flap, lTipX, lTipY)

      // Scalloped Trailing Edge 1
      ctx.quadraticCurveTo(-span * 0.4, -span * 1.1 * flap, -span * 0.35, -span * 0.8 * flap)
      // Scalloped Trailing Edge 2
      ctx.quadraticCurveTo(-span * 0.5, -span * 0.6 * flap, -span * 0.45, -span * 0.4 * flap)
      // Scalloped Trailing Edge 3
      ctx.quadraticCurveTo(-span * 0.6, -span * 0.2 * flap, -span * 0.65, 0)

      // Right Wing (Mirrored)
      ctx.quadraticCurveTo(-span * 0.6, span * 0.2 * flap, -span * 0.45, span * 0.4 * flap)
      ctx.quadraticCurveTo(-span * 0.5, span * 0.6 * flap, -span * 0.35, span * 0.8 * flap)
      const rTipX = -span * 0.2
      const rTipY = span * 1.6 * flap
      ctx.quadraticCurveTo(-span * 0.4, span * 1.1 * flap, rTipX, rTipY)

      ctx.quadraticCurveTo(span * 0.1, span * 0.8 * flap, span * 0.22, span * 0.12)

      // Right Ear
      ctx.lineTo(span * 0.38, span * 0.18)
      ctx.closePath()

      ctx.fill()
      ctx.stroke()

      // Wing bone struts
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(lTipX, lTipY)
      ctx.moveTo(0, 0)
      ctx.lineTo(-span * 0.35, -span * 0.8 * flap)
      ctx.moveTo(0, 0)
      ctx.lineTo(rTipX, rTipY)
      ctx.moveTo(0, 0)
      ctx.lineTo(-span * 0.35, span * 0.8 * flap)
      ctx.stroke()

      // Glowing Amber Eyes
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.arc(span * 0.28, -span * 0.05, 1.2, 0, Math.PI * 2)
      ctx.arc(span * 0.28, span * 0.05, 1.2, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    })

    ctx.restore()
  }

  public destroy(): void {
    this.bats = []
    this.fogMotes = []
  }
}
