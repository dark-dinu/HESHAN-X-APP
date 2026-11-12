'use client'

interface CompactProgressProps {
  percent: number
  status: string
}

export default function CompactProgress({ percent, status }: CompactProgressProps) {
  if (percent <= 0 && !status) return null

  return (
    <div className="compact-prog">
      <div className="prog-top">
        <div className="prog-left">
          <div className="eq">
            <i /><i /><i /><i />
          </div>
          <span className="prog-stat">{status}</span>
        </div>
        <span className="prog-pct">{percent}%</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
