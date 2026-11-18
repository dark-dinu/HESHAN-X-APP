import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { User, createSessionToken } from '@/lib/auth'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const MONGODB_URI = process.env.MONGODB_URI || ''

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const redirectUri = `${origin}/api/auth/google`

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${origin}/?auth_error=google_not_configured`)
  }

  // Step 1: Google OAuth consent screen එකට redirect කිරීම
  if (!code) {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid email profile')
    authUrl.searchParams.set('prompt', 'select_account')
    return NextResponse.redirect(authUrl.toString())
  }

  // Step 2: Google callback code එකෙන් user info අරගෙන MongoDB save + login කිරීම
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${origin}/?auth_error=google_failed`)
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()
    if (!profile.email) {
      return NextResponse.redirect(`${origin}/?auth_error=no_email`)
    }

    if (mongoose.connection.readyState < 1 && MONGODB_URI) {
      await mongoose.connect(MONGODB_URI)
    }

    let user = await User.findOne({ email: profile.email.toLowerCase() })
    if (!user) {
      user = await User.create({
        name: profile.name || profile.email.split('@')[0],
        email: profile.email.toLowerCase(),
        avatar: profile.picture || '',
        provider: 'google',
      })
    } else if (profile.picture && !user.avatar) {
      user.avatar = profile.picture
      await user.save()
    }

    const sessionToken = createSessionToken({
      id: String(user._id),
      name: user.name,
      email: user.email,
      avatar: user.avatar || profile.picture || '',
    })

    const res = NextResponse.redirect(`${origin}/`)
    res.cookies.set('heshan_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })
    return res
  } catch {
    return NextResponse.redirect(`${origin}/?auth_error=server_error`)
  }
}
