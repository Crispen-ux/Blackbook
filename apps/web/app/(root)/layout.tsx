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
      <Topbar />
      <div className="flex pt-24">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 max-w-4xl">
          {children}
        </main>
      </div>
    </div>
  )
}
