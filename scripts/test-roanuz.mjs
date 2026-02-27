import axios from 'axios';

const PROJECT_KEY = 'RS_P_2020810183931990021';
const API_KEY = 'RS5:1c4ab23c3b0d31d9dc34d60152214572';
const BASE_URL = 'https://api.sports.roanuz.com/v5';
const T20_WC_KEY = 'a-rz--cricket--icc--iccwct20--2026-YaNA';

async function run() {
  // Auth
  const authRes = await axios.post(`${BASE_URL}/core/${PROJECT_KEY}/auth/`, { api_key: API_KEY });
  const token = authRes.data?.data?.token;
  console.log('Token:', token ? 'OK' : 'FAILED');

  const headers = { 'rs-token': token };
  const get = async (ep) => {
    try {
      const r = await axios.get(`${BASE_URL}/cricket/${PROJECT_KEY}/${ep}`, { headers });
      return r.data;
    } catch (e) {
      return { ERROR: e.response?.status, msg: e.response?.data?.error || e.message };
    }
  };

  // ── 1. Tournament top-level (get team keys)
  console.log('\n========== TOURNAMENT TOP-LEVEL ==========');
  const tour = await get(`tournament/${T20_WC_KEY}/`);
  const teams = tour?.data?.teams || {};
  const teamKeys = Object.keys(teams);
  console.log('Number of teams:', teamKeys.length);
  console.log('Team entries sample:');
  teamKeys.slice(0, 5).forEach(k => {
    const t = teams[k];
    console.log(` [${k}]`, JSON.stringify({ name: t?.name, key: t?.key }));
  });

  // Pick first valid team key for squad test
  const firstTeamKey = teams[teamKeys[0]]?.key || teamKeys[0];
  const secondTeamKey = teams[teamKeys[1]]?.key || teamKeys[1];

  // ── 2. Tournament Team (squad)
  console.log('\n========== TOURNAMENT TEAM SQUAD ==========');
  console.log('Testing teamKey:', firstTeamKey);
  const teamData = await get(`tournament/${T20_WC_KEY}/team/${firstTeamKey}/`);
  console.log('Top-level keys:', Object.keys(teamData?.data || {}));
  const squad = teamData?.data?.squad || {};
  const squadKeys = Object.keys(squad);
  console.log('Squad keys:', squadKeys);
  // Show first few players
  const players = teamData?.data?.players || {};
  const playerKeys = Object.keys(players).slice(0, 3);
  console.log('Players map sample:');
  playerKeys.forEach(pk => {
    const p = players[pk]?.player || players[pk] || {};
    console.log(` [${pk}]`, JSON.stringify({ name: p.name, role: p.seasonal_role || p.roles }));
  });
  // Show squad structure
  if (squad.player_keys) console.log('player_keys count:', squad.player_keys?.length);
  if (squad.playing_xi) console.log('playing_xi count:', squad.playing_xi?.length);
  if (squad.captain) console.log('captain:', squad.captain);
  if (Array.isArray(squad.players)) {
    console.log('squad.players array count:', squad.players.length);
    console.log('First squad player:', JSON.stringify(squad.players[0], null, 2));
  }
  if (teamData?.ERROR) console.log('ERROR:', JSON.stringify(teamData));

  // ── 3. Tournament Stats
  console.log('\n========== TOURNAMENT STATS ==========');
  const stats = await get(`tournament/${T20_WC_KEY}/stats/`);
  const statsData = stats?.data;
  if (stats?.ERROR) {
    console.log('ERROR:', JSON.stringify(stats));
  } else {
    console.log('Stats top-level keys:', Object.keys(statsData || {}));
    const batting = statsData?.player?.batting || {};
    const bowling = statsData?.player?.bowling || {};
    console.log('Batting categories:', Object.keys(batting));
    console.log('Bowling categories:', Object.keys(bowling));
    // Show sample most_runs entry
    const mostRuns = batting?.most_runs || [];
    if (mostRuns.length > 0) {
      console.log('most_runs sample (first 3):');
      mostRuns.slice(0, 3).forEach(e => console.log(' ', JSON.stringify(e)));
    } else {
      console.log('most_runs: empty (tournament not started yet)');
    }
  }

  // ── 4. Tournament Player Stats
  console.log('\n========== TOURNAMENT PLAYER STATS ==========');
  const playerStats = await get(`tournament/${T20_WC_KEY}/player-stats/`);
  if (playerStats?.ERROR) {
    console.log('ERROR:', JSON.stringify(playerStats));
  } else {
    const psData = playerStats?.data;
    console.log('Player stats top-level keys:', Object.keys(psData || {}));
    const psPlayers = psData?.players || {};
    const psKeys = Object.keys(psPlayers).slice(0, 2);
    console.log('Sample players:');
    psKeys.forEach(k => console.log(` [${k}]`, JSON.stringify(psPlayers[k])));
  }

  // ── 5. Tournament fixtures (to get real match team keys)
  console.log('\n========== FIXTURES (first match team keys) ==========');
  const fixtures = await get(`tournament/${T20_WC_KEY}/fixtures/`);
  const matches = fixtures?.data?.matches || [];
  console.log('Total fixtures:', matches.length);
  if (matches.length > 0) {
    const m = matches[0];
    console.log('First match:', JSON.stringify({
      key: m.key,
      name: m.name || `${m.teams?.a?.name} vs ${m.teams?.b?.name}`,
      teamAKey: m.teams?.a?.key,
      teamBKey: m.teams?.b?.key,
      status: m.status,
    }));
  }
}

run().catch(e => console.error('FATAL:', e.message));
