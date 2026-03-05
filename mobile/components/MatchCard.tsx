import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '@/constants/Colors'
import type { MatchSummary } from '@/lib/api'

interface Props {
  match: MatchSummary
}

export function MatchCard({ match }: Props) {
  const isLive = match.status === 'live'
  const isUpcoming = match.status === 'upcoming'

  function handlePress() {
    if (isLive) {
      router.push(`/live/${match.key}`)
    } else {
      router.push(`/match/${match.key}`)
    }
  }

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.75}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.badges}>
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          <Text style={styles.format}>{match.format || 'T20'}</Text>
          {match.tournament ? (
            <Text style={styles.tournament} numberOfLines={1}>{match.tournament}</Text>
          ) : null}
        </View>
        {match.venue ? (
          <Text style={styles.venue} numberOfLines={1}>📍 {match.venue}</Text>
        ) : null}
      </View>

      {/* Match title */}
      <Text style={styles.matchName} numberOfLines={1}>{match.shortName || match.name}</Text>

      {/* Scores */}
      <View style={styles.scores}>
        <ScoreRow
          team={match.teamA}
          code={match.teamACode}
          score={match.scoreA}
          isLive={isLive}
        />
        <Text style={styles.vs}>vs</Text>
        <ScoreRow
          team={match.teamB}
          code={match.teamBCode}
          score={match.scoreB}
          isLive={isLive}
          right
        />
      </View>

      {/* Status note */}
      {match.statusNote ? (
        <Text style={styles.statusNote} numberOfLines={1}>{match.statusNote}</Text>
      ) : isUpcoming && match.startAt ? (
        <Text style={styles.statusNote}>
          {new Date(match.startAt).toLocaleString('en-IN', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      ) : null}
    </TouchableOpacity>
  )
}

function ScoreRow({
  team, code, score, isLive, right,
}: {
  team: string; code: string; score: string | null; isLive: boolean; right?: boolean
}) {
  return (
    <View style={[styles.scoreRow, right && styles.scoreRowRight]}>
      <Text style={styles.teamCode}>{code || team.substring(0, 3).toUpperCase()}</Text>
      {score ? (
        <Text style={[styles.score, isLive && styles.scoreLive]}>{score}</Text>
      ) : (
        <Text style={styles.scoreEmpty}>—</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.liveBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.live,
  },
  liveText: { color: Colors.live, fontSize: 10, fontWeight: '700' },
  format: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: Colors.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tournament: { color: Colors.textMuted, fontSize: 11, flex: 1 },
  venue: { color: Colors.textMuted, fontSize: 11, maxWidth: 130 },
  matchName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  scores: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreRow: { flex: 1, alignItems: 'flex-start' },
  scoreRowRight: { alignItems: 'flex-end' },
  teamCode: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  score: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  scoreLive: { color: Colors.emerald },
  scoreEmpty: { color: Colors.textMuted, fontSize: 18 },
  vs: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', paddingHorizontal: 8 },
  statusNote: {
    color: Colors.textMuted,
    fontSize: 12,
    backgroundColor: Colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
})
