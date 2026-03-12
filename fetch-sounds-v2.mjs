// fetch-sounds-v2.mjs — downloads nature video MP4s from Pixabay, saves audio track for web use
// Browsers can decode audio from MP4 via decodeAudioData — no ffmpeg needed
import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const API_KEY = '971011-26f867560c8af37b021b1c45b'
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'app', 'public', 'sounds')

// Search queries for each layer - looking for videos with good ambient audio
const LAYERS = [
  { id: 'rain',    query: 'rain nature water',         minDuration: 10 },
  { id: 'thunder', query: 'thunder storm lightning',   minDuration: 10 },
  { id: 'wind',    query: 'wind nature trees',         minDuration: 10 },
  { id: 'waves',   query: 'ocean waves beach sea',     minDuration: 10 },
  { id: 'fire',    query: 'fire campfire burning',     minDuration: 10 },
  { id: 'forest',  query: 'forest birds nature trees', minDuration: 10 },
  { id: 'space',   query: 'stars galaxy night sky',    minDuration: 10 },
  { id: 'cave',    query: 'water stream river flow',   minDuration: 10 },
]

fs.mkdirSync(OUT_DIR, { recursive: true })

function get(url, binary = false) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        return get(res.headers.location, binary).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        resolve(binary ? buf : buf.toString('utf8'))
      })
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function searchVideos(query) {
  const url = `https://pixabay.com/api/videos/?key=${API_KEY}&q=${encodeURIComponent(query)}&per_page=10&min_duration=15`
  const text = await get(url)
  return JSON.parse(text)
}

async function main() {
  const results = {}

  for (const layer of LAYERS) {
    process.stdout.write(`[${layer.id}] searching "${layer.query}"... `)
    try {
      const data = await searchVideos(layer.query)
      if (!data.hits || data.hits.length === 0) {
        console.log('❌ no results')
        continue
      }

      // Pick a hit — prefer shorter ones (less data) with good tags
      const hit = data.hits.find(h => h.duration >= layer.minDuration && h.duration <= 120) || data.hits[0]
      
      // Get smallest video URL (tiny/small quality — we only need the audio)
      const vid = hit.videos
      const videoUrl = vid.tiny?.url || vid.small?.url || vid.medium?.url
      if (!videoUrl) {
        console.log('❌ no video URL')
        continue
      }

      const destPath = path.join(OUT_DIR, `${layer.id}.mp4`)
      process.stdout.write(`downloading (${hit.duration}s)... `)
      const buf = await get(videoUrl, true)
      fs.writeFileSync(destPath, buf)
      const kb = (buf.length / 1024).toFixed(0)
      console.log(`✅ ${layer.id}.mp4 (${kb} KB) — "${hit.tags.substring(0,50)}"`)
      results[layer.id] = { file: `${layer.id}.mp4`, tags: hit.tags, duration: hit.duration, kb }

    } catch (e) {
      console.log(`❌ error: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 400))
  }

  // Write a manifest
  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(results, null, 2)
  )

  console.log('\n✦ Done. Files saved to app/public/sounds/')
  console.log('Note: samplePlayer.ts will load these as MP4 audio — browsers decode audio track from video files.')
}

main().catch(console.error)
