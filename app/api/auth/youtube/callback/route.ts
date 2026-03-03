/**
 * GET /api/auth/youtube/callback
 * Handles Google OAuth callback — exchanges code for tokens.
 * After success, copy the refresh_token into YOUTUBE_REFRESH_TOKEN in .env
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOAuthClient } from '@/lib/youtube'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.json({ error: `OAuth error: ${error}` }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'No code received from Google' }, { status: 400 })
  }

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    const refreshToken = tokens.refresh_token
    const accessToken = tokens.access_token

    if (!refreshToken) {
      return new NextResponse(
        `<html><body style="font-family:monospace;padding:40px;background:#0f172a;color:#e2e8f0">
          <h2 style="color:#f87171">⚠️ No refresh token received</h2>
          <p>This usually means you've already authorized this app before.</p>
          <p>Go to <a href="https://myaccount.google.com/permissions" style="color:#34d399">Google Account Permissions</a>,
          revoke access for this app, then visit <code>/api/auth/youtube</code> again.</p>
        </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      )
    }

    return new NextResponse(
      `<html><body style="font-family:monospace;padding:40px;background:#0f172a;color:#e2e8f0">
        <h2 style="color:#34d399">✅ YouTube Authorization Successful!</h2>
        <p style="margin:16px 0">Copy the refresh token below into your <code style="color:#fbbf24">.env</code> file and Railway environment variables:</p>
        <pre style="background:#1e293b;padding:20px;border-radius:8px;border:1px solid #334155;overflow-x:auto;color:#a78bfa">YOUTUBE_REFRESH_TOKEN=${refreshToken}</pre>
        <p style="color:#94a3b8;margin-top:16px">Access Token (expires in 1 hour — not needed in .env):</p>
        <pre style="background:#1e293b;padding:12px;border-radius:8px;border:1px solid #334155;color:#64748b;font-size:12px;overflow-x:auto">${accessToken}</pre>
        <p style="margin-top:24px;color:#94a3b8">After adding to .env, restart the dev server. You're ready to stream! 🏏</p>
      </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
