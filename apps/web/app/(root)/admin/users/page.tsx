'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, Search, BadgeCheck } from 'lucide-react'
import type { Profile } from '@blackbook/shared'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-400',
  moderator: 'bg-purple-500/20 text-purple-400',
  mentor: 'bg-blue-500/20 text-blue-400',
  member: 'bg-green-500/20 text-green-400',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.rpc('admin_list_users', {
      p_role: roleFilter,
      p_limit: 50,
      p_offset: 0,
    })
    if (data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [roleFilter])

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase.rpc('admin_set_user_role', {
      p_target_user_id: userId,
      p_new_role: newRole,
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Role updated successfully' })
      fetchUsers()
    }
    setTimeout(() => setMessage(null), 3000)
  }

  const filteredUsers = search
    ? users.filter(u => u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-light-1">User Management</h1>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-4" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-dark-3 border border-dark-4 rounded-lg pl-10 pr-4 py-2.5 text-light-1 text-sm focus:outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex gap-2">
          {[null, 'admin', 'moderator', 'mentor', 'member'].map(role => (
            <button
              key={role || 'all'}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${roleFilter === role ? 'bg-primary-500 text-white' : 'bg-dark-3 text-light-4'}`}
            >
              {role || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <div className="bg-dark-3 border border-dark-4 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-4">
                <th className="text-left p-4 text-light-4 text-sm font-medium">User</th>
                <th className="text-left p-4 text-light-4 text-sm font-medium">Role</th>
                <th className="text-left p-4 text-light-4 text-sm font-medium">Verified</th>
                <th className="text-left p-4 text-light-4 text-sm font-medium">Joined</th>
                <th className="text-left p-4 text-light-4 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-dark-4 hover:bg-dark-4 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
                        {user.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-light-1 text-sm font-medium">{user.full_name}</p>
                        <p className="text-light-4 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || ''}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.is_verified ? (
                      <BadgeCheck size={18} className="text-primary-500" />
                    ) : (
                      <span className="text-light-5 text-xs">No</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-light-4">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {['admin', 'moderator', 'mentor', 'member'].map(role => (
                        <button
                          key={role}
                          disabled={user.role === role}
                          onClick={() => handleRoleChange(user.id, role)}
                          className={`px-2 py-1 rounded text-xs transition ${user.role === role ? 'bg-dark-5 text-light-5 cursor-not-allowed' : 'bg-dark-4 text-light-3 hover:bg-primary-500/20 hover:text-primary-400'}`}
                        >
                          {role}
                        </button>
                      ))}
                      {user.is_verified ? (
                        <button
                          onClick={async () => {
                            await supabase.rpc('admin_unverify_user', { p_user_id: user.id })
                            setMessage({ type: 'success', text: 'User unverified' })
                            fetchUsers()
                          }}
                          className="px-2 py-1 rounded text-xs bg-dark-4 text-yellow-400 hover:bg-yellow-500/20"
                        >
                          Unverify
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await supabase.rpc('admin_verify_user', { p_user_id: user.id })
                            setMessage({ type: 'success', text: 'User verified' })
                            fetchUsers()
                          }}
                          className="px-2 py-1 rounded text-xs bg-primary-500/20 text-primary-400 hover:bg-primary-500/30"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
