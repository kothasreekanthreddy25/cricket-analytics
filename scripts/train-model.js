/**
 * Cricket Match Prediction Model — Training Pipeline
 *
 * Reads Cricsheet JSON data from training-data/, computes rolling features
 * (Elo, win rates, h2h, momentum), trains the TensorFlow.js model, and
 * saves weights to public/model/.
 *
 * Usage:  node scripts/train-model.js
 */

const fs = require('fs')
const path = require('path')
const tf = require('@tensorflow/tfjs')

// ─── Config ──────────────────────────────────────────────────────────────────
const TRAINING_DATA_DIR = path.join(__dirname, '..', 'training-data')
const MODEL_SAVE_DIR = path.join(__dirname, '..', 'public', 'model')
const FEATURE_COUNT = 14
const HIDDEN_UNITS_1 = 32
const HIDDEN_UNITS_2 = 16
const EPOCHS = 50
const BATCH_SIZE = 32
const VALIDATION_SPLIT = 0.15

// ─── Venue → Pitch Type mapping ────────────────────────────────────────────
const VENUE_PITCH = {
  // Countries
  india: 0.8, australia: 0.2, england: 0.3, south_africa: 0.25,
  new_zealand: 0.35, west_indies: 0.6, sri_lanka: 0.75, pakistan: 0.7,
  bangladesh: 0.8, uae: 0.7, zimbabwe: 0.5, ireland: 0.35,
  scotland: 0.35, netherlands: 0.4, nepal: 0.65, afghanistan: 0.6,
  oman: 0.65, usa: 0.45, canada: 0.4, namibia: 0.45,
  // Cities
  mumbai: 0.8, delhi: 0.75, chennai: 0.85, kolkata: 0.7,
  bangalore: 0.6, hyderabad: 0.65, pune: 0.55, ahmedabad: 0.7,
  rajkot: 0.6, mohali: 0.55, nagpur: 0.7, lucknow: 0.65,
  perth: 0.15, melbourne: 0.3, sydney: 0.35, brisbane: 0.2,
  adelaide: 0.4, hobart: 0.3, canberra: 0.35,
  london: 0.3, birmingham: 0.35, leeds: 0.3, manchester: 0.3,
  nottingham: 0.3, southampton: 0.35,
  cape_town: 0.25, johannesburg: 0.2, durban: 0.35, centurion: 0.2,
  christchurch: 0.3, wellington: 0.35, auckland: 0.35, hamilton: 0.4,
  colombo: 0.75, galle: 0.85, kandy: 0.7,
  lahore: 0.7, karachi: 0.65, rawalpindi: 0.5, multan: 0.75,
  dhaka: 0.8, chittagong: 0.75, sylhet: 0.8,
  dubai: 0.7, abu_dhabi: 0.65, sharjah: 0.75,
  harare: 0.5, bulawayo: 0.5,
  bridgetown: 0.55, kingston: 0.5, port_of_spain: 0.55,
  antigua: 0.5, grenada: 0.55, st_lucia: 0.55,
  kabul: 0.6, lauderhill: 0.5, dallas: 0.45, new_york: 0.45,
}

// Country mapping for home-team detection
const TEAM_COUNTRY = {
  india: 'india', australia: 'australia', england: 'england',
  south_africa: 'south_africa', new_zealand: 'new_zealand',
  west_indies: 'west_indies', pakistan: 'pakistan', sri_lanka: 'sri_lanka',
  bangladesh: 'bangladesh', afghanistan: 'afghanistan', ireland: 'ireland',
  zimbabwe: 'zimbabwe', netherlands: 'netherlands', scotland: 'scotland',
  nepal: 'nepal', namibia: 'namibia', usa: 'united_states',
  united_states: 'united_states', uae: 'uae',
  united_arab_emirates: 'uae', oman: 'oman', canada: 'canada',
  papua_new_guinea: 'papua_new_guinea', uganda: 'uganda',
}

// City → country mapping for home detection
const CITY_COUNTRY = {
  mumbai: 'india', delhi: 'india', chennai: 'india', kolkata: 'india',
  bangalore: 'india', bengaluru: 'india', hyderabad: 'india',
  pune: 'india', ahmedabad: 'india', rajkot: 'india',
  mohali: 'india', nagpur: 'india', lucknow: 'india',
  jaipur: 'india', indore: 'india', kanpur: 'india',
  thiruvananthapuram: 'india', visakhapatnam: 'india', dharamsala: 'india',
  perth: 'australia', melbourne: 'australia', sydney: 'australia',
  brisbane: 'australia', adelaide: 'australia', hobart: 'australia',
  canberra: 'australia', cairns: 'australia', townsville: 'australia',
  london: 'england', birmingham: 'england', leeds: 'england',
  manchester: 'england', nottingham: 'england', southampton: 'england',
  bristol: 'england', chester_le_street: 'england', taunton: 'england',
  cape_town: 'south_africa', johannesburg: 'south_africa',
  durban: 'south_africa', centurion: 'south_africa',
  port_elizabeth: 'south_africa', bloemfontein: 'south_africa',
  paarl: 'south_africa', potchefstroom: 'south_africa',
  christchurch: 'new_zealand', wellington: 'new_zealand',
  auckland: 'new_zealand', hamilton: 'new_zealand',
  napier: 'new_zealand', dunedin: 'new_zealand', nelson: 'new_zealand',
  colombo: 'sri_lanka', galle: 'sri_lanka', kandy: 'sri_lanka',
  dambulla: 'sri_lanka', hambantota: 'sri_lanka', pallekele: 'sri_lanka',
  lahore: 'pakistan', karachi: 'pakistan', rawalpindi: 'pakistan',
  multan: 'pakistan', faisalabad: 'pakistan',
  dhaka: 'bangladesh', chittagong: 'bangladesh', sylhet: 'bangladesh',
  dubai: 'uae', abu_dhabi: 'uae', sharjah: 'uae',
  harare: 'zimbabwe', bulawayo: 'zimbabwe',
  bridgetown: 'west_indies', kingston: 'west_indies',
  port_of_spain: 'west_indies', antigua: 'west_indies',
  grenada: 'west_indies', st_lucia: 'west_indies',
  dublin: 'ireland', belfast: 'ireland',
  kabul: 'afghanistan',
  kathmandu: 'nepal',
  amsterdam: 'netherlands', rotterdam: 'netherlands',
  edinburgh: 'scotland',
  windhoek: 'namibia',
  lauderhill: 'united_states', dallas: 'united_states',
  new_york: 'united_states', houston: 'united_states',
  kampala: 'uganda',
  muscat: 'oman',
}

// ─── Utility functions ──────────────────────────────────────────────────────

function normalize(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^a-z_]/g, '')
}

function getPitchType(venue, city) {
  const v = normalize(venue)
  const c = normalize(city)

  // Check city first (more specific)
  for (const [key, val] of Object.entries(VENUE_PITCH)) {
    if (c.includes(key) || key.includes(c)) return val
  }
  // Then venue name
  for (const [key, val] of Object.entries(VENUE_PITCH)) {
    if (v.includes(key)) return val
  }
  return 0.5 // balanced default
}

function getFormatFactor(matchType) {
  const t = (matchType || '').toLowerCase()
  if (t.includes('t20') || t === 'twenty20') return 1
  if (t.includes('odi') || t === 'oneday' || t.includes('one_day')) return 0.5
  if (t.includes('test') || t.includes('first_class')) return 0
  return 0.5
}

function getVenueCountry(city, venue) {
  const c = normalize(city)
  const v = normalize(venue)
  for (const [key, country] of Object.entries(CITY_COUNTRY)) {
    if (c === key || c.includes(key)) return country
  }
  // Try venue name for country hints
  for (const [key, country] of Object.entries(CITY_COUNTRY)) {
    if (v.includes(key)) return country
  }
  return null
}

function getTeamCountry(teamName) {
  const t = normalize(teamName)
  for (const [key, country] of Object.entries(TEAM_COUNTRY)) {
    if (t === key || t.includes(key) || key.includes(t)) return country
  }
  return t
}

function isHomeTeam(teamName, city, venue) {
  const teamCountry = getTeamCountry(teamName)
  const venueCountry = getVenueCountry(city, venue)
  if (!venueCountry) return null // unknown
  return teamCountry === venueCountry
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

async function main() {
  console.log('=== Cricket Model Training Pipeline ===\n')

  // Step 1: Read and parse all JSON files
  console.log('Step 1: Reading match files...')
  const files = fs.readdirSync(TRAINING_DATA_DIR).filter(f => f.endsWith('.json'))
  console.log(`  Found ${files.length} JSON files`)

  const matches = []
  let skipped = 0
  let errors = 0

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(TRAINING_DATA_DIR, file), 'utf-8')
      // Only parse the info section (skip innings ball-by-ball for speed)
      // We read the full JSON but only use info
      const data = JSON.parse(raw)
      const info = data.info

      if (!info) { skipped++; continue }

      // Only use matches with a clear winner
      if (!info.outcome?.winner) { skipped++; continue }

      // Only international matches
      if (info.team_type !== 'international') { skipped++; continue }

      // Get teams
      const teams = info.teams
      if (!teams || teams.length < 2) { skipped++; continue }

      // Get first date
      const date = info.dates?.[0] || info.meta?.created || '2000-01-01'

      // Extract batting/bowling stats from innings if available
      let teamARunsScored = 0, teamAWicketsTaken = 0
      let teamBRunsScored = 0, teamBWicketsTaken = 0
      let teamAOvers = 0, teamBOvers = 0

      if (data.innings) {
        for (const inning of data.innings) {
          const battingTeam = inning.team
          let runs = 0, balls = 0, wickets = 0

          if (inning.overs) {
            for (const over of inning.overs) {
              if (over.deliveries) {
                for (const del of over.deliveries) {
                  const r = del.runs?.total || 0
                  runs += r
                  balls++
                  if (del.wickets) wickets += del.wickets.length
                }
              }
            }
          }

          const overs = balls / 6
          if (normalize(battingTeam) === normalize(teams[0])) {
            teamARunsScored = runs
            teamAOvers = overs
            teamBWicketsTaken = wickets
          } else {
            teamBRunsScored = runs
            teamBOvers = overs
            teamAWicketsTaken = wickets
          }
        }
      }

      matches.push({
        teamA: teams[0],
        teamB: teams[1],
        winner: info.outcome.winner,
        matchType: info.match_type || 'Unknown',
        venue: info.venue || '',
        city: info.city || '',
        date,
        toss: info.toss || {},
        gender: info.gender || 'male',
        event: info.event?.name || '',
        teamARunsScored,
        teamBRunsScored,
        teamAWicketsTaken,
        teamBWicketsTaken,
        teamAOvers,
        teamBOvers,
      })
    } catch (e) {
      errors++
    }

    // Progress log
    if (matches.length % 2000 === 0 && matches.length > 0) {
      process.stdout.write(`  Parsed ${matches.length} matches...\r`)
    }
  }

  console.log(`  Parsed ${matches.length} valid international matches (skipped ${skipped}, errors ${errors})`)

  // Step 2: Sort by date
  console.log('\nStep 2: Sorting matches chronologically...')
  matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  console.log(`  Date range: ${matches[0]?.date} to ${matches[matches.length - 1]?.date}`)

  // Count by format
  const formatCounts = {}
  for (const m of matches) {
    const f = m.matchType
    formatCounts[f] = (formatCounts[f] || 0) + 1
  }
  console.log('  Format breakdown:', JSON.stringify(formatCounts))

  // Step 3: Compute rolling features
  console.log('\nStep 3: Computing rolling features (Elo, win rates, h2h, momentum, strength)...')

  // Rolling stats per team
  const teamElo = {}      // team → Elo rating
  const teamResults = {}   // team → [{ won, date }] (last 20)
  const h2hRecords = {}    // "teamA_vs_teamB" → { aWins, bWins }
  const teamBatAvg = {}    // team → rolling batting average
  const teamBowlAvg = {}   // team → rolling bowling average (wickets per match)

  const K_FACTOR = 32 // Elo K-factor
  const DEFAULT_ELO = 1500

  function getElo(team) {
    const key = normalize(team)
    if (!teamElo[key]) teamElo[key] = DEFAULT_ELO
    return teamElo[key]
  }

  function updateElo(winner, loser) {
    const wKey = normalize(winner)
    const lKey = normalize(loser)
    const eloW = getElo(winner)
    const eloL = getElo(loser)
    const expectedW = 1 / (1 + Math.pow(10, (eloL - eloW) / 400))
    const expectedL = 1 - expectedW
    teamElo[wKey] = eloW + K_FACTOR * (1 - expectedW)
    teamElo[lKey] = eloL + K_FACTOR * (0 - expectedL)
  }

  function getWinRate(team, n = 20) {
    const key = normalize(team)
    const results = teamResults[key] || []
    if (results.length === 0) return 0.5
    const recent = results.slice(-n)
    const wins = recent.filter(r => r.won).length
    return wins / recent.length
  }

  function getMomentum(team, n = 5) {
    const key = normalize(team)
    const results = teamResults[key] || []
    if (results.length === 0) return 0.5
    const recent = results.slice(-n)
    // Weight recent matches more heavily
    let score = 0, weight = 0
    for (let i = 0; i < recent.length; i++) {
      const w = i + 1 // more recent = higher weight
      score += recent[i].won ? w : 0
      weight += w
    }
    return weight > 0 ? score / weight : 0.5
  }

  function getH2H(teamA, teamB) {
    const keyAB = `${normalize(teamA)}_vs_${normalize(teamB)}`
    const keyBA = `${normalize(teamB)}_vs_${normalize(teamA)}`
    const rec = h2hRecords[keyAB] || h2hRecords[keyBA]
    if (!rec) return 0.5
    const total = rec.aWins + rec.bWins
    if (total === 0) return 0.5
    // Return from teamA's perspective
    if (h2hRecords[keyAB]) return rec.aWins / total
    return rec.bWins / total // reversed key
  }

  function updateH2H(teamA, teamB, winner) {
    const key = `${normalize(teamA)}_vs_${normalize(teamB)}`
    if (!h2hRecords[key]) h2hRecords[key] = { aWins: 0, bWins: 0 }
    if (normalize(winner) === normalize(teamA)) h2hRecords[key].aWins++
    else h2hRecords[key].bWins++
  }

  function addResult(team, won) {
    const key = normalize(team)
    if (!teamResults[key]) teamResults[key] = []
    teamResults[key].push({ won })
    // Keep last 30 for rolling stats
    if (teamResults[key].length > 30) teamResults[key].shift()
  }

  function getBatStrength(team) {
    const key = normalize(team)
    const avg = teamBatAvg[key]
    if (!avg || avg.count === 0) return 0.5
    // Normalize: 150 runs in T20 → 0.75, 300 in ODI → 0.75, 400 in Test → 0.75
    return Math.min(1, avg.total / avg.count / 250)
  }

  function getBowlStrength(team) {
    const key = normalize(team)
    const avg = teamBowlAvg[key]
    if (!avg || avg.count === 0) return 0.5
    // Normalize: 5 wickets per innings average → 0.5, 10 → 1.0
    return Math.min(1, avg.total / avg.count / 10)
  }

  function updateBatBowl(team, runsScored, wicketsTaken) {
    const key = normalize(team)
    if (!teamBatAvg[key]) teamBatAvg[key] = { total: 0, count: 0 }
    if (!teamBowlAvg[key]) teamBowlAvg[key] = { total: 0, count: 0 }

    if (runsScored > 0) {
      teamBatAvg[key].total += runsScored
      teamBatAvg[key].count++
      // Keep rolling average of last 20
      if (teamBatAvg[key].count > 20) {
        teamBatAvg[key].total = (teamBatAvg[key].total / teamBatAvg[key].count) * 20
        teamBatAvg[key].count = 20
      }
    }
    if (wicketsTaken > 0) {
      teamBowlAvg[key].total += wicketsTaken
      teamBowlAvg[key].count++
      if (teamBowlAvg[key].count > 20) {
        teamBowlAvg[key].total = (teamBowlAvg[key].total / teamBowlAvg[key].count) * 20
        teamBowlAvg[key].count = 20
      }
    }
  }

  // Generate training data
  const trainingData = []
  let processedCount = 0

  // We need some initial data before features are meaningful, skip first 200 matches
  const WARMUP = 200

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]

    // Compute features BEFORE updating stats (to avoid data leakage)
    if (i >= WARMUP) {
      const eloA = getElo(m.teamA)
      const eloB = getElo(m.teamB)
      // Normalize Elo: 1200-1800 range → 0-1
      const eloNormA = Math.max(0, Math.min(1, (eloA - 1200) / 600))
      const eloNormB = Math.max(0, Math.min(1, (eloB - 1200) / 600))

      const winRateA = getWinRate(m.teamA)
      const winRateB = getWinRate(m.teamB)
      const h2h = getH2H(m.teamA, m.teamB)

      const teamAHome = isHomeTeam(m.teamA, m.city, m.venue)
      const teamBHome = isHomeTeam(m.teamB, m.city, m.venue)
      const isHome = teamAHome === true ? 1 : teamBHome === true ? 0 : 0.5

      const pitchType = getPitchType(m.venue, m.city)
      const formatFactor = getFormatFactor(m.matchType)

      const momentumA = getMomentum(m.teamA)
      const momentumB = getMomentum(m.teamB)

      const batStrengthA = getBatStrength(m.teamA)
      const batStrengthB = getBatStrength(m.teamB)
      const bowlStrengthA = getBowlStrength(m.teamA)
      const bowlStrengthB = getBowlStrength(m.teamB)

      const winner = normalize(m.winner) === normalize(m.teamA) ? 'A' : 'B'

      trainingData.push({
        features: [
          eloNormA,       // teamARanking
          eloNormB,       // teamBRanking
          winRateA,       // teamARecentWinRate
          winRateB,       // teamBRecentWinRate
          h2h,            // h2hTeamAWinRate
          isHome,         // isHome
          pitchType,      // pitchType
          formatFactor,   // formatFactor
          momentumA,      // teamAMomentum
          momentumB,      // teamBMomentum
          batStrengthA,   // teamABattingStrength
          batStrengthB,   // teamBBattingStrength
          bowlStrengthA,  // teamABowlingStrength
          bowlStrengthB,  // teamBBowlingStrength
        ],
        label: winner === 'A' ? [1, 0] : [0, 1],
        meta: {
          teamA: m.teamA,
          teamB: m.teamB,
          winner: m.winner,
          date: m.date,
          matchType: m.matchType,
        },
      })
    }

    // Update rolling stats AFTER using them
    const won = normalize(m.winner) === normalize(m.teamA)
    updateElo(m.winner, won ? m.teamB : m.teamA)
    addResult(m.teamA, won)
    addResult(m.teamB, !won)
    updateH2H(m.teamA, m.teamB, m.winner)
    updateBatBowl(m.teamA, m.teamARunsScored, m.teamAWicketsTaken)
    updateBatBowl(m.teamB, m.teamBRunsScored, m.teamBWicketsTaken)

    processedCount++
    if (processedCount % 3000 === 0) {
      process.stdout.write(`  Processed ${processedCount}/${matches.length}...\r`)
    }
  }

  console.log(`  Generated ${trainingData.length} training samples (after ${WARMUP} warmup matches)`)

  // Step 4: Save final team Elo ratings for reference
  console.log('\nTop team Elo ratings:')
  const sortedElos = Object.entries(teamElo)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
  for (const [team, elo] of sortedElos) {
    console.log(`  ${team}: ${Math.round(elo)}`)
  }

  // Save Elo ratings and team stats for the prediction engine
  const teamStats = {}
  for (const [team, elo] of Object.entries(teamElo)) {
    teamStats[team] = {
      elo: Math.round(elo),
      winRate: getWinRate(team.charAt(0).toUpperCase() + team.slice(1)),
      momentum: getMomentum(team.charAt(0).toUpperCase() + team.slice(1)),
      batStrength: getBatStrength(team),
      bowlStrength: getBowlStrength(team),
    }
  }

  // Step 5: Train the TensorFlow.js model
  console.log(`\nStep 5: Training model with ${trainingData.length} samples...`)
  console.log(`  Architecture: ${FEATURE_COUNT} → ${HIDDEN_UNITS_1} → ${HIDDEN_UNITS_2} → 2 (softmax)`)
  console.log(`  Epochs: ${EPOCHS}, Batch: ${BATCH_SIZE}, Validation: ${VALIDATION_SPLIT * 100}%\n`)

  // Build model
  const model = tf.sequential()
  model.add(tf.layers.dense({
    inputShape: [FEATURE_COUNT],
    units: HIDDEN_UNITS_1,
    activation: 'relu',
    kernelInitializer: 'glorotUniform',
  }))
  model.add(tf.layers.dropout({ rate: 0.2 }))
  model.add(tf.layers.dense({
    units: HIDDEN_UNITS_2,
    activation: 'relu',
    kernelInitializer: 'glorotUniform',
  }))
  model.add(tf.layers.dropout({ rate: 0.1 }))
  model.add(tf.layers.dense({
    units: 2,
    activation: 'softmax',
  }))

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  })

  // Prepare tensors
  const xs = tf.tensor2d(trainingData.map(d => d.features))
  const ys = tf.tensor2d(trainingData.map(d => d.label))

  // Train
  const history = await model.fit(xs, ys, {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    validationSplit: VALIDATION_SPLIT,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if ((epoch + 1) % 5 === 0 || epoch === 0) {
          console.log(
            `  Epoch ${epoch + 1}/${EPOCHS} — ` +
            `loss: ${logs.loss.toFixed(4)}, acc: ${logs.acc.toFixed(4)}, ` +
            `val_loss: ${logs.val_loss.toFixed(4)}, val_acc: ${logs.val_acc.toFixed(4)}`
          )
        }
      },
    },
  })

  xs.dispose()
  ys.dispose()

  // Final accuracy
  const finalLogs = history.history
  const finalAcc = finalLogs.val_acc[finalLogs.val_acc.length - 1]
  console.log(`\n  Final validation accuracy: ${(finalAcc * 100).toFixed(1)}%`)

  // Step 6: Save model weights
  console.log('\nStep 6: Saving model weights...')
  fs.mkdirSync(MODEL_SAVE_DIR, { recursive: true })

  // Save model weights as JSON (no tfjs-node needed)
  const weightsData = {}
  for (let i = 0; i < model.layers.length; i++) {
    const layer = model.layers[i]
    const weights = layer.getWeights()
    if (weights.length > 0) {
      weightsData[`layer_${i}_${layer.name}`] = weights.map(w => ({
        shape: w.shape,
        data: Array.from(w.dataSync()),
      }))
    }
  }
  const weightsPath = path.join(MODEL_SAVE_DIR, 'weights.json')
  fs.writeFileSync(weightsPath, JSON.stringify(weightsData))
  console.log(`  Model weights saved to ${weightsPath}`)

  // Also save model topology
  const topologyPath = path.join(MODEL_SAVE_DIR, 'model-topology.json')
  fs.writeFileSync(topologyPath, JSON.stringify(model.toJSON()))
  console.log(`  Model topology saved to ${topologyPath}`)

  // Also save team stats for the analysis engine
  const statsPath = path.join(MODEL_SAVE_DIR, 'team-stats.json')
  fs.writeFileSync(statsPath, JSON.stringify(teamStats, null, 2))
  console.log(`  Team stats saved to ${statsPath}`)

  // Save h2h records
  const h2hPath = path.join(MODEL_SAVE_DIR, 'h2h-records.json')
  fs.writeFileSync(h2hPath, JSON.stringify(h2hRecords, null, 2))
  console.log(`  H2H records saved to ${h2hPath}`)

  // Step 7: Quick test predictions
  console.log('\nStep 7: Test predictions:')
  const testMatchups = [
    ['India', 'Australia'],
    ['India', 'Pakistan'],
    ['England', 'Australia'],
    ['South Africa', 'New Zealand'],
    ['Bangladesh', 'Afghanistan'],
    ['West Indies', 'Sri Lanka'],
  ]

  for (const [teamA, teamB] of testMatchups) {
    const eloA = getElo(teamA)
    const eloB = getElo(teamB)
    const eloNormA = Math.max(0, Math.min(1, (eloA - 1200) / 600))
    const eloNormB = Math.max(0, Math.min(1, (eloB - 1200) / 600))
    const input = tf.tensor2d([[
      eloNormA,
      eloNormB,
      getWinRate(teamA),
      getWinRate(teamB),
      getH2H(teamA, teamB),
      0.5, // neutral venue
      0.5, // balanced pitch
      1,   // T20 format
      getMomentum(teamA),
      getMomentum(teamB),
      getBatStrength(teamA),
      getBatStrength(teamB),
      getBowlStrength(teamA),
      getBowlStrength(teamB),
    ]])

    const output = model.predict(input)
    const probs = output.dataSync()
    console.log(
      `  ${teamA} vs ${teamB}: ` +
      `${teamA} ${(probs[0] * 100).toFixed(1)}% — ${teamB} ${(probs[1] * 100).toFixed(1)}%`
    )
    input.dispose()
    output.dispose()
  }

  console.log('\n=== Training complete! ===')
  console.log(`Model saved to: ${MODEL_SAVE_DIR}`)
  console.log('Restart your dev server to use the trained model.')

  model.dispose()
}

main().catch(console.error)
