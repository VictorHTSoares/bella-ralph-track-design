/**
 * Transform a piece's catalogue connectors into world-space coordinates.
 * @param {object} piece - { x, y, rotation (degrees), mirrorX, connectors }
 * @param {number} ppi   - pixels per inch
 * @returns {Array}      - connectors with { id, worldX, worldY, worldAngle }
 */
export function getWorldConnectors(piece, ppi) {
  const { x, y, rotation, mirrorX, connectors } = piece
  const rad = (rotation * Math.PI) / 180

  return connectors.map((c) => {
    // Apply mirrorX before rotation: negate local Y
    const lx = c.x * ppi
    const ly = mirrorX ? -c.y * ppi : c.y * ppi

    // Rotate by piece.rotation
    const worldX = x + lx * Math.cos(rad) - ly * Math.sin(rad)
    const worldY = y + lx * Math.sin(rad) + ly * Math.cos(rad)

    // Angle: mirror negates Y-component of angle, then add rotation
    const localAngle = mirrorX ? (360 - c.angle) % 360 : c.angle
    const worldAngle = (localAngle + rotation + 360) % 360

    return { id: c.id, worldX, worldY, worldAngle }
  })
}
