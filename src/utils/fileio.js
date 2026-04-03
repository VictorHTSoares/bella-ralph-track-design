export function saveLayout(layoutState) {
  const data = {
    version: 1,
    scale: 'N',
    pieces: layoutState.pieces,
    boundary: layoutState.boundary,
    savedAt: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'bella-ralph-layout.brtrack'
  a.click()
  URL.revokeObjectURL(url)
}

export function loadLayout() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.brtrack,.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return reject(new Error('No file selected'))
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result)
          resolve({ pieces: data.pieces ?? [], boundary: data.boundary ?? null })
        } catch {
          reject(new Error('Invalid .brtrack file'))
        }
      }
      reader.readAsText(file)
    }
    input.click()
  })
}
