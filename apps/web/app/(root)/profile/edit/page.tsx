'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/shared/FileUpload'

export default function EditProfilePage() {
  const [form, setForm] = useState({
    full_name: '', company: '', position: '', bio: '', phone: '', avatar_url: '',
    industry: '', skills: '', career_goals: '', interests: '', years_experience: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setForm({
        full_name: data.full_name || '',
        company: data.company || '',
        position: data.position || '',
        bio: data.bio || '',
        phone: data.phone || '',
        avatar_url: data.avatar_url || '',
        industry: data.industry || '',
        skills: (data.skills || []).join(', '),
        career_goals: (data.career_goals || []).join(', '),
        interests: (data.interests || []).join(', '),
        years_experience: data.years_experience?.toString() || '',
      })
      setLoading(false)
    }
    fetch()
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      full_name: form.full_name,
      company: form.company || null,
      position: form.position || null,
      bio: form.bio || null,
      phone: form.phone || null,
      avatar_url: form.avatar_url || null,
      industry: form.industry || null,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      career_goals: form.career_goals.split(',').map(s => s.trim()).filter(Boolean),
      interests: form.interests.split(',').map(s => s.trim()).filter(Boolean),
      years_experience: parseInt(form.years_experience) || 0,
    }).eq('id', user.id)

    setSaving(false)
    router.push('/profile')
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" /></div>

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-1">Edit Profile</h1>
        <div className="flex items-center gap-1.5 text-xs text-light-4 bg-dark-2 px-3 py-1.5 rounded-lg border border-dark-4">
          <span className="text-primary-500">*</span> Used for AI mentor matching
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                {form.full_name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <FileUpload
            bucket="avatars"
            path={`${typeof window !== 'undefined' ? '' : ''}`}
            onUpload={(url) => setForm(f => ({ ...f, avatar_url: url }))}
            maxSize={2097152}
          >
            <button type="button" className="px-4 py-2 bg-dark-3 border border-dark-4 rounded-lg text-sm text-light-3 hover:border-primary-500/50 transition">
              Change Photo
            </button>
          </FileUpload>
        </div>

        <div>
          <label className="block text-sm font-medium text-light-3 mb-1">Full Name</label>
          <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Company</label>
            <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Position</label>
            <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-light-3 mb-1">Bio</label>
          <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 min-h-[100px]" maxLength={500} />
        </div>

        <div className="border-t border-dark-4 pt-4">
          <h2 className="text-sm font-semibold text-primary-500 mb-3">AI Matching Profile</h2>
          <p className="text-xs text-light-4 mb-4">These fields help our AI find the best mentors, events, and connections for you.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-3 mb-1">Industry</label>
              <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1"
                placeholder="e.g., Technology, Finance" />
            </div>
            <div>
              <label className="block text-sm font-medium text-light-3 mb-1">Years Experience</label>
              <input type="number" value={form.years_experience} onChange={e => setForm(f => ({ ...f, years_experience: e.target.value }))}
                className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-light-3 mb-1">Skills (comma-separated)</label>
            <input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1"
              placeholder="Leadership, Python, Negotiation, Strategy" />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-light-3 mb-1">Career Goals (comma-separated)</label>
            <input value={form.career_goals} onChange={e => setForm(f => ({ ...f, career_goals: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1"
              placeholder="Executive promotion, Career transition, Fundraising" />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-light-3 mb-1">Interests (comma-separated)</label>
            <input value={form.interests} onChange={e => setForm(f => ({ ...f, interests: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1"
              placeholder="AI, Fintech, Impact investing, Board service" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-light-3 mb-1">Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" />
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-semibold transition">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
