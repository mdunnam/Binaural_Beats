import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

  const [subscriptions, charges] = await Promise.all([
    stripe.subscriptions.list({ limit: 100, status: 'active', expand: ['data.customer'] }),
    stripe.charges.list({ limit: 20, expand: ['data.customer'] }),
  ])

  let mrr = 0
  let monthlyCount = 0
  let annualCount = 0

  for (const sub of subscriptions.data) {
    const item = sub.items.data[0]
    const interval = item?.price?.recurring?.interval
    const amount = item?.price?.unit_amount ?? 0
    if (interval === 'month') {
      mrr += amount
      monthlyCount++
    } else if (interval === 'year') {
      mrr += Math.round(amount / 12)
      annualCount++
    }
  }

  const recentTransactions = charges.data.map(c => ({
    date: new Date(c.created * 1000).toISOString(),
    amount: c.amount,
    currency: c.currency,
    customerEmail:
      typeof c.customer === 'object' && c.customer !== null
        ? (c.customer as Stripe.Customer).email ?? ''
        : '',
    status: c.status,
  }))

  return res.status(200).json({
    mrr,
    activeCount: subscriptions.data.length,
    monthlyCount,
    annualCount,
    recentTransactions,
  })
}
