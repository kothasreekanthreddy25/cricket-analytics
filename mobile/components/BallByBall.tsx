import { View, Text, StyleSheet, FlatList } from 'react-native'
import { Colors } from '@/constants/Colors'
import type { BallEvent } from '@/lib/api'

interface Props {
  balls: BallEvent[]
}

export function BallByBall({ balls }: Props) {
  if (balls.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Ball-by-ball commentary will appear here once play begins.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={balls}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item }) => <BallRow ball={item} />}
      scrollEnabled={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  )
}

function BallRow({ ball }: { ball: BallEvent }) {
  const cardStyle = ball.isWicket
    ? styles.cardWicket
    : ball.isSix
    ? styles.cardSix
    : ball.isFour
    ? styles.cardFour
    : styles.card

  return (
    <View style={[styles.row, cardStyle]}>
      {/* Over.Ball badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{ball.over}.{ball.ball}</Text>
      </View>

      {/* Event icon */}
      <View style={styles.icon}>
        {ball.isWicket ? (
          <Text style={[styles.iconText, { color: Colors.wicket }]}>W</Text>
        ) : ball.isSix ? (
          <Text style={[styles.iconText, { color: Colors.six }]}>6</Text>
        ) : ball.isFour ? (
          <Text style={[styles.iconText, { color: Colors.four }]}>4</Text>
        ) : ball.runs > 0 ? (
          <Text style={[styles.iconText, { color: Colors.emerald }]}>{ball.runs}</Text>
        ) : (
          <Text style={[styles.iconText, { color: Colors.textMuted }]}>•</Text>
        )}
      </View>

      {/* Commentary */}
      <View style={styles.content}>
        <View style={styles.players}>
          <Text style={styles.bowler}>{ball.bowler}</Text>
          <Text style={styles.arrow}> → </Text>
          <Text style={styles.batsman}>{ball.batsman}</Text>
          {ball.isWicket && (
            <View style={styles.wicketBadge}>
              <Text style={styles.wicketBadgeText}>{ball.wicketType || 'OUT'}</Text>
            </View>
          )}
          {ball.isSix && (
            <View style={styles.sixBadge}>
              <Text style={styles.sixBadgeText}>SIX!</Text>
            </View>
          )}
          {ball.isFour && (
            <View style={styles.fourBadge}>
              <Text style={styles.fourBadgeText}>FOUR!</Text>
            </View>
          )}
        </View>
        {ball.commentary ? (
          <Text style={styles.commentary} numberOfLines={2}>{ball.commentary}</Text>
        ) : null}
        {ball.isWicket && ball.dismissedPlayer ? (
          <Text style={styles.dismissed}>{ball.dismissedPlayer} dismissed — {ball.wicketType}</Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { padding: 16, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
  separator: { height: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  card: { backgroundColor: 'rgba(30,41,59,0.6)' },
  cardWicket: { backgroundColor: Colors.wicketBg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  cardSix: { backgroundColor: Colors.sixBg, borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)' },
  cardFour: { backgroundColor: Colors.fourBg, borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)' },
  badge: {
    minWidth: 40,
    backgroundColor: 'rgba(100,116,139,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
  },
  badgeText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  icon: { width: 18, alignItems: 'center', paddingTop: 1 },
  iconText: { fontSize: 13, fontWeight: '800' },
  content: { flex: 1 },
  players: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 },
  bowler: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  arrow: { color: Colors.textMuted, fontSize: 12 },
  batsman: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700' },
  wicketBadge: {
    backgroundColor: Colors.wicketBg,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  wicketBadgeText: { color: Colors.wicket, fontSize: 9, fontWeight: '800' },
  sixBadge: {
    backgroundColor: Colors.sixBg,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sixBadgeText: { color: Colors.six, fontSize: 9, fontWeight: '800' },
  fourBadge: {
    backgroundColor: Colors.fourBg,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fourBadgeText: { color: Colors.four, fontSize: 9, fontWeight: '800' },
  commentary: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  dismissed: { color: 'rgba(239,68,68,0.7)', fontSize: 11, marginTop: 2 },
})
