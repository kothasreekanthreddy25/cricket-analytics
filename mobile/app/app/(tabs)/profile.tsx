import { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSession, signIn, signOut } from '@/lib/api'
import { Colors } from '@/constants/Colors'

export default function ProfileScreen() {
  const qc = useQueryClient()

  const { data: session, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: getSession,
    staleTime: 30_000,
  })

  const user = session?.user

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.emerald} />
      </View>
    )
  }

  if (user) {
    return <LoggedIn user={user} onSignOut={() => qc.invalidateQueries({ queryKey: ['session'] })} />
  }

  return <LoginForm onSuccess={() => qc.invalidateQueries({ queryKey: ['session'] })} />
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () => signIn(email, password),
    onSuccess,
    onError: () => Alert.alert('Login failed', 'Check your email and password.'),
  })

  return (
    <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.loginContent}>
        <Text style={styles.logo}>🏏</Text>
        <Text style={styles.loginTitle}>Sign in to CricketTips</Text>
        <Text style={styles.loginSubtitle}>Access tips, predictions and more</Text>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
            />
          </View>

          {isError && (
            <Text style={styles.errorText}>Invalid email or password. Please try again.</Text>
          )}

          <TouchableOpacity
            style={[styles.btn, isPending && styles.btnDisabled]}
            onPress={() => mutate()}
            disabled={isPending || !email || !password}
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator color={Colors.bg} size="small" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function LoggedIn({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const { mutate, isPending } = useMutation({
    mutationFn: signOut,
    onSuccess: onSignOut,
  })

  const roleColor = user.role === 'ADMIN' ? Colors.live
    : user.role === 'TIPSTER' ? Colors.upcoming
    : Colors.emerald

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.profileContent}>
      {/* Avatar */}
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{(user.name || user.email || 'U')[0].toUpperCase()}</Text>
      </View>

      <Text style={styles.userName}>{user.name || 'Cricket Fan'}</Text>
      <Text style={styles.userEmail}>{user.email}</Text>

      <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
        <Text style={[styles.roleText, { color: roleColor }]}>{user.role || 'USER'}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="Tips" value="—" />
        <StatBox label="Accuracy" value="—" />
        <StatBox label="Points" value="—" />
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={() => mutate()}
        disabled={isPending}
        activeOpacity={0.8}
      >
        {isPending ? (
          <ActivityIndicator color={Colors.live} size="small" />
        ) : (
          <Text style={styles.signOutText}>Sign Out</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  kav: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1, backgroundColor: Colors.bg },

  // Login
  loginContent: { flexGrow: 1, padding: 28, justifyContent: 'center', gap: 8 },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  loginTitle: { color: Colors.textPrimary, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  loginSubtitle: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  form: { gap: 16 },
  inputWrapper: { gap: 6 },
  inputLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  errorText: { color: Colors.live, fontSize: 13 },
  btn: {
    backgroundColor: Colors.emerald,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },

  // Profile
  profileContent: { padding: 28, alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.emeraldBg,
    borderWidth: 2,
    borderColor: Colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { color: Colors.emerald, fontSize: 32, fontWeight: '800' },
  userName: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  userEmail: { color: Colors.textMuted, fontSize: 14 },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  roleText: { fontSize: 12, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  signOutBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.live,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: Colors.live, fontSize: 15, fontWeight: '600' },
})
