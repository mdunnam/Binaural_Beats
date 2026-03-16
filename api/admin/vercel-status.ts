import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const token = process.env.VERCEL_TOKEN
  const response = await fetch('https://api.vercel.com/v6/deployments?app=liminal&limit=1', {
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await response.json()
  const dep = data?.deployments?.[0]
  if (!dep) return res.status(404).json({ error: 'No deployments found' })

  return res.status(200).json({
    deploymentId: dep.uid,
    url: dep.url,
    state: dep.state,
    createdAt: dep.createdAt,
    meta: dep.meta,
  })
}
