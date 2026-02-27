'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Clock, MapPin, Users } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'

interface MatchDetails {
  matchInfo: any
  scorecard: any
}

export default function MatchDetailPage() {
  const params = useParams()
  const matchId = (params?.id ?? '') as string
  
  const [match, setMatch] = useState<MatchDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMatchDetails()
    // Auto-refresh every 30 seconds for live matches
    const interval = setInterval(fetchMatchDetails, 30000)
    return () => clearInterval(interval)
  }, [matchId])

  async function fetchMatchDetails() {
    try {
      const response = await fetch(`/api/matches/${matchId}`)
      const data = await response.json()
      
      if (data.success) {
        setMatch(data.data)
        setError(null)
      } else {
        setError('Failed to fetch match details')
      }
    } catch (err) {
      setError('Error loading match details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <Link href="/matches" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Matches
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error || 'Match not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  const { matchInfo, scorecard } = match

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <Link href="/matches" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Matches
        </Link>

        {/* Match Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {matchInfo?.name || 'Match Details'}
            </h1>
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              {matchInfo?.status || 'Live'}
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{matchInfo?.venue || 'Venue TBD'}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>{matchInfo?.dateTimeGMT ? formatDateTime(matchInfo.dateTimeGMT) : 'Time TBD'}</span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              <span>{matchInfo?.matchType || 'Format TBD'}</span>
            </div>
          </div>
        </div>

        {/* Scorecard */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Scorecard</h2>
          
          {scorecard ? (
            <div className="space-y-6">
              {/* This will display the scorecard data */}
              <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(scorecard, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Scorecard not available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
