'use client'
import { useEffect, useState } from 'react'

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showIosTip, setShowIosTip] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Check if already running as installed standalone app
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (standalone) {
      setIsInstalled(true)
      return
    }

    // Android / Chrome install prompt listener
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Detect iOS Safari
    const ua = window.navigator.userAgent
    const isIos = /iPhone|iPad|iPod/i.test(ua)
    if (isIos) {
      setShowIosTip(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isInstalled || dismissed || (!deferredPrompt && !showIosTip)) return null

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice?.outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 9990,
        maxWidth: 460,
        margin: '0 auto',
        padding: '12px 14px',
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 15, 20, 0.96))',
        border: '1px solid rgba(239, 68, 68, 0.45)',
        boxShadow: '0 18px 45px rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #090d16, #7f1d1d)',
          border: '1.5px solid #ef4444',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 900,
          fontSize: 16,
          color: '#ef4444',
          flexShrink: 0,
        }}
      >
        DH
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>
          Install HESHAN OFC App
        </div>
        <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
          {deferredPrompt
            ? 'Add to Home Screen for 1-tap full-screen access'
            : 'Tap Share (↑) → "Add to Home Screen"'}
        </div>
      </div>

      {deferredPrompt && (
        <button
          type="button"
          onClick={handleInstall}
          style={{
            padding: '8px 14px',
            borderRadius: 11,
            border: 0,
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Install
        </button>
      )}

      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Close"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: 0,
          background: 'rgba(255,255,255,0.08)',
          color: '#94a3b8',
          fontSize: 12,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}
