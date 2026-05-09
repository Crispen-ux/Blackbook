'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Star, Loader2, Sparkles, UserPlus } from 'lucide-react'

interface Mentor {
  user_id: string
  expertise: string[]
  bio: string
  hourly_rate: number
  currency: string
  is_available: boolean
  rating: number
  session_count: number
  industry?: string[]
  years_experience?: number
  languages?: string[]
  user: { id: string; full_name: string; avatar_url: string | null; position: string | null; company: string | null }
  match_score?: number
  match_reason?: string
}

export default function MentorshipPage() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [recommendations, setRecommendations] = useState<Mentor[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [tab, setTab] = useState<'recommended' | 'browse' | 'sessions'>('recommended')
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if user has mentor profile
      const { data: mp } = await supabase.from('mentor_profiles').select('user_id').eq('user_id', user.id).maybeSingle()
      setHasProfile(!!mp)

      // Fetch all mentors
      const { data: m } = await supabase
        .from('mentor_profiles')
        .select('*, user:user_id(id, full_name, avatar_url, position, company)')
        .eq('is_available', true)
      if (m) setMentors(m)

      // Fetch user sessions
      const { data: s } = await supabase
        .from('mentorship_sessions')
        .select('*, mentor:mentor_id(id, full_name), mentee:mentee_id(id, full_name)')
        .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      if (s) setSessions(s)

      // Get AI recommendations via the database function
      const { data: recs } = await supabase
        .rpc('get_mentor_recommendations', { p_user_id: user.id, p_limit: 6 })
      if (recs) {
        setRecommendations(recs.map((r: any) => ({
          user_id: r.user_id,
          user: { id: r.user_id, full_name: r.full_name, avatar_url: r.avatar_url, position: r.position, company: r.company },
          expertise: r.expertise,
          industry: r.industry,
          bio: r.bio,
          hourly_rate: r.hourly_rate,
          currency: r.currency,
          rating: r.rating,
          session_count: r.session_count,
          match_score: Math.round(r.match_score * 100),
          match_reason: '',
        })))
      }

      setLoading(false)
    }
    fetch()
  }, [supabase])

  const requestSession = async (mentorId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('mentorship_sessions').insert({
      mentor_id: mentorId,
      mentee_id: user.id,
      scheduled_time: new Date(Date.now() + 86400000).toISOString(),
      duration_minutes: 30,
      status: 'pending',
    })
  }

  const MentorCard = ({ mentor, showScore }: { mentor: Mentor; showScore?: boolean }) => (
    <div className="bg-dark-2 rounded-xl p-4 border border-dark-4 space-y-3 hover:border-primary-500/50 transition">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold shrink-0">
          {mentor.user.full_name?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-light-1 truncate">{mentor.user.full_name}</p>
          {mentor.user.position && <p className="text-sm text-light-4 truncate">{mentor.user.position}</p>}
        </div>
        <div className="flex items-center gap-1 text-yellow-400 shrink-0">
          <Star size={14} fill="currentColor" />
          <span className="text-sm text-light-1">{mentor.rating?.toFixed(1) || 'New'}</span>
        </div>
      </div>

      {showScore && mentor.match_score && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-600/10 rounded-lg">
          <Sparkles size={14} className="text-primary-500" />
          <span className="text-sm text-primary-500 font-medium">{mentor.match_score}% Match</span>
          {mentor.match_reason && <span className="text-xs text-light-4 ml-1">— {mentor.match_reason}</span>}
        </div>
      )}

      <p className="text-sm text-light-3 line-clamp-2">{mentor.bio}</p>

      {(mentor.expertise || mentor.industry) && (
        <div className="flex flex-wrap gap-1.5">
          {(mentor.expertise || []).slice(0, 4).map(skill => (
            <span key={skill} className="px-2 py-0.5 bg-dark-4 rounded text-xs text-light-3">{skill}</span>
          ))}
          {(mentor.industry || []).slice(0, 2).map(ind => (
            <span key={ind} className="px-2 py-0.5 bg-blue-500/10 rounded text-xs text-blue-400">{ind}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-dark-4">
        <div className="flex items-center gap-2 text-xs text-light-4">
          <span>{formatCurrency(mentor.hourly_rate, mentor.currency)}/hr</span>
          {mentor.years_experience && <span>&middot; {mentor.years_experience}yrs exp</span>}
          {mentor.session_count > 0 && <span>&middot; {mentor.session_count} sessions</span>}
        </div>
        <button onClick={() => requestSession(mentor.user_id)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition">
          Request
        </button>
      </div>
    </div>
  )

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-1">Mentorship</h1>
        <div className="flex items-center gap-3">
          <Link href="/mentorship/setup"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition">
            <UserPlus size={16} />
            {hasProfile ? 'Edit Profile' : 'Become a Mentor'}
          </Link>
          <div className="flex bg-dark-2 rounded-lg border border-dark-4 p-1">
            <button onClick={() => setTab('recommended')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1 ${
                tab === 'recommended' ? 'bg-primary-600 text-white' : 'text-light-4 hover:text-light-1'}`}>
              <Sparkles size={14} /> AI Picks
            </button>
            <button onClick={() => setTab('browse')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                tab === 'browse' ? 'bg-primary-600 text-white' : 'text-light-4 hover:text-light-1'}`}>All</button>
            <button onClick={() => setTab('sessions')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                tab === 'sessions' ? 'bg-primary-600 text-white' : 'text-light-4 hover:text-light-1'}`}>My Sessions</button>
          </div>
        </div>
      </div>

      {tab === 'recommended' && (
        <div className="space-y-4">
          {recommendations.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-light-4">
                <Sparkles size={16} className="text-primary-500" />
                <span className="text-sm">AI-matched mentors based on your profile, skills, and goals</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {recommendations.map(mentor => <MentorCard key={mentor.user_id} mentor={mentor} showScore />)}
              </div>
            </>
          )}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-light-1 mb-4">All Mentors</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {mentors.map(mentor => <MentorCard key={mentor.user_id} mentor={mentor} />)}
              {mentors.length === 0 && <p className="text-light-4 text-center py-10 col-span-2">No mentors available yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'browse' && (
        <div className="grid gap-4 md:grid-cols-2">
          {mentors.map(mentor => <MentorCard key={mentor.user_id} mentor={mentor} />)}
          {mentors.length === 0 && <p className="text-light-4 text-center py-10 col-span-2">No mentors available yet.</p>}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="bg-dark-2 rounded-xl p-4 border border-dark-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-light-1">Session with {session.mentor.full_name}</p>
                  <p className="text-sm text-light-4">{formatDate(session.scheduled_time)} &middot; {session.duration_minutes}min</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-medium ${
                  session.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  session.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{session.status}</span>
              </div>
              {session.price > 0 && <p className="text-sm text-light-4 mt-2">{formatCurrency(session.price, session.currency)}</p>}
            </div>
          ))}
          {sessions.length === 0 && <p className="text-light-4 text-center py-10">No sessions yet.</p>}
        </div>
      )}
    </div>
  )
}
