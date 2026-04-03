export default function Toolbar({
  canUndo, canRedo, onUndo, onRedo,
  onValidate, onExportPNG, onExportPartsList,
  onSave, onLoad,
  showGrid, onToggleGrid,
  freeRotate, onToggleFreeRotate,
  scale, onScaleChange,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                  borderBottom: '1px solid #ddd', background: '#fff', flexShrink: 0, flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 700, fontSize: 14, marginRight: 8 }}>🚂 Bella-Ralph Track Design</span>
      <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">↩ Undo</button>
      <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">↪ Redo</button>
      <span style={{ width: 1, height: 20, background: '#ddd' }} />
      <button onClick={onValidate}>✓ Validate</button>
      <span style={{ width: 1, height: 20, background: '#ddd' }} />
      <button onClick={onSave}>💾 Save</button>
      <button onClick={onLoad}>📂 Load</button>
      <span style={{ width: 1, height: 20, background: '#ddd' }} />
      <details style={{ position: 'relative' }}>
        <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '4px 8px',
                          border: '1px solid #ccc', borderRadius: 4, userSelect: 'none' }}>
          Export ▾
        </summary>
        <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff',
                      border: '1px solid #ccc', borderRadius: 4, zIndex: 100, minWidth: 180 }}>
          <button onClick={onExportPNG}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                     border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Export as PNG
          </button>
          <button onClick={onExportPartsList}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                     border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Export Parts List (HTML)
          </button>
        </div>
      </details>
      <span style={{ width: 1, height: 20, background: '#ddd' }} />
      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
        <input type="checkbox" checked={showGrid} onChange={onToggleGrid} /> Grid
      </label>
      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
        <input type="checkbox" checked={freeRotate} onChange={onToggleFreeRotate} /> Free Rotate
      </label>
      <span style={{ width: 1, height: 20, background: '#ddd' }} />
      <label style={{ fontSize: 12 }}>
        Scale:{' '}
        <select value={scale} onChange={(e) => onScaleChange(e.target.value)} style={{ fontSize: 12 }}>
          <option value="N">N Scale</option>
          <option value="HO" disabled>HO (coming soon)</option>
          <option value="O" disabled>O (coming soon)</option>
          <option value="G" disabled>G (coming soon)</option>
        </select>
      </label>
    </div>
  )
}
