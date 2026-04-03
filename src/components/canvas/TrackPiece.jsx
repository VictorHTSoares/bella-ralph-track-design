import { Group, Path, Circle } from 'react-konva'
import { PIXELS_PER_INCH } from '../../constants'

const PPT = PIXELS_PER_INCH
const ROADBED_COLOR = '#888'
const OPEN_ENDPOINT_COLOR = '#ef4444'
const CONNECTED_ENDPOINT_COLOR = '#22c55e'

function buildPath(geometry) {
  if (geometry.type === 'straight') {
    const L = geometry.length * PPT
    return `M 0 0 L ${L} 0`
  }
  if (geometry.type === 'curve') {
    const R = geometry.radius * PPT
    const D = geometry.arc * (Math.PI / 180)
    const Bx = R * Math.sin(D)
    const By = R * (1 - Math.cos(D))
    return `M 0 0 A ${R} ${R} 0 0 1 ${Bx.toFixed(2)} ${By.toFixed(2)}`
  }
  if (geometry.type === 'bumper') {
    const L = geometry.length * PPT
    return `M 0 0 L ${L} 0 M ${L} -4 L ${L} 4`
  }
  return null
}

function TurnoutShape({ connectors }) {
  const B = connectors.find(c => c.id === 'B')
  const C = connectors.find(c => c.id === 'C')
  const Bx = (B?.x ?? 0) * PPT
  const Cx = (C?.x ?? 0) * PPT
  const Cy = (C?.y ?? 0) * PPT
  return (
    <>
      <Path data={`M 0 0 L ${Bx} 0`} stroke={ROADBED_COLOR} strokeWidth={6} lineCap="round" fill="transparent" />
      <Path data={`M 0 0 L ${Cx} ${Cy}`} stroke={ROADBED_COLOR} strokeWidth={6} lineCap="round" fill="transparent" />
    </>
  )
}

function CrossoverShape({ connectors }) {
  const A = connectors.find(c => c.id === 'A')
  const B = connectors.find(c => c.id === 'B')
  const C = connectors.find(c => c.id === 'C')
  const D = connectors.find(c => c.id === 'D')
  const Ax = (A?.x ?? 0) * PPT, Ay = (A?.y ?? 0) * PPT
  const Bx = (B?.x ?? 0) * PPT, By = (B?.y ?? 0) * PPT
  const Cx = (C?.x ?? 0) * PPT, Cy = (C?.y ?? 0) * PPT
  const Dx = (D?.x ?? 0) * PPT, Dy = (D?.y ?? 0) * PPT
  return (
    <>
      <Path data={`M ${Ax} ${Ay} L ${Bx} ${By}`} stroke={ROADBED_COLOR} strokeWidth={6} lineCap="round" fill="transparent" />
      <Path data={`M ${Cx} ${Cy} L ${Dx} ${Dy}`} stroke={ROADBED_COLOR} strokeWidth={6} lineCap="round" fill="transparent" />
    </>
  )
}

function CrossingShape({ geometry, connectors }) {
  const A = connectors.find(c => c.id === 'A')
  const B = connectors.find(c => c.id === 'B')
  const C = connectors.find(c => c.id === 'C')
  const D = connectors.find(c => c.id === 'D')
  const Ax = (A?.x ?? 0) * PPT, Ay = (A?.y ?? 0) * PPT
  const Bx = (B?.x ?? 0) * PPT, By = (B?.y ?? 0) * PPT
  const Cx = (C?.x ?? 0) * PPT, Cy = (C?.y ?? 0) * PPT
  const Dx = (D?.x ?? 0) * PPT, Dy = (D?.y ?? 0) * PPT
  return (
    <>
      <Path data={`M ${Ax} ${Ay} L ${Bx} ${By}`} stroke={ROADBED_COLOR} strokeWidth={6} lineCap="round" fill="transparent" />
      <Path data={`M ${Cx} ${Cy} L ${Dx} ${Dy}`} stroke={ROADBED_COLOR} strokeWidth={6} lineCap="round" fill="transparent" />
    </>
  )
}

export default function TrackPiece({ piece, catPiece, isSelected, onSelect, onDragEnd, onContextMenu, onConnectorClick, isGhost = false }) {
  const { x, y, rotation, mirrorX, connectedTo } = piece
  const { geometry, connectors } = catPiece

  const isTurnout = geometry.type === 'turnout'
  const isCrossover = geometry.type === 'crossover'
  const isCrossing = geometry.type === 'crossing'
  const pathData = buildPath(geometry)

  return (
    <Group
      x={x}
      y={y}
      rotation={rotation}
      scaleX={mirrorX ? -1 : 1}
      draggable={!isGhost}
      listening={!isGhost}
      opacity={isGhost ? 0.45 : 1}
      onClick={isGhost ? undefined : (e) => { e.cancelBubble = true; onSelect?.() }}
      onContextMenu={isGhost ? undefined : onContextMenu}
      onDragEnd={isGhost ? undefined : onDragEnd}
    >
      {isTurnout && <TurnoutShape connectors={connectors} />}
      {isCrossover && <CrossoverShape connectors={connectors} />}
      {isCrossing && <CrossingShape geometry={geometry} connectors={connectors} />}
      {!isTurnout && !isCrossover && !isCrossing && pathData && (
        <Path
          data={pathData}
          stroke={isSelected ? '#3b82f6' : ROADBED_COLOR}
          strokeWidth={6}
          lineCap="round"
          fill="transparent"
        />
      )}
      {!isGhost && connectors.map((c) => {
        const cx = c.x * PPT
        const cy = c.y * PPT
        const isConnected = connectedTo[c.id] !== null && connectedTo[c.id] !== undefined
        return (
          <Circle
            key={c.id}
            x={cx}
            y={cy}
            radius={5}
            fill={isConnected ? CONNECTED_ENDPOINT_COLOR : OPEN_ENDPOINT_COLOR}
            onClick={!isConnected && onConnectorClick
              ? (e) => { e.cancelBubble = true; onConnectorClick(c.id) }
              : undefined}
          />
        )
      })}
    </Group>
  )
}
