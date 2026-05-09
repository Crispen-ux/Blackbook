'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function Topbar() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="fixed top-0 right-0 left-0 z-50 h-24 bg-dark-2 border-b border-dark-4">
      <div className="flex items-center justify-between h-full px-6 ml-64">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="BlackBook" width={300} height={75} className="h-20 mt-10 w-auto" />
        </div>
        <div className="flex items-center gap-4">
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
