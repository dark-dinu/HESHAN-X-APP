const is = (h: string, ...d: string[]) => d.some((x) => h === x || h.endsWith('.' + x))

export type Format = { id: string; label: string; ext: string }
export type PlatformConfig = {
  id: string; name: string; icon: string
  colorPrimary: string; colorSecondary: string
  placeholder: string; formats: Format[]
  match: (host: string) => boolean
}

export const PLATFORMS: PlatformConfig[] = [
  { id: 'youtube', name: 'YouTube', icon: '▶', colorPrimary: '#ff2d2d', colorSecondary: '#ff7a3d',
    placeholder: 'YouTube video හෝ Shorts link එක paste කරන්න...',
    formats: [
      { id: '1080p', label: 'MP4 1080p HD', ext: 'mp4' },
      { id: '720p', label: 'MP4 720p', ext: 'mp4' },
      { id: '320kbps', label: 'MP3 320kbps', ext: 'mp3' },
    ],
    match: (h) => is(h, 'youtube.com', 'youtu.be') },
  { id: 'tiktok', name: 'TikTok', icon: '♪', colorPrimary: '#25f4ee', colorSecondary: '#fe2c55',
    placeholder: 'TikTok video link එක paste කරන්න...',
    formats: [{ id: 'hd', label: 'No Watermark HD', ext: 'mp4' }, { id: 'mp3', label: 'Audio MP3', ext: 'mp3' }],
    match: (h) => is(h, 'tiktok.com') },
  { id: 'instagram', name: 'Instagram', icon: '◎', colorPrimary: '#e1306c', colorSecondary: '#f7a64a',
    placeholder: 'Instagram Reel, Post හෝ Story link එක paste කරන්න...',
    formats: [{ id: 'hd', label: 'Reel / Media HD', ext: 'mp4' }],
    match: (h) => is(h, 'instagram.com') },
  { id: 'facebook', name: 'Facebook', icon: 'f', colorPrimary: '#1877f2', colorSecondary: '#5aa4ff',
    placeholder: 'Facebook video හෝ Reel link එක paste කරන්න...',
    formats: [{ id: 'hd', label: 'Facebook HD', ext: 'mp4' }],
    match: (h) => is(h, 'facebook.com', 'fb.watch', 'fb.com') },
  { id: 'spotify', name: 'Spotify', icon: '🎧', colorPrimary: '#1db954', colorSecondary: '#1ed760',
    placeholder: 'Spotify track link එක paste කරන්න...',
    formats: [{ id: '320kbps', label: 'MP3 320kbps', ext: 'mp3' }],
    match: (h) => is(h, 'spotify.com', 'spotify.link') },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', colorPrimary: '#e60023', colorSecondary: '#ff4d6d',
    placeholder: 'Pinterest Pin link එක paste කරන්න...',
    formats: [{ id: 'hd', label: 'Original Media', ext: 'mp4' }],
    match: (h) => is(h, 'pinterest.com', 'pin.it') },
  { id: 'x', name: 'X', icon: '✕', colorPrimary: '#9aa4b8', colorSecondary: '#e7e9ee',
    placeholder: 'X (Twitter) video link එක paste කරන්න...',
    formats: [{ id: 'hd', label: 'X Video HD', ext: 'mp4' }],
    match: (h) => is(h, 'x.com', 'twitter.com') },
  { id: 'whatsapp', name: 'WA DP', icon: '💬', colorPrimary: '#25d366', colorSecondary: '#128c7e',
    placeholder: 'WhatsApp අංකය දාන්න (උදා: 94783314361)',
    formats: [{ id: 'dp', label: 'Full HD Profile Pic', ext: 'jpg' }],
    match: () => false },
]

export const PLATFORM_IDS = PLATFORMS.map((p) => p.id)

export function hostOf(input: string): string {
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname.toLowerCase()
  } catch { return '' }
}

export function detectPlatform(input: string): PlatformConfig | null {
  const q = input.trim()
  if (!q) return null
  if (/^\+?\d{9,15}$/.test(q.replace(/[\s-]/g, ''))) return PLATFORMS.find((p) => p.id === 'whatsapp')!
  if (/\s/.test(q)) return null
  const h = hostOf(q)
  return PLATFORMS.find((p) => p.match(h)) || null
}
