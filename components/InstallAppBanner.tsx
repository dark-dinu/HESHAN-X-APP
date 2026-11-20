'use client'
import { useEffect, useState } from 'react'

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (standalone) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isInstalled || dismissed) return null

  const handleInstallOrDownload = async () => {
    // 1. Trigger 1-tap Chrome native install popup if available
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice?.outcome === 'accepted') {
          setIsInstalled(true)
          setDeferredPrompt(null)
          return
        }
      } catch {}
    }

    // 2. Direct download HESHAN-OFC.apk file
    const a = document.createElement('a')
    a.href = '/HESHAN-OFC.apk'
    a.download = 'HESHAN-OFC.apk'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 14,
        left: 14,
        right: 14,
        zIndex: 2147483640,
        pointerEvents: 'auto',
        maxWidth: 460,
        margin: '0 auto',
        padding: '11px 13px',
        borderRadius: 18,
        background: '#0f172a',
        border: '1.5px solid #ef4444',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.92)',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #090d16, #7f1d1d)',
          border: '1.5px solid #ef4444',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 900,
          fontSize: 15,
          color: '#ef4444',
          flexShrink: 0,
        }}
      >
        DH
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>
          HESHAN OFC Official App
        </div>
        <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 1 }}>
          Direct Android App • Fast &amp; Ad-Supported
        </div>
      </div>

      <button
        type="button"
        onClick={handleInstallOrDownload}
        style={{
          padding: '9px 14px',
          borderRadius: 11,
          border: 0,
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: '#fff',
          fontSize: 12.5,
          fontWeight: 800,
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 6px 16px rgba(239, 68, 68, 0.45)',
        }}
      >
        📲 Download App
      </button>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Close"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: 0,
          background: 'rgba(255,255,255,0.12)',
          color: '#fff',
          fontSize: 13,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}
