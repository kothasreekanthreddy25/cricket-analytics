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

  // Fetch ALL fixture pages
  let allMatches = [];
  let pageKey = null;
  let page = 1;
  do {
    const url = pageKey
      ? `tournament/${T20_WC_KEY}/fixtures/?page_key=${encodeURIComponent(pageKey)}`
      : `tournament/${T20_WC_KEY}/fixtures/`;
    const data = await get(url);
    if (data?.ERROR) { console.log('Fixtures error:', data); break; }
    const matches = data?.data?.matches || [];
    allMatches.push(...matches);
    pageKey = data?.data?.next_page_key || null;
    console.log(`Page ${page}: got ${matches.length} matches, next_page_key: ${pageKey}`);
    page++;
  } while (pageKey && page < 20);

  console.log(`\nTotal matches fetched: ${allMatches.length}`);

  // Show all matches
  allMatches.forEach(m => {
    const a = m.teams?.a?.name || 'TBD';
    const b = m.teams?.b?.name || 'TBD';
    const winner = m.winner === 'a' ? a : m.winner === 'b' ? b : '-';
    console.log(`  ${a} vs ${b} | ${m.status} | winner: ${winner} | ${m.sub_title || ''}`);
  });

  // Build standings from completed matches
  console.log('\n========== STANDINGS (derived from results) ==========');
  const teams = {};
  const getTeam = (name, key) => {
    if (!teams[key]) teams[key] = { name, key, played: 0, won: 0, lost: 0, points: 0, group: '' };
    return teams[key];
  };
  for (const m of allMatches) {
    if (m.status !== 'completed' || !m.winner) continue;
    const aKey = m.teams?.a?.key;
    const bKey = m.teams?.b?.key;
    const aName = m.teams?.a?.name;
    const bName = m.teams?.b?.name;
    if (!aKey || !bKey) continue;
    const tA = getTeam(aName, aKey);
    const tB = getTeam(bName, bKey);
    tA.played++; tB.played++;
    tA.group = m.sub_title || '';
    tB.group = m.sub_title || '';
    if (m.winner === 'a') { tA.won++; tA.points += 2; tB.lost++; }
    else if (m.winner === 'b') { tB.won++; tB.points += 2; tA.lost++; }
  }
  const sorted = Object.values(teams).sort((a, b) => b.points - a.points || b.won - a.won);
  sorted.forEach(t => console.log(`  ${t.name}: P${t.played} W${t.won} L${t.lost} Pts${t.points} [${t.group}]`));

  // Check tournament top-level for groups info
  console.log('\n========== TOURNAMENT ROUNDS/GROUPS ==========');
  const tour = await get(`tournament/${T20_WC_KEY}/`);
  const rounds = tour?.data?.rounds || [];
  rounds.forEach(r => {
    console.log(`Round: ${r.name}`);
    (r.groups || []).forEach(g => console.log(`  Group: ${g.name}, matches: ${g.match_keys?.length}`));
  });
}

run().catch(e => console.error('FATAL:', e.message));
