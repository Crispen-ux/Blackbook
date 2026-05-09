'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Home, MessageSquare, Calendar, GraduationCap, Users, User, Settings, Shield, Circle, HelpCircle, Crown, X,
} from 'lucide-react'

const navItems = [
  { label: 'Feed', href: '/feed', icon: Home },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Events', href: '/events', icon: Calendar },
  { label: 'Circles', href: '/circles', icon: Circle },
  { label: 'Q&A', href: '/qa', icon: HelpCircle },
  { label: 'Mentorship', href: '/mentorship', icon: GraduationCap },
  { label: 'Network', href: '/network', icon: Users },
  { label: 'Profile', href: '/profile', icon: User },
] as const

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (data && (data.role === 'admin' || data.role === 'moderator')) setIsAdmin(true)
    }
    checkRole()
  }, [supabase])

  useEffect(() => {
    onClose()
  }, [pathname])

  const allNavItems = isAdmin
    ? [...navItems, { label: 'Admin', href: '/admin', icon: Shield }]
    : navItems

  const sidebarContent = (
    <nav className="p-4 space-y-1">
      {allNavItems.map(({ label, href, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition',
              isActive
                ? 'bg-primary-600/20 text-primary-500'
                : 'text-light-4 hover:text-light-1 hover:bg-dark-3'
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  const sidebarFooter = (
    <div className="p-4 space-y-1">
      <Link
        href="/subscription"
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition',
          pathname === '/subscription'
            ? 'bg-primary-600/20 text-primary-500'
            : 'text-light-4 hover:text-light-1 hover:bg-dark-3'
        )}
      >
        <Crown size={20} />
        Subscription
      </Link>
      <Link
        href="/settings"
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition',
          pathname === '/settings'
            ? 'bg-primary-600/20 text-primary-500'
            : 'text-light-4 hover:text-light-1 hover:bg-dark-3'
        )}
      >
        <Settings size={20} />
        Settings
      </Link>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-64 bg-dark-2 border-r border-dark-4 overflow-y-auto transition-transform duration-300 lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-dark-4">
          <span className="text-lg font-bold text-light-1">Menu</span>
          <button
            onClick={onClose}
            className="p-1 text-light-4 hover:text-light-1 transition"
          >
            <X size={20} />
          </button>
        </div>
        {sidebarContent}
        {sidebarFooter}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col fixed left-0 top-24 bottom-0 w-64 bg-dark-2 border-r border-dark-4 overflow-y-auto">
        {sidebarContent}
        <div className="mt-auto">
          {sidebarFooter}
        </div>
      </aside>
    </>
  )
}
