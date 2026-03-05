import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet } from 'react-native'
import { Colors } from '@/constants/Colors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,       // 10s — live data refreshes frequently
      gcTime: 60_000,
      retry: 2,
    },
  },
})

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={Colors.bg} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.bg },
            headerTintColor: Colors.textPrimary,
            headerTitleStyle: { fontWeight: '700', color: Colors.textPrimary },
            contentStyle: { backgroundColor: Colors.bg },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="live/[matchKey]"
            options={{
              title: 'Live Match',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="match/[matchKey]"
            options={{
              title: 'Match Details',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="tournament/[key]"
            options={{
              title: 'Tournament',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="news/[slug]"
            options={{
              title: 'Article',
              headerBackTitle: 'News',
            }}
          />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
