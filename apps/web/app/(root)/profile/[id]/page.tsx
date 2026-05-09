'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { Loader2, Mail, Briefcase, BadgeCheck, ThumbsUp, MessageSquareQuote, Send, Star, Heart } from 'lucide-react'

export default function UserProfilePage() {
  const { id } = useParams()
  const [profile, setProfile] = useState<any>(null)
  const [endorsements, setEndorsements] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [endorsingSkill, setEndorsingSkill] = useState<string | null>(null)
  const [showRecommendForm, setShowRecommendForm] = useState(false)
  const [recContent, setRecContent] = useState('')
  const [recRelation, setRecRelation] = useState('colleague')
  const [showTip, setShowTip] = useState(false)
  const [tipAmount, setTipAmount] = useState(50)
  const [tipMessage, setTipMessage] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setCurrentUserId(user.id)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (prof) setProfile(prof)

      const { data: end } = await supabase.rpc('get_endorsements_with_counts', { p_user_id: id })
      if (end) setEndorsements(end)

      const { data: rec } = await supabase
        .from('recommendations')
        .select('*, author:profiles!author_id(full_name, avatar_url, position, company)')
        .eq('recipient_id', id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      if (rec) setRecommendations(rec)

      setLoading(false)
    }
    fetch()
  }, [id, supabase, router])

  const handleEndorse = async (skill: string) => {
    if (!currentUserId || endorsingSkill) return
    setEndorsingSkill(skill)
    await supabase.rpc('endorse_skill', { p_endorsed_user_id: id, p_skill: skill })
    setEndorsements(prev => {
      const existing = prev.find(e => e.skill === skill)
      if (existing) {
        return prev.map(e => e.skill === skill ? { ...e, count: e.count + 1 } : e)
      }
      return [...prev, { skill, count: 1 }]
    })
    setEndorsingSkill(null)
  }

  const handleTip = async () => {
    if (!currentUserId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single()
    const { data } = await supabase.functions.invoke('paystack-initialize', {
      body: {
        email: profile?.email,
        amount: tipAmount * 100,
        metadata: {
          type: 'tip',
          recipient_id: id,
          sender_id: user.id,
          message: tipMessage,
        },
      },
    })
    if (data?.authorization_url) {
      window.location.href = data.authorization_url
    }
  }

  const handleSubmitRecommendation = async () => {
    if (!currentUserId || recContent.length < 20) return
    await supabase.from('recommendations').insert({
      author_id: currentUserId,
      recipient_id: id,
      content: recContent,
      relationship: recRelation,
    })
    setRecContent('')
    setShowRecommendForm(false)
    setRecRelation('colleague')
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  }
  if (!profile) return <div className="text-center py-20 text-light-4">User not found</div>

  const skills = profile.skills || []

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-dark-2 rounded-xl p-6 border border-dark-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {profile.full_name?.charAt(0) || '?'}
            </div>
            {profile.is_verified && (
              <BadgeCheck size={22} className="absolute -bottom-1 -right-1 text-primary-500 bg-dark-2 rounded-full" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-light-1">{profile.full_name}</h1>
              {profile.is_verified && <BadgeCheck size={20} className="text-primary-500" />}
            </div>
            {profile.position && (
              <p className="text-light-4 text-sm mt-1">
                <Briefcase size={14} className="inline mr-1" />
                {profile.position}{profile.company ? ` at ${profile.company}` : ''}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-light-4">
              <span className="flex items-center gap-1"><Mail size={14} />{profile.email}</span>
              <span>Member since {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>
        {profile.bio && <p className="mt-4 text-light-2">{profile.bio}</p>}
      </div>

      {/* Skills & Endorsements */}
      {skills.length > 0 && (
        <div className="bg-dark-2 rounded-xl p-6 border border-dark-4">
          <div className="flex items-center gap-2 mb-4">
            <Star size={16} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-light-1">Skills & Endorsements</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {skills.map((skill: string) => {
              const endorsement = endorsements.find(e => e.skill === skill)
              const count = endorsement?.count || 0
              return (
                <div key={skill} className="bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-sm text-light-2">{skill}</span>
                  <span className="text-xs text-primary-500 font-medium">{count}</span>
                  <button
                    onClick={() => handleEndorse(skill)}
                    disabled={endorsingSkill === skill}
                    className="p-1 text-light-4 hover:text-primary-500 transition"
                  >
                    <ThumbsUp size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-dark-2 rounded-xl p-6 border border-dark-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquareQuote size={16} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-light-1">Recommendations</h2>
          </div>
          <button
            onClick={() => setShowRecommendForm(!showRecommendForm)}
            className="text-sm text-primary-500 hover:underline"
          >
            {showRecommendForm ? 'Cancel' : 'Write a recommendation'}
          </button>
        </div>

        {showRecommendForm && (
          <div className="mb-4 p-4 bg-dark-3 border border-dark-4 rounded-lg">
            <select
              value={recRelation}
              onChange={e => setRecRelation(e.target.value)}
              className="w-full bg-dark-4 border border-dark-5 rounded-lg px-3 py-2 text-sm text-light-2 mb-3"
            >
              <option value="colleague">Colleague</option>
              <option value="mentor">Mentor</option>
              <option value="mentee">Mentee</option>
              <option value="manager">Manager</option>
              <option value="client">Client</option>
              <option value="other">Other</option>
            </select>
            <textarea
              value={recContent}
              onChange={e => setRecContent(e.target.value)}
              placeholder="Write your recommendation (min 20 characters)..."
              className="w-full bg-dark-4 border border-dark-5 rounded-lg px-3 py-2 text-sm text-light-2 min-h-[100px] resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-light-5">{recContent.length}/2000</span>
              <button
                onClick={handleSubmitRecommendation}
                disabled={recContent.length < 20}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm disabled:opacity-50"
              >
                <Send size={14} />
                Send
              </button>
            </div>
          </div>
        )}

        {recommendations.length === 0 ? (
          <p className="text-light-4 text-sm text-center py-4">No recommendations yet</p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((r: any) => (
              <div key={r.id} className="bg-dark-3 border border-dark-4 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-medium">
                    {r.author?.full_name?.charAt(0) || '?'}
                  </div>
                  <p className="text-sm text-light-2 font-medium">{r.author?.full_name}</p>
                  <span className="text-xs text-light-5 ml-auto capitalize">{r.relationship}</span>
                </div>
                <p className="text-sm text-light-3 leading-relaxed">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {currentUserId !== id && (
        <div className="flex gap-3">
          <Link
            href={`/messages?userId=${id}`}
            className="flex-1 text-center py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition"
          >
            Send Message
          </Link>
          <button
            onClick={() => setShowTip(!showTip)}
            className="flex items-center justify-center gap-2 py-3 px-6 bg-dark-3 border border-dark-4 text-light-2 rounded-xl font-medium hover:border-primary-500/50 transition"
          >
            <Heart size={16} />
            Tip
          </button>
        </div>
      )}

      {showTip && (
        <div className="bg-dark-2 border border-dark-4 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-light-1">Send a tip to {profile.full_name}</h3>
          <div className="flex gap-2">
            {[20, 50, 100, 200, 500].map(amount => (
              <button
                key={amount}
                onClick={() => setTipAmount(amount)}
                className={`flex-1 py-2 rounded-lg text-sm transition ${
                  tipAmount === amount ? 'bg-primary-500 text-white' : 'bg-dark-3 text-light-4 border border-dark-4'
                }`}
              >
                R{amount}
              </button>
            ))}
          </div>
          <input
            value={tipMessage}
            onChange={e => setTipMessage(e.target.value)}
            placeholder="Add a message (optional)"
            className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-light-2"
          />
          <button
            onClick={handleTip}
            className="w-full py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium"
          >
            Send R{tipAmount}
          </button>
        </div>
      )}
    </div>
  )
}
