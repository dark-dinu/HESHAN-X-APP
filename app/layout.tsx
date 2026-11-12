import './globals.css'
import type { Metadata, Viewport } from 'next'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'HESHAN OFC – Media Downloader',
  description: 'YouTube, TikTok, Instagram, Facebook, Spotify, Pinterest, X & WhatsApp DP – All-in-One Fast Media Downloader',
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" },
}
export const viewport: Viewport = { themeColor: '#07080d', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="si">
      <body>
        <div className="orbs" aria-hidden><i /><i /><i /></div>
        <Nav />
        <main>{children}</main>
        <footer>© {new Date().getFullYear()} HESHAN OFC • Made with ♥</footer>
      </body>
    </html>
  )
}
