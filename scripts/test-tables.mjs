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

  // ── Tournament Tables
  console.log('========== TOURNAMENT TABLES ==========');
  const tables = await get(`tournament/${T20_WC_KEY}/tables/`);
  if (tables?.ERROR) { console.log('ERROR:', JSON.stringify(tables)); }
  else {
    const data = tables?.data;
    console.log('Top-level keys:', Object.keys(data || {}));
    const groups = data?.groups || data?.tables || data?.standings || [];
    console.log('Groups type:', typeof groups, Array.isArray(groups) ? `array[${groups.length}]` : '');
    if (Array.isArray(groups) && groups.length > 0) {
      const g = groups[0];
      console.log('\nFirst group keys:', Object.keys(g || {}));
      console.log('Group name:', g?.name || g?.title);
      const rows = g?.rows || g?.standings || g?.teams || [];
      console.log('Rows count:', rows.length);
      if (rows.length > 0) console.log('First row:', JSON.stringify(rows[0], null, 2));
    } else {
      console.log('Full data:', JSON.stringify(data, null, 2).slice(0, 2000));
    }
  }

  // ── Full stats with all batting/bowling categories
  console.log('\n========== TOURNAMENT STATS (full) ==========');
  const stats = await get(`tournament/${T20_WC_KEY}/stats/`);
  const sd = stats?.data;
  if (stats?.ERROR) { console.log('ERROR:', JSON.stringify(stats)); return; }

  // Batting
  const batting = sd?.player?.batting || {};
  const bowling = sd?.player?.bowling || {};
  const playersMap = sd?.players || {};

  const resolve = (key) => playersMap[key]?.name || key;

  console.log('\n--- most_runs (top 5) ---');
  (batting.most_runs || []).slice(0,5).forEach(e =>
    console.log(`  #${e.rank} ${resolve(e.player_key)} [${e.team_key}] ${e.value} runs`));

  console.log('\n--- most_wickets (top 5) ---');
  (bowling.most_wickets || []).slice(0,5).forEach(e =>
    console.log(`  #${e.rank} ${resolve(e.player_key)} [${e.team_key}] ${e.value} wkts`));

  console.log('\n--- best_economy (top 5) ---');
  (bowling.best_economy || []).slice(0,5).forEach(e =>
    console.log(`  #${e.rank} ${resolve(e.player_key)} [${e.team_key}] econ ${e.value}`));

  console.log('\n--- most_sixes (top 5) ---');
  (batting.most_sixes || []).slice(0,5).forEach(e =>
    console.log(`  #${e.rank} ${resolve(e.player_key)} [${e.team_key}] ${e.value} sixes`));

  console.log('\n--- best_strike_rate / best_tournament_strike_rate (top 5) ---');
  (batting.best_tournament_strike_rate || batting.best_strike_rate || []).slice(0,5).forEach(e =>
    console.log(`  #${e.rank} ${resolve(e.player_key)} [${e.team_key}] SR ${e.value}`));

  console.log('\n--- best_bowling (top 5) ---');
  (bowling.best_bowling || []).slice(0,5).forEach(e =>
    console.log(`  #${e.rank} ${resolve(e.player_key)} [${e.team_key}] ${e.value}`));

  // Team stats
  console.log('\n--- team stats keys ---');
  console.log(JSON.stringify(Object.keys(sd?.team || {})));
  const teamBat = sd?.team?.batting || {};
  console.log('Team batting keys:', Object.keys(teamBat));
  if (teamBat.most_runs) {
    console.log('Team most_runs sample:', JSON.stringify(teamBat.most_runs?.slice(0,3)));
  }
}

run().catch(e => console.error('FATAL:', e.message));
