import { useState, useRef, useEffect } from 'react'
import catalogue from './data/catalogue.json'
import { useLayoutReducer } from './hooks/useLayoutReducer'
import { useValidation } from './hooks/useValidation'
import { getWorldConnectors } from './geometry/connectors'
import { findBestSnap } from './geometry/snap'
import { PIXELS_PER_INCH, SNAP_THRESHOLD, ANGLE_TOLERANCE } from './constants'
import { saveLayout, loadLayout } from './utils/fileio'
import { exportToPNG, exportPartsListHTML } from './utils/export'
import Toolbar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import ValidationPanel from './components/ValidationPanel'
import Onboarding from './components/Onboarding'
import { Layer } from 'react-konva'
import LayoutCanvas from './components/canvas/LayoutCanvas'
import BoundaryLayer from './components/canvas/BoundaryLayer'
import TrackPiece from './components/canvas/TrackPiece'
import './App.css'

const ppi = PIXELS_PER_INCH

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function App() {
  const [state, dispatch] = useLayoutReducer()
  const [selectedPieceId, setSelectedPieceId] = useState(null)    // palette selection (catalogue id)
  const [selectedInstanceId, setSelectedInstanceId] = useState(null) // placed piece selection
  const [mouseCanvasPos, setMouseCanvasPos] = useState(null)
  const [freeRotate, setFreeRotate] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [showValidation, setShowValidation] = useState(false)
  const [scale, setScale] = useState('N')
  const stageRef = useRef(null)

  const catalogueItems = catalogue[scale] ?? []
  const catMap = Object.fromEntries(catalogueItems.map((c) => [c.id, c]))
  const validation = useValidation(state.pieces, catalogueItems, ppi)

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setSelectedPieceId(null)
        setSelectedInstanceId(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedInstanceId) {
        dispatch({ type: 'DELETE_PIECE', payload: { instanceId: selectedInstanceId } })
        setSelectedInstanceId(null)
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedInstanceId, dispatch])

  // Place piece on canvas click (click-to-place mode)
  function handleCanvasClick(pos) {
    if (!selectedPieceId) return
    const catPiece = catMap[selectedPieceId]
    if (!catPiece) return
    const instanceId = uuid()
    dispatch({
      type: 'PLACE_PIECE',
      payload: {
        instanceId,
        pieceId: selectedPieceId,
        x: pos.x,
        y: pos.y,
        rotation: 0,
        mirrorX: false,
        connectors: catPiece.connectors,
      },
    })
    setSelectedPieceId(null)
  }

  function getRotationIncrement(catPiece) {
    const geo = catPiece.geometry
    if (geo?.type === 'curve') return geo.arc
    if (geo?.type === 'straight') return 45
    if (geo?.type === 'turnout') return 30
    if (geo?.type === 'crossing' || geo?.type === 'crossover') return 90
    return 45
  }

  // Drag end: try all rotation increments to find best snap, then commit
  function handleDragEnd(instanceId, e) {
    const node = e.target
    const newX = node.x()
    const newY = node.y()

    const piece = state.pieces.find((p) => p.instanceId === instanceId)
    if (!piece) return
    const catPiece = catMap[piece.pieceId]
    if (!catPiece) return

    // Build world-connector data for all other placed pieces
    const placedWorldPieces = state.pieces
      .filter((p) => p.instanceId !== instanceId)
      .map((p) => {
        const cp = catMap[p.pieceId]
        if (!cp) return null
        return {
          instanceId: p.instanceId,
          connectedTo: p.connectedTo,
          connectors: getWorldConnectors({ ...p, connectors: cp.connectors }, ppi),
        }
      })
      .filter(Boolean)

    if (placedWorldPieces.length === 0) {
      dispatch({ type: 'MOVE_PIECE', payload: { instanceId, x: newX, y: newY } })
      return
    }

    // Try every rotation increment — pick the one that yields the closest snap
    const AUTO_SNAP_THRESHOLD = 80
    const increment = getRotationIncrement(catPiece)
    const steps = Math.round(360 / increment)

    let bestSnap = null
    let bestRotation = piece.rotation
    let bestDist = Infinity

    for (let i = 0; i < steps; i++) {
      const tryRotation = (i * increment) % 360
      const draggedAtRot = { ...piece, x: newX, y: newY, rotation: tryRotation, connectors: catPiece.connectors }
      const draggedWorldConns = getWorldConnectors(draggedAtRot, ppi)
      const snap = findBestSnap(draggedWorldConns, placedWorldPieces, AUTO_SNAP_THRESHOLD, ANGLE_TOLERANCE)
      if (snap) {
        const dist = Math.hypot(snap.dx, snap.dy)
        if (dist < bestDist) {
          bestDist = dist
          bestSnap = snap
          bestRotation = tryRotation
        }
      }
    }

    if (bestSnap) {
      const snappedX = newX + bestSnap.dx
      const snappedY = newY + bestSnap.dy
      node.x(snappedX)
      node.y(snappedY)
      node.rotation(bestRotation)
      dispatch({ type: 'MOVE_PIECE', payload: { instanceId, x: snappedX, y: snappedY, rotation: bestRotation } })
      dispatch({
        type: 'CONNECT',
        payload: {
          instanceId,
          connectorId: bestSnap.draggedConnectorId,
          targetInstanceId: bestSnap.targetInstanceId,
          targetConnectorId: bestSnap.targetConnectorId,
        },
      })
    } else {
      dispatch({ type: 'MOVE_PIECE', payload: { instanceId, x: newX, y: newY } })
    }
  }

  // Right-click to rotate
  function handleRightClick(instanceId, e) {
    e.evt.preventDefault()
    const piece = state.pieces.find((p) => p.instanceId === instanceId)
    if (!piece) return
    const catPiece = catMap[piece.pieceId]
    if (!catPiece) return
    // Don't allow rotation if any connector is connected
    const isAnyConnected = Object.values(piece.connectedTo).some((v) => v !== null)
    if (isAnyConnected) return

    let increment
    if (freeRotate) {
      increment = 5
    } else {
      const arc = catPiece.geometry?.arc
      if (arc) {
        increment = arc
      } else if (catPiece.geometry?.type === 'straight') {
        increment = 45
      } else {
        increment = 30
      }
    }

    const newRotation = (piece.rotation + increment) % 360
    // Disconnect all connections when rotating (position changes relative to connections)
    // We dispatch MOVE_PIECE which disconnects, then update rotation manually
    dispatch({ type: 'MOVE_PIECE', payload: { instanceId, x: piece.x, y: piece.y } })
    // Apply rotation after disconnect — we need a separate state update
    // Use a small workaround: dispatch a custom rotate action, or re-use PLACE flow
    // Since MOVE_PIECE doesn't accept rotation, we'll update via a second dispatch
    // Actually: dispatch MOVE_PIECE clears connections, then we need to update rotation.
    // The cleanest approach: add rotation to MOVE_PIECE payload and handle it in the reducer.
    // But the reducer doesn't handle rotation in MOVE_PIECE per spec.
    // Workaround: DELETE and re-PLACE at same position with new rotation.
    dispatch({ type: 'DELETE_PIECE', payload: { instanceId } })
    dispatch({
      type: 'PLACE_PIECE',
      payload: {
        instanceId,
        pieceId: piece.pieceId,
        x: piece.x,
        y: piece.y,
        rotation: newRotation,
        mirrorX: piece.mirrorX,
        connectors: catPiece.connectors,
      },
    })
  }

  function handleSetBoundary() {
    const w = prompt('Layout width in inches (e.g. 96 for 8ft):')
    const h = prompt('Layout height in inches (e.g. 48 for 4ft):')
    if (w && h && !isNaN(+w) && !isNaN(+h)) {
      dispatch({ type: 'SET_BOUNDARY', payload: { width: +w, height: +h } })
    }
  }

  async function handleLoad() {
    try {
      const layout = await loadLayout()
      dispatch({ type: 'LOAD_LAYOUT', payload: layout })
    } catch {
      // user cancelled or invalid file — silently ignore
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Toolbar
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onValidate={() => setShowValidation((v) => !v)}
        onExportPNG={() => exportToPNG(stageRef, state.boundary, ppi)}
        onExportPartsList={() => exportPartsListHTML(state.pieces, catalogueItems)}
        onSave={() => saveLayout(state)}
        onLoad={handleLoad}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((v) => !v)}
        freeRotate={freeRotate}
        onToggleFreeRotate={() => setFreeRotate((v) => !v)}
        scale={scale}
        onScaleChange={setScale}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Sidebar
          scale={scale}
          pieces={state.pieces}
          onSelectPiece={setSelectedPieceId}
          selectedPieceId={selectedPieceId}
        />

        <LayoutCanvas
          showGrid={showGrid}
          onCanvasClick={handleCanvasClick}
          onMouseMove={setMouseCanvasPos}
          pendingPieceId={selectedPieceId}
          stageRef={stageRef}
        >
          <BoundaryLayer boundary={state.boundary} />
          <Layer>
            {selectedPieceId && mouseCanvasPos && catMap[selectedPieceId] && (
              <TrackPiece
                key="__ghost__"
                piece={{
                  instanceId: '__ghost__',
                  pieceId: selectedPieceId,
                  x: mouseCanvasPos.x,
                  y: mouseCanvasPos.y,
                  rotation: 0,
                  mirrorX: false,
                  connectedTo: {},
                }}
                catPiece={catMap[selectedPieceId]}
                ppi={ppi}
                isSelected={false}
                isGhost={true}
                onSelect={() => {}}
                onDragEnd={() => {}}
                onContextMenu={() => {}}
              />
            )}
            {state.pieces.map((piece) => {
              const catPiece = catMap[piece.pieceId]
              if (!catPiece) return null
              return (
                <TrackPiece
                  key={piece.instanceId}
                  piece={piece}
                  catPiece={catPiece}
                  ppi={ppi}
                  isSelected={piece.instanceId === selectedInstanceId}
                  onSelect={() => setSelectedInstanceId(piece.instanceId)}
                  onDragEnd={(e) => handleDragEnd(piece.instanceId, e)}
                  onContextMenu={(e) => handleRightClick(piece.instanceId, e)}
                />
              )
            })}
          </Layer>
        </LayoutCanvas>

        {showValidation && (
          <ValidationPanel
            openEndpoints={validation.openEndpoints}
            overlappingPieces={validation.overlappingPieces}
            floatingPieces={validation.floatingPieces}
            visible={showValidation}
            onClose={() => setShowValidation(false)}
          />
        )}
      </div>

      <StatusBar
        openEndpoints={validation.openEndpoints}
        overlappingPieces={validation.overlappingPieces}
        floatingPieces={validation.floatingPieces}
        onSetBoundary={handleSetBoundary}
      />

      <Onboarding />
    </div>
  )
}
