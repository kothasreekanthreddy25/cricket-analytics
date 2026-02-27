'use client'

import { useEffect } from 'react'
import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'

export default function SignOutPage() {
  const router = useRouter()

  useEffect(() => {
    async function handleSignOut() {
      await signOut()
      router.push('/auth/signin')
    }
    handleSignOut()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Trophy className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Signing you out...</h2>
        <p className="text-gray-600">Please wait</p>
      </div>
    </div>
  )
}
