'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Search, Loader2 } from 'lucide-react'

export default function NetworkPage() {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, position, company, bio')
        .neq('id', user?.id || '')
        .limit(50)

      if (search) {
        query.or(`full_name.ilike.%${search}%,company.ilike.%${search}%,position.ilike.%${search}%`)
      }

      const { data } = await query
      if (data) setUsers(data)
      setLoading(false)
    }
    fetchUsers()
  }, [supabase, search])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-light-1">Network</h1>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-4" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, company, or role..."
          className="w-full pl-10 pr-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 placeholder-light-4 outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {users.map(u => (
          <Link
            key={u.id}
            href={`/profile/${u.id}`}
            className="flex items-center gap-3 p-4 bg-dark-2 rounded-xl border border-dark-4 hover:border-primary-500/50 transition"
          >
            <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold shrink-0">
              {u.full_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-light-1">{u.full_name}</p>
              {u.position && (
                <p className="text-sm text-light-4 truncate">
                  {u.position}{u.company ? ` at ${u.company}` : ''}
                </p>
              )}
              {u.bio && <p className="text-xs text-light-4 truncate mt-0.5">{u.bio}</p>}
            </div>
          </Link>
        ))}
        {users.length === 0 && <p className="text-light-4 text-center py-10 col-span-2">No members found.</p>}
      </div>
    </div>
  )
}
