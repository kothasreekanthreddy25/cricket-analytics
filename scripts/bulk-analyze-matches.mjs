/**
 * Bulk-analyze all T20 WC 2026 fixtures and cache analysis in the DB
 * Run: node scripts/bulk-analyze-matches.mjs
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config(); // load .env

const PROJECT_KEY = process.env.ROANUZ_PROJECT_KEY || 'RS_P_2020810183931990021';
const API_KEY = process.env.ROANUZ_API_KEY || 'RS5:1c4ab23c3b0d31d9dc34d60152214572';
const BASE_URL = process.env.ROANUZ_BASE_URL || 'https://api.sports.roanuz.com/v5';
const T20_WC_KEY = 'a-rz--cricket--icc--iccwct20--2026-YaNA';

const prisma = new PrismaClient();

async function getToken() {
  const res = await axios.post(`${BASE_URL}/core/${PROJECT_KEY}/auth/`, { api_key: API_KEY });
  return res.data?.data?.token;
}

async function rGet(token, endpoint) {
  try {
    const res = await axios.get(`${BASE_URL}/cricket/${PROJECT_KEY}/${endpoint}`, {
      headers: { 'rs-token': token },
    });
    return res.data;
  } catch (e) {
    return { ERROR: e.response?.status, msg: e.response?.data?.error?.message || e.message };
  }
}

// ---------- Helpers from analysis-engine ----------
const TEAM_RANKINGS = {
  india: 1, england: 2, australia: 3, south_africa: 4,
  west_indies: 5, new_zealand: 6, pakistan: 7, sri_lanka: 8,
  bangladesh: 9, afghanistan: 10, ireland: 11, zimbabwe: 12,
  netherlands: 13, scotland: 14, namibia: 15, nepal: 16,
  uae: 17, oman: 18, usa: 19, canada: 20,
};

const H2H = {
  'india_pakistan': { a: 8, b: 2 },
  'pakistan_india': { a: 2, b: 8 },
  'india_australia': { a: 5, b: 5 },
  'australia_india': { a: 5, b: 5 },
  'india_england': { a: 5, b: 5 },
  'england_india': { a: 5, b: 5 },
  'india_south_africa': { a: 6, b: 4 },
  'south_africa_india': { a: 4, b: 6 },
};

function normalize(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_').replace(/[^a-z_]/g, '');
}

function getRank(name) {
  const key = normalize(name);
  return TEAM_RANKINGS[key] || 10;
}

function getH2H(teamA, teamB) {
  const key = `${normalize(teamA)}_${normalize(teamB)}`;
  const h2h = H2H[key];
  if (!h2h) return { a: 5, b: 5 };
  const total = h2h.a + h2h.b;
  return { a: h2h.a / total, b: h2h.b / total };
}

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

function computeProbabilities(teamA, teamB) {
  const rankA = getRank(teamA);
  const rankB = getRank(teamB);
  const h2h = getH2H(teamA, teamB);

  // Rank factor: lower rank = higher ability
  const rankScore = (rankB - rankA) / 20; // normalized difference
  const h2hScore = h2h.a - 0.5; // positive if A has better h2h

  const combined = rankScore * 0.6 + h2hScore * 0.4;
  const probA = sigmoid(combined * 3) * 100;
  const probB = 100 - probA;

  return { probA: parseFloat(probA.toFixed(1)), probB: parseFloat(probB.toFixed(1)) };
}

function getConfidence(prob) {
  const diff = Math.abs(prob - 50);
  if (diff >= 20) return 'HIGH';
  if (diff >= 10) return 'MEDIUM';
  return 'LOW';
}

// ---------- Main ----------

async function main() {
  console.log('🏏 Bulk Analysis Script - T20 WC 2026\n');

  const token = await getToken();
  console.log('✅ Roanuz token obtained\n');

  // Fetch all fixtures
  let allMatches = [];
  let pageKey = null;
  let page = 1;
  const seenKeys = new Set();

  do {
    const url = pageKey
      ? `tournament/${T20_WC_KEY}/fixtures/?page_key=${encodeURIComponent(pageKey)}`
      : `tournament/${T20_WC_KEY}/fixtures/`;
    const data = await rGet(token, url);
    if (data?.ERROR) { console.log('Fixtures error:', data); break; }
    const matches = data?.data?.matches || [];
    const nextKey = data?.data?.next_page_key || null;

    for (const m of matches) {
      if (!seenKeys.has(m.key)) {
        seenKeys.add(m.key);
        allMatches.push(m);
      }
    }

    console.log(`Page ${page}: ${matches.length} matches, next_page_key: ${nextKey}`);

    // Stop pagination loop if same key comes back
    if (nextKey === pageKey) break;
    pageKey = nextKey;
    page++;
  } while (pageKey && page < 20);

  console.log(`\n📋 Total unique matches: ${allMatches.length}\n`);

  // Show what we found
  allMatches.forEach((m, i) => {
    const a = m.teams?.a?.name || 'TBD';
    const b = m.teams?.b?.name || 'TBD';
    const status = m.status || 'unknown';
    console.log(`  ${i + 1}. ${a} vs ${b} [${status}] - ${m.key}`);
  });

  console.log('\n⚙️  Running analyses...\n');

  let saved = 0;
  let skipped = 0;

  for (const match of allMatches) {
    const matchKey = match.key;
    const teamA = match.teams?.a?.name;
    const teamB = match.teams?.b?.name;

    if (!teamA || !teamB || teamA === 'TBD' || teamB === 'TBD') {
      console.log(`  ⏭  Skipping ${matchKey} - TBD teams`);
      skipped++;
      continue;
    }

    // Check if already in DB (and not generic)
    const existing = await prisma.matchAnalysis.findFirst({
      where: { matchKey },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const ptw = existing.playersToWatch;
      const allPlayers = [...(ptw?.teamA || []), ...(ptw?.teamB || [])];
      const hasGeneric = allPlayers.some(p =>
        typeof p.name === 'string' && (p.name.includes('Captain') || p.name.includes('Star Bowler'))
      );
      if (!hasGeneric) {
        console.log(`  ✅ Already cached: ${teamA} vs ${teamB}`);
        skipped++;
        continue;
      }
      // Delete stale generic record
      await prisma.matchAnalysis.deleteMany({ where: { matchKey } });
    }

    // Compute probabilities
    const { probA, probB } = computeProbabilities(teamA, teamB);
    const confidence = getConfidence(probA);
    const predictedWinner = probA >= probB ? teamA : teamB;

    // Determine actual result
    let actualWinner = null;
    if (match.status === 'completed' && match.winner) {
      actualWinner = match.winner === 'a' ? teamA : teamB;
    }

    // Build minimal players to watch (from DB player database concept)
    const playersToWatch = {
      teamA: [
        { name: `${teamA} Key Player 1`, role: 'Batter', reason: 'Tournament form', impact: 'high' },
        { name: `${teamA} Key Player 2`, role: 'Bowler', reason: 'Key wicket taker', impact: 'medium' },
      ],
      teamB: [
        { name: `${teamB} Key Player 1`, role: 'Batter', reason: 'Tournament form', impact: 'high' },
        { name: `${teamB} Key Player 2`, role: 'Bowler', reason: 'Key wicket taker', impact: 'medium' },
      ],
    };

    const tips = [
      `${predictedWinner} predicted to win with ${Math.max(probA, probB)}% probability`,
      `Confidence level: ${confidence}`,
    ];

    try {
      await prisma.matchAnalysis.create({
        data: {
          matchKey,
          teamA,
          teamB,
          winProbabilityA: probA,
          winProbabilityB: probB,
          confidence: confidence.toLowerCase(),
          tips,
          playersToWatch,
          conditions: { pitchType: 0.5, description: 'Balanced conditions' },
          recentForm: { teamA: [], teamB: [] },
          reasoning: `AI analysis: ${teamA} (${probA}%) vs ${teamB} (${probB}%). ${
            actualWinner ? `Match completed — actual winner: ${actualWinner}` : 'Match not yet played.'
          }`,
          rawData: {
            status: match.status,
            actualWinner,
            venue: match.venue?.name || null,
            date: match.start_at || null,
          },
        },
      });
      console.log(`  💾 Saved: ${teamA} vs ${teamB} → predicted ${predictedWinner} (${Math.max(probA, probB)}%) | actual: ${actualWinner || 'TBD'}`);
      saved++;
    } catch (err) {
      console.log(`  ❌ Failed to save ${matchKey}: ${err.message}`);
    }
  }

  console.log(`\n✅ Done! Saved ${saved} new records, skipped ${skipped}.`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
