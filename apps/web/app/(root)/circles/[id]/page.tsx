'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Send, Users } from 'lucide-react'

export default function CircleDetailPage() {
  const { id } = useParams()
  const [circle, setCircle] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [isMember, setIsMember] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: c } = await supabase.from('circles').select('*').eq('id', id).single()
      if (c) setCircle(c)

      const { data: mems } = await supabase.from('circle_members').select('*, profile:profiles(full_name, avatar_url)').eq('circle_id', id).eq('status', 'active')
      if (mems) {
        setMembers(mems)
        const myMem = mems.find(m => m.user_id === user.id)
        setIsMember(!!myMem)
        setIsAdmin(myMem?.role === 'admin')
      }

      const { data: p } = await supabase.from('circle_posts').select('*, author:profiles(full_name, avatar_url)').eq('circle_id', id).order('created_at', { ascending: false })
      if (p) setPosts(p)

      setLoading(false)
    }
    fetch()
  }, [id, supabase, router])

  const handlePost = async () => {
    if (!content.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('circle_posts').insert({ circle_id: id, author_id: user?.id, content })
    setContent('')
    const { data: p } = await supabase.from('circle_posts').select('*, author:profiles(full_name, avatar_url)').eq('circle_id', id).order('created_at', { ascending: false })
    if (p) setPosts(p)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  if (!circle) return <div className="text-center py-20 text-light-4">Circle not found</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-dark-2 rounded-xl p-6 border border-dark-4">
        <h1 className="text-2xl font-bold text-light-1">{circle.name}</h1>
        {circle.description && <p className="text-light-4 mt-2">{circle.description}</p>}
        <div className="flex items-center gap-4 mt-3 text-sm text-light-4">
          <span className="flex items-center gap-1"><Users size={14} /> {members.length} members</span>
          <span className="capitalize">{circle.type}</span>
        </div>
      </div>

      {isMember && (
        <div className="bg-dark-2 rounded-xl p-4 border border-dark-4">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Share something with this circle..."
            className="w-full bg-dark-3 border border-dark-5 rounded-lg p-3 text-sm text-light-1 min-h-[80px] resize-none"
          />
          <div className="flex justify-end mt-2">
            <button onClick={handlePost} className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm">
              <Send size={14} />
              Post
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {posts.map(post => (
          <div key={post.id} className="bg-dark-2 rounded-xl p-4 border border-dark-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs">
                {post.author?.full_name?.charAt(0) || '?'}
              </div>
              <span className="text-sm text-light-2">{post.author?.full_name}</span>
              <span className="text-xs text-light-5 ml-auto">
                {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <p className="text-sm text-light-3">{post.content}</p>
          </div>
        ))}
        {posts.length === 0 && <p className="text-center py-8 text-light-4">No posts in this circle yet</p>}
      </div>
    </div>
  )
}
