import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, amount, metadata } = await request.json()

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amount * 100,
      currency: 'ZAR',
      metadata,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/callback`,
    }),
  })

  const data = await response.json()

  if (!data.status) {
    return NextResponse.json({ error: data.message }, { status: 400 })
  }

  return NextResponse.json({ authorization_url: data.data.authorization_url, reference: data.data.reference })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')

  if (!reference) {
    return NextResponse.json({ error: 'Reference is required' }, { status: 400 })
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  })

  const data = await response.json()
  return NextResponse.json(data)
}
