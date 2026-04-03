import { describe, it, expect } from 'vitest'
import { validateLayout } from '../hooks/useValidation'
import catalogue from '../data/catalogue.json'

const catalogueN = catalogue.N

describe('validateLayout', () => {
  it('returns no issues for empty layout', () => {
    const result = validateLayout([], catalogueN, 10)
    expect(result.openEndpoints).toHaveLength(0)
    expect(result.floatingPieces).toHaveLength(0)
    expect(result.overlappingPieces).toHaveLength(0)
  })

  it('detects open endpoints on an unconnected straight piece', () => {
    const pieces = [{
      instanceId: 'p1', pieceId: '44815', x: 0, y: 0, rotation: 0, mirrorX: false,
      connectedTo: { A: null, B: null }
    }]
    const result = validateLayout(pieces, catalogueN, 10)
    expect(result.openEndpoints).toHaveLength(2) // both A and B open
  })

  it('detects floating piece (no connections at all)', () => {
    const pieces = [{
      instanceId: 'p1', pieceId: '44815', x: 0, y: 0, rotation: 0, mirrorX: false,
      connectedTo: { A: null, B: null }
    }]
    const result = validateLayout(pieces, catalogueN, 10)
    expect(result.floatingPieces).toContain('p1')
  })

  it('does not flag floating when piece has at least one connection', () => {
    const pieces = [{
      instanceId: 'p1', pieceId: '44815', x: 0, y: 0, rotation: 0, mirrorX: false,
      connectedTo: { A: 'p2:B', B: null }
    }]
    const result = validateLayout(pieces, catalogueN, 10)
    expect(result.floatingPieces).not.toContain('p1')
  })

  it('detects one open endpoint when piece has partial connections', () => {
    const pieces = [{
      instanceId: 'p1', pieceId: '44815', x: 0, y: 0, rotation: 0, mirrorX: false,
      connectedTo: { A: 'p2:B', B: null }
    }]
    const result = validateLayout(pieces, catalogueN, 10)
    expect(result.openEndpoints).toHaveLength(1)
    expect(result.openEndpoints[0].connectorId).toBe('B')
  })

  it('detects overlapping pieces', () => {
    // Two 10" straights placed at the same position
    const pieces = [
      { instanceId: 'p1', pieceId: '44815', x: 100, y: 100, rotation: 0, mirrorX: false, connectedTo: { A: null, B: null } },
      { instanceId: 'p2', pieceId: '44815', x: 100, y: 100, rotation: 0, mirrorX: false, connectedTo: { A: null, B: null } },
    ]
    const result = validateLayout(pieces, catalogueN, 10)
    expect(result.overlappingPieces).toContain('p1')
    expect(result.overlappingPieces).toContain('p2')
  })

  it('does not flag non-overlapping pieces as overlapping', () => {
    // Two 10" straights far apart
    const pieces = [
      { instanceId: 'p1', pieceId: '44815', x: 0, y: 0, rotation: 0, mirrorX: false, connectedTo: { A: null, B: null } },
      { instanceId: 'p2', pieceId: '44815', x: 500, y: 500, rotation: 0, mirrorX: false, connectedTo: { A: null, B: null } },
    ]
    const result = validateLayout(pieces, catalogueN, 10)
    expect(result.overlappingPieces).toHaveLength(0)
  })
})
