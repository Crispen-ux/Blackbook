'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostCard } from '@/components/cards/PostCard'
import { FileUpload } from '@/components/shared/FileUpload'
import { ImagePlus, Loader2, Sparkles } from 'lucide-react'

interface Post {
  id: string
  content: string
  image_url: string | null
  created_at: string
  author_id: string
  author: { id: string; full_name: string; avatar_url: string | null; position: string | null; company: string | null }
  likes: { user_id: string }[]
  comments: { id: string }[]
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [postImage, setPostImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [useSmartFeed, setUseSmartFeed] = useState(false)
  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (useSmartFeed && user) {
      // Smart ranked feed using ML scoring
      const { data: ranked } = await supabase.rpc('get_ranked_feed', {
        p_user_id: user.id,
        p_limit: 50,
        p_offset: 0,
      })

      if (ranked) {
        const transformed: Post[] = ranked.map((r: any) => ({
          id: r.id,
          content: r.content,
          image_url: r.image_url,
          created_at: r.created_at,
          author_id: r.author_id,
          author: {
            id: r.author_id,
            full_name: r.author_full_name,
            avatar_url: r.author_avatar_url,
            position: r.author_position,
            company: r.author_company,
          },
          likes: r.is_liked
            ? [{ user_id: user.id }, ...Array(Math.max(0, Number(r.like_count) - 1)).fill({ user_id: '' })]
            : Array(Number(r.like_count)).fill({ user_id: '' }),
          comments: Array(Number(r.comment_count)).fill({ id: '' }),
        }))
        setPosts(transformed)
      }
    } else {
      // Chronological feed (default)
      const { data } = await supabase
        .from('posts')
        .select('*, author:author_id(id, full_name, avatar_url, position, company), likes:post_likes(user_id), comments:comments(id)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setPosts(data)
    }

    setLoading(false)
  }, [supabase, useSmartFeed])

  useEffect(() => {
    fetchPosts()
    // Track daily activity for streak
    supabase.rpc('log_daily_activity', { p_actions: { feed_view: true } }).then(() => {})
  }, [supabase, fetchPosts])

  const handlePost = async () => {
    if (!newPost.trim()) return
    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('posts').insert({
      author_id: user.id,
      content: newPost.trim(),
      image_url: postImage,
    })
    setNewPost('')
    setPostImage(null)
    setPosting(false)
    fetchPosts()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-1">Feed</h1>
        <label className="flex items-center gap-2 cursor-pointer">
          <Sparkles size={16} className={useSmartFeed ? 'text-primary-500' : 'text-light-4'} />
          <span className="text-sm text-light-4">Smart feed</span>
          <button
            onClick={() => { setUseSmartFeed(!useSmartFeed); setLoading(true) }}
            className={`w-10 h-5 rounded-full transition relative ${useSmartFeed ? 'bg-primary-500' : 'bg-dark-4'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${useSmartFeed ? 'left-5' : 'left-0.5'}`} />
          </button>
        </label>
      </div>

      <div className="bg-dark-2 rounded-xl p-4 border border-dark-4">
        <textarea
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          placeholder="Share your thoughts..."
          className="w-full bg-transparent text-light-1 placeholder-light-4 resize-none outline-none min-h-[80px]"
          maxLength={2000}
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-4">
          <FileUpload
            bucket="posts"
            path={`posts`}
            onUpload={(url) => setPostImage(url)}
            maxSize={4194304}
          >
            <button type="button" className={`text-light-4 hover:text-primary-500 transition ${postImage ? 'text-primary-500' : ''}`}>
              <ImagePlus size={20} />
            </button>
          </FileUpload>
          <button
            onClick={handlePost}
            disabled={!newPost.trim() || posting}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition text-sm"
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onRefresh={fetchPosts} />
        ))}
        {posts.length === 0 && (
          <p className="text-light-4 text-center py-10">No posts yet. Be the first to share!</p>
        )}
      </div>
    </div>
  )
}
