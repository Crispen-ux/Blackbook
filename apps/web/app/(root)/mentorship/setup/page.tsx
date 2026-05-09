'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MentorSetupPage() {
  const [form, setForm] = useState({
    bio: '', expertise: '', hourly_rate: '', currency: 'ZAR',
    industry: '', years_experience: '', languages: '', certifications: '',
    target_mentee_profile: '', mentee_goals: '',
  })
  const [existing, setExisting] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data } = await supabase.from('mentor_profiles').select('*').eq('user_id', user.id).maybeSingle()
      if (data) {
        setExisting(data)
        setForm({
          bio: data.bio || '',
          expertise: data.expertise?.join(', ') || '',
          hourly_rate: data.hourly_rate?.toString() || '',
          currency: data.currency || 'ZAR',
          industry: data.industry?.join(', ') || '',
          years_experience: data.years_experience?.toString() || '',
          languages: data.languages?.join(', ') || '',
          certifications: data.certifications?.join(', ') || '',
          target_mentee_profile: data.target_mentee_profile || '',
          mentee_goals: data.mentee_goals?.join(', ') || '',
        })
      }
      setLoading(false)
    }
    fetch()
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      bio: form.bio,
      expertise: form.expertise.split(',').map(s => s.trim()).filter(Boolean),
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      currency: form.currency,
      is_available: true,
      industry: form.industry.split(',').map(s => s.trim()).filter(Boolean),
      years_experience: parseInt(form.years_experience) || 0,
      languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
      certifications: form.certifications.split(',').map(s => s.trim()).filter(Boolean),
      target_mentee_profile: form.target_mentee_profile,
      mentee_goals: form.mentee_goals.split(',').map(s => s.trim()).filter(Boolean),
    }

    if (existing) {
      await supabase.from('mentor_profiles').update(payload).eq('user_id', user.id)
    } else {
      await supabase.from('mentor_profiles').insert(payload)
    }

    setSaving(false)
    router.push('/mentorship')
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-light-1">
        {existing ? 'Edit Mentor Profile' : 'Become a Mentor'}
      </h1>
      <p className="text-light-4">Share your expertise and help others grow. Your profile will be matched with mentees using AI.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-light-3 mb-1">Bio *</label>
          <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 min-h-[100px]" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Expertise (comma-separated) *</label>
            <input value={form.expertise} onChange={e => setForm(f => ({ ...f, expertise: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1"
              placeholder="JavaScript, Leadership, Finance" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Industry (comma-separated)</label>
            <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1"
              placeholder="Tech, Finance, Healthcare" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Hourly Rate (ZAR)</label>
            <input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Years Experience</label>
            <input type="number" value={form.years_experience} onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Languages</label>
            <input value={form.languages} onChange={e => setForm(f => ({ ...f, languages: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1"
              placeholder="English, Zulu, Afrikaans" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-light-3 mb-1">Certifications (comma-separated)</label>
          <input value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))}
            className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1"
            placeholder="PMP, CFA, AWS Certified" />
        </div>

        <div>
          <label className="block text-sm font-medium text-light-3 mb-1">Ideal Mentee Profile</label>
          <textarea value={form.target_mentee_profile} onChange={e => setForm(f => ({ ...f, target_mentee_profile: e.target.value }))}
            className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 min-h-[80px]"
            placeholder="Describe who you'd like to mentor (e.g., early-career tech founders)" />
        </div>

        <div>
          <label className="block text-sm font-medium text-light-3 mb-1">Goals I Can Help With (comma-separated)</label>
          <input value={form.mentee_goals} onChange={e => setForm(f => ({ ...f, mentee_goals: e.target.value }))}
            className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1"
            placeholder="Career transition, Fundraising, Executive leadership" />
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-semibold transition">
          {saving ? 'Saving...' : existing ? 'Update Profile' : 'Activate Mentorship'}
        </button>
      </form>
    </div>
  )
}
