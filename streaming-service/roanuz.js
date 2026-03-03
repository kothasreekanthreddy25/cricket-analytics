/**
 * Roanuz API — Ball-by-ball poller
 */
const axios = require('axios')

const BASE_URL = process.env.ROANUZ_BASE_URL || 'https://api.sports.roanuz.com/v5'
const PROJECT_KEY = process.env.ROANUZ_PROJECT_KEY || ''
const API_KEY = process.env.ROANUZ_API_KEY || ''

let cachedToken = null
let tokenExpiry = 0

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry - 5 * 60 * 1000) return cachedToken
  const res = await axios.post(
    `${BASE_URL}/core/${PROJECT_KEY}/auth/`,
    { api_key: API_KEY }
  )
  cachedToken = res.data?.data?.token || res.data?.token
  const expires = res.data?.data?.expires || res.data?.expires
  tokenExpiry = expires ? expires * 1000 : Date.now() + 23 * 60 * 60 * 1000
  return cachedToken
}

async function roanuzGet(endpoint) {
  const token = await getToken()
  const res = await axios.get(
    `${BASE_URL}/cricket/${PROJECT_KEY}/${endpoint}`,
    { headers: { 'rs-token': token }, timeout: 8000 }
  )
  return res.data?.data
}

async function getMatchData(matchKey) {
  return roanuzGet(`match/${matchKey}/`)
}

async function getBallByBall(matchKey) {
  return roanuzGet(`match/${matchKey}/ball-by-ball/`)
}

async function getScoreText(matchKey) {
  try {
    const data = await getMatchData(matchKey)
    const match = data?.match || data
    const teams = match?.teams || {}
    const innings = match?.innings || {}

    const inningsList = Object.entries(innings).map(([key, inn]) => {
      const side = key.startsWith('a') ? teams.a?.name || 'Team A' : teams.b?.name || 'Team B'
      return `${side}: ${inn.runs || 0}/${inn.wickets || 0} (${inn.overs || 0} ov)`
    })

    return {
      scoreText: inningsList.join('  |  ') || 'Match in progress',
      teamA: teams.a?.name || 'Team A',
      teamB: teams.b?.name || 'Team B',
      status: match?.status || 'live',
    }
  } catch (err) {
    console.error('[Roanuz] Score fetch failed:', err.message)
    return { scoreText: 'Live Cricket', teamA: 'Team A', teamB: 'Team B', status: 'live' }
  }
}

module.exports = { getMatchData, getBallByBall, getScoreText }
