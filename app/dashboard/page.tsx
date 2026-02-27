import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-helpers'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Redirect based on user role
  if (user.role === 'ADMIN') {
    redirect('/dashboard/admin')
  } else if (user.role === 'TIPSTER') {
    redirect('/dashboard/tipster')
  } else {
    redirect('/dashboard/user')
  }
}
