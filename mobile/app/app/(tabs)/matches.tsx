import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { fetchFeaturedMatches } from '@/lib/api'
import { MatchCard } from '@/components/MatchCard'
import { Colors } from '@/constants/Colors'

export default function MatchesScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['all-matches'],
    queryFn: fetchFeaturedMatches,
    refetchInterval: 30_000,
  })

  const matches = data || []

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.emerald} />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load matches</Text>
        <Text style={styles.retry} onPress={() => refetch()}>Retry</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={matches}
      keyExtractor={m => m.key}
      renderItem={({ item }) => <MatchCard match={item} />}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={Colors.emerald}
          colors={[Colors.emerald]}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>No matches scheduled</Text>
        </View>
      }
      ListHeaderComponent={
        <Text style={styles.header}>All Matches</Text>
      }
    />
  )
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, gap: 12 },
  header: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 16 },
  errorText: { color: Colors.textPrimary, fontSize: 15 },
  retry: { color: Colors.emerald, fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
})
