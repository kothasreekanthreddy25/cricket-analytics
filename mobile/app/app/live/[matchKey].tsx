import { useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fetchLiveMatch } from '@/lib/api'
import { WinProbability } from '@/components/WinProbability'
import { BallByBall } from '@/components/BallByBall'
import { Colors } from '@/constants/Colors'

export default function LiveMatchScreen() {
  const { matchKey } = useLocalSearchParams<{ matchKey: string }>()
  const navigation = useNavigation()

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['live-match', matchKey],
    queryFn: () => fetchLiveMatch(matchKey),
    refetchInterval: 10_000,
    enabled: !!matchKey,
  })

  // Update nav title with match name
  useEffect(() => {
    if (data?.match?.shortName) {
      navigation.setOptions({ title: data.match.shortName })
    }
  }, [data?.match?.shortName, navigation])

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.emerald} />
        <Text style={styles.loadingText}>Loading match...</Text>
      </View>
    )
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Failed to load match data</Text>
      </View>
    )
  }

  const { match, currentPlayers, ballByBall, probability } = data
  const isLive = match.status === 'started' || match.status === 'live' || match.playStatus === 'in_play'

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.emerald} colors={[Colors.emerald]} />
      }
    >
      {/* Status bar */}
      <View style={styles.statusBar}>
        {isLive ? (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : null}
        <Text style={styles.format}>{match.format}</Text>
        {match.venue && (
          <Text style={styles.venue} numberOfLines={1}>📍 {match.venue.city || match.venue.name}</Text>
        )}
      </View>

      {/* Scoreboard */}
      <View style={styles.scoreboard}>
        {match.innings.map((inn) => {
          const teamSide = inn.teamSide === 'a' ? match.teams.a : match.teams.b
          return (
            <View key={inn.key} style={styles.inningsRow}>
              <Text style={styles.teamName}>{teamSide?.name || inn.battingTeam}</Text>
              <Text style={styles.scoreStr}>{inn.scoreStr || '—'}</Text>
            </View>
          )
        })}
        {match.statusNote ? (
          <View style={styles.statusNote}>
            <Text style={styles.statusNoteText}>{match.statusNote}</Text>
          </View>
        ) : null}
      </View>

      {/* Current Players */}
      {isLive && currentPlayers.striker && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>AT THE CREASE</Text>
          <View style={styles.playersGrid}>
            <PlayerStat
              label="Striker"
              name={currentPlayers.striker.name}
              stats={`${currentPlayers.striker.runs ?? 0}(${currentPlayers.striker.balls ?? 0})`}
              highlight
            />
            {currentPlayers.nonStriker && (
              <PlayerStat
                label="Non-striker"
                name={currentPlayers.nonStriker.name}
                stats=""
              />
            )}
            {currentPlayers.bowler && (
              <PlayerStat
                label="Bowler"
                name={currentPlayers.bowler.name}
                stats={`${currentPlayers.bowler.wickets ?? 0}/${currentPlayers.bowler.runs ?? 0} (${currentPlayers.bowler.overs ?? '0'})`}
              />
            )}
          </View>
        </View>
      )}

      {/* Win Probability */}
      <WinProbability data={probability.data} source={probability.source} />

      {/* Ball-by-Ball */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>BALL-BY-BALL</Text>
          {ballByBall.length > 0 && (
            <Text style={styles.sectionCount}>{ballByBall.length} deliveries</Text>
          )}
        </View>
        <BallByBall balls={ballByBall} />
      </View>
    </ScrollView>
  )
}

function PlayerStat({
  label, name, stats, highlight,
}: {
  label: string; name: string; stats: string; highlight?: boolean
}) {
  return (
    <View style={styles.playerStat}>
      <Text style={styles.playerLabel}>{label}</Text>
      <Text style={[styles.playerName, highlight && styles.playerNameHighlight]}>{name}</Text>
      {stats ? <Text style={styles.playerStats}>{stats}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: 14 },
  errorIcon: { fontSize: 40 },
  errorText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },

  // Status bar
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.liveBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.live },
  liveText: { color: Colors.live, fontSize: 11, fontWeight: '800' },
  format: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  venue: { color: Colors.textMuted, fontSize: 11, flex: 1 },

  // Scoreboard
  scoreboard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  inningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: { color: Colors.emerald, fontSize: 15, fontWeight: '700', flex: 1 },
  scoreStr: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statusNote: {
    backgroundColor: Colors.bg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusNoteText: { color: Colors.textMuted, fontSize: 12 },

  // Cards
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionCount: { color: Colors.textMuted, fontSize: 11 },

  // Current players
  playersGrid: { flexDirection: 'row', gap: 8 },
  playerStat: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: 10,
    padding: 10,
  },
  playerLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', marginBottom: 4 },
  playerName: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  playerNameHighlight: { color: Colors.emerald },
  playerStats: { color: Colors.textSecondary, fontSize: 12, fontVariant: ['tabular-nums'] },
})
