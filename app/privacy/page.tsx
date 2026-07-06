import Link from 'next/link'
import { Shield } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | CricketTips.ai',
  description: 'Privacy Policy for CricketTips.ai — how we collect, use, and protect your personal information in compliance with POPIA (South Africa).',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-white font-bold text-lg mb-3 pb-2 border-b border-gray-800">{title}</h2>
      <div className="text-gray-400 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <Link href="/" className="text-gray-500 text-sm hover:text-white transition-colors">CricketTips.ai</Link>
            <span className="text-gray-700">/</span>
            <span className="text-gray-400 text-sm">Privacy Policy</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: 5 July 2026 · Effective date: 5 July 2026</p>
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <p className="text-emerald-400 text-xs">
              This policy complies with the <strong>Protection of Personal Information Act (POPIA), Act 4 of 2013</strong> of the Republic of South Africa.
            </p>
          </div>
        </div>

        <Section title="1. Who We Are">
          <p>
            CricketTips.ai ("we", "us", "our") is an AI-powered cricket analytics and predictions platform. We operate the website at <strong className="text-white">crickettips.ai</strong>.
          </p>
          <p>
            For any privacy-related enquiries, contact us at: <strong className="text-white">privacy@crickettips.ai</strong>
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We collect the following categories of personal information:</p>
          <ul className="list-disc list-inside space-y-2 mt-2 text-gray-500">
            <li><strong className="text-gray-300">Account information</strong> — name, email address, and password when you register</li>
            <li><strong className="text-gray-300">Usage data</strong> — pages visited, features used, time spent on site</li>
            <li><strong className="text-gray-300">Device data</strong> — browser type, IP address, operating system</li>
            <li><strong className="text-gray-300">Age verification</strong> — confirmation that you are 18 or older (stored locally on your device)</li>
            <li><strong className="text-gray-300">Payment data</strong> — we do not process payments directly; subscription payments are handled by third-party providers</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use your personal information to:</p>
          <ul className="list-disc list-inside space-y-2 mt-2 text-gray-500">
            <li>Provide and improve our cricket analytics and prediction services</li>
            <li>Manage your account and subscription</li>
            <li>Send you match tips, alerts, and service-related communications (with your consent)</li>
            <li>Comply with legal obligations under POPIA and applicable law</li>
            <li>Detect and prevent fraud or abuse of our platform</li>
            <li>Display relevant affiliate offers from licensed bookmakers</li>
          </ul>
          <p className="mt-2">
            We do not use your personal information for automated decision-making that produces legal or similarly significant effects without your knowledge.
          </p>
        </Section>

        <Section title="4. Affiliate Links & Third Parties">
          <p>
            CricketTips.ai displays affiliate links to betting operators licensed in your region — for example <strong className="text-white">Bet365</strong>, <strong className="text-white">William Hill</strong>, and <strong className="text-white">Paddy Power</strong> for UK visitors (all licensed and regulated by the UK Gambling Commission), or <strong className="text-white">1xBet</strong>, <strong className="text-white">Mostbet</strong>, and <strong className="text-white">Melbet</strong> for other regions. The operators shown are determined automatically by your location. When you click these links:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-2 text-gray-500">
            <li>You are redirected to the third-party operator's website</li>
            <li>The third party may place cookies or tracking pixels on your device</li>
            <li>We receive a commission if you register and deposit — this does not affect your experience or the odds offered to you</li>
            <li>Each operator has their own Privacy Policy which governs how they use your data</li>
          </ul>
          <p className="mt-2">We are not responsible for the privacy practices of third-party betting operators.</p>
        </Section>

        <Section title="5. Cookies & Local Storage">
          <p>We use the following technologies on our website:</p>
          <ul className="list-disc list-inside space-y-2 mt-2 text-gray-500">
            <li><strong className="text-gray-300">Local storage</strong> — to remember your age verification and display preferences</li>
            <li><strong className="text-gray-300">Session cookies</strong> — to maintain your login state</li>
            <li><strong className="text-gray-300">Analytics cookies</strong> — to understand how visitors use our site (e.g. page views, session duration)</li>
            <li><strong className="text-gray-300">Affiliate tracking</strong> — third-party cookies placed when you click affiliate links</li>
          </ul>
          <p className="mt-2">
            You can control cookies through your browser settings. Disabling cookies may affect site functionality.
          </p>
        </Section>

        <Section title="6. Data Storage & Security">
          <p>
            Your personal data is stored in a secure cloud database hosted by <strong className="text-white">Neon (PostgreSQL)</strong>, which uses industry-standard encryption at rest and in transit. We implement reasonable technical and organisational measures to protect your information from unauthorised access, loss, or disclosure.
          </p>
          <p>
            While we take security seriously, no system is completely secure. In the event of a data breach that affects your rights, we will notify you as required by POPIA within a reasonable timeframe.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <p>
            We retain your personal information for as long as your account is active or as needed to provide our services. If you close your account, we will delete or anonymise your personal data within <strong className="text-white">30 days</strong>, unless we are required by law to retain it longer.
          </p>
        </Section>

        <Section title="8. Your Rights Under POPIA">
          <p>As a data subject, you have the right to:</p>
          <ul className="list-disc list-inside space-y-2 mt-2 text-gray-500">
            <li><strong className="text-gray-300">Access</strong> — request a copy of the personal information we hold about you</li>
            <li><strong className="text-gray-300">Correction</strong> — request correction of inaccurate or incomplete information</li>
            <li><strong className="text-gray-300">Deletion</strong> — request deletion of your personal information ("right to be forgotten")</li>
            <li><strong className="text-gray-300">Objection</strong> — object to the processing of your information for direct marketing</li>
            <li><strong className="text-gray-300">Complaint</strong> — lodge a complaint with the <strong className="text-white">Information Regulator of South Africa</strong></li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, email us at: <strong className="text-white">privacy@crickettips.ai</strong>. We will respond within <strong className="text-white">30 days</strong>.
          </p>
          <p>
            Information Regulator contact: <strong className="text-white">inforeg@justice.gov.za</strong> | +27 (0)10 023 5207
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            Our website is strictly for users aged <strong className="text-white">18 and over</strong>. We do not knowingly collect personal information from anyone under 18. If we become aware that a minor has provided us with personal information, we will delete it immediately. If you believe a minor has registered, contact us at <strong className="text-white">privacy@crickettips.ai</strong>.
          </p>
        </Section>

        <Section title="10. International Transfers">
          <p>
            Your data may be processed by our service providers in countries outside South Africa. Where this occurs, we take steps to ensure that your information is protected to a standard consistent with POPIA.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we make material changes, we will notify you by posting the updated policy on this page with a new "Last updated" date. Your continued use of the site after changes are posted constitutes your acceptance of the updated policy.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>For any privacy concerns or requests:</p>
          <div className="mt-2 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-1">
            <p><strong className="text-white">CricketTips.ai</strong></p>
            <p>Email: <strong className="text-emerald-400">privacy@crickettips.ai</strong></p>
            <p>Website: <strong className="text-white">crickettips.ai</strong></p>
          </div>
        </Section>

        <div className="mt-8 pt-6 border-t border-gray-800 flex items-center justify-between">
          <Link href="/" className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors">← Back to Home</Link>
          <Link href="/terms" className="text-gray-500 text-sm hover:text-white transition-colors">Terms & Conditions →</Link>
        </div>
      </div>
    </div>
  )
}
