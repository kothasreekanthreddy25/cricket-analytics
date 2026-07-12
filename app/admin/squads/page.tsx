import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Users2 } from 'lucide-react'
import AdminLogout from '../leads/AdminLogout'
import SquadsManager from './SquadsManager'

export const dynamic = 'force-dynamic'

const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'crickettips2026'

async function requireAuth() {
  const cookieStore = cookies()
  const session = cookieStore.get('ct_admin_session')
  if (!session || session.value !== ADMIN_PASS) redirect('/admin/login')
}

export default async function AdminSquadsPage() {
  await requireAuth()

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Users2 className="w-6 h-6 text-emerald-400" />
              Tournaments &amp; Squads
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manually-curated squads take priority over SportMonks&apos; auto-detected lineups in predictions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/leads"
              className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-xl transition-colors"
            >
              Leads
            </a>
            <AdminLogout />
          </div>
        </div>

        <SquadsManager />
      </div>
    </div>
  )
}
