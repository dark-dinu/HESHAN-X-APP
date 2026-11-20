'use client'
import { useEffect, useState } from 'react'

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
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

  const handleInstallOrDownload = async () => {
    // 1. Trigger 1-tap Chrome native install popup if ready
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

    // 2. Check if HESHAN-OFC.apk exists in /public before downloading (prevents "download failed")
    try {
      const check = await fetch('/HESHAN-OFC.apk', { method: 'HEAD' })
      if (check.ok) {
        const a = document.createElement('a')
        a.href = '/HESHAN-OFC.apk'
        a.download = 'HESHAN-OFC.apk'
        document.body.appendChild(a)
        a.click()
        a.remove()
        return
      }
    } catch {}

    // 3. Otherwise show clean 2-step install modal
    setModalOpen(true)
  }

  return (
    <>
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
            Install on your phone for 1-tap access
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
          📲 Install App
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

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            pointerEvents: 'auto',
            background: 'rgba(2, 6, 23, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 380,
              borderRadius: 22,
              background: '#0b1120',
              border: '1.5px solid rgba(239, 68, 68, 0.45)',
              padding: '22px 20px',
              color: '#f8fafc',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0,0,0,0.95)',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                margin: '0 auto 12px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, #090d16, #7f1d1d)',
                border: '2px solid #ef4444',
                display: 'grid',
                placeItems: 'center',
                fontSize: 22,
                fontWeight: 900,
                color: '#ef4444',
              }}
            >
              DH
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 800 }}>
              Install HESHAN OFC App
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#94a3b8' }}>
              Add the official full-screen app icon to your phone:
            </p>

            <div
              style={{
                textAlign: 'left',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 14,
                padding: '12px 14px',
                fontSize: 13,
                lineHeight: 1.65,
                color: '#e2e8f0',
                marginBottom: 16,
              }}
            >
              {isIos ? (
                <>
                  <div>1. Tap the <strong>Share (↑)</strong> icon at the bottom of Safari.</div>
                  <div>2. Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</div>
                </>
              ) : (
                <>
                  <div>1. Tap the <strong>⋮ (3 dots)</strong> icon at the top-right of Chrome.</div>
                  <div>2. Tap <strong>&ldquo;Install and create shortcut&rdquo;</strong> (or <strong>&ldquo;Add to Home screen&rdquo;</strong>).</div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              style={{
                width: '100%',
                height: 42,
                borderRadius: 12,
                border: 0,
                background: '#ef4444',
                color: '#fff',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
