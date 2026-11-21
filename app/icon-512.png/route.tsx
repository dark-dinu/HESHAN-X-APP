import { ImageResponse } from 'next/og'

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
          borderRadius: 112,
          border: '14px solid #ef4444',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 170, fontWeight: 900, letterSpacing: '-6px', color: '#ef4444' }}>
          DH
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '8px', color: '#f8fafc', marginTop: 8 }}>
          HESHAN OFC
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
