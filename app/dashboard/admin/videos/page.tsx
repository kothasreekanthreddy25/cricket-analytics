'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Video, RefreshCw, CheckCircle, XCircle, Clock, Wrench, Play, Zap } from 'lucide-react'

interface VideoJob {
  slug: string
  title: string
  success: boolean
  url: string | null
  error: string | null
  at: string
}

interface DiagnoseResult {
  env: Record<string, boolean>
  tools: Record<string, boolean>
  ready: boolean
}

export default function AdminVideosPage() {
  const [recentJobs, setRecentJobs] = useState<VideoJob[]>([])
  const [status, setStatus] = useState<{ running: boolean; queued: number } | null>(null)
  const [diagnose, setDiagnose] = useState<DiagnoseResult | null>(null)
  const [loadingDiagnose, setLoadingDiagnose] = useState(false)
  const [testQueued, setTestQueued] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Highlight video state
  const [hlTopic, setHlTopic] = useState('')
  const [hlStats, setHlStats] = useState('')
  const [hlType, setHlType] = useState<'highlight' | 'preview' | 'analysis'>('highlight')
  const [hlLoading, setHlLoading] = useState(false)
  const [hlResult, setHlResult] = useState<{ success: boolean; message: string } | null>(null)

  async function fetchStatus() {
    try {
      const [statusRes, recentRes] = await Promise.all([
        fetch('/api/admin/video-status'),
        fetch('/api/admin/video-recent'),
      ])
      if (statusRes.ok) setStatus(await statusRes.json())
      if (recentRes.ok) {
        const data = await recentRes.json()
        setRecentJobs(data.jobs || [])
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function runDiagnose() {
    setLoadingDiagnose(true)
    try {
      const res = await fetch('/api/admin/video-diagnose')
      if (res.ok) setDiagnose(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingDiagnose(false)
    }
  }

  async function queueTestVideo() {
    try {
      const res = await fetch('/api/admin/video-test', { method: 'POST' })
      if (res.ok) {
        setTestQueued(true)
        setTimeout(() => setTestQueued(false), 5000)
        fetchStatus()
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function generateHighlight() {
    if (!hlTopic.trim()) return
    setHlLoading(true)
    setHlResult(null)
    try {
      const res = await fetch('/api/admin/video-highlight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: hlTopic, stats: hlStats, type: hlType }),
      })
      const data = await res.json()
      if (data.queued) {
        setHlResult({ success: true, message: `Queued! "${hlTopic}" — check Recent Jobs below in ~2 mins.` })
        setHlTopic('')
        setHlStats('')
        fetchStatus()
      } else {
        setHlResult({ success: false, message: data.error || 'Failed to queue' })
      }
    } catch (e: any) {
      setHlResult({ success: false, message: e.message })
    } finally {
      setHlLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-red-600" />
            YouTube News Videos
          </h1>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Status + Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pipeline Status</h2>
            <button
              onClick={fetchStatus}
              className="text-gray-400 hover:text-gray-600"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {status ? (
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                {status.running ? (
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm text-gray-700">
                  {status.running ? 'Video rendering in progress...' : 'Idle'}
                </span>
              </div>
              <span className="text-sm text-gray-500">{status.queued} queued</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">Loading...</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={queueTestVideo}
              disabled={testQueued}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              {testQueued ? 'Test video queued!' : 'Queue test video'}
            </button>
            <button
              onClick={runDiagnose}
              disabled={loadingDiagnose}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Wrench className="w-4 h-4" />
              {loadingDiagnose ? 'Checking...' : 'Run diagnostics'}
            </button>
          </div>
        </div>

        {/* Diagnostics */}
        {diagnose && (
          <div className={`rounded-xl border p-6 ${diagnose.ready ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              {diagnose.ready ? (
                <><CheckCircle className="w-5 h-5 text-green-600" /> Pipeline ready</>
              ) : (
                <><XCircle className="w-5 h-5 text-yellow-600" /> Issues detected</>
              )}
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700 mb-2">Environment Variables</p>
                {Object.entries(diagnose.env).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 mb-1">
                    {v ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                    <span className={v ? 'text-gray-700' : 'text-red-700 font-medium'}>{k}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-2">System Tools</p>
                {Object.entries(diagnose.tools).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 mb-1">
                    {v ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                    <span className={v ? 'text-gray-700' : 'text-red-700 font-medium'}>{k}</span>
                  </div>
                ))}
              </div>
            </div>
            {!diagnose.ready && (
              <p className="mt-3 text-xs text-yellow-700">
                Missing items above must be fixed on the VPS. Ensure all env vars are in streaming-service/.env and ffmpeg is installed.
              </p>
            )}
          </div>
        )}

        {/* Generate Highlight Video */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-500" />
            Generate Cricket Highlight Video
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Enter a cricket topic and AI will write the script, narrate it, and upload to YouTube automatically.
          </p>

          <div className="space-y-3">
            {/* Type selector */}
            <div className="flex gap-2">
              {(['highlight', 'preview', 'analysis'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setHlType(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    hlType === t
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Topic input */}
            <input
              type="text"
              value={hlTopic}
              onChange={e => setHlTopic(e.target.value)}
              placeholder={
                hlType === 'highlight' ? 'e.g. Kohli scores 50 against Pakistan' :
                hlType === 'preview' ? 'e.g. India vs Australia T20 2026 Preview' :
                'e.g. India wins series against England 3-1'
              }
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              onKeyDown={e => e.key === 'Enter' && generateHighlight()}
            />

            {/* Optional stats */}
            <textarea
              value={hlStats}
              onChange={e => setHlStats(e.target.value)}
              placeholder="Optional: extra stats or context (e.g. Kohli: 50(45), 3 fours, 2 sixes. India: 168/4 in 18 overs)"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
              rows={2}
            />

            <button
              onClick={generateHighlight}
              disabled={hlLoading || !hlTopic.trim()}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-200 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Zap className="w-4 h-4" />
              {hlLoading ? 'Queuing...' : 'Generate & Upload to YouTube'}
            </button>

            {hlResult && (
              <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
                hlResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {hlResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                {hlResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Video Jobs</h2>
            <span className="text-xs text-gray-400">Auto-refreshes every 15s</span>
          </div>
          {recentJobs.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              No video jobs yet. Videos are generated automatically when blog posts are published,
              or you can queue a test above.
            </div>
          ) : (
            <div className="divide-y">
              {recentJobs.map((job, i) => (
                <div key={i} className="px-6 py-4 flex items-start gap-3">
                  {job.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{job.slug} · {new Date(job.at).toLocaleString()}</p>
                    {job.success && job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        {job.url}
                      </a>
                    ) : job.error ? (
                      <p className="text-xs text-red-600 mt-1">{job.error}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
