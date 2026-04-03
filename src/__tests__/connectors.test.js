import { describe, it, expect } from 'vitest'
import { getWorldConnectors } from '../geometry/connectors'

describe('getWorldConnectors', () => {
  it('returns connectors unchanged when rotation=0 and no mirror', () => {
    const piece = {
      x: 100, y: 50, rotation: 0, mirrorX: false,
      connectors: [{ id: 'A', x: 0, y: 0, angle: 180 }, { id: 'B', x: 10, y: 0, angle: 0 }]
    }
    const [a, b] = getWorldConnectors(piece, 10)
    expect(a.worldX).toBeCloseTo(100)
    expect(a.worldY).toBeCloseTo(50)
    expect(a.worldAngle).toBeCloseTo(180)
    expect(b.worldX).toBeCloseTo(200)
    expect(b.worldY).toBeCloseTo(50)
    expect(b.worldAngle).toBeCloseTo(0)
  })

  it('rotates connectors by piece rotation', () => {
    // 10" straight rotated 90° — B should be directly below A
    const piece = {
      x: 0, y: 0, rotation: 90, mirrorX: false,
      connectors: [{ id: 'A', x: 0, y: 0, angle: 180 }, { id: 'B', x: 10, y: 0, angle: 0 }]
    }
    const [a, b] = getWorldConnectors(piece, 10)
    expect(a.worldX).toBeCloseTo(0)
    expect(a.worldY).toBeCloseTo(0)
    expect(b.worldX).toBeCloseTo(0)
    expect(b.worldY).toBeCloseTo(100)  // 10 inches * 10 px/in
    expect(b.worldAngle).toBeCloseTo(90)
  })

  it('mirrors connectors when mirrorX=true', () => {
    const piece = {
      x: 0, y: 0, rotation: 0, mirrorX: true,
      connectors: [{ id: 'A', x: 0, y: 0, angle: 180 }, { id: 'B', x: 5.625, y: 1.508, angle: 30 }]
    }
    const [a, b] = getWorldConnectors(piece, 10)
    // x stays, y negated, angle reflected: (360 - 30) = 330
    expect(b.worldY).toBeCloseTo(-15.08)
    expect(b.worldAngle).toBeCloseTo(330) // 360 - 30
  })
})
