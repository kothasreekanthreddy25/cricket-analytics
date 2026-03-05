import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fetchBlogPosts, type BlogPost } from '@/lib/api'
import { Colors } from '@/constants/Colors'

export default function NewsScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: () => fetchBlogPosts(1),
    staleTime: 60_000,
  })

  const posts = data || []

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
        <Text style={styles.errorText}>Failed to load news</Text>
        <Text style={styles.retry} onPress={() => refetch()}>Retry</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={posts}
      keyExtractor={p => p._id}
      renderItem={({ item, index }) => (
        <NewsCard post={item} featured={index === 0} />
      )}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.emerald} colors={[Colors.emerald]} />
      }
      ListHeaderComponent={
        <Text style={styles.header}>Cricket News</Text>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📰</Text>
          <Text style={styles.emptyText}>No articles yet</Text>
        </View>
      }
    />
  )
}

function NewsCard({ post, featured }: { post: BlogPost; featured?: boolean }) {
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <TouchableOpacity
      style={[styles.card, featured && styles.cardFeatured]}
      onPress={() => router.push(`/news/${post.slug}`)}
      activeOpacity={0.75}
    >
      {post.mainImage && (
        <Image source={{ uri: post.mainImage }} style={[styles.image, featured && styles.imageFeatured]} />
      )}
      <View style={styles.body}>
        {post.categories && post.categories.length > 0 && (
          <View style={styles.categories}>
            {post.categories.slice(0, 2).map(cat => (
              <View key={cat} style={styles.catBadge}>
                <Text style={styles.catText}>{cat}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={[styles.title, featured && styles.titleFeatured]} numberOfLines={featured ? 3 : 2}>
          {post.title}
        </Text>
        {post.excerpt && !featured && (
          <Text style={styles.excerpt} numberOfLines={2}>{post.excerpt}</Text>
        )}
        {post.excerpt && featured && (
          <Text style={styles.excerpt} numberOfLines={3}>{post.excerpt}</Text>
        )}
        <View style={styles.meta}>
          {post.author && <Text style={styles.author}>✍️ {post.author}</Text>}
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, gap: 12 },
  header: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardFeatured: { borderColor: Colors.emerald + '40' },
  image: { width: '100%', height: 160, resizeMode: 'cover' },
  imageFeatured: { height: 200 },
  body: { padding: 14 },
  categories: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  catBadge: {
    backgroundColor: Colors.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catText: { color: Colors.emerald, fontSize: 10, fontWeight: '700' },
  title: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', lineHeight: 22, marginBottom: 6 },
  titleFeatured: { fontSize: 18, lineHeight: 26 },
  excerpt: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  author: { color: Colors.textMuted, fontSize: 11 },
  date: { color: Colors.textMuted, fontSize: 11 },
  errorText: { color: Colors.textPrimary, fontSize: 15 },
  retry: { color: Colors.emerald, fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
})
