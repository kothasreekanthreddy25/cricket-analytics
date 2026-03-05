import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fetchBlogPost } from '@/lib/api'
import { Colors } from '@/constants/Colors'

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => fetchBlogPost(slug),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.emerald} />
      </View>
    )
  }

  if (isError || !post) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load article</Text>
      </View>
    )
  }

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {post.mainImage && (
        <Image source={{ uri: post.mainImage }} style={styles.hero} />
      )}

      {/* Categories */}
      {post.categories && post.categories.length > 0 && (
        <View style={styles.categories}>
          {post.categories.map((cat: string) => (
            <View key={cat} style={styles.catBadge}>
              <Text style={styles.catText}>{cat}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.title}>{post.title}</Text>

      <View style={styles.meta}>
        {post.author && <Text style={styles.author}>✍️ {post.author}</Text>}
        <Text style={styles.date}>{date}</Text>
      </View>

      {/* Article body — render plain text excerpt or full body */}
      {post.excerpt && (
        <Text style={styles.excerpt}>{post.excerpt}</Text>
      )}
      {post.body && typeof post.body === 'string' && (
        <Text style={styles.body}>{post.body}</Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  hero: { width: '100%', height: 220, resizeMode: 'cover' },
  categories: { flexDirection: 'row', gap: 6, padding: 16, paddingBottom: 0 },
  catBadge: { backgroundColor: Colors.emeraldBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catText: { color: Colors.emerald, fontSize: 11, fontWeight: '700' },
  title: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', lineHeight: 30, padding: 16, paddingBottom: 10 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 },
  author: { color: Colors.textMuted, fontSize: 12 },
  date: { color: Colors.textMuted, fontSize: 12 },
  excerpt: { color: Colors.textSecondary, fontSize: 15, lineHeight: 24, paddingHorizontal: 16, marginBottom: 16, fontStyle: 'italic' },
  body: { color: Colors.textPrimary, fontSize: 15, lineHeight: 26, paddingHorizontal: 16 },
  errorText: { color: Colors.textPrimary, fontSize: 15 },
})
