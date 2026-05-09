'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Calendar, MessageSquare, FileText, TrendingUp, Shield } from 'lucide-react'

interface DashboardStats {
  total_users: number
  active_today: number
  mentors_count: number
  events_count: number
  posts_count: number
  messages_count: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role === 'member') {
        router.push('/feed')
        return
      }

      setUserRole(profile.role)

      const { data } = await supabase.rpc('admin_get_user_stats')
      if (data) setStats(data)
      setLoading(false)
    }
    init()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Active Today', value: stats?.active_today || 0, icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Mentors', value: stats?.mentors_count || 0, icon: Shield, color: 'bg-purple-500' },
    { label: 'Events', value: stats?.events_count || 0, icon: Calendar, color: 'bg-pink-500' },
    { label: 'Posts', value: stats?.posts_count || 0, icon: FileText, color: 'bg-yellow-500' },
    { label: 'Messages', value: stats?.messages_count || 0, icon: MessageSquare, color: 'bg-cyan-500' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-light-1">Admin Dashboard</h1>
          <p className="text-light-4 text-sm mt-1">
            {userRole === 'admin' ? 'Full administrative access' : 'Moderator access'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="bg-dark-3 border border-dark-4 rounded-xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center`}>
              <card.icon size={24} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-light-1">{card.value}</p>
              <p className="text-sm text-light-4">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminSection title="User Management" href="/admin/users" description="View, promote, and manage users" />
        <AdminSection title="Content Moderation" href="/admin/moderation" description="Review and moderate posts and comments" />
        <AdminSection title="Audit Logs" href="/admin/audit" description="View all administrative actions" />
        <AdminSection title="Events" href="/admin/events" description="Manage all platform events" />
      </div>
    </div>
  )
}

function AdminSection({ title, href, description }: { title: string; href: string; description: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(href)}
      className="bg-dark-3 border border-dark-4 rounded-xl p-5 text-left hover:border-primary-500/50 transition"
    >
      <h3 className="text-light-1 font-semibold mb-1">{title}</h3>
      <p className="text-sm text-light-4">{description}</p>
    </button>
  )
}
