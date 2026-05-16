import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const inputSvgPath = path.join(root, 'design', 'RACE_poster_0.8x2m.svg')
const embeddedSvgPath = path.join(root, 'design', 'RACE_poster_0.8x2m_embedded.svg')
const outJpgPath = path.join(root, 'design', 'RACE_poster_0.8x2m.jpg')
const outJpgPreviewPath = path.join(root, 'design', 'RACE_poster_0.8x2m_preview.jpg')

const svg = await fs.readFile(inputSvgPath, 'utf8')

const hrefRe = /href="(https:\/\/coresg-normal\.trae\.ai\/api\/ide\/v1\/text_to_image\?[^"]+)"/
const hrefMatch = svg.match(hrefRe)

let embeddedSvg = svg

if (hrefMatch?.[1]) {
  const url = hrefMatch[1]
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`)
  }
  const contentType = res.headers.get('content-type') || 'image/png'
  const arrayBuffer = await res.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const dataUri = `data:${contentType};base64,${base64}`
  embeddedSvg = embeddedSvg.replace(hrefRe, `href="${dataUri}"`)
  await fs.writeFile(embeddedSvgPath, embeddedSvg, 'utf8')
} else {
  await fs.writeFile(embeddedSvgPath, embeddedSvg, 'utf8')
}

const renderToJpg = async ({ svgText, width, outPath, quality }) => {
  const resvg = new Resvg(svgText, {
    fitTo: { mode: 'width', value: width },
    background: 'rgb(5,6,18)',
  })
  const png = resvg.render().asPng()
  await sharp(png).jpeg({ quality }).toFile(outPath)
}

await renderToJpg({ svgText: embeddedSvg, width: 2400, outPath: outJpgPath, quality: 92 })
await renderToJpg({ svgText: embeddedSvg, width: 1200, outPath: outJpgPreviewPath, quality: 88 })

console.log('OK')
console.log(outJpgPath)
console.log(outJpgPreviewPath)
console.log(embeddedSvgPath)

