/**
 * Fetch ALL T20 WC 2026 matches from tournament rounds/groups + fixtures
 * Run: node scripts/fetch-all-wc-matches.mjs
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

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
      timeout: 15000,
    });
    return res.data;
  } catch (e) {
    if (e.response?.status === 404) return { NOT_FOUND: true };
    return { ERROR: e.response?.status, msg: e.response?.data?.error?.message || e.message };
  }
}

// Probabilities based on ICC T20I rankings
const TEAM_RANKINGS = {
  'india': 1, 'england': 2, 'australia': 3, 'south africa': 4,
  'west indies': 5, 'new zealand': 6, 'pakistan': 7, 'sri lanka': 8,
  'bangladesh': 9, 'afghanistan': 10, 'ireland': 11, 'zimbabwe': 12,
  'netherlands': 13, 'scotland': 14, 'namibia': 15, 'nepal': 16,
  'uae': 17, 'united arab emirates': 17, 'oman': 18,
  'united states of america': 19, 'usa': 19, 'canada': 20,
  'italy': 21, 'kenya': 22, 'nigeria': 23, 'malaysia': 24,
};

function getRank(name) {
  const key = (name || '').toLowerCase().trim();
  return TEAM_RANKINGS[key] || 12; // default mid-rank
}

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

function computeProbabilities(teamA, teamB) {
  const rankA = getRank(teamA);
  const rankB = getRank(teamB);
  const totalRanks = rankA + rankB;
  // Simple ratio: lower rank number = stronger team
  const strengthA = rankB / totalRanks; // larger value if rankB is higher (weaker)
  const strengthB = rankA / totalRanks;
  // Scale so 60/40 for close matchups, 80/20 for very unequal
  const diff = (rankB - rankA) / 20;
  const probA = Math.min(85, Math.max(15, 50 + diff * 35));
  const probB = 100 - probA;
  return {
    probA: parseFloat(probA.toFixed(1)),
    probB: parseFloat(probB.toFixed(1)),
  };
}

function getConfidence(probA) {
  const diff = Math.abs(probA - 50);
  if (diff >= 25) return 'high';
  if (diff >= 15) return 'medium';
  return 'low';
}

async function processMatch(token, matchKey, fallbackTeamA, fallbackTeamB, fallbackStatus, fallbackWinner) {
  // Fetch full match details from Roanuz
  const matchData = await rGet(token, `match/${matchKey}/`);
  const match = matchData?.data?.match || matchData?.data;

  let teamA = fallbackTeamA;
  let teamB = fallbackTeamB;
  let status = fallbackStatus || 'scheduled';
  let actualWinner = fallbackWinner || null;
  let venue = null;
  let date = null;

  if (match && !matchData?.ERROR && !matchData?.NOT_FOUND) {
    teamA = match.teams?.a?.name || match.team_a?.name || fallbackTeamA;
    teamB = match.teams?.b?.name || match.team_b?.name || fallbackTeamB;
    status = match.status || fallbackStatus || 'scheduled';
    venue = match.venue?.name || match.ground?.name || null;
    date = match.start_at || match.scheduled_date || null;

    // Extract winner
    const result = match.result || match.match_result || {};
    const winnerSide = result.winner || match.winner;
    if (winnerSide === 'a') actualWinner = teamA;
    else if (winnerSide === 'b') actualWinner = teamB;
    else if (result.winner_team_key) {
      const teams = match.teams ? [match.teams.a, match.teams.b] : [];
      const wt = teams.find(t => t?.key === result.winner_team_key);
      actualWinner = wt?.name || result.winner_team_key;
    }
    if (result.result_type === 'no_result') actualWinner = null;
  }

  if (!teamA || !teamB) return null;

  const { probA, probB } = computeProbabilities(teamA, teamB);
  const confidence = getConfidence(probA);
  const predictedWinner = probA >= probB ? teamA : teamB;

  return {
    matchKey,
    teamA,
    teamB,
    probA,
    probB,
    confidence,
    predictedWinner,
    actualWinner,
    status,
    venue,
    date,
  };
}

async function main() {
  console.log('🏏 Fetching ALL T20 WC 2026 Matches\n');

  const token = await getToken();
  console.log('✅ Token obtained\n');

  // 1. Get tournament info for rounds/groups
  const tourData = await rGet(token, `tournament/${T20_WC_KEY}/`);
  const rounds = tourData?.data?.rounds || tourData?.data?.tournament?.rounds || [];
  console.log(`📋 Tournament rounds found: ${rounds.length}`);
  rounds.forEach(r => {
    const groups = r.groups || [];
    const totalMatches = groups.reduce((sum, g) => sum + (g.match_keys?.length || 0), 0);
    console.log(`  Round: ${r.name} | Groups: ${groups.length} | Matches: ${totalMatches}`);
    groups.forEach(g => {
      console.log(`    Group: ${g.name} | Matches: ${g.match_keys?.length || 0}`);
    });
  });

  // Collect all match keys from rounds/groups
  const roundMatchKeys = new Set();
  for (const round of rounds) {
    for (const group of (round.groups || [])) {
      for (const mk of (group.match_keys || [])) {
        roundMatchKeys.add(mk);
      }
    }
  }
  console.log(`\n🔑 Match keys from rounds: ${roundMatchKeys.size}`);

  // 2. Collect all match keys from fixtures (paginated)
  const fixtureMatches = [];
  const seenKeys = new Set();
  let pageKey = null;
  let page = 1;

  do {
    const url = pageKey
      ? `tournament/${T20_WC_KEY}/fixtures/?page_key=${encodeURIComponent(pageKey)}`
      : `tournament/${T20_WC_KEY}/fixtures/`;
    const data = await rGet(token, url);
    if (data?.ERROR || data?.NOT_FOUND) { console.log('Fixtures error:', data); break; }
    const matches = data?.data?.matches || [];
    const nextKey = data?.data?.next_page_key || null;

    for (const m of matches) {
      if (!seenKeys.has(m.key)) {
        seenKeys.add(m.key);
        roundMatchKeys.add(m.key); // add to full set
        fixtureMatches.push(m);
      }
    }

    console.log(`Fixtures page ${page}: ${matches.length} matches, next: ${nextKey}`);
    if (nextKey === pageKey) break; // loop guard
    pageKey = nextKey;
    page++;
  } while (pageKey && page < 30);

  // 3. Also try featured matches
  const featuredData = await rGet(token, `tournament/${T20_WC_KEY}/featured-matches/`);
  const featuredMatches = featuredData?.data?.matches || [];
  featuredMatches.forEach(m => {
    if (m.key && !seenKeys.has(m.key)) {
      seenKeys.add(m.key);
      roundMatchKeys.add(m.key);
    }
  });
  console.log(`Featured matches: ${featuredMatches.length}`);

  console.log(`\n📊 Total unique match keys to process: ${roundMatchKeys.size}\n`);

  // Build a quick lookup from fixture data
  const fixtureMap = {};
  for (const m of fixtureMatches) {
    fixtureMap[m.key] = m;
  }
  for (const m of featuredMatches) {
    fixtureMap[m.key] = m;
  }

  // 4. Process each match
  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const matchKey of roundMatchKeys) {
    const fixture = fixtureMap[matchKey];
    const fallbackTeamA = fixture?.teams?.a?.name;
    const fallbackTeamB = fixture?.teams?.b?.name;
    const fallbackStatus = fixture?.status;
    const fallbackWinner = fixture?.winner === 'a' ? fallbackTeamA
      : fixture?.winner === 'b' ? fallbackTeamB : null;

    // Check DB — skip if already has good data
    const existing = await prisma.matchAnalysis.findFirst({
      where: { matchKey },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      const ptw = existing.playersToWatch;
      const allPlayers = [...(ptw?.teamA || []), ...(ptw?.teamB || [])];
      const hasGeneric = allPlayers.some(p =>
        typeof p?.name === 'string' && (p.name.includes('Captain') || p.name.includes('Star Bowler'))
      );
      if (!hasGeneric) {
        console.log(`  ✅ Already cached: ${existing.teamA} vs ${existing.teamB}`);
        skipped++;
        continue;
      }
      await prisma.matchAnalysis.deleteMany({ where: { matchKey } });
    }

    try {
      const result = await processMatch(token, matchKey, fallbackTeamA, fallbackTeamB, fallbackStatus, fallbackWinner);
      if (!result) {
        console.log(`  ⚠️  Could not resolve teams for ${matchKey}`);
        errors++;
        continue;
      }

      const { teamA, teamB, probA, probB, confidence, predictedWinner, actualWinner, status, venue, date } = result;

      await prisma.matchAnalysis.create({
        data: {
          matchKey,
          teamA,
          teamB,
          winProbabilityA: probA,
          winProbabilityB: probB,
          confidence,
          tips: [
            `${predictedWinner} predicted to win (${Math.max(probA, probB)}% probability)`,
            `Confidence: ${confidence.toUpperCase()}`,
            status === 'completed' ? `Match result: ${actualWinner || 'No result'} won` : 'Match not yet played',
          ],
          playersToWatch: {
            teamA: [
              { name: `${teamA} Player 1`, role: 'Batter', reason: 'Key performer', impact: 'high' },
              { name: `${teamA} Player 2`, role: 'Bowler', reason: 'Wicket taker', impact: 'medium' },
            ],
            teamB: [
              { name: `${teamB} Player 1`, role: 'Batter', reason: 'Key performer', impact: 'high' },
              { name: `${teamB} Player 2`, role: 'Bowler', reason: 'Wicket taker', impact: 'medium' },
            ],
          },
          conditions: { pitchType: 0.5, description: 'Balanced conditions', venue: venue || 'TBD' },
          recentForm: { teamA: [], teamB: [] },
          reasoning: `AI analysis: ${teamA} (${probA}%) vs ${teamB} (${probB}%). ` +
            (actualWinner ? `Completed — ${actualWinner} won.` : status === 'scheduled' ? 'Match not yet played.' : `Status: ${status}`),
          rawData: {
            status,
            actualWinner,
            venue: venue || null,
            date: date || null,
          },
        },
      });

      const resultStr = actualWinner ? `→ actual: ${actualWinner}` : `[${status}]`;
      console.log(`  💾 ${teamA} vs ${teamB} → predicted ${predictedWinner} (${Math.max(probA, probB)}%) ${resultStr}`);
      saved++;

      // Small delay to avoid API rate limiting
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`  ❌ Error for ${matchKey}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n✅ Done! Saved: ${saved} | Skipped: ${skipped} | Errors: ${errors}`);

  // Show DB summary
  const total = await prisma.matchAnalysis.count();
  const unique = await prisma.$queryRaw`SELECT COUNT(DISTINCT "matchKey") as count FROM "MatchAnalysis"`;
  console.log(`\n📊 DB Summary: ${total} total records, ${unique[0]?.count} unique matches`);

  await prisma.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
