import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { fetchFeaturedMatches, type MatchSummary } from '@/lib/api'
import { MatchCard } from '@/components/MatchCard'
import { Colors } from '@/constants/Colors'

export default function LiveMatchesScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['featured-matches'],
    queryFn: fetchFeaturedMatches,
    refetchInterval: 15_000, // auto-refresh every 15s
  })

  const allMatches: MatchSummary[] = data || []
  const live = allMatches.filter(m => m.status === 'live')
  const upcoming = allMatches.filter(m => m.status === 'upcoming')
  const completed = allMatches.filter(m => m.status === 'completed')

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.emerald} />
        <Text style={styles.loadingText}>Loading matches...</Text>
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Failed to load matches</Text>
        <Text style={styles.retryText} onPress={() => refetch()}>Tap to retry</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={[]}
      renderItem={null}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={Colors.emerald}
          colors={[Colors.emerald]}
        />
      }
      ListHeaderComponent={
        <>
          {live.length > 0 && (
            <Section title="🔴 Live Now" count={live.length}>
              {live.map(m => <MatchCard key={m.key} match={m} />)}
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title="🗓 Upcoming" count={upcoming.length}>
              {upcoming.map(m => <MatchCard key={m.key} match={m} />)}
            </Section>
          )}
          {completed.length > 0 && (
            <Section title="✅ Recent Results" count={completed.length}>
              {completed.map(m => <MatchCard key={m.key} match={m} />)}
            </Section>
          )}
          {allMatches.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏏</Text>
              <Text style={styles.emptyTitle}>No matches today</Text>
              <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
            </View>
          )}
        </>
      }
    />
  )
}

function Section({
  title, count, children,
}: {
  title: string; count: number; children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountText}>{count}</Text>
        </View>
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: 14 },
  errorIcon: { fontSize: 40 },
  errorText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  retryText: { color: Colors.emerald, fontSize: 14 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  sectionCount: {
    backgroundColor: Colors.emeraldBg,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountText: { color: Colors.emerald, fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: Colors.textMuted, fontSize: 14 },
})
