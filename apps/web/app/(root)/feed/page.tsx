'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostCard } from '@/components/cards/PostCard'
import { FileUpload } from '@/components/shared/FileUpload'
import { Loader2, Sparkles, Hash, TrendingUp, ImageIcon, X, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

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

type FeedTab = 'smart' | 'latest' | 'trending'

const tabs: { key: FeedTab; label: string; icon: typeof Sparkles }[] = [
  { key: 'smart', label: 'For You', icon: Sparkles },
  { key: 'latest', label: 'Latest', icon: Hash },
  { key: 'trending', label: 'Trending', icon: TrendingUp },
]

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [postImage, setPostImage] = useState<string | null>(null)
  const [postImageFile, setPostImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [posting, setPosting] = useState(false)
  const [activeTab, setActiveTab] = useState<FeedTab>('smart')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; full_name: string } | null>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const POSTS_PER_PAGE = 10

  const fetchPosts = useCallback(async (append = false) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (!append) setCurrentUser({ id: user.id, full_name: user.user_metadata?.full_name || '' })

    const currentOffset = append ? offset : 0
    const limit = POSTS_PER_PAGE

    if (activeTab === 'smart' && user) {
      const { data: ranked } = await supabase.rpc('get_ranked_feed', {
        p_user_id: user.id,
        p_limit: limit,
        p_offset: currentOffset,
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
        setPosts(prev => append ? [...prev, ...transformed] : transformed)
        setHasMore(ranked.length === limit)
      }
    } else if (activeTab === 'trending') {
      const { data } = await supabase
        .from('posts')
        .select('*, author:author_id(id, full_name, avatar_url, position, company), likes:post_likes(user_id), comments:comments(id)')
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(currentOffset, currentOffset + limit - 1)

      if (data) {
        const sorted = [...data].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
        setPosts(prev => append ? [...prev, ...sorted] : sorted)
        setHasMore(data.length === limit)
      }
    } else {
      const { data } = await supabase
        .from('posts')
        .select('*, author:author_id(id, full_name, avatar_url, position, company), likes:post_likes(user_id), comments:comments(id)')
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(currentOffset, currentOffset + limit - 1)
      if (data) {
        setPosts(prev => append ? [...prev, ...data] : data)
        setHasMore(data.length === limit)
      }
    }

    setLoading(false)
    setLoadingMore(false)
    if (!append) setOffset(limit)
    else setOffset(prev => prev + limit)
  }, [supabase, activeTab, offset])

  // Fetch trending posts separately (top 3 by engagement)
  useEffect(() => {
    const fetchTrending = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, author:author_id(id, full_name, avatar_url, position, company), likes:post_likes(user_id), comments:comments(id)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) {
        const sorted = [...data].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
        setTrendingPosts(sorted.slice(0, 3))
      }
    }
    fetchTrending()
  }, [])

  useEffect(() => {
    setLoading(true)
    setOffset(0)
    setHasMore(true)
    fetchPosts()
  }, [activeTab])

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        setLoadingMore(true)
        fetchPosts(true)
      }
    }, { rootMargin: '200px' })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, fetchPosts])

  // Real-time new post notification
  useEffect(() => {
    const channel = supabase
      .channel('feed-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        const newPost = payload.new as any
        supabase
          .from('posts')
          .select('*, author:author_id(id, full_name, avatar_url, position, company), likes:post_likes(user_id), comments:comments(id)')
          .eq('id', newPost.id)
          .single()
          .then(({ data }) => {
            if (data && activeTab === 'latest') setPosts(prev => [data as any, ...prev])
          })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, activeTab])

  // Track daily activity
  useEffect(() => {
    supabase.rpc('log_daily_activity', { p_actions: { feed_view: true } }).then(() => {})
  }, [])

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
    setPostImageFile(null)
    setPosting(false)

    if (activeTab === 'latest') fetchPosts()
    else setActiveTab('latest')
  }

  const handleImageSelect = (url: string) => {
    setPostImage(url)
  }

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-1">Feed</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-2 rounded-xl p-1 border border-dark-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-lg text-sm font-medium transition',
              activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-light-4 hover:text-light-1'
            )}
          >
            <tab.icon size={15} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Trending bar (only on For You tab) */}
      {activeTab === 'smart' && trendingPosts.length > 0 && (
        <div className="bg-dark-2 rounded-2xl border border-primary-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-primary-500" />
            <h2 className="text-sm font-semibold text-light-1">Trending today</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {trendingPosts.map((post, i) => (
              <a
                key={post.id}
                href={`/feed/${post.id}`}
                className="flex-shrink-0 w-56 bg-dark-3 rounded-xl p-3 border border-dark-4 hover:border-primary-500/30 transition"
              >
                <div className="flex items-center gap-1.5 text-xs text-light-4 mb-1">
                  <TrendingUp size={12} className="text-primary-500" />
                  #{i + 1} trending
                </div>
                <p className="text-xs text-light-2 line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-light-5">
                  <span>{post.likes?.length || 0} likes</span>
                  <span>{post.comments?.length || 0} comments</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="bg-dark-2 rounded-2xl border border-dark-4 overflow-hidden">
        <div className="flex items-start gap-3 p-4 pb-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {currentUser?.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <textarea
              ref={composerRef}
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full bg-transparent text-light-1 placeholder-light-4 resize-none outline-none min-h-[48px] text-sm leading-relaxed"
              maxLength={2000}
              rows={newPost ? 3 : 1}
            />
          </div>
        </div>

        {/* Image preview */}
        {postImage && (
          <div className="relative mx-4 mt-3">
            <img src={postImage} alt="" className="w-full max-h-48 object-cover rounded-xl border border-dark-4" />
            <button
              onClick={() => { setPostImage(null); setPostImageFile(null) }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 mt-1 border-t border-dark-4">
          <FileUpload
            bucket="posts"
            path={`posts`}
            onUpload={handleImageSelect}
            maxSize={4194304}
          >
            <button type="button" className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition',
              postImage ? 'text-primary-500 bg-primary-500/10' : 'text-light-4 hover:text-primary-500 hover:bg-dark-3'
            )}>
              <ImageIcon size={16} />
              <span className="text-xs hidden sm:inline">Photo</span>
            </button>
          </FileUpload>

          <div className="flex items-center gap-3">
            <span className={cn(
              'text-xs',
              newPost.length > 1900 ? 'text-amber-400' : 'text-light-5'
            )}>
              {newPost.length}/2000
            </span>
            <button
              onClick={handlePost}
              disabled={!newPost.trim() || posting}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition text-sm"
            >
              {posting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              <span className="hidden sm:inline">Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onRefresh={() => fetchPosts()} />
        ))}

        {/* Loading more */}
        {loadingMore && (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-primary-500" size={24} />
          </div>
        )}

        {/* Empty */}
        {!loading && posts.length === 0 && (
          <div className="text-center py-16 bg-dark-2 rounded-2xl border border-dark-4">
            <Hash size={40} className="mx-auto text-dark-4 mb-4" />
            <h3 className="text-lg font-semibold text-light-1 mb-1">No posts yet</h3>
            <p className="text-sm text-light-4">Be the first to share something with the community!</p>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {/* End of feed */}
        {!hasMore && posts.length > 0 && (
          <p className="text-center text-xs text-light-5 py-4">You&apos;ve caught up! Check back later.</p>
        )}
      </div>
    </div>
  )
}
