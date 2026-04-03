import { describe, it, expect } from 'vitest'
import { layoutReducer, initialState } from '../hooks/useLayoutReducer'

function place(state, pieceId, x = 0, y = 0, rotation = 0, instanceId = 'inst-1') {
  return layoutReducer(state, {
    type: 'PLACE_PIECE',
    payload: {
      instanceId,
      pieceId,
      x,
      y,
      rotation,
      mirrorX: false,
      connectors: [{ id: 'A' }, { id: 'B' }],
    }
  })
}

describe('PLACE_PIECE', () => {
  it('adds a piece to the layout', () => {
    const s = place(initialState, '44815', 100, 200)
    expect(s.pieces).toHaveLength(1)
    expect(s.pieces[0].pieceId).toBe('44815')
    expect(s.pieces[0].x).toBe(100)
    expect(s.pieces[0].connectedTo).toEqual({ A: null, B: null })
  })
})

describe('DELETE_PIECE', () => {
  it('removes a piece from the layout', () => {
    let s = place(initialState, '44815')
    s = layoutReducer(s, { type: 'DELETE_PIECE', payload: { instanceId: 'inst-1' } })
    expect(s.pieces).toHaveLength(0)
  })

  it('clears connections pointing to the deleted piece', () => {
    let s = place(initialState, '44815', 0, 0, 0, 'inst-1')
    s = place(s, '44815', 100, 0, 0, 'inst-2')
    // Connect inst-2.A → inst-1.B
    s = layoutReducer(s, {
      type: 'CONNECT',
      payload: { instanceId: 'inst-2', connectorId: 'A', targetInstanceId: 'inst-1', targetConnectorId: 'B' }
    })
    // Now delete inst-1
    s = layoutReducer(s, { type: 'DELETE_PIECE', payload: { instanceId: 'inst-1' } })
    expect(s.pieces).toHaveLength(1)
    expect(s.pieces[0].connectedTo.A).toBeNull()
  })
})

describe('MOVE_PIECE', () => {
  it('updates position', () => {
    let s = place(initialState, '44815', 100, 200)
    s = layoutReducer(s, { type: 'MOVE_PIECE', payload: { instanceId: 'inst-1', x: 300, y: 400 } })
    expect(s.pieces[0].x).toBe(300)
    expect(s.pieces[0].y).toBe(400)
  })

  it('clears all connections when piece is moved', () => {
    let s = place(initialState, '44815', 0, 0, 0, 'inst-1')
    s = place(s, '44815', 100, 0, 0, 'inst-2')
    s = layoutReducer(s, {
      type: 'CONNECT',
      payload: { instanceId: 'inst-1', connectorId: 'B', targetInstanceId: 'inst-2', targetConnectorId: 'A' }
    })
    s = layoutReducer(s, { type: 'MOVE_PIECE', payload: { instanceId: 'inst-1', x: 300, y: 400 } })
    expect(s.pieces.find(p => p.instanceId === 'inst-1').connectedTo.B).toBeNull()
    expect(s.pieces.find(p => p.instanceId === 'inst-2').connectedTo.A).toBeNull()
  })
})

describe('CONNECT', () => {
  it('creates a bidirectional connection between two connectors', () => {
    let s = place(initialState, '44815', 0, 0, 0, 'inst-1')
    s = place(s, '44815', 100, 0, 0, 'inst-2')
    s = layoutReducer(s, {
      type: 'CONNECT',
      payload: { instanceId: 'inst-1', connectorId: 'B', targetInstanceId: 'inst-2', targetConnectorId: 'A' }
    })
    expect(s.pieces.find(p => p.instanceId === 'inst-1').connectedTo.B).toBe('inst-2:A')
    expect(s.pieces.find(p => p.instanceId === 'inst-2').connectedTo.A).toBe('inst-1:B')
  })
})

describe('UNDO / REDO', () => {
  it('undoes a place action', () => {
    let s = place(initialState, '44815')
    expect(s.pieces).toHaveLength(1)
    s = layoutReducer(s, { type: 'UNDO' })
    expect(s.pieces).toHaveLength(0)
  })

  it('redoes an undone action', () => {
    let s = place(initialState, '44815')
    s = layoutReducer(s, { type: 'UNDO' })
    s = layoutReducer(s, { type: 'REDO' })
    expect(s.pieces).toHaveLength(1)
  })

  it('UNDO on empty past does nothing', () => {
    const s = layoutReducer(initialState, { type: 'UNDO' })
    expect(s).toBe(initialState)
  })

  it('REDO on empty future does nothing', () => {
    const s = layoutReducer(initialState, { type: 'REDO' })
    expect(s).toBe(initialState)
  })
})

describe('SET_BOUNDARY', () => {
  it('sets the boundary', () => {
    const s = layoutReducer(initialState, { type: 'SET_BOUNDARY', payload: { width: 96, height: 48 } })
    expect(s.boundary).toEqual({ width: 96, height: 48 })
  })

  it('clears the boundary when payload is null', () => {
    let s = layoutReducer(initialState, { type: 'SET_BOUNDARY', payload: { width: 96, height: 48 } })
    s = layoutReducer(s, { type: 'SET_BOUNDARY', payload: null })
    expect(s.boundary).toBeNull()
  })
})

describe('CLEAR_LAYOUT', () => {
  it('removes all pieces and resets to initial state', () => {
    let s = place(initialState, '44815')
    s = layoutReducer(s, { type: 'CLEAR_LAYOUT' })
    expect(s.pieces).toHaveLength(0)
    expect(s.boundary).toBeNull()
  })
})
