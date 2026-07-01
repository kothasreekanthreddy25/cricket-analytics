'use client'

import { useState, useEffect } from 'react'

export interface SessionUser {
  userId: string
  email: string
  name: string | null
  plan: string
  role: string
}

// Hook — drop-in replacement for better-auth's useSession
export function useSession() {
  const [data, setData] = useState<{ user: SessionUser | null } | null>(null)
  const [isPending, setIsPending] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { setData(d); setIsPending(false) })
      .catch(() => { setData({ user: null }); setIsPending(false) })
  }, [])

  return { data, isPending }
}

// signIn — call login API, return error or redirect hint
export const signIn = {
  email: async ({ email, password }: { email: string; password: string }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) return { error: { message: data.error } }
    return { data }
  },
}

// signUp — call register API
export const signUp = {
  email: async (fields: { email: string; password: string; name: string; phone?: string }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    const data = await res.json()
    if (!res.ok) return { error: { message: data.error } }
    return { data }
  },
}

// signOut — clear session cookie
export async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/auth/signin'
}
