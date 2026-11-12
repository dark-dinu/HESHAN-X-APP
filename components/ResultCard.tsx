'use client'
import React, { useState } from 'react'
import { Result, countDownload } from '@/hooks/useDownloader'

export default function ResultCard({
  result,
  icon,
  name,
}: {
  result: Result
  icon: React.ReactNode
  name: string
}) {
  const [downloading, setDownloading] = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const ext = result.ext || 'mp4'
  const fileName = `${result.title.replace(/[^\w\s-]/g, '').trim() || 'HESHAN_OFC'}.${ext}`
  const href = result.directHref || `/api/stream?t=${result.token}`

  async function handleDirectSave(e: React.MouseEvent) {
    e.preventDefault()
    if (downloading) return
    setDownloading(true)
    countDownload(result.platform)

    try {
      const res = await fetch(href)
      if (!res.ok) throw new Error('Direct open fallback')
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
    } catch {
      window.open(href, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="result-card pop"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 14,
        borderRadius: 16,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginTop: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            overflow: 'hidden',
            flexShrink: 0,
            background: 'linear-gradient(135deg, var(--a), var(--a2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
          }}
        >
          {result.thumb && !imgErr ? (
            <img
              src={result.thumb}
              alt={result.title}
              onError={() => setImgErr(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span>{icon}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: 4,
            }}
          >
            {result.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af' }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--a)',
                fontWeight: 700,
              }}
            >
              {ext.toUpperCase()} HD
            </span>
            <span>• {name}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDirectSave}
        disabled={downloading}
        style={{
          width: '100%',
          padding: '13px 18px',
          borderRadius: 12,
          border: 'none',
          cursor: downloading ? 'wait' : 'pointer',
          background: 'linear-gradient(90deg, var(--a), var(--a2))',
          color: '#fff',
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: '0.3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '0 6px 20px -4px var(--a)',
        }}
      >
        {downloading ? (
          <>
            <span className="spin" />
            <span>Downloading to Device...</span>
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download {ext.toUpperCase()} Now</span>
          </>
        )}
      </button>
    </div>
  )
}
