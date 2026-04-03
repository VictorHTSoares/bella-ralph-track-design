import { Layer, Line } from 'react-konva'

export default function GridLayer({ width, height, gridSpacing = 100, visible }) {
  if (!visible) return null
  const lines = []
  for (let x = 0; x <= width; x += gridSpacing) {
    lines.push(<Line key={`v${x}`} points={[x, 0, x, height]} stroke="#e0e0e0" strokeWidth={0.5} />)
  }
  for (let y = 0; y <= height; y += gridSpacing) {
    lines.push(<Line key={`h${y}`} points={[0, y, width, y]} stroke="#e0e0e0" strokeWidth={0.5} />)
  }
  return <Layer>{lines}</Layer>
}
