const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const cron = require('node-cron')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    startScheduler()
  })
})

function startScheduler() {
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || `http://localhost:${port}`
  const secret = process.env.BLOG_GENERATE_SECRET || ''

  // Run at 6:00 AM UTC (morning edition)
  cron.schedule('0 6 * * *', async () => {
    console.log('[Scheduler] Running morning blog generation (6:00 AM UTC)...')
    await triggerBlogGenerate(baseUrl, secret)
  }, { timezone: 'UTC' })

  // Run at 6:00 PM UTC (evening edition)
  cron.schedule('0 18 * * *', async () => {
    console.log('[Scheduler] Running evening blog generation (6:00 PM UTC)...')
    await triggerBlogGenerate(baseUrl, secret)
  }, { timezone: 'UTC' })

  console.log('[Scheduler] Blog auto-generation scheduled: 6:00 AM UTC and 6:00 PM UTC daily')
}

async function triggerBlogGenerate(baseUrl, secret) {
  try {
    const url = `${baseUrl}/api/blog/generate`
    const headers = { 'Content-Type': 'application/json' }
    if (secret) headers['Authorization'] = `Bearer ${secret}`

    const res = await fetch(url, { method: 'GET', headers })
    const data = await res.json()
    console.log(`[Scheduler] Blog generation result: ${data.message || JSON.stringify(data)}`)
  } catch (err) {
    console.error('[Scheduler] Blog generation failed:', err.message)
  }
}
