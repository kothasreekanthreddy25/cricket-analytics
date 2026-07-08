import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function page(message: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>CricketTips.ai</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { background:#0a0a0a; color:#e5e7eb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px; }
  .card { max-width:420px; text-align:center; }
  h1 { color:#fff; font-size:20px; margin-bottom:8px; }
  p { color:#9ca3af; font-size:14px; }
  a { color:#34d399; text-decoration:none; font-weight:600; }
</style></head>
<body><div class="card">
  <h1>CricketTips.ai</h1>
  <p>${message}</p>
  <p><a href="https://crickettips.ai">Back to CricketTips.ai</a></p>
</div></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

// GET so this works as a plain link inside an email — no form/JS needed.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return page("Invalid unsubscribe link.")

  try {
    await prisma.predictionLead.update({
      where: { id },
      data: { emailOptIn: false },
    })
    return page("You've been unsubscribed from the weekly email digest. You won't receive any more emails from us.")
  } catch {
    return page("This unsubscribe link is no longer valid.")
  }
}
