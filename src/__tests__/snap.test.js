import { describe, it, expect } from 'vitest'
import { angleDiff, isSnapValid, findBestSnap } from '../geometry/snap'

describe('angleDiff', () => {
  it('returns 0 for equal angles', () => expect(angleDiff(45, 45)).toBe(0))
  it('returns 180 for opposite angles', () => expect(angleDiff(0, 180)).toBe(180))
  it('handles wrap-around', () => expect(angleDiff(350, 10)).toBeCloseTo(20))
})

describe('isSnapValid', () => {
  it('returns true when connectors face each other', () => {
    expect(isSnapValid({ worldAngle: 0 }, { worldAngle: 180 })).toBe(true)
    expect(isSnapValid({ worldAngle: 30 }, { worldAngle: 210 })).toBe(true)
  })
  it('returns false when connectors face same direction', () => {
    expect(isSnapValid({ worldAngle: 0 }, { worldAngle: 0 })).toBe(false)
  })
  it('returns false when angle diff is not ~180 degrees', () => {
    expect(isSnapValid({ worldAngle: 0 }, { worldAngle: 90 })).toBe(false)
  })
})

describe('findBestSnap', () => {
  it('returns null when no pieces placed', () => {
    const dragged = [{ id: 'A', worldX: 100, worldY: 100, worldAngle: 180 }]
    expect(findBestSnap(dragged, [], 8, 10)).toBeNull()
  })

  it('returns snap candidate when connectors are close and facing each other', () => {
    const dragged = [{ id: 'A', worldX: 100, worldY: 100, worldAngle: 0 }]
    const placed = [{
      instanceId: 'abc',
      connectors: [{ id: 'B', worldX: 104, worldY: 100, worldAngle: 180 }],
      connectedTo: { B: null }
    }]
    const snap = findBestSnap(dragged, placed, 8, 10)
    expect(snap).not.toBeNull()
    expect(snap.draggedConnectorId).toBe('A')
    expect(snap.targetInstanceId).toBe('abc')
    expect(snap.targetConnectorId).toBe('B')
  })

  it('ignores already-connected target connectors', () => {
    const dragged = [{ id: 'A', worldX: 100, worldY: 100, worldAngle: 0 }]
    const placed = [{
      instanceId: 'abc',
      connectors: [{ id: 'B', worldX: 104, worldY: 100, worldAngle: 180 }],
      connectedTo: { B: 'other:C' }   // already connected
    }]
    expect(findBestSnap(dragged, placed, 8, 10)).toBeNull()
  })
})
