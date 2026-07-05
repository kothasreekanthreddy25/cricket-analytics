import AdSidebar from './AdSidebar'
import MobileAdStrip from './MobileAdStrip'

interface Props {
  children: React.ReactNode
}

export default function PageWithSidebar({ children }: Props) {
  return (
    <div className="max-w-[1400px] mx-auto bg-gray-950">
      <div className="flex">
        {/* Main content */}
        <div className="flex-1 min-w-0">{children}</div>

        {/* Right sidebar — desktop only */}
        <aside className="hidden lg:block w-[300px] shrink-0 px-3 py-8 bg-gray-950">
          <AdSidebar />
        </aside>
      </div>

      {/* Mobile ad strip — shown below content on small screens */}
      <div className="lg:hidden px-4 pb-6">
        <MobileAdStrip />
      </div>
    </div>
  )
}
