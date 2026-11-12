'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const path = usePathname()
  return (
    <nav>
      <Link href="/" className="logo">HESHAN <b>OFC</b></Link>
      <div className="links">
        <Link href="/" className={path === '/' ? 'on' : ''}>Downloader</Link>
        <Link href="/music" className={path.startsWith('/music') ? 'on' : ''}>Music Hub</Link>
      </div>
    </nav>
  )
}
