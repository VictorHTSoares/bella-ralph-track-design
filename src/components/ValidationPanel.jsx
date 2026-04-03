export default function ValidationPanel({ openEndpoints, overlappingPieces, floatingPieces, visible, onClose }) {
  if (!visible) return null
  const hasIssues = openEndpoints.length + overlappingPieces.length + floatingPieces.length > 0
  return (
    <div style={{ position: 'absolute', top: 48, right: 8, width: 280, background: '#fff',
                  border: '1px solid #ddd', borderRadius: 6, padding: 12, zIndex: 50, fontSize: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 700 }}>Validation Results</span>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14 }}>×</button>
      </div>
      {!hasIssues && <div style={{ color: '#22c55e' }}>✓ No issues found</div>}
      {openEndpoints.map((ep, i) => (
        <div key={i} style={{ color: '#ef4444', marginBottom: 2 }}>
          ● Open: {ep.instanceId} — connector {ep.connectorId}
        </div>
      ))}
      {overlappingPieces.map((id) => (
        <div key={id} style={{ color: '#ef4444', marginBottom: 2 }}>● Overlap: {id}</div>
      ))}
      {floatingPieces.map((id) => (
        <div key={id} style={{ color: '#f59e0b', marginBottom: 2 }}>● Floating: {id}</div>
      ))}
    </div>
  )
}
