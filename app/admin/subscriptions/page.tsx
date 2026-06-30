import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CreditCard, Users, TrendingUp, Calendar } from 'lucide-react'
import AdminLogout from '../leads/AdminLogout'

export const dynamic = 'force-dynamic'

const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'crickettips2026'

async function requireAuth() {
  const cookieStore = cookies()
  const session = cookieStore.get('ct_admin_session')
  if (!session || session.value !== ADMIN_PASS) redirect('/admin/login')
}

const PLAN_AMOUNTS: Record<string, number> = { pro: 29900, elite: 69900 }

export default async function AdminSubscriptionsPage() {
  await requireAuth()

  const subs = await prisma.subscription.findMany({ orderBy: { createdAt: 'desc' } })

  const paid = subs.filter(s => s.status === 'paid')
  const totalRevenue = paid.reduce((acc, s) => acc + s.amount, 0) / 100
  const todayCount = paid.filter(s => {
    const d = new Date(s.createdAt)
    return d.toDateString() === new Date().toDateString()
  }).length

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-emerald-400" />
              Subscriptions
            </h1>
            <p className="text-gray-500 text-sm mt-1">Razorpay payment records</p>
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Orders', value: subs.length, color: 'text-white', border: 'border-gray-800' },
            { label: 'Paid', value: paid.length, color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Today Paid', value: todayCount, color: 'text-blue-400', border: 'border-blue-500/20' },
            { label: 'Revenue (₹)', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: 'text-yellow-400', border: 'border-yellow-500/20' },
          ].map(s => (
            <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-4 text-center`}>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-800">
            <p className="text-sm font-bold text-white">{subs.length} orders</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Plan</th>
                  <th className="text-left px-5 py-3">Amount</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Order ID</th>
                  <th className="text-left px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {subs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-600">No orders yet</td>
                  </tr>
                )}
                {subs.map(s => {
                  const date = new Date(s.createdAt).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
                  })
                  const statusColor = s.status === 'paid'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : s.status === 'failed'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-gray-800 text-gray-400 border-gray-700'

                  return (
                    <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3.5 text-white font-semibold">
                        {s.name || <span className="text-gray-600 font-normal">—</span>}
                        {s.email && <div className="text-xs text-gray-500">{s.email}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded-full ${s.plan === 'elite' ? 'text-yellow-400 bg-yellow-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                          {s.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-white font-mono">
                        ₹{(s.amount / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${statusColor}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{s.razorpayOrderId}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          {date}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
