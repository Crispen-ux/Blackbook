'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { Settings, Loader2, Mail, Briefcase, Sparkles, Star, Target, Brain, BadgeCheck, ThumbsUp, MessageSquareQuote, Flame, Award } from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [endorsements, setEndorsements] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [streak, setStreak] = useState<any>(null)
  const [achievements, setAchievements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (prof) setProfile(prof)

      const { data: p } = await supabase
        .from('posts')
        .select('*, likes:post_likes(count), comments:comments(count)')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
      if (p) setPosts(p)

      const { data: end } = await supabase.rpc('get_endorsements_with_counts', { p_user_id: user.id })
      if (end) setEndorsements(end)

      const { data: rec } = await supabase
        .from('recommendations')
        .select('*, author:profiles!author_id(full_name, avatar_url, position, company)')
        .eq('recipient_id', user.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      if (rec) setRecommendations(rec)

      const { data: st } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (st) setStreak(st)

      const { data: ach } = await supabase.rpc('get_user_achievements', { p_user_id: user.id })
      if (ach) setAchievements(ach)

      setLoading(false)
    }
    fetch()
  }, [supabase, router])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  }
  if (!profile) return null

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-dark-2 rounded-xl p-6 border border-dark-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                {profile.full_name?.charAt(0) || '?'}
              </div>
              {profile.is_verified && (
                <BadgeCheck size={22} className="absolute -bottom-1 -right-1 text-primary-500 bg-dark-2 rounded-full" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-light-1">{profile.full_name}</h1>
                {profile.is_verified && <BadgeCheck size={20} className="text-primary-500" />}
              </div>
              {profile.position && (
                <div className="flex items-center gap-1.5 text-light-4 text-sm mt-1">
                  <Briefcase size={14} />
                  <span>{profile.position}{profile.company ? ` at ${profile.company}` : ''}</span>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-light-4">
                <div className="flex items-center gap-1.5"><Mail size={14} /><span>{profile.email}</span></div>
              </div>
            </div>
          </div>
          <Link href="/profile/edit" className="p-2 text-light-4 hover:text-primary-500 transition">
            <Settings size={20} />
          </Link>
        </div>
        {profile.bio && <p className="mt-4 text-light-2">{profile.bio}</p>}

        {(profile.industry || profile.skills?.length > 0 || profile.career_goals?.length > 0) && (
          <div className="mt-4 pt-4 border-t border-dark-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary-500" />
              <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">AI Matching Profile</span>
            </div>
            {profile.industry && (
              <div className="flex items-center gap-2 text-sm text-light-4">
                <Briefcase size={14} className="text-primary-500/70" />
                <span>Industry: <span className="text-light-2">{profile.industry}</span></span>
                <span className="text-dark-4">|</span>
                <span>{profile.years_experience || 0} years experience</span>
              </div>
            )}
            {profile.skills?.length > 0 && (
              <div className="flex items-start gap-2">
                <Brain size={14} className="text-primary-500/70 mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s: string) => (
                    <span key={s} className="px-2 py-0.5 bg-dark-4 rounded text-xs text-light-3">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.career_goals?.length > 0 && (
              <div className="flex items-start gap-2">
                <Target size={14} className="text-primary-500/70 mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  {profile.career_goals.map((g: string) => (
                    <span key={g} className="px-2 py-0.5 bg-primary-600/10 rounded text-xs text-primary-400">{g}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-dark-4 text-sm text-light-4">
          <span>Member since {formatDate(profile.created_at)}</span>
        </div>
      </div>

      {streak && (
        <div className="bg-dark-2 rounded-xl p-5 border border-dark-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Flame size={24} className={streak.current_streak > 0 ? 'text-orange-500' : 'text-light-5'} />
              <div>
                <p className="text-2xl font-bold text-light-1">{streak.current_streak}</p>
                <p className="text-xs text-light-4">Day streak</p>
              </div>
            </div>
            <div className="w-px h-10 bg-dark-4" />
            <div>
              <p className="text-lg font-bold text-light-1">{streak.longest_streak}</p>
              <p className="text-xs text-light-4">Longest streak</p>
            </div>
          </div>
        </div>
      )}

      {achievements.length > 0 && (
        <div className="bg-dark-2 rounded-xl p-5 border border-dark-4">
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-light-1">Achievements</h2>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {achievements.map((a: any) => (
              <div
                key={a.id}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg ${a.earned_at ? 'bg-dark-3' : 'bg-dark-4/50 opacity-40'}`}
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs text-center text-light-4 leading-tight">{a.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {endorsements.length > 0 && (
        <div className="bg-dark-2 rounded-xl p-6 border border-dark-4">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp size={16} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-light-1">Endorsements</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {endorsements.map((e: any) => (
              <div key={e.skill} className="bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-sm text-light-2">{e.skill}</span>
                <span className="text-xs text-primary-500 font-medium">{e.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="bg-dark-2 rounded-xl p-6 border border-dark-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquareQuote size={16} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-light-1">Recommendations</h2>
          </div>
          <div className="space-y-3">
            {recommendations.map((r: any) => (
              <div key={r.id} className="bg-dark-3 border border-dark-4 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-medium">
                    {r.author?.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm text-light-2 font-medium">{r.author?.full_name}</p>
                    <p className="text-xs text-light-5">{r.author?.position}{r.author?.company ? ` at ${r.author.company}` : ''}</p>
                  </div>
                  <span className="text-xs text-light-5 ml-auto capitalize">{r.relationship}</span>
                </div>
                <p className="text-sm text-light-3 leading-relaxed">{r.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-light-1 mb-4">Your Posts ({posts.length})</h2>
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-dark-2 rounded-xl p-4 border border-dark-4">
              <p className="text-light-2 text-sm">{post.content}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-light-4">
                <span>{post.likes?.[0]?.count || 0} likes</span>
                <span>{post.comments?.[0]?.count || 0} comments</span>
                <span>{formatDate(post.created_at)}</span>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-light-4 text-center py-6">No posts yet.</p>}
        </div>
      </div>
    </div>
  )
}
