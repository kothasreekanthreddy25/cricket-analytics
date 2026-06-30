import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMatchDetails } from '@/lib/sportmonks'

interface PredictionRecord {
  id: string
  matchKey: string
  teamA: string
  teamB: string
  winProbabilityA: number
  winProbabilityB: number
  confidence: string
  createdAt: Date
  matchDate: string | null
  stage: string
  group: string
  venue: string | null
  predictedWinner: string
  predictedProbability: number
  actualWinner: string | null
  status: 'won' | 'lost' | 'pending' | 'no_result'
}

interface PerformanceSummary {
  total: number
  won: number
  lost: number
  pending: number
  noResult: number
  successRate: number
  stakePerMatch: number
  totalInvested: number
  totalReturned: number
  netProfitLoss: number
  roi: number
  lastUpdated: string
  records: PredictionRecord[]
}

async function getMatchWinner(matchKey: string): Promise<{ winner: string | null; status: string } | null> {
  try {
    const data = await getMatchDetails(matchKey)
    const match = data?.data
    if (!match) return null

    const matchStatus: string = match.status || ''
    const isFinished = matchStatus === 'Finished' || matchStatus === 'Completed'

    if (!isFinished) {
      return { winner: null, status: matchStatus }
    }

    const winnerId: number | null = match.winner_team_id || null
    const localteam = match.localteam?.data || match.localteam || {}
    const visitorteam = match.visitorteam?.data || match.visitorteam || {}

    if (winnerId) {
      if (winnerId === localteam.id) return { winner: localteam.name || 'Local Team', status: matchStatus }
      if (winnerId === visitorteam.id) return { winner: visitorteam.name || 'Visitor Team', status: matchStatus }
    }

    if (match.draw_noresult) return { winner: null, status: 'no_result' }

    return { winner: null, status: matchStatus }
  } catch {
    // legacy dead-code paths removed
    return null
  }
}

function normalizeTeamName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

function teamsMatch(predictedWinner: string, actualWinner: string): boolean {
  const p = normalizeTeamName(predictedWinner)
  const a = normalizeTeamName(actualWinner)

  if (p === a) return true

  const aliases: Record<string, string[]> = {
    india: ['ind', 'india', 'team india'],
    pakistan: ['pak', 'pakistan'],
    australia: ['aus', 'australia'],
    england: ['eng', 'england'],
    'south africa': ['rsa', 'sa', 'south africa'],
    'new zealand': ['nz', 'new zealand'],
    'west indies': ['wi', 'west indies', 'windies'],
    'sri lanka': ['sl', 'sri lanka'],
    bangladesh: ['ban', 'bd', 'bangladesh'],
    afghanistan: ['afg', 'afghanistan'],
    ireland: ['ire', 'ireland'],
    zimbabwe: ['zim', 'zimbabwe'],
    netherlands: ['nl', 'ned', 'netherlands'],
    scotland: ['sct', 'scot', 'scotland'],
    namibia: ['nam', 'namibia'],
    nepal: ['nep', 'nepal'],
    canada: ['can', 'canada'],
    uae: ['uae', 'united arab emirates'],
    usa: ['usa', 'united states', 'united states of america'],
  }

  for (const [, aliasSet] of Object.entries(aliases)) {
    if (aliasSet.includes(p) && aliasSet.includes(a)) return true
  }

  if (p.includes(a) || a.includes(p)) return true

  return false
}

export async function GET() {
  try {
    const allAnalysis = await prisma.matchAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Deduplicate by matchKey — keep only the most recent per match
    const seen = new Set<string>()
    const uniqueAnalysis = allAnalysis.filter((a) => {
      if (seen.has(a.matchKey)) return false
      seen.add(a.matchKey)
      return true
    })

    const records: PredictionRecord[] = []

    for (const analysis of uniqueAnalysis) {
      const predictedWinner =
        analysis.winProbabilityA >= analysis.winProbabilityB
          ? analysis.teamA
          : analysis.teamB
      const predictedProbability = Math.max(
        analysis.winProbabilityA,
        analysis.winProbabilityB
      )

      const rawData = (analysis.rawData as any) || {}
      let actualWinner: string | null = rawData.actualWinner || null
      let matchStatus: string = rawData.matchResultStatus || rawData.status || 'unknown'

      // ── KEY FIX: If no winner stored yet, ALWAYS check Roanuz API ──
      if (!actualWinner && matchStatus !== 'no_result' && matchStatus !== 'tie') {
        const matchResult = await getMatchWinner(analysis.matchKey)
        if (matchResult) {
          actualWinner = matchResult.winner
          matchStatus = matchResult.status

          // ── KEY FIX: Persist the result back to DB so we don't re-fetch ──
          if (actualWinner || matchStatus === 'completed' || matchStatus === 'finished' || matchStatus === 'no_result' || matchStatus === 'tie') {
            try {
              await prisma.matchAnalysis.update({
                where: { id: analysis.id },
                data: {
                  rawData: {
                    ...rawData,
                    actualWinner: actualWinner,
                    matchResultStatus: matchStatus,
                    resultUpdatedAt: new Date().toISOString(),
                  },
                },
              })
              console.log(`[Perf] Updated result for ${analysis.matchKey}: ${actualWinner || matchStatus}`)
            } catch (dbErr: any) {
              console.warn(`[Perf] Failed to persist result for ${analysis.matchKey}:`, dbErr.message)
            }
          }
        }
      }

      let status: PredictionRecord['status'] = 'pending'
      if (matchStatus === 'no_result' || matchStatus === 'tie') {
        status = 'no_result'
      } else if (actualWinner) {
        status = teamsMatch(predictedWinner, actualWinner) ? 'won' : 'lost'
      } else {
        status = 'pending'
      }

      const rawDateTs = rawData.date
      const matchDate = rawDateTs
        ? new Date(rawDateTs * 1000).toISOString()
        : null

      records.push({
        id: analysis.id,
        matchKey: analysis.matchKey,
        teamA: analysis.teamA,
        teamB: analysis.teamB,
        winProbabilityA: analysis.winProbabilityA,
        winProbabilityB: analysis.winProbabilityB,
        confidence: analysis.confidence,
        createdAt: analysis.createdAt,
        matchDate,
        stage: rawData.stage || 'Group',
        group: rawData.group || 'Group Stage',
        venue: rawData.venue || null,
        predictedWinner,
        predictedProbability,
        actualWinner,
        status,
      })
    }

    // Aggregate stats
    const total = records.length
    const won = records.filter((r) => r.status === 'won').length
    const lost = records.filter((r) => r.status === 'lost').length
    const noResult = records.filter((r) => r.status === 'no_result').length
    const pending = records.filter((r) => r.status === 'pending').length
    const settled = won + lost

    const successRate = settled > 0 ? Math.round((won / settled) * 100) : 0

    const stakePerMatch = settled > 0 ? Math.round(10000 / settled) : 0
    const totalInvested = stakePerMatch * settled
    let totalReturned = 0

    for (const r of records) {
      if (r.status === 'won') {
        const prob = r.predictedProbability > 1 ? r.predictedProbability / 100 : r.predictedProbability
        const decimalOdds = prob > 0 ? 1 / prob : 1
        totalReturned += stakePerMatch * decimalOdds
      }
    }

    totalReturned = Math.round(totalReturned)
    const netProfitLoss = totalReturned - totalInvested
    const roi = totalInvested > 0 ? Math.round((netProfitLoss / totalInvested) * 100) : 0

    const summary: PerformanceSummary = {
      total,
      won,
      lost,
      pending,
      noResult,
      successRate,
      stakePerMatch,
      totalInvested,
      totalReturned,
      netProfitLoss,
      roi,
      lastUpdated: new Date().toISOString(),
      records,
    }

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('Prediction performance error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate prediction performance', detail: error.message },
      { status: 500 }
    )
  }
}
