import { useReducer } from 'react'

export const initialState = {
  pieces: [],          // PlacedPiece[]
  boundary: null,      // { width, height } in inches | null
  past: [],            // snapshots for undo
  future: [],          // snapshots for redo
}

/**
 * PlacedPiece:
 * { instanceId, pieceId, x, y, rotation, mirrorX, connectedTo: { [connectorId]: "instanceId:connectorId" | null } }
 */

function buildConnectedTo(connectors) {
  return Object.fromEntries(connectors.map((c) => [c.id, null]))
}

function snapshot(state) {
  return { pieces: state.pieces, boundary: state.boundary }
}

const MODIFYING = new Set([
  'PLACE_PIECE', 'DELETE_PIECE', 'MOVE_PIECE', 'CONNECT', 'DISCONNECT',
  'SET_BOUNDARY', 'LOAD_LAYOUT', 'CLEAR_LAYOUT',
])

export function layoutReducer(state, action) {
  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state
    const prev = state.past[state.past.length - 1]
    return {
      ...state,
      ...prev,
      past: state.past.slice(0, -1),
      future: [snapshot(state), ...state.future],
    }
  }

  if (action.type === 'REDO') {
    if (state.future.length === 0) return state
    const next = state.future[0]
    return {
      ...state,
      ...next,
      past: [...state.past, snapshot(state)],
      future: state.future.slice(1),
    }
  }

  const newState = coreReducer(state, action)
  if (MODIFYING.has(action.type)) {
    return { ...newState, past: [...state.past, snapshot(state)], future: [] }
  }
  return newState
}

function coreReducer(state, action) {
  switch (action.type) {
    case 'PLACE_PIECE': {
      const { instanceId, pieceId, x, y, rotation, mirrorX, connectors } = action.payload
      const piece = {
        instanceId,
        pieceId,
        x,
        y,
        rotation: rotation ?? 0,
        mirrorX: mirrorX ?? false,
        connectedTo: buildConnectedTo(connectors || []),
      }
      return { ...state, pieces: [...state.pieces, piece] }
    }

    case 'MOVE_PIECE': {
      const { instanceId, x, y } = action.payload
      // Moving disconnects all connections — piece is floating after a move
      const pieces = state.pieces.map((p) => {
        if (p.instanceId !== instanceId) {
          // Clear any connections that point to the moved piece
          const connectedTo = Object.fromEntries(
            Object.entries(p.connectedTo).map(([k, v]) =>
              v && v.startsWith(instanceId + ':') ? [k, null] : [k, v]
            )
          )
          return { ...p, connectedTo }
        }
        const connectedTo = Object.fromEntries(Object.keys(p.connectedTo).map((k) => [k, null]))
        return { ...p, x, y, connectedTo }
      })
      return { ...state, pieces }
    }

    case 'DELETE_PIECE': {
      const { instanceId } = action.payload
      const pieces = state.pieces
        .filter((p) => p.instanceId !== instanceId)
        .map((p) => {
          const connectedTo = Object.fromEntries(
            Object.entries(p.connectedTo).map(([k, v]) =>
              v && v.startsWith(instanceId + ':') ? [k, null] : [k, v]
            )
          )
          return { ...p, connectedTo }
        })
      return { ...state, pieces }
    }

    case 'CONNECT': {
      const { instanceId, connectorId, targetInstanceId, targetConnectorId } = action.payload
      const pieces = state.pieces.map((p) => {
        if (p.instanceId === instanceId)
          return { ...p, connectedTo: { ...p.connectedTo, [connectorId]: `${targetInstanceId}:${targetConnectorId}` } }
        if (p.instanceId === targetInstanceId)
          return { ...p, connectedTo: { ...p.connectedTo, [targetConnectorId]: `${instanceId}:${connectorId}` } }
        return p
      })
      return { ...state, pieces }
    }

    case 'DISCONNECT': {
      const { instanceId, connectorId } = action.payload
      const target = state.pieces.find((p) => p.instanceId === instanceId)?.connectedTo[connectorId]
      const pieces = state.pieces.map((p) => {
        if (p.instanceId === instanceId)
          return { ...p, connectedTo: { ...p.connectedTo, [connectorId]: null } }
        if (target) {
          const [tid, tcid] = target.split(':')
          if (p.instanceId === tid)
            return { ...p, connectedTo: { ...p.connectedTo, [tcid]: null } }
        }
        return p
      })
      return { ...state, pieces }
    }

    case 'SET_BOUNDARY':
      return { ...state, boundary: action.payload }

    case 'LOAD_LAYOUT':
      return { ...initialState, pieces: action.payload.pieces ?? [], boundary: action.payload.boundary ?? null }

    case 'CLEAR_LAYOUT':
      return { ...initialState }

    default:
      return state
  }
}

export function useLayoutReducer() {
  return useReducer(layoutReducer, initialState)
}
