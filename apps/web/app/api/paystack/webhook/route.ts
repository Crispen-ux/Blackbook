import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  const supabase = createServiceClient()

  if (event.event === 'charge.success') {
    const { reference, metadata, amount, currency } = event.data

    await supabase.from('payments').insert({
      user_id: metadata.user_id,
      amount: amount / 100,
      currency: currency || 'ZAR',
      type: metadata.type || 'event',
      status: 'completed',
      reference_id: reference,
      metadata,
    })

    if (metadata.type === 'event' && metadata.event_id) {
      await supabase
        .from('event_registrations')
        .update({ payment_status: 'completed', payment_id: reference })
        .eq('event_id', metadata.event_id)
        .eq('user_id', metadata.user_id)
    }

    if (metadata.type === 'subscription' && metadata.plan_id) {
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('user_id', metadata.user_id)
        .eq('status', 'active')

      await supabase.from('subscriptions').insert({
        user_id: metadata.user_id,
        plan_id: metadata.plan_id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }

    if (metadata.type === 'tip' && metadata.recipient_id) {
      await supabase.from('tips').insert({
        sender_id: metadata.user_id,
        recipient_id: metadata.recipient_id,
        amount: amount / 100,
        currency: currency || 'ZAR',
        message: metadata.message || null,
      })
    }
  }

  if (event.event === 'subscription.create') {
    const { subscription_code, email_token, plan, customer } = event.data

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customer.email)
      .single()

    if (profile) {
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', plan.name)
        .single()

      if (planData) {
        await supabase
          .from('subscriptions')
          .update({
            paystack_subscription_code: subscription_code,
            paystack_email_token: email_token,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('user_id', profile.id)
          .eq('plan_id', planData.id)
      }
    }
  }

  return NextResponse.json({ status: 'ok' })
}
