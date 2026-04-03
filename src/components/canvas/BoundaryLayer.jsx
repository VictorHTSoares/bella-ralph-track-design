import { Layer, Rect, Text } from 'react-konva'
import { PIXELS_PER_INCH } from '../../constants'

export default function BoundaryLayer({ boundary }) {
  if (!boundary) return null
  const w = boundary.width * PIXELS_PER_INCH
  const h = boundary.height * PIXELS_PER_INCH
  return (
    <Layer listening={false}>
      <Rect x={0} y={0} width={w} height={h}
        stroke="#3b82f6" strokeWidth={2} dash={[10, 5]}
        fill="rgba(59,130,246,0.03)" />
      <Text x={4} y={4} text={`${boundary.width}" × ${boundary.height}"`}
        fontSize={12} fill="#3b82f6" />
    </Layer>
  )
}
