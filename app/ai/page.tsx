'use client'
import { useEffect, useRef, useState } from 'react'

type AiTab = 'chat' | 'remini'
type AiModel = 'chatgpt' | 'deepseek' | 'duckai'

type ChatItem = {
  id: string
  role: 'user' | 'assistant'
  text: string
  model?: AiModel
}

const MODELS: { id: AiModel; label: string; tag: string }[] = [
  { id: 'chatgpt', label: 'HESHAN AI PRO', tag: 'V1' },
  { id: 'deepseek', label: 'HESHAN LOGIC', tag: 'DEEP' },
  { id: 'duckai', label: 'HESHAN FAST', tag: 'LITE' },
]

const QUICK_PROMPTS = [
  'TikTok caption එකක් ලියලා දෙන්න 🔥',
  'Write a Python Telegram bot script',
  'ඔයාව හැදුවේ කවුද?',
  'YouTube video description template',
]

export default function AiStudioPage() {
  const [tab, setTab] = useState<AiTab>('chat')
  const [model, setModel] = useState<AiModel>('chatgpt')
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      model: 'chatgpt',
      text: 'ආයුබෝවන්! මම **HESHAN OFC AI** — දිනිදු හේෂාන් (Dinidu Heshan) විසින් නිර්මාණය කළ AI සහායකයා. සිංහලෙන් හෝ English වලින් ඕනෑම ප්‍රශ්නයක් අහන්න!',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const [imgUrl, setImgUrl] = useState('')
  const [scale, setScale] = useState<2 | 4>(2)
  const [enhancing, setEnhancing] = useState(false)
  const [enhancedUrl, setEnhancedUrl] = useState('')
  const [reminiErr, setReminiErr] = useState('')

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const sendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault()
    const prompt = (customPrompt !== undefined ? customPrompt : input).trim()
    if (!prompt || sending) return

    const userMsg: ChatItem = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: prompt,
    }
    setMessages((prev) => [...prev, userMsg])
    if (customPrompt === undefined) setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', model, prompt }),
      })
      const json = await res.json()

      if (!res.ok || !json?.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            model,
            text: `⚠️ ${json?.error || 'Could not get HESHAN OFC AI response.'}`,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            model,
            text: json.reply,
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          model,
          text: '⚠️ Network error. Please check your connection and try again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const copyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleEnhance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imgUrl.trim() || enhancing) return
    setEnhancing(true)
    setReminiErr('')
    setEnhancedUrl('')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remini', url: imgUrl.trim(), scale }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) {
        setReminiErr(json?.error || 'Enhance failed.')
      } else {
        setEnhancedUrl(json.enhancedUrl)
      }
    } catch {
      setReminiErr('Network error while enhancing photo.')
    } finally {
      setEnhancing(false)
    }
  }

  return (
    <main className="ai-root">
      <style>{css}</style>

      <div className="ai-wrap">
        <header className="ai-hero">
          <div className="ai-pill">
            <span className="ai-dot" />
            <span>BY DINIDU HESHAN • HESHAN OFC</span>
          </div>
          <h1 className="ai-title">
            HESHAN OFC <span>AI</span>
          </h1>
        </header>

        <div className="ai-tabs">
          <button
            type="button"
            className={`ai-tab ${tab === 'chat' ? 'active' : ''}`}
            onClick={() => setTab('chat')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
              <circle cx="9" cy="14" r="1.2" fill="currentColor" />
              <circle cx="15" cy="14" r="1.2" fill="currentColor" />
            </svg>
            <span>AI Chat</span>
          </button>

          <button
            type="button"
            className={`ai-tab ${tab === 'remini' ? 'active' : ''}`}
            onClick={() => setTab('remini')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
            </svg>
            <span>HD Enhancer</span>
          </button>
        </div>

        {tab === 'chat' ? (
          <>
            <div className="ai-models">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`ai-model-btn ${model === m.id ? 'active' : ''}`}
                  onClick={() => setModel(m.id)}
                >
                  <span>{m.label}</span>
                  <span className="ai-mtag">{m.tag}</span>
                </button>
              ))}
              {messages.length > 1 && (
                <button
                  type="button"
                  className="ai-clear-chat"
                  onClick={() => setMessages([messages[0]])}
                  title="Clear Chat"
                >
                  Clear
                </button>
              )}
            </div>

            <section className="ai-box">
              <div className="ai-feed">
                {messages.map((m) => (
                  <div key={m.id} className={`ai-msg ${m.role}`}>
                    {m.role === 'assistant' && (
                      <div className="ai-msg-top">
                        <span className="ai-bot-badge">HESHAN OFC AI</span>
                        <button
                          type="button"
                          className="ai-copy"
                          onClick={() => copyText(m.id, m.text)}
                        >
                          {copiedId === m.id ? 'Copied ✓' : 'Copy'}
                        </button>
                      </div>
                    )}
                    <div className="ai-text">{m.text}</div>
                  </div>
                ))}

                {sending && (
                  <div className="ai-msg assistant">
                    <div className="ai-typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {messages.length <= 2 && (
                <div className="ai-prompts">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="ai-pchip"
                      onClick={() => sendMessage(undefined, p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={(e) => sendMessage(e)} className="ai-form">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask HESHAN OFC AI anything..."
                />
                <button type="submit" disabled={sending || !input.trim()} className="ai-send">
                  {sending ? '...' : 'Send'}
                </button>
              </form>
            </section>
          </>
        ) : (
          <section className="ai-remini-card">
            <h2>HESHAN OFC HD Photo Enhancer</h2>
            <p>
              Paste any image URL to upscale &amp; sharpen face details into crisp HD quality.
            </p>

            <form onSubmit={handleEnhance} className="ai-remini-form">
              <input
                type="url"
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                required
              />

              <div className="ai-scale-row">
                <button
                  type="button"
                  className={scale === 2 ? 'active' : ''}
                  onClick={() => setScale(2)}
                >
                  2x HD Upscale
                </button>
                <button
                  type="button"
                  className={scale === 4 ? 'active' : ''}
                  onClick={() => setScale(4)}
                >
                  4x Ultra HD
                </button>
              </div>

              <button type="submit" disabled={enhancing || !imgUrl.trim()} className="ai-enh-btn">
                {enhancing ? 'Enhancing Photo...' : 'Enhance Photo ✨'}
              </button>
            </form>

            {reminiErr && <div className="ai-err">{reminiErr}</div>}

            {enhancedUrl && (
              <div className="ai-result-wrap">
                <img src={enhancedUrl} alt="Enhanced HD" />
                <a
                  href={enhancedUrl}
                  download="heshan-ofc-hd.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ai-dl-hd"
                >
                  Download Enhanced HD ↓
                </a>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

const css = `
.ai-root{min-height:100vh;padding:12px 14px 86px;color:#f8fafc;
  background:radial-gradient(circle at 50% 0%,rgba(56,189,248,.14),transparent 45%),#05070d;
  font-family:Inter,system-ui,-apple-system,sans-serif}
.ai-wrap{max-width:600px;margin:0 auto}

.ai-hero{text-align:center;margin-bottom:12px}
.ai-pill{display:inline-flex;align-items:center;gap:7px;padding:4px 11px;border-radius:999px;
  background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.32);
  font-size:10px;font-weight:800;letter-spacing:.06em;color:#7dd3fc}
.ai-dot{width:6px;height:6px;border-radius:50%;background:#38bdf8;box-shadow:0 0 8px #38bdf8}
.ai-title{margin:6px 0 0;font-size:24px;font-weight:900;letter-spacing:-.02em}
.ai-title span{color:#ef4444}

.ai-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:5px;border-radius:16px;
  background:rgba(15,23,42,.85);border:1px solid rgba(255,255,255,.08);margin-bottom:10px}
.ai-tab{display:flex;align-items:center;justify-content:center;gap:7px;height:38px;border:0;
  border-radius:12px;background:transparent;color:#94a3b8;font:700 12.5px inherit;cursor:pointer;
  transition:all .2s ease}
.ai-tab.active{background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;
  box-shadow:0 6px 18px rgba(239,68,68,.3)}

.ai-models{display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px}
.ai-model-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:999px;
  border:1px solid rgba(255,255,255,.09);background:rgba(15,23,42,.9);color:#cbd5e1;
  font:700 11px inherit;cursor:pointer;white-space:nowrap}
.ai-model-btn.active{border-color:rgba(56,189,248,.55);background:rgba(56,189,248,.16);color:#fff}
.ai-mtag{font-size:9px;padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.1);color:#38bdf8}
.ai-clear-chat{margin-left:auto;padding:6px 10px;border-radius:999px;border:1px solid rgba(239,68,68,.3);
  background:rgba(239,68,68,.1);color:#fca5a5;font:700 11px inherit;cursor:pointer}

.ai-box{display:flex;flex-direction:column;height:calc(100vh - 255px);min-height:400px;
  border-radius:20px;background:rgba(11,16,29,.95);border:1px solid rgba(255,255,255,.09);overflow:hidden}
.ai-feed{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}

.ai-msg{max-width:88%;padding:10px 13px;border-radius:16px;font-size:13px;line-height:1.5;word-break:break-word}
.ai-msg.user{align-self:flex-end;background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;
  border-bottom-right-radius:4px}
.ai-msg.assistant{align-self:flex-start;background:rgba(30,41,59,.78);
  border:1px solid rgba(255,255,255,.08);color:#f1f5f9;border-bottom-left-radius:4px}
.ai-msg-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:5px}
.ai-bot-badge{font-size:9.5px;font-weight:800;letter-spacing:.05em;color:#38bdf8}
.ai-copy{border:0;background:rgba(255,255,255,.08);color:#cbd5e1;padding:2px 7px;border-radius:6px;
  font:700 10px inherit;cursor:pointer}
.ai-text{white-space:pre-wrap}

.ai-typing{display:flex;gap:5px;padding:4px 2px}
.ai-typing span{width:7px;height:7px;border-radius:50%;background:#38bdf8;animation:aiBounce 1s infinite}
.ai-typing span:nth-child(2){animation-delay:.15s}
.ai-typing span:nth-child(3){animation-delay:.3s}
@keyframes aiBounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}

.ai-prompts{display:flex;gap:6px;overflow-x:auto;padding:8px 12px;border-top:1px solid rgba(255,255,255,.06)}
.ai-pchip{padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.09);
  background:rgba(255,255,255,.04);color:#cbd5e1;font:600 11px inherit;white-space:nowrap;cursor:pointer}

.ai-form{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08);background:rgba(7,10,20,.9)}
.ai-form input{flex:1;min-width:0;height:42px;padding:0 13px;border-radius:12px;
  border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.95);color:#fff;font-size:13.5px;outline:none}
.ai-send{height:42px;padding:0 16px;border:0;border-radius:12px;
  background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font:700 13px inherit;cursor:pointer}
.ai-send:disabled{opacity:.5;cursor:not-allowed}

.ai-remini-card{padding:16px;border-radius:20px;background:rgba(11,16,29,.95);
  border:1px solid rgba(255,255,255,.09)}
.ai-remini-card h2{margin:0 0 6px;font-size:17px;font-weight:800}
.ai-remini-card p{margin:0 0 14px;font-size:12.5px;color:#94a3b8}
.ai-remini-form{display:flex;flex-direction:column;gap:10px}
.ai-remini-form input{height:44px;padding:0 13px;border-radius:12px;
  border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.95);color:#fff;font-size:13.5px;outline:none}
.ai-scale-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ai-scale-row button{height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.1);
  background:rgba(255,255,255,.04);color:#cbd5e1;font:700 12px inherit;cursor:pointer}
.ai-scale-row button.active{border-color:rgba(56,189,248,.6);background:rgba(56,189,248,.16);color:#fff}
.ai-enh-btn{height:44px;border:0;border-radius:13px;background:linear-gradient(135deg,#2563eb,#38bdf8);
  color:#fff;font:700 13.5px inherit;cursor:pointer}
.ai-enh-btn:disabled{opacity:.5}
.ai-err{margin-top:12px;padding:10px 12px;border-radius:11px;font-size:12px;
  background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.35);color:#fecaca}
.ai-result-wrap{margin-top:14px;display:flex;flex-direction:column;gap:10px}
.ai-result-wrap img{width:100%;border-radius:14px;border:1px solid rgba(255,255,255,.12)}
.ai-dl-hd{display:grid;place-items:center;height:44px;border-radius:13px;text-decoration:none;
  background:linear-gradient(135deg,#10b981,#059669);color:#fff;font:700 13.5px inherit}
`
