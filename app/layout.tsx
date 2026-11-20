import './globals.css'
import type { Metadata, Viewport } from 'next'
import Nav from '@/components/Nav'
import InstallAppBanner from '@/components/InstallAppBanner'

export const metadata: Metadata = {
  title: 'HESHAN OFC – Media & Music App',
  description: 'YouTube, TikTok, Instagram, Facebook, Spotify, Pinterest, X & WhatsApp DP – All-in-One Fast Media Downloader',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HESHAN OFC',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-512.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#07080d',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="si">
      <body>
        <div className="orbs" aria-hidden><i /><i /><i /></div>
        <Nav />
        <main>{children}</main>
        <InstallAppBanner />
        <footer>© {new Date().getFullYear()} HESHAN OFC • Made with 👑</footer>
      </body>
    </html>
  )
}
