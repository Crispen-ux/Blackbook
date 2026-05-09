'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { ArrowRight, CheckCircle, Menu, X, MessageSquare, Calendar, GraduationCap, Users, Circle, HelpCircle, Sparkles, Shield, Globe, Zap } from 'lucide-react'

const features = [
  { icon: MessageSquare, title: 'Messaging', desc: 'Private, secure messaging with other verified professionals.' },
  { icon: Users, title: 'Network', desc: 'Build meaningful connections with Black professionals across industries.' },
  { icon: Calendar, title: 'Events', desc: 'Exclusive professional events, webinars, and networking sessions.' },
  { icon: Circle, title: 'Circles', desc: 'Join or create private communities around your interests and industry.' },
  { icon: GraduationCap, title: 'Mentorship', desc: 'AI-matched mentorship connecting you with experienced leaders.' },
  { icon: HelpCircle, title: 'Q&A', desc: 'Ask questions and get answers from industry experts.' },
  { icon: Sparkles, title: 'AI Matching', desc: 'Smart recommendations for mentors, events, and connections.' },
  { icon: Shield, title: 'Verified', desc: 'Authenticated profiles ensuring a trusted professional network.' },
]

const plans = [
  {
    name: 'Free', price: 'R0', period: '/month', featured: false,
    items: ['Browse feed', 'View events', 'Join public circles', 'Basic search', 'Community Q&A'],
  },
  {
    name: 'Pro', price: 'R299', period: '/month', featured: true,
    items: ['Everything in Free', 'Unlimited messaging', 'Premium mentor matching', 'Private circles', 'Anonymous Q&A'],
  },
  {
    name: 'Enterprise', price: 'R999', period: '/month', featured: false,
    items: ['Everything in Pro', 'Team management', 'Analytics dashboard', 'Custom branding', 'Priority support', 'API access'],
  },
]

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) router.push('/feed')
      else setChecking(false)
    }
    check()
  }, [router])

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-1">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
    </div>
  )

  return (
    <div className="bg-dark-1 text-light-1">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-dark-1/90 backdrop-blur border-b border-dark-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="BlackBook" width={300} height={75} className="h-20 w-auto" />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-light-4 hover:text-light-1 transition">Features</a>
              <a href="#pricing" className="text-sm text-light-4 hover:text-light-1 transition">Pricing</a>
              <Link href="/login" className="text-sm text-light-4 hover:text-light-1 transition">Sign In</Link>
              <ThemeToggle />
              <Link href="/register" className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition">
                Get Started
              </Link>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-light-4">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-dark-4 bg-dark-2 px-4 py-4 space-y-3 mt-8">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-light-4 py-2">Features</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-light-4 py-2">Pricing</a>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-light-4 py-2">Sign In</Link>
            <Link href="/register" onClick={() => setMenuOpen(false)} className="block text-center py-3 bg-primary-600 text-white font-semibold rounded-lg">Get Started</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-500/10 border border-primary-500/30 rounded-full text-sm text-primary-500">
            <Globe size={14} /> Africa&apos;s Premium Professional Network
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            Connect, Grow, and{' '}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-500 to-purple-400">Thrive Together</span>
          </h1>
          <p className="text-lg sm:text-xl text-light-4 max-w-2xl mx-auto">
            The exclusive platform connecting professionals across Africa and the diaspora.
            Build your network, find mentors, and unlock new opportunities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register"
              className="flex items-center gap-2 px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition text-lg">
              Join BlackBook <ArrowRight size={20} />
            </Link>
            <a href="#features"
              className="px-8 py-3.5 border border-dark-4 text-light-3 hover:border-primary-500/50 hover:text-light-1 font-medium rounded-lg transition text-lg">
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '10,000+', label: 'Members' },
            { value: '500+', label: 'Mentors' },
            { value: '1,000+', label: 'Events' },
            { value: '95%', label: 'Satisfaction' },
          ].map(s => (
            <div key={s.label} className="text-center p-6 bg-dark-2 rounded-xl border border-dark-4">
              <div className="text-2xl sm:text-3xl font-bold text-primary-500">{s.value}</div>
              <div className="text-sm text-light-4 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-2/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">Everything you need to grow</h2>
            <p className="text-light-4 max-w-xl mx-auto">From networking to mentorship, BlackBook provides the tools to advance your career.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(f => (
              <div key={f.title} className="p-6 bg-dark-2 rounded-xl border border-dark-4 hover:border-primary-500/30 transition group">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center mb-4 group-hover:bg-primary-500/20 transition">
                  <f.icon size={20} className="text-primary-500" />
                </div>
                <h3 className="font-semibold text-light-1 mb-2">{f.title}</h3>
                <p className="text-sm text-light-4 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">How it works</h2>
            <p className="text-light-4 max-w-xl mx-auto">Get started in minutes and unlock your professional network.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create your profile', desc: 'Sign up and build a rich professional profile highlighting your experience and goals.' },
              { step: '02', title: 'Connect & engage', desc: 'Join circles, attend events, and message professionals in your industry.' },
              { step: '03', title: 'Grow with AI', desc: 'Get matched with mentors, opportunities, and connections tailored to you.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary-500/10 border border-primary-500/30 flex items-center justify-center mx-auto mb-5">
                  <span className="text-primary-500 font-bold text-lg">{s.step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-light-4 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-2/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">Simple, transparent pricing</h2>
            <p className="text-light-4 max-w-xl mx-auto">Start free and upgrade as you grow. No hidden fees.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(p => (
              <div key={p.name} className={`relative rounded-xl border p-6 ${p.featured ? 'border-primary-500 bg-primary-500/5' : 'border-dark-4 bg-dark-2'}`}>
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-1">{p.name}</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{p.price}</span>
                  <span className="text-light-4 text-sm ml-1">{p.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {p.items.map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-light-3">
                      <CheckCircle size={16} className="text-primary-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href={p.name === 'Free' ? '/register' : '/subscription'}
                  className={`block text-center py-3 rounded-lg font-semibold text-sm transition ${
                    p.featured
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'border border-dark-4 text-light-3 hover:border-primary-500/50 hover:text-light-1'
                  }`}>
                  {p.name === 'Free' ? 'Get Started' : 'Upgrade'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile App */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl sm:text-4xl font-bold">Take BlackBook on the go</h2>
              <p className="text-lg text-light-4">Stay connected with your network wherever you are. The BlackBook mobile app brings the full experience to your pocket.</p>
              <ul className="space-y-3">
                {[
                  'Real-time messaging and notifications',
                  'Browse and RSVP to events on the fly',
                  'AI-powered mentor matching anywhere',
                  'Join circles and engage with your community',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-light-3">
                    <CheckCircle size={16} className="text-primary-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <a href="#" className="flex items-center gap-3 px-5 py-3 bg-dark-2 border border-dark-4 rounded-xl hover:border-primary-500/50 transition group">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-light-1 group-hover:text-primary-500 transition" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  <div>
                    <div className="text-xs text-light-4">Download on the</div>
                    <div className="text-sm font-semibold text-light-1 group-hover:text-primary-500 transition">App Store</div>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-3 px-5 py-3 bg-dark-2 border border-dark-4 rounded-xl hover:border-primary-500/50 transition group">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-light-1 group-hover:text-primary-500 transition" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
                  <div>
                    <div className="text-xs text-light-4">Get it on</div>
                    <div className="text-sm font-semibold text-light-1 group-hover:text-primary-500 transition">Google Play</div>
                  </div>
                </a>
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="relative w-64 h-125 bg-dark-2 rounded-4xl border-4 border-dark-4 p-2">
                <div className="w-full h-full bg-linear-to-b from-primary-500/20 to-dark-3 rounded-[28px] flex flex-col items-center justify-center gap-4">
                  <Image src="/logo.png" alt="" width={120} height={30} className="h-8 w-auto opacity-40" />
                  <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <Zap size={24} className="text-primary-500" />
                  </div>
                  <p className="text-light-4 text-xs text-center px-6">Coming soon to iOS & Android</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-2/50">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to elevate your network?</h2>
          <p className="text-lg text-light-4">Join thousands of Black professionals already connecting, growing, and thriving on BlackBook.</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition text-lg">
            Create Your Account <Zap size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-4 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <Image src="/logo.png" alt="BlackBook" width={250} height={62} className="h-16 w-auto" />
              <p className="text-sm text-light-4">Africa&apos;s premium professional network for Black decision-makers.</p>
            </div>
            {[
              { title: 'Platform', links: ['Features', 'Pricing', 'FAQ'] },
              { title: 'Community', links: ['Circles', 'Events', 'Mentorship'] },
              { title: 'Company', links: ['About', 'Blog', 'Contact'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm text-light-1 mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-sm text-light-4 hover:text-light-1 transition">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-dark-4 pt-8 text-center text-sm text-light-4">
            &copy; {new Date().getFullYear()} BlackBook. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
