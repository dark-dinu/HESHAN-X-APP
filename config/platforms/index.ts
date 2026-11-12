export const PLATFORMS = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶',
    colorPrimary: '#ff2d2d',
    colorSecondary: '#ff7a3d',
    placeholder: 'YouTube video හෝ Shorts link එක paste කරන්න...',
    formats: [
      { id: '1080p', label: 'MP4 1080p HD', ext: 'mp4' },
      { id: '720p', label: 'MP4 720p', ext: 'mp4' },
      { id: '320kbps', label: 'MP3 320kbps', ext: 'mp3' },
    ],
    match: (q: string) => q.includes('youtube.com') || q.includes('youtu.be'),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '♪',
    colorPrimary: '#25f4ee',
    colorSecondary: '#fe2c55',
    placeholder: 'TikTok video link එක paste කරන්න...',
    formats: [
      { id: 'hd', label: 'No Watermark HD', ext: 'mp4' },
      { id: 'mp3', label: 'Audio MP3', ext: 'mp3' },
    ],
    match: (q: string) => q.includes('tiktok.com'),
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '◎',
    colorPrimary: '#e1306c',
    colorSecondary: '#f7a64a',
    placeholder: 'Instagram Reel, Post හෝ Story link එක paste කරන්න...',
    formats: [{ id: 'hd', label: 'Reel / Media HD', ext: 'mp4' }],
    match: (q: string) => q.includes('instagram.com'),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'f',
    colorPrimary: '#1877f2',
    colorSecondary: '#5aa4ff',
    placeholder: 'Facebook video හෝ Reel link එක paste කරන්න...',
    formats: [{ id: 'hd', label: 'Facebook HD', ext: 'mp4' }],
    match: (q: string) => q.includes('facebook.com') || q.includes('fb.watch'),
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🎧',
    colorPrimary: '#1db954',
    colorSecondary: '#1ed760',
    placeholder: 'Spotify track link එක paste කරන්න...',
    formats: [{ id: '320kbps', label: 'MP3 320kbps', ext: 'mp3' }],
    match: (q: string) => q.includes('open.spotify.com'),
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: '📌',
    colorPrimary: '#e60023',
    colorSecondary: '#ff4d6d',
    placeholder: 'Pinterest Pin link එක paste කරන්න...',
    formats: [{ id: 'hd', label: 'Original Media', ext: 'mp4' }],
    match: (q: string) => q.includes('pinterest.com') || q.includes('pin.it'),
  },
  {
    id: 'x',
    name: 'X',
    icon: '✕',
    colorPrimary: '#9aa4b8',
    colorSecondary: '#e7e9ee',
    placeholder: 'X (Twitter) video link එක paste කරන්න...',
    formats: [{ id: 'hd', label: 'X Video HD', ext: 'mp4' }],
    match: (q: string) => q.includes('x.com') || q.includes('twitter.com'),
  },
  {
    id: 'whatsapp',
    name: 'WA DP',
    icon: '💬',
    colorPrimary: '#25d366',
    colorSecondary: '#128c7e',
    placeholder: 'WhatsApp අංකය දාන්න (උදා: 94783314361)',
    formats: [{ id: 'dp', label: 'Full HD Profile Pic', ext: 'jpg' }],
    match: (q: string) => /^\d{9,15}$/.test(q.replace(/\+/g, '')),
  },
]

export type PlatformConfig = (typeof PLATFORMS)[number]

export function detectPlatform(input: string): PlatformConfig | null {
  const clean = input.toLowerCase().trim()
  return PLATFORMS.find((p) => p.match(clean)) || null
}
