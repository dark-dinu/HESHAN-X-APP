import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #7f1d1d 100%)',
          borderRadius: 42,
          border: '6px solid #ef4444',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-2px', color: '#ef4444' }}>
          DH
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '3px', color: '#f8fafc', marginTop: 4 }}>
          HESHAN
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
