import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'HESHAN OFC – Media Downloader',
  description: 'All-in-One Fast Media Downloader',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="si">
      <body>
        <nav>
          <div className="logo">
            HESHAN <b>OFC</b>
          </div>
          <div className="links">
            <Link href="/" className="on">Downloader</Link>
            <Link href="/music">Music Hub</Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
