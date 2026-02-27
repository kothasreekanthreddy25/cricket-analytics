'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Match {
  id: string
  matchId: string
  name: string
  date: Date
  teams: string[]
  venue: string
}

interface TipsterFormProps {
  matches: Match[]
  tipsterId: string
}

export default function TipsterForm({ matches, tipsterId }: TipsterFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    matchId: '',
    prediction: '',
    odds: '',
    confidence: 'MEDIUM' as const,
    analysis: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tipsterId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create tip')
      }

      setSuccess('Tip created successfully!')
      setFormData({
        matchId: '',
        prediction: '',
        odds: '',
        confidence: 'MEDIUM',
        analysis: '',
      })

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to create tip')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div>
        <label htmlFor="matchId" className="block text-sm font-medium text-gray-700">
          Select Match
        </label>
        <select
          id="matchId"
          required
          value={formData.matchId}
          onChange={(e) => setFormData({ ...formData, matchId: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Choose a match...</option>
          {matches.map((match) => (
            <option key={match.id} value={match.id}>
              {match.name} - {new Date(match.date).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="prediction" className="block text-sm font-medium text-gray-700">
          Prediction
        </label>
        <input
          id="prediction"
          type="text"
          required
          value={formData.prediction}
          onChange={(e) => setFormData({ ...formData, prediction: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., India to win, Total runs over 300"
        />
      </div>

      <div>
        <label htmlFor="odds" className="block text-sm font-medium text-gray-700">
          Odds (Optional)
        </label>
        <input
          id="odds"
          type="text"
          value={formData.odds}
          onChange={(e) => setFormData({ ...formData, odds: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., 1.85, 2.5"
        />
      </div>

      <div>
        <label htmlFor="confidence" className="block text-sm font-medium text-gray-700">
          Confidence Level
        </label>
        <select
          id="confidence"
          required
          value={formData.confidence}
          onChange={(e) => setFormData({ ...formData, confidence: e.target.value as any })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="VERY_HIGH">Very High</option>
        </select>
      </div>

      <div>
        <label htmlFor="analysis" className="block text-sm font-medium text-gray-700">
          Analysis (Optional)
        </label>
        <textarea
          id="analysis"
          rows={3}
          value={formData.analysis}
          onChange={(e) => setFormData({ ...formData, analysis: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Provide your analysis and reasoning..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Tip...' : 'Create Tip'}
      </button>
    </form>
  )
}
