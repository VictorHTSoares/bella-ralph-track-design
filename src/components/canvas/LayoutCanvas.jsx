import { useRef, useEffect, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import GridLayer from './GridLayer'

const CANVAS_SIZE = 3000

export default function LayoutCanvas({ children, showGrid, onCanvasClick, pendingPieceId, stageRef }) {
  const containerRef = useRef(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)

  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  function handleWheel(e) {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    const scaleBy = 1.1
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
    const clamped = Math.max(0.1, Math.min(8, newScale))
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    setStageScale(clamped)
    setStagePos({
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    })
  }

  function handleStageClick(e) {
    if (e.target === e.target.getStage() && onCanvasClick) {
      const stage = e.target.getStage()
      const pos = stage.getRelativePointerPosition()
      onCanvasClick(pos)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'hidden', background: '#f5f5f5',
               cursor: pendingPieceId ? 'crosshair' : 'default' }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable={!pendingPieceId}
        onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
        onWheel={handleWheel}
        onClick={handleStageClick}
      >
        <GridLayer width={CANVAS_SIZE} height={CANVAS_SIZE} gridSpacing={100} visible={showGrid} />
        {children}
      </Stage>
    </div>
  )
}
