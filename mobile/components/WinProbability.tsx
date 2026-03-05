import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '@/constants/Colors'

interface Props {
  data: {
    teamA: { name: string; code: string; pct: number }
    teamB: { name: string; code: string; pct: number }
  } | null
  source: string
}

export function WinProbability({ data, source }: Props) {
  if (!data) {
    return (
      <View style={styles.unavailable}>
        <Text style={styles.unavailableText}>Win probability not available</Text>
      </View>
    )
  }

  const pctA = Math.max(1, Math.min(99, data.teamA.pct))
  const pctB = Math.max(1, Math.min(99, data.teamB.pct))

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WIN PROBABILITY</Text>
        <View style={[styles.sourceBadge, source === 'live' && styles.sourceLive]}>
          <Text style={styles.sourceText}>{source === 'live' ? '🔴 Live' : '📊 Pre-match'}</Text>
        </View>
      </View>

      {/* Percentages */}
      <View style={styles.row}>
        <View style={styles.teamBlock}>
          <Text style={styles.pct}>{pctA}%</Text>
          <Text style={styles.teamName} numberOfLines={1}>{data.teamA.name}</Text>
          <Text style={styles.teamCode}>{data.teamA.code}</Text>
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={[styles.teamBlock, styles.teamBlockRight]}>
          <Text style={[styles.pct, styles.pctRight]}>{pctB}%</Text>
          <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1}>{data.teamB.name}</Text>
          <Text style={[styles.teamCode, styles.teamNameRight]}>{data.teamB.code}</Text>
        </View>
      </View>

      {/* Bar */}
      <View style={styles.barContainer}>
        <View style={[styles.barA, { flex: pctA }]} />
        <View style={[styles.barB, { flex: pctB }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  sourceBadge: {
    backgroundColor: Colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceLive: { backgroundColor: Colors.liveBg },
  sourceText: { color: Colors.textSecondary, fontSize: 11 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamBlock: { flex: 1 },
  teamBlockRight: { alignItems: 'flex-end' },
  pct: { color: Colors.emerald, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pctRight: { textAlign: 'right' },
  teamName: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600', marginTop: 2 },
  teamNameRight: { textAlign: 'right' },
  teamCode: { color: Colors.textMuted, fontSize: 11 },
  vs: { color: Colors.textMuted, fontSize: 14, fontWeight: '700', paddingHorizontal: 12 },
  barContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
  barA: { backgroundColor: Colors.emerald, borderRadius: 4 },
  barB: { backgroundColor: Colors.four, borderRadius: 4 },
  unavailable: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unavailableText: { color: Colors.textMuted, fontSize: 13 },
})
