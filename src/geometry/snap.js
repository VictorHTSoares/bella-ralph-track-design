import { ANGLE_TOLERANCE } from '../constants'

/**
 * Shortest angular difference between two angles (0–180).
 */
export function angleDiff(a1, a2) {
  const diff = Math.abs((a1 - a2 + 360) % 360)
  return Math.min(diff, 360 - diff)
}

/**
 * Two connectors can snap if they face opposite directions (diff ≈ 180°).
 */
export function isSnapValid(c1, c2) {
  return Math.abs(angleDiff(c1.worldAngle, c2.worldAngle) - 180) < ANGLE_TOLERANCE
}

/**
 * Given world-space connectors of the piece being dragged, find the closest
 * valid snap among all free connectors of placed pieces.
 *
 * @param {Array}  draggedConnectors  - world connectors of dragged piece
 * @param {Array}  placedWorldPieces  - [{ instanceId, connectors: [{id, worldX, worldY, worldAngle}], connectedTo }]
 * @param {number} snapThreshold      - pixels
 * @param {number} angleTolerance     - degrees
 * @returns {{ draggedConnectorId, targetInstanceId, targetConnectorId, dx, dy } | null}
 */
export function findBestSnap(draggedConnectors, placedWorldPieces, snapThreshold, angleTolerance) {
  let best = null
  let bestDist = Infinity

  for (const dc of draggedConnectors) {
    for (const placed of placedWorldPieces) {
      for (const tc of placed.connectors) {
        // Skip already-connected target connectors
        if (placed.connectedTo[tc.id] !== null && placed.connectedTo[tc.id] !== undefined) continue

        const dist = Math.hypot(dc.worldX - tc.worldX, dc.worldY - tc.worldY)
        if (dist > snapThreshold) continue
        if (!isSnapValid(dc, tc)) continue
        if (dist < bestDist) {
          bestDist = dist
          best = {
            draggedConnectorId: dc.id,
            targetInstanceId: placed.instanceId,
            targetConnectorId: tc.id,
            dx: tc.worldX - dc.worldX,
            dy: tc.worldY - dc.worldY,
          }
        }
      }
    }
  }
  return best
}
