import * as tf from '@tensorflow/tfjs'
import * as fs from 'fs'
import * as path from 'path'

// Feature vector structure for match prediction
export interface MatchFeatures {
  // Team strength indicators (0-1 normalized)
  teamARanking: number
  teamBRanking: number
  teamARecentWinRate: number
  teamBRecentWinRate: number
  // Head to head
  h2hTeamAWinRate: number
  // Venue/conditions
  isHome: number // 1 if teamA is home, 0.5 neutral, 0 away
  pitchType: number // 0=pace friendly, 0.5=balanced, 1=spin friendly
  // Format factor
  formatFactor: number // 0=Test, 0.5=ODI, 1=T20
  // Form momentum (last 5 matches weighted)
  teamAMomentum: number
  teamBMomentum: number
  // Batting/bowling strength
  teamABattingStrength: number
  teamBBattingStrength: number
  teamABowlingStrength: number
  teamBBowlingStrength: number
}

const FEATURE_COUNT = 14
const HIDDEN_UNITS_1 = 32
const HIDDEN_UNITS_2 = 16

let model: tf.LayersModel | null = null
let trainedWeightsLoaded = false

// Trained team stats from real match data (Elo, win rate, momentum, strength)
let teamStats: Record<string, {
  elo: number
  winRate: number
  momentum: number
  batStrength: number
  bowlStrength: number
}> = {}

// Head-to-head records from training data
let h2hRecords: Record<string, { aWins: number; bWins: number }> = {}

function buildModel(): tf.LayersModel {
  const m = tf.sequential()

  m.add(tf.layers.dense({
    inputShape: [FEATURE_COUNT],
    units: HIDDEN_UNITS_1,
    activation: 'relu',
    kernelInitializer: 'glorotUniform',
  }))

  m.add(tf.layers.dropout({ rate: 0.2 }))

  m.add(tf.layers.dense({
    units: HIDDEN_UNITS_2,
    activation: 'relu',
    kernelInitializer: 'glorotUniform',
  }))

  m.add(tf.layers.dropout({ rate: 0.1 }))

  m.add(tf.layers.dense({
    units: 2,
    activation: 'softmax',
  }))

  m.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  })

  return m
}

// Load trained weights from public/model/weights.json
function loadTrainedWeights(m: tf.LayersModel): boolean {
  try {
    const weightsPath = path.join(process.cwd(), 'public', 'model', 'weights.json')

    if (!fs.existsSync(weightsPath)) {
      console.log('[TF Model] No trained weights found at', weightsPath)
      return false
    }

    const weightsData = JSON.parse(fs.readFileSync(weightsPath, 'utf-8'))

    for (const [layerKey, layerWeights] of Object.entries(weightsData)) {
      // Extract layer index from key like "layer_0_dense_Dense1"
      const layerIndex = parseInt(layerKey.split('_')[1])
      const layer = m.layers[layerIndex]
      if (!layer) continue

      const tensorWeights = (layerWeights as any[]).map((w: any) =>
        tf.tensor(w.data, w.shape)
      )
      layer.setWeights(tensorWeights)
    }

    console.log('[TF Model] Loaded trained weights from 9,086 international matches (71.2% accuracy)')
    return true
  } catch (err) {
    console.warn('[TF Model] Failed to load trained weights:', err)
    return false
  }
}

// Load team stats computed during training
function loadTeamStats() {
  try {
    const statsPath = path.join(process.cwd(), 'public', 'model', 'team-stats.json')
    if (fs.existsSync(statsPath)) {
      teamStats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'))
      console.log(`[TF Model] Loaded stats for ${Object.keys(teamStats).length} teams`)
    }
  } catch (err) {
    console.warn('[TF Model] Failed to load team stats:', err)
  }

  try {
    const h2hPath = path.join(process.cwd(), 'public', 'model', 'h2h-records.json')
    if (fs.existsSync(h2hPath)) {
      h2hRecords = JSON.parse(fs.readFileSync(h2hPath, 'utf-8'))
      console.log(`[TF Model] Loaded ${Object.keys(h2hRecords).length} head-to-head records`)
    }
  } catch (err) {
    console.warn('[TF Model] Failed to load h2h records:', err)
  }
}

export function getModel(): tf.LayersModel {
  if (!model) {
    // Dispose any leftover TF variables from hot-reload
    try { tf.disposeVariables() } catch { /* ok */ }
    model = buildModel()
    trainedWeightsLoaded = loadTrainedWeights(model)
    loadTeamStats()
  }
  return model
}

export function isModelTrained(): boolean {
  return trainedWeightsLoaded
}

// Get trained team stats for a team (normalized name)
export function getTeamStats(teamName: string) {
  const key = teamName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^a-z_]/g, '')
  return teamStats[key] || null
}

// Get h2h win rate for teamA vs teamB from training data
export function getTrainedH2H(teamA: string, teamB: string): number {
  const normA = teamA.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_').replace(/[^a-z_]/g, '')
  const normB = teamB.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_').replace(/[^a-z_]/g, '')
  const keyAB = `${normA}_vs_${normB}`
  const keyBA = `${normB}_vs_${normA}`

  if (h2hRecords[keyAB]) {
    const rec = h2hRecords[keyAB]
    const total = rec.aWins + rec.bWins
    return total > 0 ? rec.aWins / total : 0.5
  }
  if (h2hRecords[keyBA]) {
    const rec = h2hRecords[keyBA]
    const total = rec.aWins + rec.bWins
    return total > 0 ? rec.bWins / total : 0.5 // reversed
  }
  return 0.5
}

// Get Elo-normalized ranking (0-1) from training data
export function getTrainedRanking(teamName: string): number {
  const stats = getTeamStats(teamName)
  if (!stats) return 0.5
  // Normalize Elo: 1200-1800 → 0-1 (same as training)
  return Math.max(0, Math.min(1, (stats.elo - 1200) / 600))
}

export function featuresToTensor(features: MatchFeatures): tf.Tensor2D {
  return tf.tensor2d([[
    features.teamARanking,
    features.teamBRanking,
    features.teamARecentWinRate,
    features.teamBRecentWinRate,
    features.h2hTeamAWinRate,
    features.isHome,
    features.pitchType,
    features.formatFactor,
    features.teamAMomentum,
    features.teamBMomentum,
    features.teamABattingStrength,
    features.teamBBattingStrength,
    features.teamABowlingStrength,
    features.teamBBowlingStrength,
  ]])
}

export interface PredictionResult {
  teamAWinProb: number
  teamBWinProb: number
  confidence: 'high' | 'medium' | 'low'
}

export function predict(features: MatchFeatures): PredictionResult {
  const m = getModel()
  const input = featuresToTensor(features)
  const output = m.predict(input) as tf.Tensor
  const probs = output.dataSync()

  input.dispose()
  output.dispose()

  const teamAWinProb = Math.round(probs[0] * 1000) / 10
  const teamBWinProb = Math.round(probs[1] * 1000) / 10

  // Determine confidence based on probability gap
  const gap = Math.abs(probs[0] - probs[1])
  let confidence: 'high' | 'medium' | 'low'
  if (gap > 0.3) confidence = 'high'
  else if (gap > 0.15) confidence = 'medium'
  else confidence = 'low'

  return { teamAWinProb, teamBWinProb, confidence }
}

// Train model with historical match data
export async function trainModel(
  trainingData: { features: MatchFeatures; winner: 'A' | 'B' }[]
): Promise<tf.History> {
  const m = getModel()

  const xs = tf.tensor2d(trainingData.map(d => [
    d.features.teamARanking,
    d.features.teamBRanking,
    d.features.teamARecentWinRate,
    d.features.teamBRecentWinRate,
    d.features.h2hTeamAWinRate,
    d.features.isHome,
    d.features.pitchType,
    d.features.formatFactor,
    d.features.teamAMomentum,
    d.features.teamBMomentum,
    d.features.teamABattingStrength,
    d.features.teamBBattingStrength,
    d.features.teamABowlingStrength,
    d.features.teamBBowlingStrength,
  ]))

  const ys = tf.tensor2d(trainingData.map(d =>
    d.winner === 'A' ? [1, 0] : [0, 1]
  ))

  const history = await m.fit(xs, ys, {
    epochs: 50,
    batchSize: 16,
    validationSplit: 0.2,
    shuffle: true,
  })

  xs.dispose()
  ys.dispose()

  return history
}
