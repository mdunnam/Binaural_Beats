// fetch-freesound.mjs — downloads CC0 ambient audio from Freesound.org
// Usage: node fetch-freesound.mjs

import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const API_KEY = '6iaV7EpTdoXHM3XghHPNMDa2BJG95LiEdRCjDxNc'
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'app', 'public', 'sounds')

const LAYERS = [
  { id: 'rain',    query: 'rain ambience',      tags: 'rain loop' },
  { id: 'thunder', query: 'thunder storm',      tags: 'thunder storm' },
  { id: 'wind',    query: 'wind ambience',      tags: 'wind loop' },
  { id: 'waves',   query: 'ocean waves',        tags: 'ocean waves loop' },
  { id: 'fire',    query: 'fire crackling',     tags: 'fire loop' },
  { id: 'forest',  query: 'forest birds',       tags: 'forest birds nature' },
  { id: 'space',   query: 'space ambient drone',tags: 'space ambient' },
  { id: 'cave',    query: 'cave water drip',    tags: 'cave water' },
]

fs.mkdirSync(OUT_DIR, { recursive: true })

function get(url, binary = false) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'User-Agent': 'LiminalApp/1.0',
      }
    }, res => {
      if ([301,302,303,307,308].includes(res.statusCode)) {
        return get(res.headers.location, binary).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      res.on('end', () => resolve(binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function search(query) {
  // Search for CC0 loopable sounds, prefer longer duration for good loops
  const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&license=Creative_Commons_0&fields=id,name,duration,previews,download,license&filter=duration:[10 TO 300]&sort=downloads_desc&page_size=5`
  const text = await get(url)
  return JSON.parse(text)
}

async function downloadAudio(url, dest) {
  // Freesound previews don't need auth; direct downloads do
  const buf = await get(url, true)
  fs.writeFileSync(dest, buf)
  return buf.length
}

async function main() {
  console.log('Fetching ambient sounds from Freesound.org (CC0 license)...\n')

  for (const layer of LAYERS) {
    process.stdout.write(`[${layer.id}] searching "${layer.query}"... `)
    try {
      const result = await search(layer.query)

      if (!result.results || result.results.length === 0) {
        console.log('❌ no results')
        continue
      }

      const hit = result.results[0]
      
      // Use HQ preview (mp3) — doesn't require extra OAuth, just token auth
      const previewUrl = hit.previews?.['preview-hq-mp3'] || hit.previews?.['preview-lq-mp3']
      if (!previewUrl) {
        console.log(`❌ no preview URL`)
        continue
      }

      const dest = path.join(OUT_DIR, `${layer.id}.mp3`)
      process.stdout.write(`"${hit.name}" (${hit.duration.toFixed(0)}s)... `)
      const bytes = await downloadAudio(previewUrl, dest)
      console.log(`✅ ${layer.id}.mp3 (${(bytes/1024).toFixed(0)} KB)`)

    } catch (e) {
      console.log(`❌ ${e.message}`)
    }

    await new Promise(r => setTimeout(r, 500))
  }

  // Update samplePlayer fallback order to prefer mp3 over mp4
  console.log('\n✦ Done! Files in app/public/sounds/')
  console.log('MP3s will be used automatically (samplePlayer tries ogg → mp3 → mp4)')
}

main().catch(console.error)
