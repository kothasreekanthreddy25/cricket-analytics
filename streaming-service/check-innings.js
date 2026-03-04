require('dotenv').config()
const axios = require('axios')
const BASE = process.env.ROANUZ_BASE_URL
const PK = process.env.ROANUZ_PROJECT_KEY
const AK = process.env.ROANUZ_API_KEY

async function main() {
  const t = (await axios.post(BASE+'/core/'+PK+'/auth/', {api_key:AK})).data.data.token
  const featured = (await axios.get(BASE+'/cricket/'+PK+'/featured-matches-2/', {headers:{'rs-token':t}})).data
  const live = (featured.data.matches||[]).find(m => m.status==='started')
  if (!live) return console.log('No live match')
  console.log('Live match key:', live.key)
  const matchRes = await axios.get(BASE+'/cricket/'+PK+'/match/'+live.key+'/', {headers:{'rs-token':t}})
  const data = matchRes.data.data
  const play = data.play || {}
  const innings = play.innings || {}
  console.log('Innings keys:', Object.keys(innings))
  Object.entries(innings).forEach(([k, inn]) => {
    console.log('  '+k+':', JSON.stringify(inn))
  })
  // Also check live odds
  try {
    const oddsRes = await axios.get(BASE+'/cricket/'+PK+'/match/'+live.key+'/live-match-odds/', {headers:{'rs-token':t}})
    console.log('\nLive odds keys:', Object.keys(oddsRes.data.data||{}))
    console.log('Live odds sample:', JSON.stringify(oddsRes.data.data).slice(0, 300))
  } catch(e) {
    console.log('Live odds error:', e.response ? e.response.status : e.message)
  }
}
main().catch(e => console.error(e.message))
