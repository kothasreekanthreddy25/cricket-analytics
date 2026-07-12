/**
 * IndexNow — push-based instant indexing for Bing/Yandex/Seznam. Unlike
 * Google (whose Indexing API is contractually restricted to JobPosting/
 * BroadcastEvent content — using it here would violate their terms), IndexNow
 * needs no account or verification beyond hosting the key file this module's
 * key corresponds to (see public/<key>.txt).
 */
const HOST = 'crickettips.ai'
const DEFAULT_KEY = '31dfa578727d920a823f387e904d257e'

function getKey(): string {
  return process.env.INDEXNOW_KEY || DEFAULT_KEY
}

// No external account needed (unlike GA4/Resend/Telegram), so this is
// "configured" out of the box — kept as a function for the same isXConfigured()
// shape the rest of the scheduler's jobs use, in case a deployment ever wants
// to disable it via INDEXNOW_KEY="".
export function isIndexNowConfigured(): boolean {
  return getKey().length > 0
}

export async function submitUrls(urls: string[]): Promise<{ submitted: number; ok: boolean }> {
  const key = getKey()
  const unique = Array.from(new Set(urls)).filter(Boolean)
  if (!isIndexNowConfigured() || unique.length === 0) {
    return { submitted: 0, ok: false }
  }

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: `https://${HOST}/${key}.txt`,
        urlList: unique,
      }),
      signal: AbortSignal.timeout(15000),
    })
    // IndexNow returns 200 or 202 on success
    return { submitted: unique.length, ok: res.ok }
  } catch {
    return { submitted: 0, ok: false }
  }
}
