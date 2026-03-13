// fetch-new-sounds.mjs — downloads CC0 ambient audio for new layers
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const API_KEY = '6iaV7EpTdoXHM3XghHPNMDa2BJG95LiEdRCjDxNc'
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'app', 'public', 'sounds')

const LAYERS = [
  { id: 'stream', query: 'stream water flowing' },
  { id: 'birds',  query: 'birds chirping nature' },
  { id: 'cafe',   query: 'cafe coffee shop ambience' },
  { id: 'night',  query: 'night crickets insects' },
  { id: 'fan',    query: 'fan white noise' },
  { id: 'bowl',   query: 'tibetan singing bowl' },
  { id: 'beach',  query: 'beach waves sand' },
  { id: 'city',   query: 'city rain urban ambience' },
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
  const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&license=Creative_Commons_0&fields=id,name,duration,previews&filter=duration:[10 TO 300]&sort=downloads_desc&page_size=5`
  const text = await get(url)
  return JSON.parse(text)
}

async function main() {
  console.log('Fetching new ambient sounds from Freesound.org (CC0)...\n')
  for (const layer of LAYERS) {
    const dest = path.join(OUT_DIR, `${layer.id}.mp3`)
    if (fs.existsSync(dest)) {
      console.log(`[${layer.id}] already exists, skipping`)
      continue
    }
    process.stdout.write(`[${layer.id}] searching "${layer.query}"... `)
    try {
      const result = await search(layer.query)
      if (!result.results?.length) { console.log('❌ no results'); continue }
      const hit = result.results[0]
      const previewUrl = hit.previews?.['preview-hq-mp3'] || hit.previews?.['preview-lq-mp3']
      if (!previewUrl) { console.log('❌ no preview URL'); continue }
      process.stdout.write(`"${hit.name}" (${hit.duration?.toFixed(0)}s)... `)
      const buf = await get(previewUrl, true)
      fs.writeFileSync(dest, buf)
      console.log(`✅ ${(buf.length/1024).toFixed(0)} KB`)
    } catch (e) {
      console.log(`❌ ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 500))
  }
  console.log('\n✦ Done!')
}

main().catch(console.error)
