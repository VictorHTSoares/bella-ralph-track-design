export default function StatusBar({ openEndpoints, overlappingPieces, floatingPieces, onSetBoundary }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 12px',
                  borderTop: '1px solid #ddd', background: '#fafafa', fontSize: 12, flexShrink: 0 }}>
      <span style={{ color: openEndpoints.length ? '#ef4444' : '#22c55e' }}>
        {openEndpoints.length} open endpoint{openEndpoints.length !== 1 ? 's' : ''}
      </span>
      <span style={{ color: overlappingPieces.length ? '#ef4444' : '#22c55e' }}>
        {overlappingPieces.length} overlap{overlappingPieces.length !== 1 ? 's' : ''}
      </span>
      <span style={{ color: floatingPieces.length ? '#f59e0b' : '#22c55e' }}>
        {floatingPieces.length} floating
      </span>
      <span style={{ marginLeft: 'auto' }}>
        <button onClick={onSetBoundary} style={{ fontSize: 11 }}>Set Boundary…</button>
      </span>
    </div>
  )
}
