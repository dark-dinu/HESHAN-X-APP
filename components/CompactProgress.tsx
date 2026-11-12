'use client'

export default function CompactProgress({ percent, status, error }: { percent: number; status: string; error?: string }) {
  if (error) return <div className="alert err"><b>⚠</b><span>{error}</span></div>
  if (percent <= 0 && !status) return null
  const done = percent >= 100
  return (
    <div className={`compact-prog pop ${done ? 'done' : ''}`}>
      <div className="prog-top">
        <div className="prog-left">
          {done ? <span className="tick">✔</span> : <div className="eq"><i /><i /><i /><i /></div>}
          <span className="prog-stat">{status}</span>
        </div>
        <span className="prog-pct">{percent}%</span>
      </div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${percent}%` }} /></div>
    </div>
  )
}
