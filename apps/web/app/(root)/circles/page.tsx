'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Lock, Globe, Users, Plus, Search } from 'lucide-react'

export default function CirclesPage() {
  const [circles, setCircles] = useState<any[]>([])
  const [memberships, setMemberships] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', type: 'public', max_members: 100 })
  const supabase = createClient()
  const router = useRouter()

  const fetchCircles = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('circles').select('*').order('created_at', { ascending: false })
    if (data) setCircles(data)

    if (user) {
      const { data: mems } = await supabase.from('circle_members').select('circle_id').eq('user_id', user.id)
      if (mems) setMemberships(new Set(mems.map(m => m.circle_id)))
    }
    setLoading(false)
  }

  useEffect(() => { fetchCircles() }, [])

  const handleJoin = async (circleId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('circle_members').insert({ circle_id: circleId, user_id: user.id, role: 'member', status: 'active' })
    setMemberships(prev => new Set(prev).add(circleId))
  }

  const handleCreate = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !form.name) return
    const { data } = await supabase.from('circles').insert({ ...form, created_by: user.id }).select().single()
    if (data) {
      await supabase.from('circle_members').insert({ circle_id: data.id, user_id: user.id, role: 'admin', status: 'active' })
      setShowCreate(false)
      setForm({ name: '', description: '', type: 'public', max_members: 100 })
      fetchCircles()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-1">Circles</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm"
        >
          <Plus size={16} />
          Create Circle
        </button>
      </div>

      {showCreate && (
        <div className="bg-dark-3 border border-dark-4 rounded-xl p-5 space-y-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Circle name" className="w-full bg-dark-4 border border-dark-5 rounded-lg px-3 py-2 text-sm text-light-1" />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full bg-dark-4 border border-dark-5 rounded-lg px-3 py-2 text-sm text-light-1 min-h-[60px]" />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-dark-4 border border-dark-5 rounded-lg px-3 py-2 text-sm text-light-2">
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="application">Application</option>
          </select>
          <button onClick={handleCreate} className="w-full py-2 bg-primary-500 text-white rounded-lg text-sm">Create</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
      ) : circles.length === 0 ? (
        <div className="text-center py-12 text-light-4">No circles yet</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {circles.map(circle => {
            const isMember = memberships.has(circle.id)
            return (
              <div key={circle.id} className="bg-dark-2 border border-dark-4 rounded-xl p-5 hover:border-primary-500/30 transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-light-1 font-semibold">{circle.name}</h3>
                      {circle.type === 'private' ? <Lock size={14} className="text-light-4" /> : <Globe size={14} className="text-light-4" />}
                    </div>
                    {circle.description && <p className="text-sm text-light-4 mt-1">{circle.description}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-light-5 flex items-center gap-1"><Users size={12} /> Up to {circle.max_members}</span>
                  {isMember ? (
                    <Link href={`/circles/${circle.id}`} className="text-sm text-primary-500 hover:underline">View</Link>
                  ) : (
                    <button onClick={() => handleJoin(circle.id)} className="text-sm text-primary-500 hover:underline">Join</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
