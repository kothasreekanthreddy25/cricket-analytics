import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fetchFeaturedMatches, type MatchSummary } from '@/lib/api'
import { Colors } from '@/constants/Colors'

export default function PredictionsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['predictions-matches'],
    queryFn: fetchFeaturedMatches,
    refetchInterval: 30_000,
  })

  const matches = (data || []).filter(m => m.status === 'live' || m.status === 'upcoming')

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={matches}
      keyExtractor={m => m.key}
      renderItem={({ item }) => <PredictionCard match={item} />}
      refreshControl={
        <RefreshControl refreshing={isRefetching || isLoading} onRefresh={refetch} tintColor={Colors.emerald} colors={[Colors.emerald]} />
      }
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <Text style={styles.header}>AI Predictions</Text>
          <Text style={styles.subtitle}>Win probability powered by Roanuz live odds</Text>
        </View>
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyText}>No upcoming matches to predict</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.emerald} />
          </View>
        )
      }
    />
  )
}

function PredictionCard({ match }: { match: MatchSummary }) {
  const isLive = match.status === 'live'

  function handlePress() {
    router.push(`/live/${match.key}`)
  }

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.75}>
      {/* Header */}
      <View style={styles.cardHeader}>
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        <Text style={styles.format}>{match.format}</Text>
        <Text style={styles.tournament} numberOfLines={1}>{match.tournament}</Text>
      </View>

      <Text style={styles.matchName} numberOfLines={1}>{match.shortName || match.name}</Text>

      {/* Team matchup */}
      <View style={styles.matchup}>
        <View style={styles.teamBlock}>
          <Text style={styles.teamCode}>{match.teamACode}</Text>
          <Text style={styles.teamName}>{match.teamA}</Text>
          {match.scoreA && <Text style={styles.score}>{match.scoreA}</Text>}
        </View>
        <View style={styles.vsBlock}>
          <Text style={styles.vs}>VS</Text>
        </View>
        <View style={[styles.teamBlock, styles.teamBlockRight]}>
          <Text style={[styles.teamCode, { textAlign: 'right' }]}>{match.teamBCode}</Text>
          <Text style={[styles.teamName, { textAlign: 'right' }]}>{match.teamB}</Text>
          {match.scoreB && <Text style={[styles.score, { textAlign: 'right' }]}>{match.scoreB}</Text>}
        </View>
      </View>

      <Text style={styles.viewMore}>View Live Probability →</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  center: { padding: 40, alignItems: 'center' },
  headerBlock: { marginBottom: 20 },
  header: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: Colors.textMuted, fontSize: 13 },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.liveBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.live },
  liveText: { color: Colors.live, fontSize: 10, fontWeight: '700' },
  format: {
    color: Colors.textMuted,
    fontSize: 11,
    backgroundColor: Colors.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tournament: { color: Colors.textMuted, fontSize: 11, flex: 1 },
  matchName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 14 },
  matchup: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  teamBlock: { flex: 1 },
  teamBlockRight: { alignItems: 'flex-end' },
  vsBlock: { paddingHorizontal: 12 },
  vs: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  teamCode: { color: Colors.emerald, fontSize: 20, fontWeight: '800' },
  teamName: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  score: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 4 },
  viewMore: { color: Colors.emerald, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
})
