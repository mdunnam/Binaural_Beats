// fetch-sounds.mjs — downloads soundscape audio from Pixabay
// Usage: node fetch-sounds.mjs

import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const API_KEY = '971011-26f867560c8af37b021b1c45b'
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'app', 'public', 'sounds')

const LAYERS = [
  { id: 'rain',    query: 'rain ambience loop' },
  { id: 'thunder', query: 'thunder storm loop' },
  { id: 'wind',    query: 'wind ambience loop' },
  { id: 'waves',   query: 'ocean waves loop' },
  { id: 'fire',    query: 'fire crackling loop' },
  { id: 'forest',  query: 'forest birds nature loop' },
  { id: 'space',   query: 'space ambient drone' },
  { id: 'cave',    query: 'cave water drip ambience' },
]

fs.mkdirSync(OUT_DIR, { recursive: true })

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function search(query) {
  const url = `https://pixabay.com/api/videos/sounds/?key=${API_KEY}&q=${encodeURIComponent(query)}&per_page=5`
  const buf = await get(url)
  return JSON.parse(buf.toString())
}

async function downloadFile(url, dest) {
  const buf = await get(url)
  fs.writeFileSync(dest, buf)
  return buf.length
}

async function main() {
  for (const layer of LAYERS) {
    process.stdout.write(`[${layer.id}] searching "${layer.query}"... `)
    try {
      const result = await search(layer.query)
      if (!result.hits || result.hits.length === 0) {
        console.log('❌ no results')
        continue
      }
      const hit = result.hits[0]
      const downloadUrl = hit.audio || (hit.previews && (hit.previews['audio/ogg'] || hit.previews['audio/mp3']))
      if (!downloadUrl) {
        console.log(`❌ no audio URL in hit: ${JSON.stringify(Object.keys(hit))}`)
        continue
      }
      const ext = downloadUrl.includes('.ogg') ? 'ogg' : 'mp3'
      const dest = path.join(OUT_DIR, `${layer.id}.${ext}`)
      process.stdout.write(`downloading... `)
      const bytes = await downloadFile(downloadUrl, dest)
      console.log(`✅ ${layer.id}.${ext} (${(bytes/1024).toFixed(1)} KB)`)
    } catch (e) {
      console.log(`❌ error: ${e.message}`)
    }
    // small delay to be polite
    await new Promise(r => setTimeout(r, 300))
  }
  console.log('\nDone. Files in app/public/sounds/')
}

main().catch(console.error)
