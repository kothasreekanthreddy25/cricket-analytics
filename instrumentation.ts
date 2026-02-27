/**
 * Next.js Instrumentation — runs once when the server starts.
 * Sets up background cron jobs:
 *   1. Prediction results update — every 6 hours
 *   2. Blog auto-generation — once daily at 6 AM IST
 */

export async function register() {
  // Only run on the server (not edge runtime or build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler')
    startScheduler()
  }
}
