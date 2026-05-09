'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/shared/Sidebar'
import { Topbar } from '@/components/shared/Topbar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      if (pathname !== '/onboarding') {
        const { data } = await supabase.from('profiles').select('onboarded').eq('id', user.id).single()
        if (data && !data.onboarded) {
          router.push('/onboarding')
          return
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [router, supabase, pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-1">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (pathname === '/onboarding') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-dark-1">
      <Topbar onMenuToggle={() => setSidebarOpen(v => !v)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="pt-24 lg:ml-64 min-h-screen">
        <div className="px-4 py-6 lg:px-6 max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
