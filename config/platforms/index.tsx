import React from 'react'

const is = (h: string, ...d: string[]) => d.some((x) => h === x || h.endsWith('.' + x))

export type Format = { id: string; label: string; ext: string }
export type PlatformConfig = {
  id: string
  name: string
  icon: React.ReactNode
  colorPrimary: string
  colorSecondary: string
  placeholder: string
  formats: Format[]
  match: (host: string) => boolean
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    colorPrimary: '#ff2d2d',
    colorSecondary: '#ff7a3d',
    placeholder: 'Paste YouTube video or Shorts link...',
    formats: [
      { id: '1080p', label: 'MP4 1080p HD', ext: 'mp4' },
      { id: '720p', label: 'MP4 720p', ext: 'mp4' },
      { id: '320kbps', label: 'MP3 320kbps', ext: 'mp3' },
    ],
    match: (h) => is(h, 'youtube.com', 'youtu.be'),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    ),
    colorPrimary: '#25f4ee',
    colorSecondary: '#fe2c55',
    placeholder: 'Paste TikTok video link...',
    formats: [
      { id: 'hd', label: 'No Watermark HD', ext: 'mp4' },
      { id: 'mp3', label: 'Audio MP3', ext: 'mp3' },
    ],
    match: (h) => is(h, 'tiktok.com'),
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="#E1306C">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    colorPrimary: '#e1306c',
    colorSecondary: '#f7a64a',
    placeholder: 'Paste Instagram Reel, Post or Story link...',
    formats: [{ id: 'hd', label: 'Reel / Media HD', ext: 'mp4' }],
    match: (h) => is(h, 'instagram.com'),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    colorPrimary: '#1877f2',
    colorSecondary: '#5aa4ff',
    placeholder: 'Paste Facebook video or Reel link...',
    formats: [{ id: 'hd', label: 'Facebook HD', ext: 'mp4' }],
    match: (h) => is(h, 'facebook.com', 'fb.watch', 'fb.com'),
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="#1DB954">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
    colorPrimary: '#1db954',
    colorSecondary: '#1ed760',
    placeholder: 'Paste Spotify track link...',
    formats: [{ id: '320kbps', label: 'MP3 320kbps', ext: 'mp3' }],
    match: (h) => is(h, 'spotify.com', 'spotify.link'),
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="#E60023">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
      </svg>
    ),
    colorPrimary: '#e60023',
    colorSecondary: '#ff4d6d',
    placeholder: 'Paste Pinterest Pin link...',
    formats: [{ id: 'hd', label: 'Original Media', ext: 'mp4' }],
    match: (h) => is(h, 'pinterest.com', 'pin.it'),
  },
  {
    id: 'x',
    name: 'X',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    colorPrimary: '#9aa4b8',
    colorSecondary: '#e7e9ee',
    placeholder: 'Paste X (Twitter) video link...',
    formats: [{ id: 'hd', label: 'X Video HD', ext: 'mp4' }],
    match: (h) => is(h, 'x.com', 'twitter.com'),
  },
  {
    id: 'whatsapp',
    name: 'WA DP',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="#25D366">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z" />
      </svg>
    ),
    colorPrimary: '#25d366',
    colorSecondary: '#128c7e',
    placeholder: 'Enter WhatsApp number (e.g., 94783314361)',
    formats: [{ id: 'dp', label: 'Full HD Profile Pic', ext: 'jpg' }],
    match: () => false,
  },
]

export const PLATFORM_IDS = PLATFORMS.map((p) => p.id)

export function hostOf(input: string): string {
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function detectPlatform(input: string): PlatformConfig | null {
  const q = input.trim()
  if (!q) return null
  if (/^\+?\d{9,15}$/.test(q.replace(/[\s-]/g, ''))) return PLATFORMS.find((p) => p.id === 'whatsapp')!
  if (/\s/.test(q)) return null
  const h = hostOf(q)
  return PLATFORMS.find((p) => p.match(h)) || null
}
