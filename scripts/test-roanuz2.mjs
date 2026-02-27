import axios from 'axios';

const PROJECT_KEY = 'RS_P_2020810183931990021';
const API_KEY = 'RS5:1c4ab23c3b0d31d9dc34d60152214572';
const BASE_URL = 'https://api.sports.roanuz.com/v5';
const T20_WC_KEY = 'a-rz--cricket--icc--iccwct20--2026-YaNA';

async function run() {
  const authRes = await axios.post(`${BASE_URL}/core/${PROJECT_KEY}/auth/`, { api_key: API_KEY });
  const token = authRes.data?.data?.token;
  const headers = { 'rs-token': token };
  const get = async (ep) => {
    try {
      const r = await axios.get(`${BASE_URL}/cricket/${PROJECT_KEY}/${ep}`, { headers });
      return r.data;
    } catch (e) {
      return { ERROR: e.response?.status, msg: e.response?.data?.error || e.message };
    }
  };

  // ── 1. Full stats — inspect the 'players' map
  console.log('========== STATS: players map ==========');
  const stats = await get(`tournament/${T20_WC_KEY}/stats/`);
  const statsData = stats?.data;
  const playersMap = statsData?.players || {};
  const pKeys = Object.keys(playersMap).slice(0, 5);
  console.log('Total players in map:', Object.keys(playersMap).length);
  console.log('Sample player entries:');
  pKeys.forEach(k => console.log(` [${k}]`, JSON.stringify(playersMap[k], null, 2)));

  // ── 2. All batting most_runs entries
  console.log('\n========== BATTING: most_runs (top 10) ==========');
  const mostRuns = statsData?.player?.batting?.most_runs || [];
  mostRuns.slice(0, 10).forEach(e => {
    const p = playersMap[e.player_key] || {};
    console.log(`  #${e.rank} ${p.name || e.player_key} [${e.team_key}] — ${e.value} runs`);
  });

  // ── 3. All bowling most_wickets entries
  console.log('\n========== BOWLING: most_wickets (top 10) ==========');
  const mostWickets = statsData?.player?.bowling?.most_wickets || [];
  mostWickets.slice(0, 10).forEach(e => {
    const p = playersMap[e.player_key] || {};
    console.log(`  #${e.rank} ${p.name || e.player_key} [${e.team_key}] — ${e.value} wickets`);
  });

  // ── 4. best_strike_rate batters
  console.log('\n========== BATTING: best_strike_rate (top 5) ==========');
  const bestSR = statsData?.player?.batting?.best_strike_rate || [];
  bestSR.slice(0, 5).forEach(e => {
    const p = playersMap[e.player_key] || {};
    console.log(`  #${e.rank} ${p.name || e.player_key} [${e.team_key}] — SR ${e.value}`);
  });

  // ── 5. best_economy bowlers
  console.log('\n========== BOWLING: best_economy (top 5) ==========');
  const bestEcon = statsData?.player?.bowling?.best_economy || [];
  bestEcon.slice(0, 5).forEach(e => {
    const p = playersMap[e.player_key] || {};
    console.log(`  #${e.rank} ${p.name || e.player_key} [${e.team_key}] — Econ ${e.value}`);
  });

  // ── 6. All team keys + fixtures to see what matches happened
  console.log('\n========== ALL FIXTURES ==========');
  const fix = await get(`tournament/${T20_WC_KEY}/fixtures/`);
  const matches = fix?.data?.matches || [];
  console.log(`Total matches: ${matches.length}`);
  matches.forEach(m => {
    console.log(`  ${m.teams?.a?.name || 'TBD'} vs ${m.teams?.b?.name || 'TBD'} — ${m.status} — ${m.key}`);
  });

  // ── 7. Try fetching a completed match to see its squad/players
  const completedMatch = matches.find(m => m.status === 'completed');
  if (completedMatch) {
    console.log('\n========== COMPLETED MATCH DETAILS ==========');
    const md = await get(`match/${completedMatch.key}/`);
    const d = md?.data;
    console.log('Match data keys:', Object.keys(d || {}));
    const squadKeys = Object.keys(d?.squad || {});
    console.log('Squad keys:', squadKeys);
    if (squadKeys.length > 0) {
      const sq = d.squad[squadKeys[0]];
      console.log('Squad[0] keys:', Object.keys(sq || {}));
      console.log('playing_xi sample:', sq?.playing_xi?.slice(0, 3));
      console.log('captain:', sq?.captain);
      // Resolve first few player names
      const xi = sq?.playing_xi?.slice(0, 3) || [];
      const pMap = d?.players || {};
      xi.forEach(pk => {
        const p = pMap[pk]?.player || pMap[pk] || {};
        console.log(`  [${pk}] name: ${p.name}, role: ${p.seasonal_role || p.roles}`);
      });
    }
  }

  // ── 8. Check most_sixes + best_bowling
  console.log('\n========== BATTING: most_sixes (top 5) ==========');
  const sixes = statsData?.player?.batting?.most_sixes || [];
  sixes.slice(0, 5).forEach(e => {
    const p = playersMap[e.player_key] || {};
    console.log(`  #${e.rank} ${p.name || e.player_key} [${e.team_key}] — ${e.value} sixes`);
  });

  console.log('\n========== BOWLING: best_bowling (top 5) ==========');
  const bestBowl = statsData?.player?.bowling?.best_bowling || [];
  bestBowl.slice(0, 5).forEach(e => {
    const p = playersMap[e.player_key] || {};
    console.log(`  #${e.rank} ${p.name || e.player_key} [${e.team_key}] — ${e.value}`);
  });
}

run().catch(e => console.error('FATAL:', e.message, e.stack));
