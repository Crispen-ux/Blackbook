'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import { Heart, MessageCircle, Share2, Trash2, BadgeCheck, ImageIcon } from 'lucide-react'
import { ImageLightbox } from '@/components/shared/ImageLightbox'

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
  const [lightboxOpen, setLightboxOpen] = useState(false)
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

    supabase.rpc('toggle_post_like', { p_post_id: post.id }).then()
  }

  const handleDelete = async () => {
    await supabase.from('posts').delete().match({ id: post.id })
    onRefresh?.()
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/feed/${post.id}`
    if (navigator.share) {
      navigator.share({ title: 'BlackBook Post', url })
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <>
      <div className="group bg-dark-2 rounded-2xl border border-dark-4 hover:border-primary-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/5">
        <div className="p-5">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <Link href={`/profile/${post.author.id}`} className="shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {post.author.full_name?.charAt(0) || '?'}
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              {/* Author row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/profile/${post.author.id}`} className="font-semibold text-light-1 text-sm hover:text-primary-500 transition">
                  {post.author.full_name}
                </Link>
                <div className="flex items-center gap-1.5 text-light-4 text-xs truncate">
                  {post.author.position && (
                    <span className="truncate max-w-[160px] sm:max-w-[240px]">
                      {post.author.position}{post.author.company ? ` at ${post.author.company}` : ''}
                    </span>
                  )}
                </div>
                <span className="text-light-5 text-xs ml-auto shrink-0">{formatRelativeTime(post.created_at)}</span>
              </div>

              {/* Content */}
              <p className="mt-2 text-light-2 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>

              {/* Image */}
              {post.image_url && (
                <button onClick={() => setLightboxOpen(true)} className="mt-3 w-full rounded-xl overflow-hidden border border-dark-4 hover:border-primary-500/30 transition group/image">
                  <img
                    src={post.image_url}
                    alt=""
                    className="max-h-96 w-full object-cover group-hover/image:scale-[1.02] transition-transform duration-300"
                  />
                </button>
              )}

              {/* Action bar */}
              <div className="flex items-center gap-1 mt-4 pt-3 border-t border-dark-4">
                {/* Like */}
                <button onClick={handleLike} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  isLiked ? 'text-accent bg-accent/5' : 'text-light-4 hover:text-accent hover:bg-accent/5'
                }`}>
                  <Heart size={16} className={isLiked ? 'fill-accent' : ''} />
                  <span className="text-xs font-medium">{likeCount}</span>
                </button>

                {/* Comment */}
                <Link
                  href={`/feed/${post.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-light-4 hover:text-primary-500 hover:bg-primary-500/5 transition"
                >
                  <MessageCircle size={16} />
                  <span className="text-xs font-medium">{post.comments?.length || 0}</span>
                </Link>

                {/* Share */}
                <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-light-4 hover:text-primary-500 hover:bg-primary-500/5 transition">
                  <Share2 size={16} />
                  <span className="text-xs hidden sm:inline">Share</span>
                </button>

                {/* Delete */}
                {currentUserId === post.author_id && (
                  <button onClick={handleDelete} className="ml-auto p-1.5 rounded-lg text-light-4 hover:text-accent hover:bg-accent/5 transition">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && post.image_url && (
        <ImageLightbox src={post.image_url} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  )
}
