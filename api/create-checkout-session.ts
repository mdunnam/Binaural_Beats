import Stripe from 'stripe'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { priceId, userId, email } = req.body as { priceId: string; userId: string; email: string }

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Missing priceId or userId' })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { supabase_user_id: userId },
      success_url: `${req.headers.origin}/?upgrade=success`,
      cancel_url: `${req.headers.origin}/?upgrade=cancelled`,
    })

    return res.json({ url: session.url })
  } catch (err) {
    console.error('Checkout session error:', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
