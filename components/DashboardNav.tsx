'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, LayoutDashboard, Users, TrendingUp, Settings } from 'lucide-react'
import { SignOutButton } from './SignOutButton'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
}

interface DashboardNavProps {
  userRole: string
}

export function DashboardNav({ userRole }: DashboardNavProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      href: '/dashboard/admin',
      label: 'Admin',
      icon: <Settings className="w-5 h-5" />,
      roles: ['ADMIN']
    },
    {
      href: '/dashboard/tipster',
      label: 'My Tips',
      icon: <TrendingUp className="w-5 h-5" />,
      roles: ['TIPSTER', 'ADMIN']
    },
    {
      href: '/dashboard/user',
      label: 'View Tips',
      icon: <Users className="w-5 h-5" />,
      roles: ['USER', 'TIPSTER', 'ADMIN']
    }
  ]

  const filteredItems = navItems.filter(item =>
    !item.roles || item.roles.includes(userRole)
  )

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Trophy className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Cricket Analytics</span>
            </Link>

            <div className="ml-10 flex items-center space-x-4">
              {filteredItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <div className="mr-4">
              <span className="text-sm text-gray-600">
                Role: <span className="font-medium text-gray-900">{userRole}</span>
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
