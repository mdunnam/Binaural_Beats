import Stripe from 'stripe'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'https://www.theliminal.app')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { email } = req.body as { email: string }
    if (!email) return res.status(400).json({ error: 'Missing email' })

    // Look up customer by email
    const customers = await stripe.customers.list({ email, limit: 1 })
    if (!customers.data.length) {
      return res.status(404).json({ error: 'No Stripe customer found for this email' })
    }

    const origin = (req.headers.origin as string) || 'https://www.theliminal.app'
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/app`,
    })

    return res.json({ url: portalSession.url })
  } catch (err) {
    console.error('[portal] error:', err)
    return res.status(500).json({ error: 'Failed to create portal session' })
  }
}
