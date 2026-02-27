/**
 * Real player database for ICC T20 World Cup 2026 teams.
 * Stats are career T20I figures based on known records (as of early 2026).
 * Used as fallback when live squad data is unavailable from the API.
 */

export interface KnownPlayer {
  name: string
  role: 'Batter' | 'Bowler' | 'All-rounder' | 'WK-Batter'
  isCapt?: boolean
  isKeeper?: boolean
  stats: {
    runs?: number
    wickets?: number
    strikeRate?: number
    economy?: number
    catches?: number
    ranking?: { category: string; rank: number }
  }
  reason: string
  impact: 'high' | 'medium' | 'low'
}

export const PLAYER_DATABASE: Record<string, KnownPlayer[]> = {
  // ── INDIA ──────────────────────────────────────────────────────────────────
  India: [
    {
      name: 'Rohit Sharma',
      role: 'Batter',
      isCapt: true,
      stats: { runs: 4231, strikeRate: 140.9, ranking: { category: 'T20I Runs', rank: 2 } },
      reason: 'Captain and explosive opener — most T20I runs for India, exceptional powerplay performer',
      impact: 'high',
    },
    {
      name: 'Virat Kohli',
      role: 'Batter',
      stats: { runs: 4188, strikeRate: 137.0, ranking: { category: 'T20I Runs', rank: 3 } },
      reason: 'All-time T20I great — highest run scorer in T20 WC history, anchors the middle order',
      impact: 'high',
    },
    {
      name: 'Suryakumar Yadav',
      role: 'Batter',
      stats: { runs: 2756, strikeRate: 170.1, ranking: { category: 'T20I Ranking', rank: 1 } },
      reason: '#1 ranked T20I batter — extraordinary 360° game, devastating in death overs',
      impact: 'high',
    },
    {
      name: 'Jasprit Bumrah',
      role: 'Bowler',
      stats: { wickets: 89, economy: 6.18, ranking: { category: 'T20I Wickets', rank: 1 } },
      reason: "World's best death bowler — unplayable yorkers, lethal in powerplay and final overs",
      impact: 'high',
    },
    {
      name: 'Hardik Pandya',
      role: 'All-rounder',
      stats: { runs: 1318, wickets: 59, strikeRate: 147.3, economy: 8.80 },
      reason: 'Explosive finisher and strike bowler — game-changing all-round impact',
      impact: 'high',
    },
    {
      name: 'Ravindra Jadeja',
      role: 'All-rounder',
      stats: { runs: 672, wickets: 54, economy: 7.09, strikeRate: 130.3 },
      reason: 'Left-arm spin and lower-order runs — provides balance in spin-friendly conditions',
      impact: 'medium',
    },
  ],

  // ── ENGLAND ────────────────────────────────────────────────────────────────
  England: [
    {
      name: 'Jos Buttler',
      role: 'WK-Batter',
      isCapt: true,
      isKeeper: true,
      stats: { runs: 2884, strikeRate: 144.6, ranking: { category: 'T20I Runs', rank: 4 } },
      reason: 'England\'s captain and finisher — extraordinary power-hitting, vital at No. 4',
      impact: 'high',
    },
    {
      name: 'Phil Salt',
      role: 'WK-Batter',
      stats: { runs: 1352, strikeRate: 155.4 },
      reason: 'Destructive opener — among the fastest scorers in T20Is, sets up big totals',
      impact: 'high',
    },
    {
      name: 'Adil Rashid',
      role: 'Bowler',
      stats: { wickets: 102, economy: 7.42, ranking: { category: 'T20I Wickets', rank: 5 } },
      reason: '100+ T20I wickets — leg-spin ace who takes wickets in the middle overs',
      impact: 'high',
    },
    {
      name: 'Jofra Archer',
      role: 'Bowler',
      stats: { wickets: 47, economy: 7.75 },
      reason: 'Extreme pace and bounce — match-winning ability with the new ball and at death',
      impact: 'high',
    },
    {
      name: 'Harry Brook',
      role: 'Batter',
      stats: { runs: 749, strikeRate: 158.0 },
      reason: 'Most exciting young batter in the world — clean ball-striking and natural power',
      impact: 'medium',
    },
    {
      name: 'Sam Curran',
      role: 'All-rounder',
      stats: { runs: 327, wickets: 51, economy: 8.52 },
      reason: 'T20 WC 2022 Player of the Tournament — left-arm pace and handy runs below',
      impact: 'medium',
    },
  ],

  // ── AUSTRALIA ─────────────────────────────────────────────────────────────
  Australia: [
    {
      name: 'Travis Head',
      role: 'Batter',
      stats: { runs: 1407, strikeRate: 145.3, ranking: { category: 'T20I Runs', rank: 7 } },
      reason: 'Australia\'s most destructive opener — consistently scores at 145+ SR at the top',
      impact: 'high',
    },
    {
      name: 'Mitchell Marsh',
      role: 'All-rounder',
      isCapt: true,
      stats: { runs: 1218, wickets: 30, strikeRate: 149.7 },
      reason: 'Captain and attacking No. 3 — big-match player who impacted the 2021 T20 WC win',
      impact: 'high',
    },
    {
      name: 'Glenn Maxwell',
      role: 'All-rounder',
      stats: { runs: 3116, wickets: 53, strikeRate: 158.2, economy: 7.95 },
      reason: 'Most dangerous T20I batter in the world — off-spin and incredible batting range',
      impact: 'high',
    },
    {
      name: 'Pat Cummins',
      role: 'Bowler',
      stats: { wickets: 57, economy: 8.11 },
      reason: 'World\'s best all-format captain — pace variations crucial at the death',
      impact: 'high',
    },
    {
      name: 'Adam Zampa',
      role: 'Bowler',
      stats: { wickets: 96, economy: 7.24, ranking: { category: 'T20I Wickets', rank: 6 } },
      reason: 'Australia\'s premier spinner — leg-spin at 90+ wickets, reliable in middle overs',
      impact: 'high',
    },
    {
      name: 'Tim David',
      role: 'Batter',
      stats: { runs: 683, strikeRate: 163.2 },
      reason: 'World-class death-over batter — SR 163 in T20Is, devastating against spin and pace',
      impact: 'medium',
    },
  ],

  // ── SOUTH AFRICA ──────────────────────────────────────────────────────────
  'South Africa': [
    {
      name: 'Quinton de Kock',
      role: 'WK-Batter',
      isKeeper: true,
      stats: { runs: 2497, strikeRate: 135.7, ranking: { category: 'T20I Runs', rank: 8 } },
      reason: 'South Africa\'s batting cornerstone — consistent opener with 2500+ T20I runs',
      impact: 'high',
    },
    {
      name: 'Kagiso Rabada',
      role: 'Bowler',
      stats: { wickets: 102, economy: 7.84, ranking: { category: 'T20I Wickets', rank: 3 } },
      reason: '100+ T20I wickets — extreme pace and skill, dangerous at every stage of innings',
      impact: 'high',
    },
    {
      name: 'Aiden Markram',
      role: 'Batter',
      isCapt: true,
      stats: { runs: 1248, strikeRate: 143.9 },
      reason: 'Captain and composed batter — read the game well at No. 3 through middle overs',
      impact: 'high',
    },
    {
      name: 'Marco Jansen',
      role: 'All-rounder',
      stats: { runs: 193, wickets: 41, economy: 8.16 },
      reason: 'Tall left-arm pace — skiddy in powerplay and generates awkward bounce',
      impact: 'medium',
    },
    {
      name: 'Tabraiz Shamsi',
      role: 'Bowler',
      stats: { wickets: 96, economy: 6.68, ranking: { category: 'T20I Wickets', rank: 4 } },
      reason: 'Left-arm wrist spin — SA\'s No. 1 spinner and a handful in spin-friendly conditions',
      impact: 'high',
    },
    {
      name: 'Heinrich Klaasen',
      role: 'WK-Batter',
      stats: { runs: 1289, strikeRate: 166.1 },
      reason: 'SR of 166 — South Africa\'s best finisher, devastating in the last five overs',
      impact: 'high',
    },
  ],

  // ── WEST INDIES ───────────────────────────────────────────────────────────
  'West Indies': [
    {
      name: 'Nicholas Pooran',
      role: 'WK-Batter',
      isKeeper: true,
      stats: { runs: 1918, strikeRate: 153.6, ranking: { category: 'T20I SR', rank: 5 } },
      reason: 'SR over 150 — explosive bat-wielder who can single-handedly change a game',
      impact: 'high',
    },
    {
      name: 'Andre Russell',
      role: 'All-rounder',
      stats: { runs: 1227, wickets: 79, strikeRate: 167.8, economy: 8.84 },
      reason: 'Most feared T20 player — power-hitting SR 168 and crucial pace wickets',
      impact: 'high',
    },
    {
      name: 'Rovman Powell',
      role: 'Batter',
      isCapt: true,
      stats: { runs: 1476, strikeRate: 148.4 },
      reason: 'Captain and power-hitter — immense six-hitting ability in the death overs',
      impact: 'high',
    },
    {
      name: 'Alzarri Joseph',
      role: 'Bowler',
      stats: { wickets: 63, economy: 7.94 },
      reason: 'Genuine pace weapon — bounce and speed generate difficult hitting conditions',
      impact: 'medium',
    },
    {
      name: 'Akeal Hosein',
      role: 'Bowler',
      stats: { wickets: 47, economy: 6.22 },
      reason: 'Left-arm spinner — economical and takes wickets in middle overs on slow tracks',
      impact: 'medium',
    },
    {
      name: 'Shimron Hetmyer',
      role: 'Batter',
      stats: { runs: 1061, strikeRate: 155.0 },
      reason: 'Brilliant left-hander — changes the complexion of a match with attacking play',
      impact: 'medium',
    },
  ],

  // ── PAKISTAN ──────────────────────────────────────────────────────────────
  Pakistan: [
    {
      name: 'Babar Azam',
      role: 'Batter',
      stats: { runs: 4113, strikeRate: 129.4, ranking: { category: 'T20I Runs', rank: 1 } },
      reason: 'Highest T20I run scorer for Pakistan — classical technique and consistent form',
      impact: 'high',
    },
    {
      name: 'Mohammad Rizwan',
      role: 'WK-Batter',
      isKeeper: true,
      stats: { runs: 2955, strikeRate: 133.8, ranking: { category: 'T20I Runs', rank: 5 } },
      reason: '2900+ T20I runs — anchors Pakistan\'s innings with solid wicketkeeping',
      impact: 'high',
    },
    {
      name: 'Shaheen Shah Afridi',
      role: 'Bowler',
      stats: { wickets: 112, economy: 7.28, ranking: { category: 'T20I Wickets', rank: 2 } },
      reason: '112 T20I wickets — left-arm pace, swings in the powerplay and dangerous at death',
      impact: 'high',
    },
    {
      name: 'Shadab Khan',
      role: 'All-rounder',
      stats: { runs: 476, wickets: 93, economy: 7.21 },
      reason: 'Leg-spin and valuable runs — 90+ wickets and crucial middle-overs control',
      impact: 'high',
    },
    {
      name: 'Fakhar Zaman',
      role: 'Batter',
      stats: { runs: 2076, strikeRate: 135.7 },
      reason: 'Explosive left-handed opener — big hundreds and match-winning knocks for Pakistan',
      impact: 'medium',
    },
    {
      name: 'Naseem Shah',
      role: 'Bowler',
      stats: { wickets: 52, economy: 7.47 },
      reason: 'Express pace — moves the ball both ways and generates extra bounce',
      impact: 'medium',
    },
  ],

  // ── NEW ZEALAND ───────────────────────────────────────────────────────────
  'New Zealand': [
    {
      name: 'Kane Williamson',
      role: 'Batter',
      isCapt: true,
      stats: { runs: 2271, strikeRate: 126.0 },
      reason: 'Experienced captain — calm under pressure, reads the game and builds partnerships',
      impact: 'high',
    },
    {
      name: 'Finn Allen',
      role: 'Batter',
      stats: { runs: 1165, strikeRate: 156.1 },
      reason: 'SR over 155 — most explosive opener in the NZ set-up, devastating in powerplay',
      impact: 'high',
    },
    {
      name: 'Trent Boult',
      role: 'Bowler',
      stats: { wickets: 69, economy: 7.88 },
      reason: 'Left-arm swing in powerplay — two-time T20 WC finalist who takes early wickets',
      impact: 'high',
    },
    {
      name: 'Glenn Phillips',
      role: 'WK-Batter',
      stats: { runs: 1288, strikeRate: 150.2, wickets: 5 },
      reason: 'Versatile middle-order batter and occasional off-spinner — brilliant under pressure',
      impact: 'medium',
    },
    {
      name: 'Mitchell Santner',
      role: 'All-rounder',
      stats: { runs: 450, wickets: 62, economy: 6.60 },
      reason: 'Left-arm spin is extremely economical — controls middle overs and contributes runs',
      impact: 'medium',
    },
    {
      name: 'Lockie Ferguson',
      role: 'Bowler',
      stats: { wickets: 74, economy: 7.81 },
      reason: '145+ km/h pace — New Zealand\'s fastest bowler and a wicket-taking threat',
      impact: 'medium',
    },
  ],

  // ── SRI LANKA ─────────────────────────────────────────────────────────────
  'Sri Lanka': [
    {
      name: 'Wanindu Hasaranga',
      role: 'All-rounder',
      stats: { runs: 382, wickets: 121, economy: 6.59, ranking: { category: 'T20I Wickets', rank: 1 } },
      reason: '#1 T20I wicket-taker — lethal leg-spin, 120+ wickets and crucial runs in death',
      impact: 'high',
    },
    {
      name: 'Kusal Mendis',
      role: 'WK-Batter',
      isKeeper: true,
      stats: { runs: 1985, strikeRate: 139.3 },
      reason: 'Sri Lanka\'s premier T20I batter — consistent opener with near 2000 T20I runs',
      impact: 'high',
    },
    {
      name: 'Pathum Nissanka',
      role: 'Batter',
      stats: { runs: 1272, strikeRate: 136.0 },
      reason: 'Elegant opener — builds big partnerships and excels in spin-heavy conditions',
      impact: 'medium',
    },
    {
      name: 'Maheesh Theekshana',
      role: 'Bowler',
      stats: { wickets: 81, economy: 6.71 },
      reason: 'Mystery spinner — difficult to read, takes wickets in the powerplay',
      impact: 'high',
    },
    {
      name: 'Dasun Shanaka',
      role: 'All-rounder',
      isCapt: true,
      stats: { runs: 836, wickets: 37, strikeRate: 138.9 },
      reason: 'Captain and middle-order hitter — provides the crucial finishing touch',
      impact: 'medium',
    },
    {
      name: 'Dhananjaya de Silva',
      role: 'All-rounder',
      stats: { runs: 721, wickets: 33, economy: 6.82 },
      reason: 'Right-arm off-spin and solid batting — key contribution in balanced conditions',
      impact: 'medium',
    },
  ],

  // ── BANGLADESH ────────────────────────────────────────────────────────────
  Bangladesh: [
    {
      name: 'Shakib Al Hasan',
      role: 'All-rounder',
      stats: { runs: 2418, wickets: 138, economy: 6.78, ranking: { category: 'T20I Wickets', rank: 2 } },
      reason: '138 T20I wickets + 2400 runs — Bangladesh\'s greatest cricketer and engine of the side',
      impact: 'high',
    },
    {
      name: 'Litton Das',
      role: 'WK-Batter',
      isKeeper: true,
      stats: { runs: 1541, strikeRate: 131.3 },
      reason: 'Bangladesh\'s most reliable T20I opener — consistent scorer who keeps well',
      impact: 'high',
    },
    {
      name: 'Mustafizur Rahman',
      role: 'Bowler',
      stats: { wickets: 120, economy: 7.21, ranking: { category: 'T20I Wickets', rank: 4 } },
      reason: '120+ wickets — the Fizz\'s cutters and offcutters are devastating on slow pitches',
      impact: 'high',
    },
    {
      name: 'Najmul Hossain Shanto',
      role: 'Batter',
      isCapt: true,
      stats: { runs: 972, strikeRate: 127.4 },
      reason: 'Captain and dependable opener — builds foundations for the middle-order to attack',
      impact: 'medium',
    },
    {
      name: 'Mehidy Hasan Miraz',
      role: 'All-rounder',
      stats: { runs: 316, wickets: 51, economy: 6.68 },
      reason: 'Off-spin and handy bat — controls the middle overs on turning pitches',
      impact: 'medium',
    },
    {
      name: 'Taskin Ahmed',
      role: 'Bowler',
      stats: { wickets: 82, economy: 7.97 },
      reason: 'Express pace — opens the bowling and creates early chances for Bangladesh',
      impact: 'medium',
    },
  ],

  // ── AFGHANISTAN ───────────────────────────────────────────────────────────
  Afghanistan: [
    {
      name: 'Rashid Khan',
      role: 'All-rounder',
      stats: { runs: 695, wickets: 157, economy: 6.29, ranking: { category: 'T20I Wickets', rank: 1 } },
      reason: 'All-time T20I bowling great — 157 wickets, near-impossible to bat against on good day',
      impact: 'high',
    },
    {
      name: 'Mohammad Nabi',
      role: 'All-rounder',
      isCapt: true,
      stats: { runs: 1985, wickets: 89, economy: 6.98 },
      reason: 'Captain and world-class veteran — 2000 runs + 89 wickets in T20Is, leads by example',
      impact: 'high',
    },
    {
      name: 'Fazalhaq Farooqi',
      role: 'Bowler',
      stats: { wickets: 78, economy: 7.57 },
      reason: 'Left-arm seam and swing — Afghanistan\'s best pace bowler in the powerplay',
      impact: 'high',
    },
    {
      name: 'Ibrahim Zadran',
      role: 'Batter',
      stats: { runs: 1297, strikeRate: 126.1 },
      reason: 'Anchor batter at the top — stabilizes Afghanistan\'s innings in pressure situations',
      impact: 'medium',
    },
    {
      name: 'Mujeeb Ur Rahman',
      role: 'Bowler',
      stats: { wickets: 100, economy: 6.24 },
      reason: 'Mysterious off-break — 100+ wickets, keeps batters guessing with variations',
      impact: 'high',
    },
    {
      name: 'Naveen-ul-Haq',
      role: 'Bowler',
      stats: { wickets: 48, economy: 8.09 },
      reason: 'Skillful pacer — tight in death overs, accurate in the powerplay',
      impact: 'medium',
    },
  ],

  // ── IRELAND ───────────────────────────────────────────────────────────────
  Ireland: [
    {
      name: 'Paul Stirling',
      role: 'Batter',
      stats: { runs: 3117, strikeRate: 131.9, ranking: { category: 'T20I Runs', rank: 6 } },
      reason: '3000+ T20I runs — one of Ireland\'s all-time greats and relentless opener',
      impact: 'high',
    },
    {
      name: 'Andrew Balbirnie',
      role: 'Batter',
      isCapt: true,
      stats: { runs: 2032, strikeRate: 128.3 },
      reason: 'Captain and experienced No. 3 — calm head in a chase, technically sound',
      impact: 'high',
    },
    {
      name: 'Josh Little',
      role: 'Bowler',
      stats: { wickets: 58, economy: 7.47 },
      reason: 'Ireland\'s best T20I bowler — left-arm swing, wickets in powerplay and death',
      impact: 'medium',
    },
    {
      name: 'Lorcan Tucker',
      role: 'WK-Batter',
      isKeeper: true,
      stats: { runs: 878, strikeRate: 130.4 },
      reason: 'Reliable keeper-batter — solid batting in the middle order for Ireland',
      impact: 'medium',
    },
    {
      name: 'Mark Adair',
      role: 'All-rounder',
      stats: { runs: 623, wickets: 50, economy: 8.14 },
      reason: 'Genuine match-winner — pace and lower-order runs make him Ireland\'s X-factor',
      impact: 'medium',
    },
  ],

  // ── ZIMBABWE ──────────────────────────────────────────────────────────────
  Zimbabwe: [
    {
      name: 'Sikandar Raza',
      role: 'All-rounder',
      isCapt: true,
      stats: { runs: 1694, wickets: 73, economy: 7.21 },
      reason: 'Zimbabwe\'s best player — off-spin, useful batting, brings all-round value',
      impact: 'high',
    },
    {
      name: 'Sean Williams',
      role: 'All-rounder',
      stats: { runs: 1318, wickets: 55, economy: 6.48 },
      reason: 'Left-arm spin and middle-order runs — crucial double threat for Zimbabwe',
      impact: 'medium',
    },
    {
      name: 'Regis Chakabva',
      role: 'WK-Batter',
      isKeeper: true,
      stats: { runs: 816, strikeRate: 130.4 },
      reason: 'Keeps wickets and contributes useful runs at the top of the order',
      impact: 'medium',
    },
    {
      name: 'Luke Jongwe',
      role: 'All-rounder',
      stats: { runs: 318, wickets: 42, economy: 8.32 },
      reason: 'Right-arm medium pace — wicket-taking ability and useful lower-order runs',
      impact: 'medium',
    },
    {
      name: 'Blessing Muzarabani',
      role: 'Bowler',
      stats: { wickets: 56, economy: 8.41 },
      reason: 'Zimbabwe\'s tallest bowler — extra bounce and pace trouble top-order batters',
      impact: 'medium',
    },
  ],

  // ── NETHERLANDS ───────────────────────────────────────────────────────────
  Netherlands: [
    {
      name: 'Scott Edwards',
      role: 'WK-Batter',
      isCapt: true,
      isKeeper: true,
      stats: { runs: 816, strikeRate: 124.1 },
      reason: 'Captain and anchor — leads Netherlands with calm batting and sharp keeping',
      impact: 'medium',
    },
    {
      name: 'Bas de Leede',
      role: 'All-rounder',
      stats: { runs: 712, wickets: 36, economy: 8.04 },
      reason: 'Netherlands\' best all-rounder — big innings and vital wickets in key moments',
      impact: 'high',
    },
    {
      name: 'Roelof van der Merwe',
      role: 'All-rounder',
      stats: { runs: 474, wickets: 53, economy: 6.56 },
      reason: 'Left-arm spin veteran — 53 wickets and economical under pressure',
      impact: 'medium',
    },
    {
      name: 'Logan van Beek',
      role: 'All-rounder',
      stats: { runs: 148, wickets: 32, economy: 7.93 },
      reason: 'Right-arm medium pace and handy bat — valuable all-round contributor',
      impact: 'medium',
    },
    {
      name: 'Max ODowd',
      role: 'Batter',
      stats: { runs: 1042, strikeRate: 121.3 },
      reason: 'Netherlands\' leading run scorer — technically sound at the top of the order',
      impact: 'medium',
    },
  ],

  // ── SCOTLAND ──────────────────────────────────────────────────────────────
  Scotland: [
    {
      name: 'Richie Berrington',
      role: 'Batter',
      isCapt: true,
      stats: { runs: 1742, strikeRate: 126.7 },
      reason: 'Captain and Scotland\'s leading batter — consistent performer who leads by example',
      impact: 'high',
    },
    {
      name: 'Matthew Cross',
      role: 'WK-Batter',
      isKeeper: true,
      stats: { runs: 1098, strikeRate: 118.4 },
      reason: 'Solid keeper-batter — Scotland\'s opening anchor and glue of the batting unit',
      impact: 'medium',
    },
    {
      name: 'Mark Watt',
      role: 'Bowler',
      stats: { wickets: 52, economy: 6.68 },
      reason: 'Left-arm spin — Scotland\'s best bowler, very economical in middle overs',
      impact: 'medium',
    },
    {
      name: 'Brad Wheal',
      role: 'Bowler',
      stats: { wickets: 46, economy: 7.51 },
      reason: 'Right-arm medium pace — key wicket-taker in powerplay for Scotland',
      impact: 'medium',
    },
    {
      name: 'George Munsey',
      role: 'Batter',
      stats: { runs: 1464, strikeRate: 141.0 },
      reason: 'SR of 141 — Scotland\'s most explosive opener, capable of match-winning starts',
      impact: 'medium',
    },
  ],

  // ── NAMIBIA ───────────────────────────────────────────────────────────────
  Namibia: [
    {
      name: 'Gerhard Erasmus',
      role: 'All-rounder',
      isCapt: true,
      stats: { runs: 836, wickets: 24, strikeRate: 124.2 },
      reason: 'Captain and Namibia\'s best batter — experienced leader with all-round contribution',
      impact: 'high',
    },
    {
      name: 'Jan Frylinck',
      role: 'All-rounder',
      stats: { runs: 418, wickets: 31, economy: 7.44 },
      reason: 'Left-arm pace and useful runs — Namibia\'s most impactful all-round player',
      impact: 'medium',
    },
    {
      name: 'Ruben Trumpelmann',
      role: 'Bowler',
      stats: { wickets: 38, economy: 7.82 },
      reason: 'Left-arm express pace — difficult to play in the powerplay, generates early wickets',
      impact: 'medium',
    },
    {
      name: 'David Wiese',
      role: 'All-rounder',
      stats: { runs: 512, wickets: 27, strikeRate: 142.0 },
      reason: 'Experienced IPL-level all-rounder — explosive in death and pace in final overs',
      impact: 'medium',
    },
    {
      name: 'JJ Smit',
      role: 'All-rounder',
      stats: { runs: 253, wickets: 27, economy: 8.13 },
      reason: 'Right-arm pace all-rounder — Namibia\'s game-changer in big tournaments',
      impact: 'medium',
    },
  ],

  // ── NEPAL ─────────────────────────────────────────────────────────────────
  Nepal: [
    {
      name: 'Sandeep Lamichhane',
      role: 'Bowler',
      stats: { wickets: 126, economy: 5.71, ranking: { category: 'T20I Wickets', rank: 3 } },
      reason: '126 T20I wickets — leg-spin with googly, one of the best spinners in Associate cricket',
      impact: 'high',
    },
    {
      name: 'Rohit Paudel',
      role: 'Batter',
      isCapt: true,
      stats: { runs: 926, strikeRate: 126.1 },
      reason: 'Captain and leading batter — young leader who holds Nepal\'s batting together',
      impact: 'high',
    },
    {
      name: 'Dipendra Singh Airee',
      role: 'All-rounder',
      stats: { runs: 849, wickets: 33, strikeRate: 145.8 },
      reason: 'Nepal\'s most explosive bat — fastest Associate T20I fifty and key all-rounder',
      impact: 'high',
    },
    {
      name: 'Kushal Bhurtel',
      role: 'Batter',
      stats: { runs: 776, strikeRate: 130.7 },
      reason: 'Right-handed top-order anchor — consistent performance for Nepal',
      impact: 'medium',
    },
    {
      name: 'Sompal Kami',
      role: 'Bowler',
      stats: { wickets: 61, economy: 7.38 },
      reason: 'Nepal\'s leading pace bowler — swings the ball and takes early wickets',
      impact: 'medium',
    },
  ],

  // ── UAE ───────────────────────────────────────────────────────────────────
  'United Arab Emirates': [
    {
      name: 'Muhammad Waseem',
      role: 'Batter',
      stats: { runs: 1042, strikeRate: 137.1 },
      reason: 'UAE\'s most consistent batter — strong opener with three T20I hundreds',
      impact: 'high',
    },
    {
      name: 'Chirag Suri',
      role: 'Batter',
      stats: { runs: 834, strikeRate: 132.7 },
      reason: 'Experienced opener — UAE\'s most reliable batsman at the top',
      impact: 'medium',
    },
    {
      name: 'CP Rizwaan',
      role: 'WK-Batter',
      isKeeper: true,
      stats: { runs: 689, strikeRate: 128.2 },
      reason: 'Wicketkeeper-batter who stabilizes the middle order for UAE',
      impact: 'medium',
    },
    {
      name: 'Karthik Meiyappan',
      role: 'All-rounder',
      stats: { runs: 228, wickets: 42, economy: 6.78 },
      reason: 'Off-spin all-rounder — UAE\'s key spinner in Associate cricket',
      impact: 'medium',
    },
    {
      name: 'Zahoor Khan',
      role: 'Bowler',
      stats: { wickets: 46, economy: 7.41 },
      reason: 'UAE\'s leading fast bowler — moves the ball and creates pressure',
      impact: 'medium',
    },
  ],

  // ── OMAN ──────────────────────────────────────────────────────────────────
  Oman: [
    {
      name: 'Zeeshan Maqsood',
      role: 'All-rounder',
      isCapt: true,
      stats: { runs: 1017, wickets: 57, economy: 6.93 },
      reason: 'Captain and Oman\'s best player — left-arm spin and reliable batting anchor',
      impact: 'high',
    },
    {
      name: 'Aqib Ilyas',
      role: 'Batter',
      stats: { runs: 816, strikeRate: 130.1 },
      reason: 'Oman\'s most consistent batter — reliable at the top of the order',
      impact: 'medium',
    },
    {
      name: 'Bilal Khan',
      role: 'Bowler',
      stats: { wickets: 63, economy: 6.99 },
      reason: 'Oman\'s top wicket-taker — left-arm pace is hard to score against',
      impact: 'medium',
    },
    {
      name: 'Kashyap Prajapati',
      role: 'Batter',
      stats: { runs: 724, strikeRate: 128.4 },
      reason: 'Dependable middle-order batter — important anchor in Oman\'s batting',
      impact: 'medium',
    },
    {
      name: 'Kaleemullah',
      role: 'Bowler',
      stats: { wickets: 44, economy: 7.21 },
      reason: 'Skilled pacer — difficult to score off and bowls key overs for Oman',
      impact: 'medium',
    },
  ],

  // ── CANADA ────────────────────────────────────────────────────────────────
  Canada: [
    {
      name: 'Aaron Johnson',
      role: 'All-rounder',
      stats: { runs: 584, wickets: 28, strikeRate: 135.6 },
      reason: 'Canada\'s best all-rounder — contributes with bat and ball at every stage',
      impact: 'high',
    },
    {
      name: 'Navneet Dhaliwal',
      role: 'Batter',
      isCapt: true,
      stats: { runs: 762, strikeRate: 133.8 },
      reason: 'Captain and opening batter — sets the tone for Canada\'s innings',
      impact: 'medium',
    },
    {
      name: 'Shreyas Movva',
      role: 'WK-Batter',
      isKeeper: true,
      stats: { runs: 648, strikeRate: 130.2 },
      reason: 'Keeper-batter who anchors Canada\'s middle order',
      impact: 'medium',
    },
    {
      name: 'Saad Bin Zafar',
      role: 'All-rounder',
      stats: { runs: 326, wickets: 32, economy: 7.62 },
      reason: 'Leg-spin all-rounder — Canada\'s spin weapon in the middle overs',
      impact: 'medium',
    },
    {
      name: 'Dilon Heyliger',
      role: 'All-rounder',
      stats: { runs: 412, wickets: 24, economy: 7.97 },
      reason: 'Right-arm pace all-rounder — energy in the field and key overs',
      impact: 'medium',
    },
  ],

  // ── PAPUA NEW GUINEA ──────────────────────────────────────────────────────
  'Papua New Guinea': [
    {
      name: 'Assad Vala',
      role: 'All-rounder',
      isCapt: true,
      stats: { runs: 1186, wickets: 42, economy: 6.81 },
      reason: 'Captain and PNG\'s leading all-rounder — off-spin and solid batting in the top 4',
      impact: 'high',
    },
    {
      name: 'Charles Amini',
      role: 'Batter',
      stats: { runs: 1048, strikeRate: 126.4 },
      reason: 'PNG\'s most consistent batter — has performed well against all opponents',
      impact: 'medium',
    },
    {
      name: 'Sese Bau',
      role: 'All-rounder',
      stats: { runs: 412, wickets: 37, economy: 7.44 },
      reason: 'Right-arm pace all-rounder — PNG\'s most dangerous bowler at pace',
      impact: 'medium',
    },
    {
      name: 'Norman Vanua',
      role: 'Bowler',
      stats: { wickets: 52, economy: 7.98 },
      reason: 'PNG\'s leading wicket-taker — right-arm pace with good control',
      impact: 'medium',
    },
    {
      name: 'Lega Siaka',
      role: 'Batter',
      stats: { runs: 724, strikeRate: 128.4 },
      reason: 'Opening batter who gives PNG good starts at the top of the order',
      impact: 'medium',
    },
  ],

  // ── UGANDA ────────────────────────────────────────────────────────────────
  Uganda: [
    {
      name: 'Brian Masaba',
      role: 'All-rounder',
      isCapt: true,
      stats: { runs: 418, wickets: 32, economy: 7.52 },
      reason: 'Captain and Uganda\'s star — right-arm medium pace and aggressive batting',
      impact: 'high',
    },
    {
      name: 'Roger Mukasa',
      role: 'Batter',
      stats: { runs: 636, strikeRate: 122.9 },
      reason: 'Uganda\'s most experienced batter — calm at the crease and builds partnerships',
      impact: 'medium',
    },
    {
      name: 'Riazat Ali Shah',
      role: 'All-rounder',
      stats: { runs: 724, wickets: 26, economy: 6.84 },
      reason: 'Left-arm spin and batting — Uganda\'s pivotal all-round performer',
      impact: 'medium',
    },
    {
      name: 'Frank Nsubuga',
      role: 'Bowler',
      stats: { wickets: 41, economy: 6.73 },
      reason: 'Left-arm orthodox spinner — Uganda\'s leading wicket-taker and match-winner',
      impact: 'medium',
    },
    {
      name: 'Alpesh Ramjani',
      role: 'All-rounder',
      stats: { runs: 348, wickets: 28, economy: 7.36 },
      reason: 'Off-spin all-rounder — key contributor in Uganda\'s bowling and batting',
      impact: 'medium',
    },
  ],
}

/**
 * Get top 3 key players for a team from the database.
 * Prioritises captain + one batter + one bowler for role diversity.
 */
export function getKeyPlayersForTeam(teamName: string): KnownPlayer[] {
  // Direct match
  if (PLAYER_DATABASE[teamName]) {
    return selectDiverseThree(PLAYER_DATABASE[teamName])
  }

  // Fuzzy match — e.g. "United Arab Emirates" / "UAE"
  const aliases: Record<string, string> = {
    UAE: 'United Arab Emirates',
    'U.A.E': 'United Arab Emirates',
    'U.A.E.': 'United Arab Emirates',
    'West Indies': 'West Indies',
    WI: 'West Indies',
    PNG: 'Papua New Guinea',
    'Papua New Guinea': 'Papua New Guinea',
    SA: 'South Africa',
    NZ: 'New Zealand',
    ENG: 'England',
    IND: 'India',
    AUS: 'Australia',
    PAK: 'Pakistan',
    SL: 'Sri Lanka',
    BAN: 'Bangladesh',
    AFG: 'Afghanistan',
    IRE: 'Ireland',
    ZIM: 'Zimbabwe',
    NED: 'Netherlands',
    SCO: 'Scotland',
    NAM: 'Namibia',
    NEP: 'Nepal',
    OMN: 'Oman',
    CAN: 'Canada',
    UGA: 'Uganda',
  }

  const resolved = aliases[teamName]
  if (resolved && PLAYER_DATABASE[resolved]) {
    return selectDiverseThree(PLAYER_DATABASE[resolved])
  }

  // Partial name match (case-insensitive)
  const lower = teamName.toLowerCase()
  for (const [key, players] of Object.entries(PLAYER_DATABASE)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return selectDiverseThree(players)
    }
  }

  return []
}

function selectDiverseThree(players: KnownPlayer[]): KnownPlayer[] {
  const result: KnownPlayer[] = []

  // 1. Captain first
  const capt = players.find(p => p.isCapt)
  if (capt) result.push(capt)

  // 2. Best bowler (not already picked)
  const bowler = players.find(
    p => !result.includes(p) && (p.role === 'Bowler' || (p.stats.wickets ?? 0) > 50)
  )
  if (bowler) result.push(bowler)

  // 3. Fill remaining from high-impact players
  for (const p of players) {
    if (result.length >= 3) break
    if (!result.includes(p) && p.impact === 'high') {
      result.push(p)
    }
  }

  // 4. Fall back to any remaining if still short
  for (const p of players) {
    if (result.length >= 3) break
    if (!result.includes(p)) result.push(p)
  }

  return result.slice(0, 3)
}
