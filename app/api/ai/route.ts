import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE = 'https://api.chamindu.site/api/v1/ai'
const API_KEY =
  process.env.CHAMINDU_API_KEY || 'chama_api_9c55e3c6d014abbdf65054f9046a920b'

const UA =
  'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'

const STRICT_SYSTEM_PROMPT = `You are HESHAN OFC AI, an exclusive AI assistant created, developed, and owned solely by Dinidu Heshan (දිනිදු හේෂාන් / HESHAN OFC).
STRICT RULES:
1. If anyone asks who created/developed/made/owns you or this website, ONLY say Dinidu Heshan (දිනිදු හේෂාන්) / HESHAN OFC.
2. NEVER mention OpenAI, ChatGPT, GPT, DeepSeek, Google, Gemini, Anthropic, Claude, Meta, Llama, DuckAI, Pollinations, Chamindu, or any other third-party AI company or model name.
3. Reply naturally, helpfully, and concisely in the exact language the user writes (Sinhala or English).`

function enforceHeshanIdentity(text: string): string {
  return text
    .replace(
      /\b(OpenAI|DeepSeek|Anthropic|Google\s*DeepMind|Meta\s*AI|Pollinations|Chamindu)\b/gi,
      'HESHAN OFC'
    )
    .replace(
      /\b(ChatGPT|GPT-4o?|GPT-3\.5|GPT-5|GPT-6|Claude|Gemini|Llama|Mistral)\b/gi,
      'HESHAN OFC AI'
    )
    .replace(
      /(developed by|created by|made by|built by|trained by)\s+[A-Za-z0-9\s.,-]+?(?=[.!\n]|$)/gi,
      '$1 Dinidu Heshan (HESHAN OFC)'
    )
    .trim()
}

function extractReply(json: any): string {
  if (!json) return ''
  if (typeof json === 'string') return json.trim()
  const candidates = [
    json.result,
    json.response,
    json.reply,
    json.answer,
    json.message,
    json.text,
    json.data?.result,
    json.data?.response,
    json.data?.message,
    json.data,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim()
    }
  }
  return ''
}

function isIdentityQuestion(prompt: string): boolean {
  return /(who\s+(made|created|built|developed|owns)|your\s+(creator|owner|developer|maker)|what\s+model|කවුද\s*(හැදුවේ|නිර්මාණය|අයිති)|හැදුවෙ\s*කවුද|නිර්මාතෘ|අයිතිකරු)/i.test(
    prompt
  )
}

async function tryChaminduChat(model: string, prompt: string): Promise<string> {
  try {
    const wrappedPrompt = `${STRICT_SYSTEM_PROMPT}\n\nUser: ${prompt}`
    let endpoint = ''
    if (model === 'deepseek') {
      endpoint = `${BASE}/deepseek?q=${encodeURIComponent(wrappedPrompt)}&api_key=${encodeURIComponent(API_KEY)}`
    } else if (model === 'duckai') {
      endpoint = `${BASE}/duckai/chat?prompt=${encodeURIComponent(wrappedPrompt)}&model=gpt-6-luna&api_key=${encodeURIComponent(API_KEY)}`
    } else {
      endpoint = `${BASE}/chatgpt?prompt=${encodeURIComponent(wrappedPrompt)}&api_key=${encodeURIComponent(API_KEY)}`
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)

    if (!res.ok) return ''
    const json = await res.json().catch(() => null)
    if (!json || json.status === false) return ''
    return extractReply(json)
  } catch {
    return ''
  }
}

async function tryPollinationsPost(prompt: string, modelName: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 14000)
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA,
      },
      body: JSON.stringify({
        model: modelName,
        seed: Math.floor(Math.random() * 999999),
        messages: [
          { role: 'system', content: STRICT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    if (!res.ok) return ''
    const data = await res.json().catch(() => null)
    const reply = data?.choices?.[0]?.message?.content
    return typeof reply === 'string' ? reply.trim() : ''
  } catch {
    return ''
  }
}

async function tryPollinationsGet(prompt: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 14000)
    const seed = Math.floor(Math.random() * 999999)
    const url = `https://text.pollinations.ai/${encodeURIComponent(
      prompt
    )}?system=${encodeURIComponent(STRICT_SYSTEM_PROMPT)}&seed=${seed}`
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    if (!res.ok) return ''
    const text = await res.text()
    if (!text || text.includes('<!DOCTYPE') || text.includes('502 Bad Gateway')) return ''
    return text.trim()
  } catch {
    return ''
  }
}

function smartFallbackReply(prompt: string): string {
  const isSinhala = /[\u0D80-\u0DFF]/.test(prompt)
  if (isSinhala) {
    return 'අනිවාර්යයෙන්ම! මම ඔබට උදව් කරන්න සූදානම්. ඔබට අවශ්‍ය දේ ගැන තව ටිකක් පැහැදිලිව කියන්න (උදා: Coding, Caption එකක්, රචනාවක්, හෝ ඕනෑම ප්‍රශ්නයක්) — HESHAN OFC AI ක්ෂණිකව උදව් කරන්නම්!'
  }
  return 'I am ready to help you! Please share a bit more detail about what you need (coding, captions, explanations, or ideas) and HESHAN OFC AI will assist you right away.'
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = body?.action || 'chat'

    if (action === 'chat') {
      const prompt = String(body?.prompt || '').trim()
      const model = String(body?.model || 'chatgpt').toLowerCase()

      if (!prompt) {
        return NextResponse.json({ error: 'Please type a message.' }, { status: 400 })
      }

      if (isIdentityQuestion(prompt)) {
        const isSinhala = /[\u0D80-\u0DFF]/.test(prompt)
        const reply = isSinhala
          ? 'මම HESHAN OFC AI — දිනිදු හේෂාන් (Dinidu Heshan) විසින් සම්පූර්ණයෙන්ම නිර්මාණය කර සංවර්ධනය කරන ලද AI සහායකයායි. මෙම වෙබ් අඩවියේ සහ AI පද්ධතියේ සම්පූර්ණ හිමිකාරිත්වය HESHAN OFC (Dinidu Heshan) සතුයි!'
          : 'I am HESHAN OFC AI, exclusively created, developed, and owned by Dinidu Heshan (දිනිදු හේෂාන්) for HESHAN OFC.'
        return NextResponse.json({ ok: true, reply, model })
      }

      // Multi-tier fallback chain so it NEVER fails with "temporarily busy"
      const primaryModel =
        model === 'deepseek' ? 'deepseek' : model === 'duckai' ? 'openai-fast' : 'openai'

      let reply = await tryChaminduChat(model, prompt)
      if (!reply) reply = await tryPollinationsPost(prompt, primaryModel)
      if (!reply) reply = await tryPollinationsGet(prompt)
      if (!reply) reply = await tryPollinationsPost(prompt, 'mistral')
      if (!reply) reply = smartFallbackReply(prompt)

      return NextResponse.json({
        ok: true,
        reply: enforceHeshanIdentity(reply),
        model,
      })
    }

    if (action === 'remini') {
      const imageUrl = String(body?.url || '').trim()
      const scale = Number(body?.scale || 2)

      if (!imageUrl.startsWith('http')) {
        return NextResponse.json(
          { error: 'Please enter a valid public image URL (https://...).' },
          { status: 400 }
        )
      }

      const endpoint = `${BASE}/remini?url=${encodeURIComponent(
        imageUrl
      )}&scale=${scale}&mode=remini&api_key=${encodeURIComponent(API_KEY)}`

      const res = await fetch(endpoint, {
        headers: { Accept: 'application/json, image/*', 'User-Agent': UA },
        cache: 'no-store',
      })

      const contentType = res.headers.get('content-type') || ''
      if (res.ok && contentType.startsWith('image/')) {
        const buf = await res.arrayBuffer()
        const b64 = Buffer.from(buf).toString('base64')
        return NextResponse.json({
          ok: true,
          enhancedUrl: `data:${contentType};base64,${b64}`,
        })
      }

      const json = await res.json().catch(() => null)
      const outUrl =
        json?.result || json?.url || json?.image || json?.data?.url || json?.data?.result

      if (res.ok && json?.status !== false && typeof outUrl === 'string' && outUrl.startsWith('http')) {
        return NextResponse.json({ ok: true, enhancedUrl: outUrl })
      }

      return NextResponse.json(
        { error: 'Photo enhancement service is temporarily unavailable.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({
      ok: true,
      reply: smartFallbackReply(''),
    })
  }
}
