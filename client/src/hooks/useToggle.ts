import { useState } from 'react'

export function useToggle(initial = false) {
  const [on, setOn] = useState(initial)
  return { on, toggle: () => setOn((v) => !v), set: setOn }
}
