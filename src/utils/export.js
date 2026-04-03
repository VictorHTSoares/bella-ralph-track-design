export function buildPartsList(pieces, catalogueItems) {
  const catMap = Object.fromEntries(catalogueItems.map((c) => [c.id, c]))
  const counts = {}
  for (const p of pieces) {
    counts[p.pieceId] = (counts[p.pieceId] ?? 0) + 1
  }
  return Object.entries(counts).map(([id, qty]) => {
    const cat = catMap[id] ?? { name: id, itemNo: '?', price: 0 }
    return { id, name: cat.name, itemNo: cat.itemNo, qty, unitPrice: cat.price, total: cat.price * qty }
  })
}

export function exportToPNG(stageRef, boundary, ppi) {
  const stage = stageRef.current
  if (!stage) return
  const config = boundary
    ? { x: 0, y: 0, width: boundary.width * ppi, height: boundary.height * ppi, pixelRatio: 2 }
    : { pixelRatio: 1 }
  const dataUrl = stage.toDataURL(config)
  downloadFile(dataUrl, 'bella-ralph-layout.png')
}

export function exportPartsListHTML(pieces, catalogueItems) {
  const parts = buildPartsList(pieces, catalogueItems)
  const grandTotal = parts.reduce((s, p) => s + p.total, 0)
  const rows = parts.map((p) =>
    `<tr><td>${p.itemNo}</td><td>${p.name}</td><td>${p.qty}</td><td>$${p.unitPrice.toFixed(2)}</td><td>$${p.total.toFixed(2)}</td></tr>`
  ).join('')
  const html = `<!DOCTYPE html><html><head><title>Parts List</title>
<style>body{font-family:sans-serif;padding:2rem}table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}
.total{font-weight:700;margin-top:1rem}</style></head><body>
<h1>Bella-Ralph Track Design — Parts List</h1>
<table><thead><tr><th>Item #</th><th>Name</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="total">Grand Total: $${grandTotal.toFixed(2)}</p>
</body></html>`
  downloadFile('data:text/html;charset=utf-8,' + encodeURIComponent(html), 'bella-ralph-parts-list.html')
}

function downloadFile(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
