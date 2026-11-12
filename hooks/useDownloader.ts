'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

export type Result = {
  token: string
  directHref?: string
  thumb?: string
  title: string
  ext: string
  platform: string
}

const STEPS = ['Verifying link...', 'Fetching media from server...', 'Generating secure link...']

export function useDownloader() {
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState(0)
  const [stat, setStat] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  }
  useEffect(() => stop, [])

  const reset = useCallback(() => {
    stop()
    setBusy(false)
    setPct(0)
    setStat('')
    setError('')
    setResult(null)
  }, [])

  const run = useCallback(async (body: { url: string; platform: string; format: string }) => {
    stop()
    setBusy(true)
    setError('')
    setResult(null)
    setPct(8)
    setStat(STEPS[0])

    timer.current = setInterval(() => {
      setPct((p) => {
        const n = p + (92 - p) * 0.07
        setStat(n < 30 ? STEPS[0] : n < 62 ? STEPS[1] : STEPS[2])
        return n
      })
    }, 250)

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))

      if (data?.clientFallback === 'tiktok') {
        setStat('Fetching via direct fast engine...')
        const ttRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(data.url)}&hd=1`)
        const ttJson = await ttRes.json()
        const rawLink = data.isAudio ? ttJson?.data?.music : (ttJson?.data?.hdplay || ttJson?.data?.play)
        if (!rawLink) throw new Error('Unable to fetch TikTok video')

        const finalLink = rawLink.startsWith('http') ? rawLink : `https://www.tikwm.com${rawLink}`
        const rawCover = ttJson?.data?.cover || ttJson?.data?.origin_cover || ''
        const finalCover = rawCover ? (rawCover.startsWith('http') ? rawCover : `https://www.tikwm.com${rawCover}`) : ''

        stop()
        setPct(100)
        setStat('Ready! Click below to save ✔')
        setResult({
          token: '',
          directHref: finalLink,
          thumb: finalCover,
          title: String(ttJson?.data?.title || 'HESHAN_OFC_TikTok').slice(0, 50),
          ext: data.isAudio ? 'mp3' : 'mp4',
          platform: 'tiktok',
        })
        return
      }

      if (!res.ok) throw new Error(data.error || 'Failed to fetch media')

      stop()
      setPct(100)
      setStat('Ready! Click below to save ✔')
      setResult(data)
    } catch (e: any) {
      stop()
      setPct(0)
      setStat('')
      setError(e.message || 'An unexpected error occurred')
    } finally {
      setBusy(false)
    }
  }, [])

  return { busy, pct: Math.round(pct), stat, error, result, run, reset }
}

export function countDownload(platform: string) {
  fetch('/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform }),
  }).catch(() => {})
}
