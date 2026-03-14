import Stripe from 'stripe'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const config = { api: { bodyParser: false } }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', resolve)
      req.on('error', reject)
    })
    const rawBody = Buffer.concat(chunks)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Webhook signature error:', msg)
    return res.status(400).json({ error: `Webhook Error: ${msg}` })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      if (userId) {
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
        const { error } = await supabase.from('profiles').update({
          is_pro: true,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        }).eq('id', userId)
        if (error) console.error('Supabase update error:', error)
        else console.log(`Set is_pro=true for user ${userId}`)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
      const { error } = await supabase.from('profiles').update({ is_pro: false, stripe_subscription_id: null }).eq('stripe_customer_id', customerId)
      if (error) console.error('Supabase update error:', error)
    }

    return res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  try {
    // Skip signature verification if using placeholder secret
    if (!webhookSecret || webhookSecret === 'whsec_PLACEHOLDER') {
      event = req.body as Stripe.Event
    } else {
      const rawBody = req.body as Buffer
      event = stripe.webhooks.constructEvent(rawBody, sig!, webhookSecret)
    }
  } catch (err) {
    console.error('Webhook signature error:', err)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id

      if (userId) {
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null

        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null

        const { error } = await supabase
          .from('profiles')
          .update({
            is_pro: true,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', userId)

        if (error) console.error('Supabase update error:', error)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

      const { error } = await supabase
        .from('profiles')
        .update({ is_pro: false, stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId)

      if (error) console.error('Supabase update error:', error)
    }

    return res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
}
