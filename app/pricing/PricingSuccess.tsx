'use client'

import { CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PricingSuccess() {
  const router = useRouter()

  return (
    <div className="mb-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 flex items-center gap-4">
      <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
      <div>
        <h3 className="font-bold text-white">Payment Successful!</h3>
        <p className="text-gray-400 text-sm mt-0.5">
          Welcome to CricketTips AI. Your subscription is now active. We will contact you on WhatsApp/Telegram shortly.
        </p>
      </div>
      <button
        onClick={() => router.replace('/pricing')}
        className="ml-auto text-gray-500 hover:text-gray-300 text-xs"
      >
        Dismiss
      </button>
    </div>
  )
}
