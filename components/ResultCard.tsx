'use client'
import { countDownload, Result } from '@/hooks/useDownloader'

export default function ResultCard({ result, icon, name }: { result: Result; icon: string; name: string }) {
  return (
    <div className="result-card pop">
      <div className="res-info">
        <div className="res-thumb">{icon}</div>
        <div className="res-meta">
          <b title={result.title}>{result.title}</b>
          <span>{name} • {result.ext.toUpperCase()} Ready</span>
        </div>
      </div>
      <a className="btn save-btn" href={`/api/stream?t=${result.token}`} download onClick={() => countDownload(result.platform)}>
        ⬇ Save
      </a>
    </div>
  )
}
