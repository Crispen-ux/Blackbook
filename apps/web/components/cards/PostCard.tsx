'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import { Heart, MessageCircle, Trash2 } from 'lucide-react'

interface PostCardProps {
  post: {
    id: string
    content: string
    image_url: string | null
    created_at: string
    author_id: string
    author: { id: string; full_name: string; avatar_url: string | null; position: string | null; company: string | null }
    likes: { user_id: string }[]
    comments: { id: string }[]
  }
  onRefresh?: () => void
}

export function PostCard({ post, onRefresh }: PostCardProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id)
        setIsLiked(post.likes?.some(l => l.user_id === user.id) ?? false)
        setLikeCount(post.likes?.length || 0)
      }
    })
  }, [])

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newLiked = !isLiked

    setIsLiked(newLiked)
    setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1))

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/post_likes`
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }

    if (newLiked) {
      fetch(url, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ post_id: post.id, user_id: user.id }),
      })
    } else {
      fetch(`${url}?post_id=eq.${post.id}&user_id=eq.${user.id}`, {
        method: 'DELETE',
        headers,
      })
    }
  }

  const handleDelete = async () => {
    await supabase.from('posts').delete().match({ id: post.id })
    onRefresh?.()
  }

  return (
    <div className="bg-dark-2 rounded-xl p-4 border border-dark-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {post.author.full_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-light-1 text-sm">{post.author.full_name}</span>
            {post.author.position && (
              <span className="text-light-4 text-xs truncate max-w-[180px] sm:max-w-none">
                {post.author.position}{post.author.company ? ` at ${post.author.company}` : ''}
              </span>
            )}
            <span className="text-light-4 text-xs ml-auto shrink-0">{formatRelativeTime(post.created_at)}</span>
          </div>
          <p className="mt-2 text-light-2 text-sm whitespace-pre-wrap">{post.content}</p>
          {post.image_url && (
            <img src={post.image_url} alt="" className="mt-3 rounded-lg max-h-96 w-full object-cover" />
          )}
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-dark-4">
            <button onClick={handleLike} className="flex items-center gap-1.5 text-sm transition">
              <Heart size={16} className={isLiked ? 'fill-accent text-accent' : 'text-light-4 hover:text-accent'} />
              <span className={isLiked ? 'text-accent' : 'text-light-4'}>{likeCount}</span>
            </button>
            <Link
              href={`/feed/${post.id}`}
              className="flex items-center gap-1.5 text-sm text-light-4 hover:text-primary-500 transition"
            >
              <MessageCircle size={16} />
              <span>{post.comments?.length || 0}</span>
              <span className="hidden sm:inline ml-0.5 text-xs">Reply</span>
            </Link>
            {currentUserId === post.author_id && (
              <button onClick={handleDelete} className="ml-auto text-light-4 hover:text-accent transition">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
