'use client'
import { useEffect, useState } from 'react'

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)

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

    setIsIos(/iPhone|iPad|iPod/i.test(window.navigator.userAgent))

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isInstalled || dismissed) return null

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice?.outcome === 'accepted') {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    } else {
      setShowGuide((prev) => !prev)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 14,
        left: 14,
        right: 14,
        zIndex: 9990,
        maxWidth: 460,
        margin: '0 auto',
        padding: '12px 14px',
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.97), rgba(35, 12, 20, 0.97))',
        border: '1px solid rgba(239, 68, 68, 0.5)',
        boxShadow: '0 18px 45px rgba(0, 0, 0, 0.88)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            HESHAN OFC Official App
          </div>
          <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 2 }}>
            Install on your phone for fast 1-tap access
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
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
            boxShadow: '0 6px 16px rgba(239, 68, 68, 0.45)',
          }}
        >
          📲 Install App
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Close"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: 0,
            background: 'rgba(255,255,255,0.1)',
            color: '#94a3b8',
            fontSize: 12,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {showGuide && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: 12,
            lineHeight: 1.5,
            color: '#e2e8f0',
          }}
        >
          {isIos ? (
            <span>
              1. Tap the <strong>Share (↑)</strong> icon at the bottom of Safari.<br />
              2. Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
            </span>
          ) : (
            <span>
              1. Tap the <strong>⋮ (3 dots)</strong> menu at the top-right of Chrome.<br />
              2. Tap <strong>&ldquo;Add to Home screen&rdquo;</strong> or <strong>&ldquo;Install app&rdquo;</strong>.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
