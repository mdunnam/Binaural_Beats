// Stamps sw.js with the current build timestamp so every deploy busts the cache
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const swPath = resolve(__dirname, '../public/sw.js')

const ts = Date.now()
const src = readFileSync(swPath, 'utf8').replace('__BUILD_TIME__', ts)
writeFileSync(swPath, src)

console.log(`sw.js stamped with cache version: liminal-v${ts}`)
