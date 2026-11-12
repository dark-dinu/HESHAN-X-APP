'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

export type Result = { token: string; title: string; ext: string; platform: string }
const STEPS = ['Link එක පරීක්ෂා කරමින්...', 'Server එකෙන් media සොයමින්...', 'Secure link එක හදමින්...']

export function useDownloader() {
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState(0)
  const [stat, setStat] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = () => { if (timer.current) { clearInterval(timer.current); timer.current = null } }
  useEffect(() => stop, [])

  const reset = useCallback(() => {
    stop(); setBusy(false); setPct(0); setStat(''); setError(''); setResult(null)
  }, [])

  const run = useCallback(async (body: { url: string; platform: string; format: string }) => {
    stop(); setBusy(true); setError(''); setResult(null); setPct(8); setStat(STEPS[0])
    timer.current = setInterval(() => {
      setPct((p) => {
        const n = p + (92 - p) * 0.07
        setStat(n < 30 ? STEPS[0] : n < 62 ? STEPS[1] : STEPS[2])
        return n
      })
    }, 250)
    try {
      const res = await fetch('/api/download', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'බාගත කිරීමට නොහැකි විය')
      stop(); setPct(100); setStat('සූදානම්! Save කරන්න ✔'); setResult(data)
    } catch (e: any) {
      stop(); setPct(0); setStat(''); setError(e.message || 'දෝෂයකි')
    } finally { setBusy(false) }
  }, [])

  return { busy, pct: Math.round(pct), stat, error, result, run, reset }
}

export function countDownload(platform: string) {
  fetch('/api/stats', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform }),
  }).catch(() => {})
}
