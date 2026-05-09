'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Lock, Globe, Users, Plus, Search, Sparkles, Hash, ArrowRight, UserPlus, Check, X, MessageCircle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CircleMemberInfo {
  user_id: string
  profile: { full_name: string; avatar_url: string | null } | null
}

interface CircleWithStats {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  type: string
  created_by: string
  max_members: number
  tags: string[]
  is_featured: boolean
  created_at: string
  member_count: number
  post_count: number
  recent_members: CircleMemberInfo[]
  is_member: boolean
  my_role?: string
}

type FilterTab = 'all' | 'featured' | 'my' | 'public' | 'private'

const filters: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All Circles' },
  { key: 'featured', label: 'Featured' },
  { key: 'my', label: 'My Circles' },
  { key: 'public', label: 'Public' },
  { key: 'private', label: 'Private' },
]

export default function CirclesPage() {
  const [circles, setCircles] = useState<CircleWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', type: 'public' as const, max_members: 100, tags: '' })
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState<Set<string>>(new Set())
  const supabase = createClient()
  const router = useRouter()

  const fetchCircles = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data } = await supabase
      .from('circles')
      .select(`
        *,
        member_count:circle_members!inner(count),
        recent_members:circle_members(
          user_id,
          profile:profiles(full_name, avatar_url)
        )
      `)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    const myCircleIds = new Set<string>()
    if (user) {
      const { data: myMems } = await supabase.from('circle_members').select('circle_id, role').eq('user_id', user.id).eq('status', 'active')
      if (myMems) myMems.forEach(m => myCircleIds.add(m.circle_id))
    }

    const postCounts = new Map<string, number>()
    if (data && data.length > 0) {
      const circleIds = data.map(c => c.id)
      const { data: counts } = await supabase
        .from('circle_posts')
        .select('circle_id')
        .in('circle_id', circleIds)
      if (counts) {
        counts.forEach(p => postCounts.set(p.circle_id, (postCounts.get(p.circle_id) || 0) + 1))
      }
    }

    if (data) {
      const enriched: CircleWithStats[] = data.map(c => ({
        ...c,
        member_count: (c.member_count as any)?.[0]?.count || 0,
        post_count: postCounts.get(c.id) || 0,
        is_member: myCircleIds.has(c.id),
        my_role: undefined,
      }))
      setCircles(enriched)
    }
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchCircles() }, [fetchCircles])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('circles')
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: form.type,
        max_members: form.max_members,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        created_by: user.id,
      })
      .select()
      .single()
    if (data) {
      await supabase.from('circle_members').insert({
        circle_id: data.id, user_id: user.id, role: 'admin', status: 'active',
      })
      setShowCreate(false)
      setForm({ name: '', description: '', type: 'public', max_members: 100, tags: '' })
      fetchCircles()
    }
    setCreating(false)
  }

  const handleJoin = async (circleId: string) => {
    setJoining(prev => new Set(prev).add(circleId))
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('circle_members').insert({
      circle_id: circleId, user_id: user.id, role: 'member', status: 'active',
    })
    setCircles(prev => prev.map(c => c.id === circleId ? { ...c, is_member: true, member_count: c.member_count + 1 } : c))
    setJoining(prev => { const n = new Set(prev); n.delete(circleId); return n })
  }

  const handleLeave = async (circleId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('circle_members').delete().eq('circle_id', circleId).eq('user_id', user.id)
    setCircles(prev => prev.map(c => c.id === circleId ? { ...c, is_member: false, member_count: Math.max(0, c.member_count - 1) } : c))
  }

  const filtered = circles.filter(c => {
    if (activeFilter === 'featured' && !c.is_featured) return false
    if (activeFilter === 'my' && !c.is_member) return false
    if (activeFilter === 'public' && c.type !== 'public') return false
    if (activeFilter === 'private' && c.type !== 'private') return false
    if (search) {
      const q = search.toLowerCase()
      const nameMatch = c.name.toLowerCase().includes(q)
      const tagMatch = c.tags?.some(t => t.toLowerCase().includes(q))
      const descMatch = c.description?.toLowerCase().includes(q)
      if (!nameMatch && !tagMatch && !descMatch) return false
    }
    return true
  })

  const featured = circles.filter(c => c.is_featured)
  const myCircles = circles.filter(c => c.is_member)
  const trending = [...circles].sort((a, b) => b.post_count - a.post_count).slice(0, 6)

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-light-1">Circles</h1>
          <p className="text-light-4 text-sm mt-1">Join communities built around your industry, interests, and goals</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-primary-600/20"
        >
          <Plus size={18} />
          Create Circle
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-dark-2 border border-primary-500/30 rounded-2xl p-6 space-y-4 shadow-xl shadow-primary-500/5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-light-1">New Circle</h2>
            <button onClick={() => setShowCreate(false)} className="p-1 text-light-4 hover:text-light-1 transition">
              <X size={20} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-light-4 mb-1.5">Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., African Tech Leaders"
                className="w-full px-4 py-2.5 bg-dark-1 border border-dark-4 rounded-xl text-light-1 placeholder:text-light-4 outline-none focus:border-primary-500 transition text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-light-4 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What is this circle about?"
                className="w-full px-4 py-2.5 bg-dark-1 border border-dark-4 rounded-xl text-light-1 placeholder:text-light-4 outline-none focus:border-primary-500 transition text-sm min-h-[80px] resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-light-4 mb-1.5">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))}
                className="w-full px-4 py-2.5 bg-dark-1 border border-dark-4 rounded-xl text-light-1 outline-none focus:border-primary-500 transition text-sm">
                <option value="public">Public — anyone can join</option>
                <option value="private">Private — by invite only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-light-4 mb-1.5">Max Members</label>
              <input type="number" value={form.max_members} onChange={e => setForm(p => ({ ...p, max_members: parseInt(e.target.value) || 100 }))}
                className="w-full px-4 py-2.5 bg-dark-1 border border-dark-4 rounded-xl text-light-1 outline-none focus:border-primary-500 transition text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-light-4 mb-1.5">Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                placeholder="Technology, Leadership, Africa"
                className="w-full px-4 py-2.5 bg-dark-1 border border-dark-4 rounded-xl text-light-1 placeholder:text-light-4 outline-none focus:border-primary-500 transition text-sm" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating || !form.name.trim()}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2">
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {creating ? 'Creating...' : 'Create Circle'}
          </button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-4" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search circles by name, tag, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 bg-dark-2 border border-dark-4 rounded-xl text-light-1 placeholder:text-light-4 outline-none focus:border-primary-500 transition text-sm"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filters.map(f => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)}
              className={cn(
                'px-3.5 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap',
                activeFilter === f.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-dark-2 text-light-4 hover:text-light-1 border border-dark-4'
              )}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured section */}
      {activeFilter === 'all' && featured.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-light-1">Featured Circles</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {featured.map(circle => <CircleCard key={circle.id} circle={circle} onJoin={handleJoin} onLeave={handleLeave} joining={joining} />)}
          </div>
        </section>
      )}

      {/* My Circles */}
      {activeFilter === 'all' && myCircles.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={16} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-light-1">My Circles</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {myCircles.slice(0, 4).map(circle => <CircleCard key={circle.id} circle={circle} onJoin={handleJoin} onLeave={handleLeave} joining={joining} />)}
          </div>
          {myCircles.length > 4 && (
            <button onClick={() => setActiveFilter('my')} className="mt-3 text-sm text-primary-500 hover:underline flex items-center gap-1">
              View all {myCircles.length} circles <ArrowRight size={14} />
            </button>
          )}
        </section>
      )}

      {/* Trending */}
      {activeFilter === 'all' && trending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-light-1">Trending</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {trending.slice(0, 4).map(circle => <CircleCard key={circle.id} circle={circle} onJoin={handleJoin} onLeave={handleLeave} joining={joining} />)}
          </div>
        </section>
      )}

      {/* All circles */}
      <section>
        {activeFilter !== 'all' && (
          <div className="flex items-center gap-2 mb-4">
            <Hash size={16} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-light-1">
              {filters.find(f => f.key === activeFilter)?.label || 'Circles'}
            </h2>
            <span className="text-sm text-light-4">({filtered.length})</span>
          </div>
        )}
        {activeFilter === 'all' && (
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-light-1">All Circles</h2>
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-dark-2 rounded-2xl border border-dark-4">
            <Users size={40} className="mx-auto text-dark-4 mb-4" />
            <h3 className="text-lg font-semibold text-light-1 mb-1">No circles found</h3>
            <p className="text-sm text-light-4 mb-6">
              {search ? 'Try a different search term' : 'Create the first circle in this category'}
            </p>
            {!search && (
              <button onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition">
                <Plus size={16} /> Create Circle
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(circle => <CircleCard key={circle.id} circle={circle} onJoin={handleJoin} onLeave={handleLeave} joining={joining} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function CircleCard({ circle, onJoin, onLeave, joining }: {
  circle: CircleWithStats
  onJoin: (id: string) => void
  onLeave: (id: string) => void
  joining: Set<string>
}) {
  const membersToShow = circle.recent_members?.slice(0, 3) || []
  const overflow = Math.max(0, circle.member_count - membersToShow.length)

  return (
    <div className={cn(
      'group relative bg-dark-2 rounded-2xl border overflow-hidden transition-all duration-200',
      circle.is_member ? 'border-primary-500/30 hover:border-primary-500/60' : 'border-dark-4 hover:border-primary-500/30',
      'hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-0.5'
    )}>
      {/* Cover image gradient */}
      <div className="h-24 bg-gradient-to-r from-primary-600/20 via-primary-500/10 to-dark-4 relative overflow-hidden">
        {circle.is_featured && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-primary-600/80 backdrop-blur rounded-full text-[10px] text-white font-medium">
            <Sparkles size={10} /> Featured
          </div>
        )}
        <div className="absolute bottom-2 right-2">
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur',
            circle.type === 'public' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
          )}>
            {circle.type === 'public' ? <Globe size={10} /> : <Lock size={10} />}
            {circle.type}
          </span>
        </div>
      </div>

      <div className="p-5 pt-0">
        {/* Avatar overlapping cover */}
        <div className="flex items-end -mt-10 mb-3">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl font-bold shadow-lg border-2 border-dark-2 shrink-0">
            {circle.name.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="space-y-3">
          {/* Name + type */}
          <div>
            <Link href={`/circles/${circle.id}`} className="text-lg font-bold text-light-1 hover:text-primary-500 transition line-clamp-1">
              {circle.name}
            </Link>
            {circle.description && (
              <p className="text-sm text-light-4 mt-0.5 line-clamp-2">{circle.description}</p>
            )}
          </div>

          {/* Tags */}
          {circle.tags && circle.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {circle.tags.slice(0, 4).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-dark-4/50 rounded-md text-[11px] text-light-4 font-medium">{tag}</span>
              ))}
              {circle.tags.length > 4 && (
                <span className="px-2 py-0.5 text-[11px] text-light-4">+{circle.tags.length - 4}</span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-light-4">
            <span className="flex items-center gap-1">
              <Users size={13} />
              {circle.member_count} / {circle.max_members}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={13} />
              {circle.post_count} posts
            </span>
          </div>

          {/* Member avatars + actions */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center">
              {membersToShow.length > 0 && (
                <div className="flex -space-x-2">
                  {membersToShow.map(m => (
                    <div key={m.user_id} className="w-7 h-7 rounded-full bg-dark-4 border-2 border-dark-2 flex items-center justify-center text-[10px] text-light-2 font-medium">
                      {m.profile?.full_name?.charAt(0) || '?'}
                    </div>
                  ))}
                  {overflow > 0 && (
                    <div className="w-7 h-7 rounded-full bg-dark-4 border-2 border-dark-2 flex items-center justify-center text-[10px] text-light-4 font-medium">
                      +{overflow}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {circle.is_member ? (
                <>
                  <Link href={`/circles/${circle.id}`}
                    className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold transition shadow-sm">
                    View
                  </Link>
                  <button onClick={() => onLeave(circle.id)}
                    className="p-1.5 text-light-4 hover:text-accent transition">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <button onClick={() => onJoin(circle.id)} disabled={joining.has(circle.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 border border-primary-500/50 text-primary-500 hover:bg-primary-600 hover:text-white rounded-lg text-xs font-semibold transition disabled:opacity-50">
                  {joining.has(circle.id) ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <UserPlus size={12} />
                  )}
                  Join
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
