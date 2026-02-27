import axios from 'axios'

const CRICKET_API_URL = process.env.CRICKET_API_URL || 'https://api.cricapi.com/v1'
const CRICKET_API_KEY = process.env.CRICKET_API_KEY || ''

const cricketApi = axios.create({
  baseURL: CRICKET_API_URL,
  params: {
    apikey: CRICKET_API_KEY,
  },
})

export interface MatchData {
  id: string
  name: string
  matchType: string
  status: string
  venue: string
  date: string
  dateTimeGMT: string
  teams: string[]
  teamInfo: any[]
  score: any[]
}

export interface PlayerStats {
  id: string
  name: string
  country: string
  role: string
  battingStyle?: string
  bowlingStyle?: string
  stats?: any
}

export interface TeamStats {
  id: string
  name: string
  country: string
  stats?: any
}

// Get current matches
export async function getCurrentMatches() {
  try {
    const response = await cricketApi.get('/currentMatches')
    return response.data.data || []
  } catch (error) {
    console.error('Error fetching current matches:', error)
    return []
  }
}

// Get match info by ID
export async function getMatchInfo(matchId: string) {
  try {
    const response = await cricketApi.get('/match_info', {
      params: { id: matchId },
    })
    return response.data.data
  } catch (error) {
    console.error('Error fetching match info:', error)
    return null
  }
}

// Get match scorecard
export async function getMatchScorecard(matchId: string) {
  try {
    const response = await cricketApi.get('/match_scorecard', {
      params: { id: matchId },
    })
    return response.data.data
  } catch (error) {
    console.error('Error fetching match scorecard:', error)
    return null
  }
}

// Get player info
export async function getPlayerInfo(playerId: string) {
  try {
    const response = await cricketApi.get('/players_info', {
      params: { id: playerId },
    })
    return response.data.data
  } catch (error) {
    console.error('Error fetching player info:', error)
    return null
  }
}

// Get series matches
export async function getSeriesMatches(seriesId: string) {
  try {
    const response = await cricketApi.get('/series_info', {
      params: { id: seriesId },
    })
    return response.data.data
  } catch (error) {
    console.error('Error fetching series matches:', error)
    return null
  }
}

export default cricketApi
