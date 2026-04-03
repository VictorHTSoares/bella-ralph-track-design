import { useMemo } from 'react'
import { getWorldConnectors } from '../geometry/connectors'

/**
 * Pure validation function — usable in tests and in the React hook.
 * @param {Array}  pieces         - placed piece instances
 * @param {Array}  catalogueItems - N-scale catalogue pieces (for connector defs)
 * @param {number} ppi            - pixels per inch
 * @returns {{ openEndpoints, floatingPieces, overlappingPieces }}
 */
export function validateLayout(pieces, catalogueItems, ppi) {
  const catMap = Object.fromEntries(catalogueItems.map((c) => [c.id, c]))

  const openEndpoints = []
  const floatingPieces = []
  const overlappingPieces = []

  // Build bounding boxes for overlap detection
  const boxes = []

  for (const piece of pieces) {
    const catPiece = catMap[piece.pieceId]
    if (!catPiece) continue

    const pieceWithConnectors = { ...piece, connectors: catPiece.connectors }
    const worldConns = getWorldConnectors(pieceWithConnectors, ppi)

    let hasAnyConnection = false

    for (const wc of worldConns) {
      const connected = piece.connectedTo[wc.id]
      if (connected !== null && connected !== undefined) {
        hasAnyConnection = true
      } else {
        openEndpoints.push({
          instanceId: piece.instanceId,
          connectorId: wc.id,
          worldX: wc.worldX,
          worldY: wc.worldY,
        })
      }
    }

    if (!hasAnyConnection) {
      floatingPieces.push(piece.instanceId)
    }

    // Bounding box from connector positions (+ padding)
    const xs = worldConns.map((c) => c.worldX)
    const ys = worldConns.map((c) => c.worldY)
    const pad = 3
    boxes.push({
      instanceId: piece.instanceId,
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minY: Math.min(...ys) - pad,
      maxY: Math.max(...ys) + pad,
    })
  }

  // Build set of directly-connected pairs — connected pieces touch by design, not overlap
  const connectedPairs = new Set()
  for (const piece of pieces) {
    for (const target of Object.values(piece.connectedTo)) {
      if (target) {
        const [targetId] = target.split(':')
        connectedPairs.add([piece.instanceId, targetId].sort().join('|'))
      }
    }
  }

  // O(n²) overlap check — acceptable for typical layout sizes
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (connectedPairs.has([a.instanceId, b.instanceId].sort().join('|'))) continue
      const overlaps =
        a.minX < b.maxX && a.maxX > b.minX &&
        a.minY < b.maxY && a.maxY > b.minY
      if (overlaps) {
        if (!overlappingPieces.includes(a.instanceId)) overlappingPieces.push(a.instanceId)
        if (!overlappingPieces.includes(b.instanceId)) overlappingPieces.push(b.instanceId)
      }
    }
  }

  return { openEndpoints, floatingPieces, overlappingPieces }
}

/**
 * React hook — memoized validation that reruns only when pieces change.
 */
export function useValidation(pieces, catalogueItems, ppi) {
  return useMemo(
    () => validateLayout(pieces, catalogueItems, ppi),
    [pieces, catalogueItems, ppi]
  )
}
