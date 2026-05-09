'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import { Heart, Send, ArrowLeft, Loader2, Trash2, MessageCircle } from 'lucide-react'

interface Comment {
  id: string
  content: string
  author_id: string
  created_at: string
  author: { id: string; full_name: string; avatar_url: string | null } | null
}

interface PostDetail {
  id: string
  content: string
  image_url: string | null
  created_at: string
  author_id: string
  author: { id: string; full_name: string; avatar_url: string | null; position: string | null; company: string | null } | null
  likes: { user_id: string }[]
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      const { data: postData, error: postErr } = await supabase
        .from('posts')
        .select('*, author:author_id(id, full_name, avatar_url, position, company), likes:post_likes(user_id)')
        .eq('id', id)
        .single()

      if (postErr || !postData) {
        setError('Post not found')
        setLoading(false)
        return
      }
      setPost(postData as any)

      const { data: commentData } = await supabase
        .from('comments')
        .select('*, author:author_id(id, full_name, avatar_url)')
        .eq('post_id', id)
        .order('created_at', { ascending: true })

      if (commentData) setComments(commentData as any)
      setLoading(false)
    }
    fetchData()
  }, [id, supabase])

  const handleLike = async () => {
    if (!post || !currentUserId) return
    const newLiked = !post.likes?.some(l => l.user_id === currentUserId)

    if (newLiked) {
      setPost({ ...post, likes: [...post.likes, { user_id: currentUserId }] })
      try { await supabase.from('post_likes').insert({ post_id: id, user_id: currentUserId }) } catch {}
    } else {
      setPost({ ...post, likes: post.likes.filter(l => l.user_id !== currentUserId) })
      try { await supabase.from('post_likes').delete().match({ post_id: id, user_id: currentUserId }) } catch {}
    }
  }

  const handleComment = async () => {
    if (!commentText.trim() || !currentUserId || !post) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: id, author_id: currentUserId, content: commentText.trim() })
      .select('*, author:author_id(id, full_name, avatar_url)')
      .single()

    if (error || !data) {
      setSubmitting(false)
      return
    }

    setComments(prev => [...prev, data as any])
    setCommentText('')
    setSubmitting(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().match({ id: commentId })
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  }

  if (error || !post) {
    return <div className="text-center py-20 text-light-4">{error || 'Post not found'}</div>
  }

  const isLiked = post.likes?.some(l => l.user_id === currentUserId) ?? false

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-light-4 hover:text-light-1 transition">
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </button>

      <div className="bg-dark-2 rounded-xl p-4 border border-dark-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {post.author?.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-light-1 text-sm">{post.author?.full_name}</span>
              {post.author?.position && (
                <span className="text-light-4 text-xs">
                  {post.author.position}{post.author.company ? ` at ${post.author.company}` : ''}
                </span>
              )}
              <span className="text-light-4 text-xs ml-auto">{formatRelativeTime(post.created_at)}</span>
            </div>
            <p className="mt-2 text-light-2 text-sm whitespace-pre-wrap">{post.content}</p>
            {post.image_url && (
              <img src={post.image_url} alt="" className="mt-3 rounded-lg max-h-96 w-full object-cover" />
            )}
            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-dark-4">
              <button onClick={handleLike} className="flex items-center gap-1.5 text-sm transition">
                <Heart size={16} className={isLiked ? 'fill-accent text-accent' : 'text-light-4 hover:text-accent'} />
                <span className={isLiked ? 'text-accent' : 'text-light-4'}>{post.likes?.length || 0}</span>
              </button>
              <button className="flex items-center gap-1.5 text-sm text-light-4">
                <MessageCircle size={16} />
                <span>{comments.length} replies</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-dark-2 rounded-xl border border-dark-4">
        <div className="p-4 border-b border-dark-4">
          <h3 className="text-sm font-semibold text-light-1">Comments ({comments.length})</h3>
        </div>
        {comments.length === 0 ? (
          <p className="text-light-4 text-sm text-center py-8">No comments yet. Write one below!</p>
        ) : (
          <div className="divide-y divide-dark-4">
            {comments.map(comment => (
              <div key={comment.id} className="p-4 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-dark-4 flex items-center justify-center text-light-1 font-bold text-xs shrink-0">
                  {comment.author?.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-light-1 text-sm">{comment.author?.full_name}</span>
                    <span className="text-light-4 text-xs">{formatRelativeTime(comment.created_at)}</span>
                    {currentUserId === comment.author_id && (
                      <button onClick={() => handleDeleteComment(comment.id)} className="ml-auto text-light-4 hover:text-accent transition">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-light-2 text-sm mt-1">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-dark-2 rounded-xl p-4 border border-primary-500/30">
        <h4 className="text-sm font-semibold text-light-1 mb-3">Write a reply</h4>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleComment())}
            placeholder="Type your reply..."
            className="flex-1 px-4 py-2.5 bg-dark-3 border border-dark-4 rounded-lg text-light-1 placeholder-light-4 outline-none focus:border-primary-500 transition text-sm"
            autoFocus
          />
          <button
            onClick={handleComment}
            disabled={!commentText.trim() || submitting}
            className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition flex items-center gap-1.5"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span className="text-sm font-medium hidden sm:inline">Reply</span>
          </button>
        </div>
      </div>
    </div>
  )
}
