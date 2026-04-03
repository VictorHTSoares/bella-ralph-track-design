import { useState } from 'react'
import catalogue from '../data/catalogue.json'

const CATEGORIES = [
  { key: 'straight', label: 'Straights' },
  { key: 'curve',    label: 'Curves' },
  { key: 'turnout',  label: 'Turnouts' },
  { key: 'crossing', label: 'Crossings' },
  { key: 'bumper',   label: 'Bumpers' },
  { key: 'special',  label: 'Specials' },
]

export default function Sidebar({ scale = 'N', pieces, onSelectPiece, selectedPieceId }) {
  const [search, setSearch] = useState('')
  const [openCats, setOpenCats] = useState(new Set(['straight', 'curve']))

  const catalogueItems = catalogue[scale] ?? []
  const filtered = catalogueItems.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.itemNo.includes(search)
  )

  const catMap = Object.fromEntries(catalogueItems.map((c) => [c.id, c]))
  const partsMap = {}
  for (const p of pieces) {
    partsMap[p.pieceId] = (partsMap[p.pieceId] ?? 0) + 1
  }
  const partsList = Object.entries(partsMap).map(([id, qty]) => {
    const cat = catMap[id]
    return { id, qty, name: cat?.name ?? id, price: cat?.price ?? 0 }
  })
  const totalCost = partsList.reduce((sum, p) => sum + p.price * p.qty, 0)

  function toggleCat(key) {
    setOpenCats((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div style={{ width: 220, display: 'flex', flexDirection: 'column', borderRight: '1px solid #ddd',
                  background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '8px' }}>
        <input
          type="text"
          placeholder="Search pieces..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc',
                   borderRadius: 4, boxSizing: 'border-box', fontSize: 12 }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {CATEGORIES.map(({ key, label }) => {
          const items = filtered.filter((p) => p.category === key)
          if (items.length === 0) return null
          const isOpen = openCats.has(key)
          return (
            <div key={key}>
              <button
                onClick={() => toggleCat(key)}
                style={{ width: '100%', textAlign: 'left', padding: '6px 8px', border: 'none',
                         background: '#f3f4f6', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
              >
                {isOpen ? '▾' : '▸'} {label} ({items.length})
              </button>
              {isOpen && items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPiece(p.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '5px 16px',
                    border: 'none', borderBottom: '1px solid #f0f0f0',
                    background: selectedPieceId === p.id ? '#dbeafe' : '#fff',
                    cursor: 'pointer', fontSize: 11,
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div style={{ color: '#888' }}>#{p.itemNo} · ${p.price.toFixed(2)}</div>
                </button>
              ))}
            </div>
          )
        })}
      </div>
      <div style={{ borderTop: '1px solid #ddd', padding: 8, fontSize: 11 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Parts List</div>
        {partsList.length === 0 && <div style={{ color: '#aaa' }}>No pieces placed yet</div>}
        {partsList.map((p) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{p.name}</span>
            <span style={{ color: '#555', whiteSpace: 'nowrap' }}>×{p.qty} ${(p.price * p.qty).toFixed(0)}</span>
          </div>
        ))}
        {partsList.length > 0 && (
          <div style={{ marginTop: 4, fontWeight: 700, borderTop: '1px solid #eee', paddingTop: 4 }}>
            Total: ${totalCost.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  )
}
