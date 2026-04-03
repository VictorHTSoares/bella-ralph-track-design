import { useState, useEffect } from 'react'

const STEPS = [
  { title: 'Pick a piece', body: 'Click any track piece in the left sidebar to select it.' },
  { title: 'Place it', body: 'Click anywhere on the canvas to place the piece. Or drag directly from the sidebar.' },
  { title: 'Connect pieces', body: 'Drag a piece close to another — endpoints snap together automatically when facing each other. Right-click to rotate.' },
]

const STORAGE_KEY = 'brtrack_onboarding_done'

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      localStorage.setItem(STORAGE_KEY, '1')
      setVisible(false)
    }
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  const s = STEPS[step]
  return (
    <div style={{ position: 'fixed', bottom: 40, right: 40, width: 280, background: '#1e293b',
                  color: '#fff', borderRadius: 10, padding: 20, zIndex: 200,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
        Step {step + 1} of {STEPS.length}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{s.title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>{s.body}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={dismiss}
          style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 12 }}>
          Skip
        </button>
        <button onClick={next}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6,
                   padding: '6px 16px', cursor: 'pointer', fontWeight: 600 }}>
          {step < STEPS.length - 1 ? 'Next →' : 'Get Started'}
        </button>
      </div>
    </div>
  )
}
