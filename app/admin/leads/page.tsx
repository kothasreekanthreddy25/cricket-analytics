import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { MessageCircle, Users, Calendar, Phone } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getLeads() {
  return prisma.predictionLead.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: { secret?: string }
}) {
  const secret = searchParams?.secret
  const adminSecret = process.env.ADMIN_SECRET || 'crickettips2026'

  if (secret !== adminSecret) {
    redirect(`/admin/leads?secret=${adminSecret}`)
  }

  const leads = await getLeads()
  const whatsappCount = leads.filter(l => l.whatsapp).length
  const telegramCount = leads.filter(l => l.telegram).length

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Prediction Leads
          </h1>
          <p className="text-gray-400 text-sm mt-1">All users who signed up for predictions via the popup</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-extrabold text-white">{leads.length}</p>
            <p className="text-gray-400 text-xs mt-1">Total Leads</p>
          </div>
          <div className="bg-gray-900 border border-green-500/20 rounded-xl p-4 text-center">
            <p className="text-3xl font-extrabold text-green-400">{whatsappCount}</p>
            <p className="text-gray-400 text-xs mt-1">WhatsApp</p>
          </div>
          <div className="bg-gray-900 border border-blue-500/20 rounded-xl p-4 text-center">
            <p className="text-3xl font-extrabold text-blue-400">{telegramCount}</p>
            <p className="text-gray-400 text-xs mt-1">Telegram</p>
          </div>
        </div>

        {/* Export hint */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-500 text-xs">{leads.length} total entries</p>
          <a
            href={`/api/leads/export?secret=${secret}`}
            className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            Export CSV →
          </a>
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Channel</th>
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-left px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-600">No leads yet</td>
                  </tr>
                )}
                {leads.map((lead, i) => {
                  const isWA = !!lead.whatsapp
                  const contact = isWA ? lead.whatsapp : `@${lead.telegram}`
                  const date = new Date(lead.createdAt).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
                  })
                  return (
                    <tr key={lead.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 text-gray-600 text-xs">{leads.length - i}</td>
                      <td className="px-4 py-3 text-white font-medium">{lead.name || <span className="text-gray-600">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isWA ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                          {isWA ? <Phone className="w-2.5 h-2.5" /> : <MessageCircle className="w-2.5 h-2.5" />}
                          {isWA ? 'WhatsApp' : 'Telegram'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-300">{contact}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {date} IST
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
