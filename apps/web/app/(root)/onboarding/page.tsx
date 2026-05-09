'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/shared/Logo'
import { CheckCircle, ArrowRight, ArrowLeft, Sparkles, Users, Briefcase, Rocket } from 'lucide-react'

const steps = [
  { id: 'welcome', label: 'Welcome', icon: Rocket },
  { id: 'profile', label: 'Profile', icon: Users },
  { id: 'matching', label: 'AI Matching', icon: Sparkles },
  { id: 'complete', label: 'Done', icon: CheckCircle },
]

const industryOptions = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Legal',
  'Consulting', 'Media', 'Real Estate', 'Manufacturing', 'Energy',
  'Retail', 'Non-Profit', 'Government', 'Arts & Entertainment', 'Other',
]

const interestOptions = [
  'Leadership', 'Entrepreneurship', 'Career Growth', 'Investing',
  'Networking', 'Mentorship', 'Public Speaking', 'DEI',
  'Tech Innovation', 'Impact Investing', 'Board Service', 'Policy',
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [f, setF] = useState({
    full_name: '', company: '', position: '', bio: '',
    industry: '', years_experience: '', skills: '', career_goals: '', interests: '',
  })

  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      setUser(user)
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setF({
            full_name: data.full_name || '',
            company: data.company || '',
            position: data.position || '',
            bio: data.bio || '',
            industry: data.industry || '',
            years_experience: data.years_experience?.toString() || '',
            skills: (data.skills || []).join(', '),
            career_goals: (data.career_goals || []).join(', '),
            interests: (data.interests || []).join(', '),
          })
          setSelectedInterests(data.interests || [])
        }
      })
    })
  }, [router, supabase])

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    )
  }

  const handleComplete = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').update({
      full_name: f.full_name,
      company: f.company || null,
      position: f.position || null,
      bio: f.bio || null,
      industry: f.industry || null,
      years_experience: parseInt(f.years_experience) || 0,
      skills: f.skills.split(',').map(s => s.trim()).filter(Boolean),
      career_goals: f.career_goals.split(',').map(s => s.trim()).filter(Boolean),
      interests: selectedInterests,
      onboarded: true,
    }).eq('id', user.id)

    setSaving(false)
    if (!error) router.push('/feed')
  }

  const canProceed = () => {
    if (step === 0) return true
    if (step === 1) return f.full_name.length >= 2
    if (step === 2) return true
    return true
  }

  return (
    <div className="min-h-screen bg-dark-1 flex">
      {/* Sidebar */}
      <div className="hidden lg:flex flex-col w-72 bg-dark-2 border-r border-dark-4 p-8">
  <Logo className="text-2xl sm:text-3xl lg:text-4xl mb-12" />

  <nav className="space-y-1">
    {steps.map((s, i) => {
      const active = i === step
      const done = i < step

      return (
        <button
          key={s.id}
          onClick={() => i < step && setStep(i)}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
            active
              ? 'bg-primary-500/10 text-primary-500 border border-primary-500/30'
              : done
              ? 'text-green-400'
              : 'text-light-4'
          }`}
        >
          <s.icon size={18} />
          <span>{s.label}</span>
          {done && <CheckCircle size={14} className="ml-auto" />}
        </button>
      )
    })}
  </nav>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center mx-auto">
                <Rocket size={40} className="text-primary-500" />
              </div>
              <h1 className="text-3xl font-bold text-light-1">Welcome to BlackBook</h1>
              <p className="text-light-4 text-lg max-w-md mx-auto">
                Let&apos;s get your profile set up so you can start connecting with Africa&apos;s top professionals.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left">
                {[
                  'Create your profile',
                  'Set your preferences',
                  'AI matching setup',
                  'Start networking',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-light-3">
                    <CheckCircle size={14} className="text-primary-500 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-light-1">Tell us about yourself</h2>
              <p className="text-light-4">Help other professionals get to know you.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-light-3 mb-1">Full Name *</label>
                  <input value={f.full_name} onChange={e => setF(p => ({ ...p, full_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-light-3 mb-1">Company</label>
                    <input value={f.company} onChange={e => setF(p => ({ ...p, company: e.target.value }))}
                      className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Acme Corp" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-light-3 mb-1">Position</label>
                    <input value={f.position} onChange={e => setF(p => ({ ...p, position: e.target.value }))}
                      className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. CEO" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-light-3 mb-1">Bio</label>
                  <textarea value={f.bio} onChange={e => setF(p => ({ ...p, bio: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary-500" maxLength={500} placeholder="Tell your story..." />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles size={24} className="text-primary-500" />
                <h2 className="text-2xl font-bold text-light-1">AI Matching Profile</h2>
              </div>
              <p className="text-light-4">These fields help our AI find the best mentors, events, and connections for you.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-light-3 mb-1">Industry</label>
                    <select value={f.industry} onChange={e => setF(p => ({ ...p, industry: e.target.value }))}
                      className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">Select industry</option>
                      {industryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-light-3 mb-1">Years Experience</label>
                    <input type="number" value={f.years_experience} onChange={e => setF(p => ({ ...p, years_experience: e.target.value }))}
                      className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-light-3 mb-1">Skills (comma-separated)</label>
                  <input value={f.skills} onChange={e => setF(p => ({ ...p, skills: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Leadership, Python, Negotiation, Strategy" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-light-3 mb-1">Career Goals (comma-separated)</label>
                  <input value={f.career_goals} onChange={e => setF(p => ({ ...p, career_goals: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Executive promotion, Career transition, Fundraising" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-light-3 mb-3">Select your interests</label>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map(interest => (
                    <button key={interest} onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        selectedInterests.includes(interest)
                          ? 'bg-primary-500/10 border-primary-500 text-primary-500'
                          : 'bg-dark-2 border-dark-4 text-light-4 hover:border-primary-500/50'
                      }`}>
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-light-1">You&apos;re all set!</h1>
              <p className="text-light-4 text-lg max-w-md mx-auto">
                Your profile is ready. Start exploring your network, joining circles, and finding mentors.
              </p>
              <button onClick={handleComplete} disabled={saving}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg transition text-lg">
                {saving ? 'Setting up...' : 'Go to Feed'} <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Navigation buttons */}
          {step < 3 && (
            <div className="flex justify-between mt-10">
              <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                className="flex items-center gap-2 px-6 py-3 text-light-4 hover:text-light-1 disabled:opacity-30 transition font-medium">
                <ArrowLeft size={18} /> Back
              </button>
              <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-semibold transition">
                Continue <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Step indicators (mobile) */}
          <div className="flex justify-center gap-2 mt-8 lg:hidden">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition ${
                i === step ? 'bg-primary-500' : i < step ? 'bg-green-400' : 'bg-dark-4'
              }`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
