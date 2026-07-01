import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default function PlansIndex() {
  const cookieStore = cookies()
  const plan = cookieStore.get('ct_plan')?.value

  if (plan === 'elite') redirect('/plans/elite')
  if (plan === 'pro') redirect('/plans/pro')
  redirect('/plans/free')
}
