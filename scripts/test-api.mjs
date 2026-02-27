/**
 * Tests Roanuz API endpoints to find which ones work
 * Run: node scripts/test-api.mjs
 */

const PROJECT_KEY = 'RS_P_2020810183931990021'
const API_KEY = 'RS5:1c4ab23c3b0d31d9dc34d60152214572'
const BASE_URL = 'https://api.sports.roanuz.com/v5'

async function getToken() {
  const res = await fetch(`${BASE_URL}/core/${PROJECT_KEY}/auth/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: API_KEY }),
  })
  const data = await res.json()
  if (data.error) throw new Error(`Auth failed: ${JSON.stringify(data.error)}`)
  return data.data.token
}

async function testEndpoint(token, endpoint) {
  try {
    const res = await fetch(`${BASE_URL}/cricket/${PROJECT_KEY}/${endpoint}`, {
      headers: { 'rs-token': token },
    })
    const text = await res.text()
    if (!text.startsWith('{')) return `❌ Not JSON — ${text.slice(0, 60)}`
    const data = JSON.parse(text)
    if (data.error) return `❌ ${data.error.code} — ${data.error.msg}`
    const keys = data.data ? Object.keys(data.data).slice(0, 5).join(', ') : 'null'
    return `✅ OK  (keys: ${keys})`
  } catch (e) {
    return `💥 ${e.message.slice(0, 80)}`
  }
}

// Step 1: Get token
console.log('🔑 Getting Roanuz auth token...')
const token = await getToken()
console.log('✅ Token obtained\n')

// Step 2: Test match endpoints
console.log('━━━━ MATCH ENDPOINTS ━━━━')
const matchEndpoints = [
  'featured-matches/',
  'featured-tournaments/',
  'live-matches/',
  'upcoming-matches/',
  'recent-matches/',
]
for (const ep of matchEndpoints) {
  const result = await testEndpoint(token, ep)
  console.log(`  ${ep.padEnd(32)} ${result}`)
}

// Step 3: Get a tournament key to test tournament-based match endpoints
console.log('\n━━━━ FETCHING TOURNAMENTS ━━━━')
const tRes = await fetch(`${BASE_URL}/cricket/${PROJECT_KEY}/featured-tournaments/`, {
  headers: { 'rs-token': token },
})
const tData = await tRes.json()
const tournaments = tData.data?.tournaments || []
console.log(`  Found ${tournaments.length} tournaments`)

if (tournaments.length > 0) {
  const t = tournaments[0]
  const tKey = t.key || t.tournament_key
  console.log(`  Using tournament: ${t.name || tKey} (${tKey})\n`)

  console.log('━━━━ TOURNAMENT ENDPOINTS ━━━━')
  const tEndpoints = [
    `tournament/${tKey}/`,
    `tournament/${tKey}/fixtures/`,
    `tournament/${tKey}/featured-matches/`,
    `tournament/${tKey}/tables/`,
    `tournament/${tKey}/stats/`,
    `tournament/${tKey}/player-stats/`,
  ]
  for (const ep of tEndpoints) {
    const result = await testEndpoint(token, ep)
    console.log(`  ${ep.padEnd(45)} ${result}`)
  }

  // Step 4: Get a match key from fixtures
  console.log('\n━━━━ MATCH-SPECIFIC ENDPOINTS ━━━━')
  const fRes = await fetch(`${BASE_URL}/cricket/${PROJECT_KEY}/tournament/${tKey}/fixtures/`, {
    headers: { 'rs-token': token },
  })
  const fText = await fRes.text()
  if (fText.startsWith('{')) {
    const fData = JSON.parse(fText)
    const matches = fData.data?.matches || fData.data?.fixtures || []
    if (matches.length > 0) {
      const m = matches[0]
      const mKey = m.key || m.match_key
      console.log(`  Using match: ${m.name || mKey} (${mKey})\n`)
      const mEndpoints = [
        `match/${mKey}/`,
        `match/${mKey}/ball-by-ball/`,
        `match/${mKey}/overs-summary/`,
        `match/${mKey}/worm/`,
        `match/${mKey}/manhattan/`,
        `match/${mKey}/run-rate/`,
        `match/${mKey}/pre-match-odds/`,
        `match/${mKey}/live-match-odds/`,
        `match/${mKey}/insights/`,
      ]
      for (const ep of mEndpoints) {
        const result = await testEndpoint(token, ep)
        console.log(`  ${ep.padEnd(45)} ${result}`)
      }
    } else {
      console.log('  No matches found in fixtures')
    }
  }
}

console.log('\n✅ API Test Complete')
