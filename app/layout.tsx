import './globals.css'
import type { Metadata, Viewport } from 'next'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'HESHAN OFC',
  description: 'All-in-One Fast Media & Music App',
  manifest: '/manifest.json',
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
        <footer>© {new Date().getFullYear()} HESHAN OFC • Made with 👑</footer>
      </body>
    </html>
  )
}
