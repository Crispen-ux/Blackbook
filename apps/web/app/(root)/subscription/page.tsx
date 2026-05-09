'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Check, Crown } from 'lucide-react'

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [currentPlan, setCurrentPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: p } = await supabase.from('subscription_plans').select('*').order('sort_order')
      if (p) setPlans(p)

      const { data: s } = await supabase.rpc('get_user_subscription', { p_user_id: user.id })
      if (s && s.length > 0) setCurrentPlan(s[0])

      setLoading(false)
    }
    fetch()
  }, [supabase, router])

  const handleSubscribe = async (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    if (!plan || plan.price === 0) return

    setProcessing(true)
    setSelected(planId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single()

    // Initialize Paystack transaction
    const { data } = await supabase.functions.invoke('paystack-initialize', {
      body: {
        email: profile?.email,
        amount: plan.price,
        metadata: { plan_id: planId, type: 'subscription' },
      },
    })

    if (data?.authorization_url) {
      window.location.href = data.authorization_url
    }
    setProcessing(false)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <Crown size={40} className="text-primary-500 mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-light-1">Upgrade Your Experience</h1>
        <p className="text-light-4 mt-2">Choose the plan that fits your needs</p>
      </div>

      {currentPlan && (
        <div className="bg-dark-3 border border-primary-500/30 rounded-xl p-4 text-center">
          <p className="text-light-4 text-sm">
            Current plan: <span className="text-primary-500 font-semibold">{currentPlan.plan_name}</span>
            {currentPlan.status === 'active' && (
              <span className="text-light-5 ml-2">
                (Renews {new Date(currentPlan.current_period_end).toLocaleDateString()})
              </span>
            )}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.filter(p => p.is_active).map(plan => {
          const isCurrent = currentPlan?.plan_id === plan.id
          return (
            <div
              key={plan.id}
              className={`bg-dark-2 border rounded-xl p-6 flex flex-col ${
                isCurrent ? 'border-primary-500' : 'border-dark-4 hover:border-primary-500/50'
              } transition`}
            >
              <h3 className="text-lg font-semibold text-light-1">{plan.name}</h3>
              <p className="text-light-4 text-sm mt-1">{plan.description}</p>
              <div className="mt-4 mb-6">
                <span className="text-3xl font-bold text-light-1">
                  R{(plan.price / 100).toLocaleString()}
                </span>
                <span className="text-light-4 text-sm ml-1">/{plan.interval}</span>
              </div>

              <ul className="space-y-2 flex-1">
                {(plan.features as string[]).map((feat: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-light-3">
                    <Check size={16} className="text-primary-500 mt-0.5 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={processing || plan.price === 0 || isCurrent}
                className={`mt-6 w-full py-3 rounded-lg font-medium text-sm transition ${
                  isCurrent
                    ? 'bg-dark-4 text-light-5 cursor-not-allowed'
                    : plan.price === 0
                    ? 'bg-dark-4 text-light-5 cursor-not-allowed'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {isCurrent ? 'Current Plan' : plan.price === 0 ? 'Free' : processing && selected === plan.id ? 'Processing...' : 'Subscribe'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
