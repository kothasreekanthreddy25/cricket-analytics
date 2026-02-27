'use client'

import AdSidebar from './AdSidebar'

interface Props {
  children: React.ReactNode
}

export default function PageWithSidebar({ children }: Props) {
  return (
    <div className="max-w-[1400px] mx-auto flex bg-gray-950">
      {/* Main content — takes all available space */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* Right sidebar — hidden on mobile/tablet, visible on lg+ */}
      <aside className="hidden lg:block w-[300px] shrink-0 px-3 py-8 bg-gray-950">
        <AdSidebar />
      </aside>
    </div>
  )
}
