import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MessageCircle, Users, Calendar, Phone, Download, LogOut } from 'lucide-react'
import AdminLogout from './AdminLogout'

export const dynamic = 'force-dynamic'

const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'crickettips2026'

async function requireAuth() {
  const cookieStore = cookies()
  const session = cookieStore.get('ct_admin_session')
  if (!session || session.value !== ADMIN_PASS) {
    redirect('/admin/login')
  }
}

async function getLeads() {
  return prisma.predictionLead.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export default async function AdminLeadsPage() {
  await requireAuth()
  const leads = await getLeads()

  const whatsappCount = leads.filter(l => l.whatsapp).length
  const telegramCount = leads.filter(l => l.telegram).length

  const todayCount = leads.filter(l => {
    const d = new Date(l.createdAt)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" />
              Leads Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">Users who signed up for AI predictions</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/subscriptions"
              className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 hover:border-yellow-500/60 px-3 py-2 rounded-xl transition-colors"
            >
              Subscriptions
            </a>
            <a
              href="/admin/squads"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 px-3 py-2 rounded-xl transition-colors"
            >
              Squads
            </a>
            <a
              href="/api/leads/export"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 px-3 py-2 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </a>
            <AdminLogout />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Leads', value: leads.length, color: 'text-white', border: 'border-gray-800' },
            { label: 'Today', value: todayCount, color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'WhatsApp', value: whatsappCount, color: 'text-green-400', border: 'border-green-500/20' },
            { label: 'Telegram', value: telegramCount, color: 'text-blue-400', border: 'border-blue-500/20' },
          ].map(s => (
            <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-4 text-center`}>
              <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
            <p className="text-sm font-bold text-white">{leads.length} registrations</p>
            <p className="text-xs text-gray-500">Newest first · IST timezone</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">#</th>
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Channel</th>
                  <th className="text-left px-5 py-3">Contact</th>
                  <th className="text-left px-5 py-3">Registered</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-gray-600">
                      No leads yet — share your site to get signups!
                    </td>
                  </tr>
                )}
                {leads.map((lead, i) => {
                  const isWA = !!lead.whatsapp
                  const contact = isWA ? lead.whatsapp! : `@${lead.telegram}`
                  const date = new Date(lead.createdAt).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
                  })
                  return (
                    <tr key={lead.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3.5 text-gray-600 text-xs">{leads.length - i}</td>
                      <td className="px-5 py-3.5 text-white font-semibold">
                        {lead.name || <span className="text-gray-600 font-normal">Anonymous</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${isWA ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                          {isWA ? <Phone className="w-2.5 h-2.5" /> : <MessageCircle className="w-2.5 h-2.5" />}
                          {isWA ? 'WhatsApp' : 'Telegram'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-sm text-gray-200">{contact}</td>
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
