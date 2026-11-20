import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HESHAN OFC – HD Media & Music Downloader',
    short_name: 'HESHAN OFC',
    description: 'Download HD Videos & Stream 320kbps MP3 Music from YouTube, TikTok, Instagram, Facebook & Spotify.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07080d',
    theme_color: '#07080d',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
