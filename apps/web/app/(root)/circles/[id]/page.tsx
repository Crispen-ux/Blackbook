'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Loader2, Send, Users, Globe, Lock, ArrowLeft, MessageCircle, Sparkles,
  Settings, UserMinus, UserPlus, Plus, X, ChevronDown, ChevronUp,
} from 'lucide-react'

interface Member {
  user_id: string
  role: string
  status: string
  joined_at: string
  profile: { id: string; full_name: string; avatar_url: string | null; position: string | null; company: string | null } | null
}

interface Post {
  id: string
  content: string
  created_at: string
  author_id: string
  author: { full_name: string; avatar_url: string | null } | null
}

export default function CircleDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [circle, setCircle] = useState<any>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setCurrentUserId(user.id)

      const { data: c } = await supabase.from('circles').select('*').eq('id', id).single()
      if (c) setCircle(c)

      const { data: mems } = await supabase
        .from('circle_members')
        .select('*, profile:profiles(id, full_name, avatar_url, position, company)')
        .eq('circle_id', id)
        .eq('status', 'active')
        .order('role', { ascending: true })
      if (mems) {
        setMembers(mems as any)
        const myMem = mems.find(m => m.user_id === user.id)
        setIsMember(!!myMem)
        setMyRole(myMem?.role || null)
      }

      const { data: p } = await supabase
        .from('circle_posts')
        .select('*, author:profiles(full_name, avatar_url)')
        .eq('circle_id', id)
        .order('created_at', { ascending: false })
      if (p) setPosts(p as any)

      setLoading(false)
    }
    fetch()
  }, [id, supabase, router])

  const handlePost = async () => {
    if (!content.trim() || posting) return
    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('circle_posts')
      .insert({ circle_id: id, author_id: user?.id, content: content.trim() })
      .select('*, author:profiles(full_name, avatar_url)')
      .single()
    if (data) {
      setPosts(prev => [data as any, ...prev])
      setContent('')
    }
    setPosting(false)
  }

  const handleDeletePost = async (postId: string) => {
    await supabase.from('circle_posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const handleRemoveMember = async (userId: string) => {
    await supabase.from('circle_members').delete().eq('circle_id', id).eq('user_id', userId)
    setMembers(prev => prev.filter(m => m.user_id !== userId))
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteEmail.trim())
      .single()

    if (!profile) {
      setInviteError('User not found with that email')
      setInviting(false)
      return
    }

    if (members.some(m => m.user_id === profile.id)) {
      setInviteError('User is already a member')
      setInviting(false)
      return
    }

    await supabase.from('circle_members').insert({
      circle_id: id,
      user_id: profile.id,
      role: 'member',
      status: 'active',
    })

    const { data: newMember } = await supabase
      .from('circle_members')
      .select('*, profile:profiles(id, full_name, avatar_url, position, company)')
      .eq('circle_id', id)
      .eq('user_id', profile.id)
      .single()

    if (newMember) setMembers(prev => [...prev, newMember as any])
    setInviteEmail('')
    setInviting(false)
  }

  const isAdminOrMod = myRole === 'admin' || myRole === 'moderator'

  const activeMembers = members.filter(m => m.status === 'active')
  const admins = activeMembers.filter(m => m.role === 'admin')
  const moderators = activeMembers.filter(m => m.role === 'moderator')
  const regulars = activeMembers.filter(m => m.role === 'member')

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  if (!circle) return <div className="text-center py-20 text-light-4">Circle not found</div>

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/circles" className="inline-flex items-center gap-1.5 text-sm text-light-4 hover:text-light-1 transition">
        <ArrowLeft size={16} /> All Circles
      </Link>

      {/* Hero */}
      <div className="bg-dark-2 rounded-2xl border border-dark-4 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary-600/30 via-primary-500/15 to-dark-4 relative">
          {circle.is_featured && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 bg-primary-600/80 backdrop-blur rounded-full text-xs text-white font-medium">
              <Sparkles size={12} /> Featured
            </div>
          )}
          <div className="absolute top-3 right-3">
            <span className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur',
              circle.type === 'public' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
            )}>
              {circle.type === 'public' ? <Globe size={12} /> : <Lock size={12} />}
              {circle.type}
            </span>
          </div>
        </div>

        <div className="p-6 pt-0">
          <div className="flex items-end -mt-12 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-dark-2">
              {circle.name?.charAt(0).toUpperCase() || '?'}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div>
                <h1 className="text-2xl font-bold text-light-1">{circle.name}</h1>
                {circle.description && (
                  <p className="text-light-4 mt-1 text-sm leading-relaxed">{circle.description}</p>
                )}
              </div>

              {circle.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {circle.tags.map((t: string) => (
                    <span key={t} className="px-2.5 py-1 bg-dark-4/50 rounded-lg text-xs text-light-4 font-medium">{t}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-light-4">
                <button onClick={() => setShowMembers(!showMembers)} className="flex items-center gap-1.5 hover:text-light-1 transition">
                  <Users size={15} />
                  {activeMembers.length} {activeMembers.length === 1 ? 'member' : 'members'}
                  {showMembers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <span className="flex items-center gap-1.5">
                  <MessageCircle size={15} />
                  {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                </span>
              </div>
            </div>

            {isAdminOrMod && (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setShowMembers(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-dark-3 border border-dark-4 hover:border-primary-500/50 rounded-xl text-xs text-light-3 hover:text-light-1 transition font-medium">
                  <Settings size={14} /> Manage
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Members section (collapsible) */}
      {showMembers && (
        <div className="bg-dark-2 rounded-2xl border border-dark-4 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-light-1">Members ({activeMembers.length})</h2>
            <div className="flex items-center gap-2">
              {isAdminOrMod && (
                <div className="flex items-center gap-2">
                  <input
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="Invite by email..."
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                    className="px-3 py-1.5 bg-dark-1 border border-dark-4 rounded-lg text-xs text-light-1 placeholder:text-light-4 outline-none focus:border-primary-500 transition w-48"
                  />
                  <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition">
                    {inviting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Invite
                  </button>
                </div>
              )}
            </div>
          </div>

          {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}

          {/* Admins */}
          {admins.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-light-4 uppercase tracking-wider mb-2">Admins</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {admins.map(m => <MemberRow key={m.user_id} member={m} isAdmin={isAdminOrMod} currentUserId={currentUserId} onRemove={handleRemoveMember} />)}
              </div>
            </div>
          )}

          {/* Moderators */}
          {moderators.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-light-4 uppercase tracking-wider mb-2">Moderators</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {moderators.map(m => <MemberRow key={m.user_id} member={m} isAdmin={isAdminOrMod} currentUserId={currentUserId} onRemove={handleRemoveMember} />)}
              </div>
            </div>
          )}

          {/* Regular members */}
          {regulars.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-light-4 uppercase tracking-wider mb-2">Members</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {regulars.map(m => <MemberRow key={m.user_id} member={m} isAdmin={isAdminOrMod} currentUserId={currentUserId} onRemove={handleRemoveMember} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Post composer */}
      {isMember ? (
        <div className="bg-dark-2 rounded-2xl border border-primary-500/20 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs text-primary-500 font-medium">
            <MessageCircle size={14} />
            Share with the circle
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind?"
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handlePost())}
            className="w-full bg-dark-1 border border-dark-4 rounded-xl p-3.5 text-sm text-light-1 placeholder:text-light-4 outline-none focus:border-primary-500 transition min-h-[80px] resize-none"
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-light-5">{content.length}/2000</span>
            <button onClick={handlePost} disabled={!content.trim() || posting}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition">
              {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Post
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-dark-2 rounded-2xl border border-dark-4 p-8 text-center">
          <Users size={32} className="mx-auto text-dark-4 mb-3" />
          <h3 className="text-lg font-semibold text-light-1 mb-1">Join this circle</h3>
          <p className="text-sm text-light-4 mb-4">Become a member to participate in discussions</p>
          <button
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) return
              await supabase.from('circle_members').insert({ circle_id: id, user_id: user.id, role: 'member', status: 'active' })
              setIsMember(true)
              setMyRole('member')
              const { data: mems } = await supabase
                .from('circle_members')
                .select('*, profile:profiles(id, full_name, avatar_url, position, company)')
                .eq('circle_id', id)
                .eq('status', 'active')
              if (mems) setMembers(mems as any)
            }}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-primary-600/20"
          >
            <UserPlus size={16} className="inline mr-1.5" />
            Join Circle
          </button>
        </div>
      )}

      {/* Posts feed */}
      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-dark-2 rounded-2xl border border-dark-4">
            <MessageCircle size={32} className="mx-auto text-dark-4 mb-3" />
            <p className="text-sm text-light-4">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-dark-2 rounded-2xl border border-dark-4 p-5 hover:border-dark-5 transition">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {post.author?.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-light-1">{post.author?.full_name}</span>
                    <span className="text-xs text-light-5">
                      {new Date(post.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {(currentUserId === post.author_id || myRole === 'admin') && (
                      <button onClick={() => handleDeletePost(post.id)} className="ml-auto p-1 text-light-4 hover:text-accent transition">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-light-2 mt-1.5 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function MemberRow({ member, isAdmin, currentUserId, onRemove }: {
  member: Member
  isAdmin: boolean
  currentUserId: string | null
  onRemove: (userId: string) => void
}) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-dark-1 rounded-xl border border-dark-4">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {member.profile?.full_name?.charAt(0) || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-light-1 truncate">
          {member.profile?.full_name}
          {member.user_id === currentUserId && <span className="text-light-4 font-normal"> (you)</span>}
        </p>
        {member.profile?.position && (
          <p className="text-xs text-light-4 truncate">
            {member.profile.position}{member.profile.company ? ` at ${member.profile.company}` : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn(
          'px-2 py-0.5 rounded-md text-[10px] font-medium',
          member.role === 'admin' ? 'bg-primary-600/15 text-primary-500' :
          member.role === 'moderator' ? 'bg-amber-500/15 text-amber-400' :
          'bg-dark-4 text-light-4'
        )}>
          {member.role}
        </span>
        {isAdmin && member.user_id !== currentUserId && (
          <button onClick={() => onRemove(member.user_id)}
            className="p-1 text-light-4 hover:text-accent transition">
            <UserMinus size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
