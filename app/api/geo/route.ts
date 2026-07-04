import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const headersList = await headers()

  // Vercel sets this automatically on all requests
  const vercelCountry = headersList.get('x-vercel-ip-country')
  // Cloudflare fallback
  const cfCountry = headersList.get('cf-ipcountry')
  // Custom header set by middleware
  const customCountry = headersList.get('x-country')

  const country = vercelCountry || cfCountry || customCountry || 'ZA'

  return NextResponse.json({ country: country.toUpperCase() })
}
