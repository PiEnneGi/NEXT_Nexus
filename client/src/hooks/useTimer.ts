import { useState, useEffect } from 'react'

export function useTimer(initialMinutes = 15) {
  const [seconds, setSeconds] = useState(initialMinutes * 60)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!running) return
    if (seconds <= 0) return
    const id = setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [running, seconds])

  const reset = () => setSeconds(initialMinutes * 60)
  const toggle = () => setRunning((r) => !r)

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return { display, running, reset, toggle }
}
