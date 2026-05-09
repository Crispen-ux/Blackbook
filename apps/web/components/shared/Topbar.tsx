'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Menu } from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

interface TopbarProps {
  onMenuToggle: () => void
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="fixed top-0 right-0 left-0 z-30 h-24 bg-dark-2 border-b border-dark-4">
      <div className="flex items-center justify-between h-full px-4 lg:px-6 lg:ml-64">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 text-light-4 hover:text-light-1 transition lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          <Image
            src="/logo.png"
            alt="BlackBook"
            width={180}
            height={45}
            className="h-14 w-auto sm:h-16 lg:h-24"
          />
        </div>
        <div className="flex items-center gap-3 lg:gap-4">
          <ThemeToggle />
          <NotificationBell />
          <button
            onClick={handleSignOut}
            className="p-2 text-light-4 hover:text-accent transition"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
