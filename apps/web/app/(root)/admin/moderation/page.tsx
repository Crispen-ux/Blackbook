'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, AlertTriangle } from 'lucide-react'

interface ModerationItem {
  id: string
  type: 'post' | 'comment'
  content: string
  author_name: string
  created_at: string
  reports_count?: number
}

export default function AdminModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const [postsRes, commentsRes] = await Promise.all([
        supabase.from('posts').select('id, content, created_at, author:profiles(full_name)').order('created_at', { ascending: false }).limit(20),
        supabase.from('comments').select('id, content, created_at, author:profiles(full_name)').order('created_at', { ascending: false }).limit(20),
      ])

      const posts: ModerationItem[] = (postsRes.data || []).map(p => ({
        id: p.id, type: 'post', content: p.content, author_name: (p.author as any)?.full_name || 'Unknown', created_at: p.created_at,
      }))
      const comments: ModerationItem[] = (commentsRes.data || []).map(c => ({
        id: c.id, type: 'comment', content: c.content, author_name: (c.author as any)?.full_name || 'Unknown', created_at: c.created_at,
      }))

      setItems([...posts, ...comments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      setLoading(false)
    }
    fetch()
  }, [supabase])

  const handleDelete = async (item: ModerationItem) => {
    const fn = item.type === 'post' ? 'moderator_delete_post' : 'moderator_delete_comment'
    const { error } = await supabase.rpc(fn, item.type === 'post' ? { p_post_id: item.id } : { p_comment_id: item.id })
    if (!error) setItems(prev => prev.filter(i => i.id !== item.id))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-light-1 mb-6">Content Moderation</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-light-4">No content to moderate</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-dark-3 border border-dark-4 rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.type === 'post' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    {item.type}
                  </span>
                  <span className="text-light-4 text-xs">{item.author_name}</span>
                  <span className="text-light-5 text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-light-2 text-sm line-clamp-3">{item.content}</p>
              </div>
              <button
                onClick={() => handleDelete(item)}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
