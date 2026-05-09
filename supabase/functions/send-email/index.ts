import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

interface EmailPayload {
  notification_id: string
  user_id: string
  type: string
  title: string
  body: string
}

serve(async (req) => {
  try {
    const payload: EmailPayload = await req.json()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', payload.user_id)
      .single()

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.log('Email sending skipped: RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    const emailHtml = `
      <div style="font-family: system-ui; max-width: 480px; margin: 0 auto;">
        <div style="background: #6366f1; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">BlackBook</h1>
        </div>
        <div style="background: #1a1a2e; padding: 24px; border-radius: 0 0 12px 12px;">
          <h2 style="color: white; margin: 0 0 8px;">${payload.title}</h2>
          <p style="color: #94a3b8; margin: 0; line-height: 1.5;">${payload.body}</p>
        </div>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BlackBook <notifications@blackbook.app>',
        to: user.email,
        subject: payload.title,
        html: emailHtml,
      }),
    })

    const result = await res.json()
    return new Response(JSON.stringify(result), { status: res.ok ? 200 : 400 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
