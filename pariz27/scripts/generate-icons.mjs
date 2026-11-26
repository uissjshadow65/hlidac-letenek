/**
 * Vygeneruje ikony aplikace (PNG) z vektorového návrhu.
 * Spuštění: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public/icons')
mkdirSync(out, { recursive: true })

const NAVY = '#14213D'
const CREAM = '#F6F1E7'
const RED = '#C9505D'
const digits = readFileSync(join(root, 'scripts/27.path'), 'utf8')

const tower = `
  <path d="M60 4v14" />
  <path d="M56 18h8l3 40H53z" />
  <path d="M50 58h20" />
  <path d="M53 58c-2 22-6 44-14 64M67 58c2 22 6 44 14 64" />
  <path d="M44 100h32" />
  <path d="M36 122h48" />
  <path d="M39 122c-6 34-16 66-30 94M81 122c6 34 16 66 30 94" />
  <path d="M42 152h36" />
  <path d="M34 216c2-30 12-46 26-46s24 16 26 46" />`

/** @param {number} pad 0–1: podíl okraje (u „maskable“ ikon větší) */
function svg({ pad = 0, rounded = false, transparent = false } = {}) {
  const s = 1 - pad * 2
  const inner = `
    <g transform="translate(${512 - 512 * s} ${512 - 512 * s}) scale(${s})">
      <g transform="translate(356 92) scale(2.6)" fill="none" stroke="${CREAM}" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round">${tower}</g>
      <rect x="302" y="664" width="420" height="10" rx="5" fill="${CREAM}" opacity="0.9"/>
      <g transform="translate(${512 - (1020 * 0.2) / 2} 880) scale(0.2)" fill="${RED}"><path d="${digits}"/></g>
    </g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    ${transparent ? '' : `<rect width="1024" height="1024" ${rounded ? 'rx="228"' : ''} fill="${NAVY}"/>`}
    ${inner}
  </svg>`
}

const tasks = [
  ['icon-512.png', 512, svg()],
  ['icon-192.png', 192, svg()],
  ['apple-touch-icon.png', 180, svg()],
  ['icon-maskable-512.png', 512, svg({ pad: 0.1 })],
]
for (const [name, size, src] of tasks) {
  await sharp(Buffer.from(src)).resize(size, size).png({ compressionLevel: 9 }).toFile(join(out, name))
}
writeFileSync(join(root, 'public/favicon.svg'), svg({ rounded: true }).replace(/\s+/g, ' '))
await sharp(Buffer.from(svg({ rounded: true }))).resize(1024, 1024).png().toFile(join(root, 'scripts/icon-preview.png'))
console.log('Ikony vygenerovány do public/icons')
