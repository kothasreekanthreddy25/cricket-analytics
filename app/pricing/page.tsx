import { CheckCircle2, Zap, Trophy, Sparkles } from 'lucide-react'
import RazorpayCheckout from '@/components/RazorpayCheckout'
import { Suspense } from 'react'
import PricingSuccess from './PricingSuccess'

export const metadata = {
  title: 'Pricing — CricketTips AI',
  description: 'Choose your CricketTips AI plan and get accurate cricket match predictions.',
}

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '₹0',
    period: 'forever',
    icon: Zap,
    color: 'text-gray-400',
    border: 'border-gray-800',
    highlight: false,
    features: [
      '3 AI predictions per week',
      'Basic win probability',
      'Match analysis cards',
      'No WhatsApp tips',
    ],
    cta: 'Current Plan',
    ctaDisabled: true,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '₹299',
    period: '/month',
    icon: Trophy,
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    highlight: true,
    features: [
      'Unlimited AI predictions',
      'Live win probability updates',
      'Advanced match analysis',
      'WhatsApp + Telegram tips',
      'Early access to predictions',
      'Priority support',
    ],
    cta: 'Get Pro',
    ctaDisabled: false,
  },
  {
    id: 'elite' as const,
    name: 'Elite',
    price: '₹699',
    period: '/month',
    icon: Sparkles,
    color: 'text-yellow-400',
    border: 'border-yellow-500/30',
    highlight: false,
    features: [
      'Everything in Pro',
      'Direct tipster WhatsApp group',
      'VIP predictions (high-confidence only)',
      'Match previews 24h early',
      'Monthly betting bankroll guide',
      'Dedicated 1-on-1 support',
    ],
    cta: 'Get Elite',
    ctaDisabled: false,
  },
]

export default function PricingPage({ searchParams }: { searchParams: { success?: string } }) {
  const success = searchParams.success === '1'

  return (
    <div className="min-h-screen bg-gray-950 py-16 px-4">
      <div className="max-w-5xl mx-auto">

        {success && (
          <Suspense>
            <PricingSuccess />
          </Suspense>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-4">
            Pricing
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            AI Predictions for Every Fan
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto text-sm">
            Start free. Upgrade when you want more — cancel anytime.
            All plans include our AI-powered win probability model.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map(plan => {
            const Icon = plan.icon
            return (
              <div
                key={plan.id}
                className={`relative bg-gray-900 border rounded-2xl p-6 flex flex-col gap-4 ${plan.border} ${plan.highlight ? 'ring-1 ring-emerald-500/30' : ''}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${plan.highlight ? 'bg-emerald-500/15' : 'bg-gray-800'}`}>
                    <Icon className={`w-5 h-5 ${plan.color}`} />
                  </div>
                  <h2 className="text-lg font-extrabold text-white">{plan.name}</h2>
                  <div className="flex items-end gap-1 mt-1">
                    <span className={`text-3xl font-extrabold ${plan.color}`}>{plan.price}</span>
                    <span className="text-gray-500 text-sm mb-0.5">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.color}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.ctaDisabled ? (
                  <div className="w-full py-3 rounded-2xl text-sm text-center text-gray-600 border border-gray-800 cursor-default">
                    {plan.cta}
                  </div>
                ) : (
                  <RazorpayCheckout
                    plan={plan.id as 'pro' | 'elite'}
                    label={plan.name}
                    price={plan.price + plan.period}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Trust note */}
        <p className="text-center text-gray-600 text-xs mt-10">
          Payments secured by Razorpay · UPI, Debit/Credit cards, Net banking accepted ·
          International cards (Visa/Mastercard) supported · Cancel anytime
        </p>

      </div>
    </div>
  )
}
