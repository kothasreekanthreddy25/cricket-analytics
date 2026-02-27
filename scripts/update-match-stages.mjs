/**
 * Update all MatchAnalysis records with stage/group info from tournament rounds
 * Run: node scripts/update-match-stages.mjs
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
    return { ERROR: e.response?.status, msg: e.response?.data?.error?.message || e.message };
  }
}

async function main() {
  console.log('📋 Updating match stages in DB...\n');

  const token = await getToken();
  console.log('✅ Token obtained\n');

  // Fetch tournament rounds to build matchKey → stage mapping
  const tourData = await rGet(token, `tournament/${T20_WC_KEY}/`);
  const rounds = tourData?.data?.rounds || [];

  // Build matchKey → { stage, group } map
  const stageMap = {};
  for (const round of rounds) {
    for (const group of (round.groups || [])) {
      for (const matchKey of (group.match_keys || [])) {
        stageMap[matchKey] = {
          stage: round.name,       // e.g. "Group", "Super 8", "Knockout"
          group: group.name,       // e.g. "Group A", "Semi Final"
        };
      }
    }
  }

  console.log(`🔑 Stage map built: ${Object.keys(stageMap).length} matches\n`);

  // Also fetch match details to get accurate dates
  // (only fetch for matches where date might be missing or wrong)
  const allAnalysis = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📊 Records in DB: ${allAnalysis.length}\n`);

  let updated = 0;
  let noStage = 0;

  for (const analysis of allAnalysis) {
    const stageInfo = stageMap[analysis.matchKey];
    const currentRawData = (analysis.rawData || {});

    // Only update if stage info is missing
    if (currentRawData.stage && currentRawData.group) {
      process.stdout.write('.');
      continue;
    }

    let matchDate = currentRawData.date || null;
    let venue = currentRawData.venue || null;

    // Fetch match details if date is missing
    if (!matchDate) {
      const matchData = await rGet(token, `match/${analysis.matchKey}/`);
      const match = matchData?.data?.match || matchData?.data;
      if (match) {
        matchDate = match.start_at || match.scheduled_date || null;
        venue = match.venue?.name || match.ground?.name || venue;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (!stageInfo) {
      console.log(`\n⚠️  No stage info for ${analysis.teamA} vs ${analysis.teamB} (${analysis.matchKey})`);
      noStage++;
      continue;
    }

    await prisma.matchAnalysis.update({
      where: { id: analysis.id },
      data: {
        rawData: {
          ...currentRawData,
          stage: stageInfo.stage,
          group: stageInfo.group,
          date: matchDate,
          venue: venue,
        },
      },
    });

    console.log(`\n  ✅ ${analysis.teamA} vs ${analysis.teamB} → [${stageInfo.group}] date: ${matchDate ? new Date(matchDate * 1000).toDateString() : 'N/A'}`);
    updated++;
  }

  console.log(`\n\n✅ Done! Updated: ${updated} | No stage: ${noStage}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
