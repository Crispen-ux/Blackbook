'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/shared/FileUpload'
import {
  User, Award, Bell, Shield, AlertTriangle, CheckCircle, LogOut, Save,
} from 'lucide-react'

interface Profile {
  id: string; email: string; full_name: string; role: string
  company: string | null; position: string | null; bio: string | null
  avatar_url: string | null; phone: string | null
  industry: string | null; years_experience: number
  skills: string[]; career_goals: string[]; interests: string[]
  created_at: string; last_active: string
}

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'matching', label: 'AI Matching', icon: Award },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'account', label: 'Account', icon: AlertTriangle },
] as const

type TabId = typeof tabs[number]['id']

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  const [f, setF] = useState({
    full_name: '', company: '', position: '', bio: '', phone: '', avatar_url: '',
    industry: '', skills: '', career_goals: '', interests: '', years_experience: '',
  })

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setF({
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
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').update({
      full_name: f.full_name,
      company: f.company || null,
      position: f.position || null,
      bio: f.bio || null,
      phone: f.phone || null,
      avatar_url: f.avatar_url || null,
      industry: f.industry || null,
      skills: f.skills.split(',').map(s => s.trim()).filter(Boolean),
      career_goals: f.career_goals.split(',').map(s => s.trim()).filter(Boolean),
      interests: f.interests.split(',').map(s => s.trim()).filter(Boolean),
      years_experience: parseInt(f.years_experience) || 0,
    }).eq('id', user.id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const handleSignOut = async () => {
    await (supabase.auth as any).signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-1">Settings</h1>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-lg">
              <CheckCircle size={16} /> Saved
            </span>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition">
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-dark-4 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id ? 'border-primary-500 text-primary-500' : 'border-transparent text-light-4 hover:text-light-1'
            }`}>
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="bg-dark-2 rounded-xl border border-dark-4 p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              {f.avatar_url ? (
                <img src={f.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                  {f.full_name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <FileUpload bucket="avatars" path="" onUpload={(url) => setF(p => ({ ...p, avatar_url: url }))} maxSize={2097152}>
              <button type="button" className="px-4 py-2 bg-dark-3 border border-dark-4 rounded-lg text-sm text-light-3 hover:border-primary-500/50 transition">
                Change Photo
              </button>
            </FileUpload>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Full Name</label>
            <input value={f.full_name} onChange={e => setF(p => ({ ...p, full_name: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-3 mb-1">Company</label>
              <input value={f.company} onChange={e => setF(p => ({ ...p, company: e.target.value }))}
                className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-light-3 mb-1">Position</label>
              <input value={f.position} onChange={e => setF(p => ({ ...p, position: e.target.value }))}
                className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Bio</label>
            <textarea value={f.bio} onChange={e => setF(p => ({ ...p, bio: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-lg text-light-1 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary-500" maxLength={500} />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Phone</label>
            <input value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
      )}

      {activeTab === 'matching' && (
        <div className="bg-dark-2 rounded-xl border border-dark-4 p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-primary-500 mb-1">AI Matching Profile</h2>
            <p className="text-xs text-light-4">These fields help our AI find the best mentors, events, and connections for you.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-3 mb-1">Industry</label>
              <input value={f.industry} onChange={e => setF(p => ({ ...p, industry: e.target.value }))}
                className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Technology, Finance" />
            </div>
            <div>
              <label className="block text-sm font-medium text-light-3 mb-1">Years Experience</label>
              <input type="number" value={f.years_experience} onChange={e => setF(p => ({ ...p, years_experience: e.target.value }))}
                className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Skills (comma-separated)</label>
            <input value={f.skills} onChange={e => setF(p => ({ ...p, skills: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Leadership, Python, Negotiation, Strategy" />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Career Goals (comma-separated)</label>
            <input value={f.career_goals} onChange={e => setF(p => ({ ...p, career_goals: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Executive promotion, Career transition, Fundraising" />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Interests (comma-separated)</label>
            <input value={f.interests} onChange={e => setF(p => ({ ...p, interests: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="AI, Fintech, Impact investing, Board service" />
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-dark-2 rounded-xl border border-dark-4 p-12 text-center">
          <Bell size={40} className="mx-auto text-dark-4 mb-4" />
          <h3 className="text-lg font-semibold text-light-1 mb-2">Notification Preferences</h3>
          <p className="text-sm text-light-4">Choose which notifications you receive via email and push.</p>
          <div className="mt-6 space-y-4 max-w-md mx-auto text-left">
            {[
              { label: 'Messages', desc: 'New direct messages' },
              { label: 'Mentorship', desc: 'Mentorship requests and updates' },
              { label: 'Events', desc: 'Event invitations and reminders' },
              { label: 'Circles', desc: 'Circle activity and invites' },
              { label: 'Q&A', desc: 'Answers and replies to your questions' },
            ].map(n => (
              <label key={n.label} className="flex items-center justify-between p-3 bg-dark-1 rounded-lg cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-light-1">{n.label}</p>
                  <p className="text-xs text-light-4">{n.desc}</p>
                </div>
                <div className="w-10 h-6 bg-dark-4 rounded-full relative opacity-50">
                  <div className="w-4 h-4 bg-light-4 rounded-full absolute top-1 left-1" />
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-light-4 mt-6 italic">Notification toggles coming soon</p>
        </div>
      )}

      {activeTab === 'privacy' && (
        <div className="bg-dark-2 rounded-xl border border-dark-4 p-12 text-center">
          <Shield size={40} className="mx-auto text-dark-4 mb-4" />
          <h3 className="text-lg font-semibold text-light-1 mb-2">Privacy Settings</h3>
          <p className="text-sm text-light-4">Control your profile visibility and data preferences.</p>
          <div className="mt-6 space-y-4 max-w-md mx-auto text-left">
            {[
              { label: 'Profile visibility', desc: 'Show your profile to all members' },
              { label: 'Show email', desc: 'Display your email on your profile' },
              { label: 'Show activity status', desc: 'Let others see when you are active' },
            ].map(n => (
              <label key={n.label} className="flex items-center justify-between p-3 bg-dark-1 rounded-lg cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-light-1">{n.label}</p>
                  <p className="text-xs text-light-4">{n.desc}</p>
                </div>
                <div className="w-10 h-6 bg-primary-600 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1" />
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-light-4 mt-6 italic">Privacy controls coming soon</p>
        </div>
      )}

      {activeTab === 'account' && profile && (
        <div className="space-y-4">
          <div className="bg-dark-2 rounded-xl border border-dark-4 p-6 space-y-4">
            <h3 className="font-semibold text-light-1">Account Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-light-4">Email</span>
                <p className="text-light-1 font-medium mt-0.5">{profile.email}</p>
              </div>
              <div>
                <span className="text-light-4">Role</span>
                <p className="text-light-1 font-medium mt-0.5 capitalize">{profile.role}</p>
              </div>
              <div>
                <span className="text-light-4">Member since</span>
                <p className="text-light-1 font-medium mt-0.5">{new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div>
                <span className="text-light-4">Last active</span>
                <p className="text-light-1 font-medium mt-0.5">{new Date(profile.last_active).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-2 rounded-xl border border-red-500/20 p-6 space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={20} />
              <h3 className="font-semibold">Danger Zone</h3>
            </div>
            <p className="text-sm text-light-4">Sign out of your account on this device.</p>
            <button onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg font-medium text-sm transition">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
