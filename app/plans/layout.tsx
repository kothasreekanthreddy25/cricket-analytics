import Link from 'next/link'
import { Shield, Home, TrendingUp, Star } from 'lucide-react'

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top nav */}
      <nav className="bg-gray-950 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-extrabold text-white text-sm">
              CricketTips<span className="text-emerald-400">.ai</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/plans/free" className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" /> Free
            </Link>
            <Link href="/plans/pro" className="text-xs text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Pro
            </Link>
            <Link href="/plans/elite" className="text-xs text-yellow-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" /> Elite
            </Link>
            <Link href="/pricing" className="ml-2 text-xs bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
              Upgrade
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
