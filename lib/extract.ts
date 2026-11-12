// Finds the best downloadable file URL inside any JSON shape the upstream API returns.
const AUDIO = ['mp3', 'audio', 'download_url', 'downloadurl', 'download', 'url', 'link', 'music']
const VIDEO = ['hdplay', 'no_watermark', 'nowm', 'hd', 'play', 'video', 'mp4', 'download_url', 'downloadurl', 'download', 'sd', 'url', 'link']
const IMAGE = ['dp', 'profilepic', 'image', 'hd', 'url', 'link']
const IMG_EXT = /\.(jpe?g|png|webp|gif)(\?|$)/i
const AUD_EXT = /\.(mp3|m4a|aac|ogg|wav)(\?|$)/i
const VID_EXT = /\.(mp4|webm|mov|mkv)(\?|$)/i
const BAD_KEY = /thumb|cover|avatar|poster|preview|icon|logo|origin_cover|dynamic|wm_/i

export type Media = { url: string; ext: string }

export function pickMedia(json: any, o: { audio?: boolean; image?: boolean }): Media | null {
  const list = o.audio ? AUDIO : o.image ? IMAGE : VIDEO
  let best: { s: number; url: string } | null = null

  const walk = (v: any, key: string, path: string, depth: number) => {
    if (depth > 7 || v == null) return
    if (typeof v === 'string') {
      if (!/^https?:\/\//i.test(v)) return
      const idx = list.indexOf(key.toLowerCase())
      let s = idx >= 0 ? 100 - idx * 5 : 10
      if (BAD_KEY.test(path) && !o.image) s -= 80
      if (o.audio ? AUD_EXT.test(v) : o.image ? IMG_EXT.test(v) : VID_EXT.test(v)) s += 30
      else if (!o.image && IMG_EXT.test(v)) s -= 60
      if (!best || s > best.s) best = { s, url: v }
      return
    }
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, key, `${path}[${i}]`, depth + 1))
    if (typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k, `${path}.${k}`, depth + 1)
  }
  walk(json, '', '', 0)
  if (!best) return null
  const url = (best as { s: number; url: string }).url
  const found = url.split('?')[0].match(/\.([a-z0-9]{2,4})$/i)?.[1].toLowerCase() || ''
  const ok = ['mp4', 'webm', 'mov', 'mp3', 'm4a', 'jpg', 'jpeg', 'png', 'webp', 'gif']
  return { url, ext: ok.includes(found) ? (found === 'jpeg' ? 'jpg' : found) : '' }
}

export function pickTitle(j: any): string {
  const c = [j?.title, j?.result?.title, j?.data?.title, j?.result?.name, j?.data?.name, j?.name]
  return String(c.find((x) => typeof x === 'string' && x.trim()) || '').trim()
}
