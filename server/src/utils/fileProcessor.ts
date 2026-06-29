import { readFileSync, readdirSync, unlinkSync, mkdirSync, rmSync, existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { execSync } from 'child_process'
import sharp from 'sharp'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'

const UPLOAD_DIR = join('/tmp', 'nexus-uploads')

export interface FileContext {
  id: string
  name: string
  type: 'text' | 'image'
  mimeType: string
  size: number
  textContent?: string
  base64?: string
  imageFormat?: string
}

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.csv', '.toml', '.ini', '.xml', '.log', '.svg'])
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp'])
const PDF_EXTENSION = '.pdf'
const DOCX_EXTENSION = '.docx'
const DOC_EXTENSION = '.doc'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 2048

function detectMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.csv': 'text/csv',
    '.toml': 'application/toml',
    '.ini': 'text/plain',
    '.xml': 'application/xml',
    '.log': 'text/plain',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }
  return map[ext] ?? 'application/octet-stream'
}

function readTextFile(filePath: string, name: string): FileContext {
  const content = readFileSync(filePath, 'utf-8')
  const ext = extname(name).toLowerCase()
  return {
    id: randomUUID(),
    name,
    type: 'text',
    mimeType: detectMimeType(ext),
    size: Buffer.byteLength(content, 'utf-8'),
    textContent: content,
  }
}

async function processImageFile(filePath: string, name: string): Promise<FileContext> {
  const ext = extname(name).toLowerCase()
  const mimeType = detectMimeType(ext)
  let imageBuffer = readFileSync(filePath)

  try {
    const metadata = await sharp(imageBuffer).metadata()
    if ((metadata.width && metadata.width > MAX_IMAGE_DIMENSION) ||
        (metadata.height && metadata.height > MAX_IMAGE_DIMENSION)) {
      imageBuffer = await sharp(imageBuffer)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .toBuffer()
    }
  } catch {
    // If sharp fails, use original
  }

  const format = ext === '.png' ? 'png' : ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : ext === '.webp' ? 'webp' : 'png'
  const base64 = imageBuffer.toString('base64')

  return {
    id: randomUUID(),
    name,
    type: 'image',
    mimeType,
    size: imageBuffer.length,
    base64,
    imageFormat: format,
  }
}

async function processPdfFile(filePath: string, name: string): Promise<FileContext[]> {
  const pdfBuffer = readFileSync(filePath)

  let textContent = ''
  try {
    const parser = new PDFParse({ data: pdfBuffer })
    const result = await parser.getText()
    textContent = (result.text ?? '').trim()
  } catch {
    textContent = ''
  }

  if (textContent.length > 100) {
    return [{
      id: randomUUID(),
      name,
      type: 'text',
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
      textContent,
    }]
  }

  const results: FileContext[] = []
  const pageDir = join(UPLOAD_DIR, randomUUID())
  mkdirSync(pageDir, { recursive: true })

  try {
    const prefix = join(pageDir, 'page')
    execSync(`pdftoppm -png -r 200 "${filePath}" "${prefix}"`, { timeout: 30000 })

    const pageFiles = readdirSync(pageDir)
      .filter(f => f.startsWith('page-') && f.endsWith('.png'))
      .sort()

    for (const pageFile of pageFiles) {
      const pagePath = join(pageDir, pageFile)
      let imageBuffer = readFileSync(pagePath)

      try {
        const metadata = await sharp(imageBuffer).metadata()
        if ((metadata.width && metadata.width > MAX_IMAGE_DIMENSION) ||
            (metadata.height && metadata.height > MAX_IMAGE_DIMENSION)) {
          imageBuffer = await sharp(imageBuffer)
            .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
            .png()
            .toBuffer()
        }
      } catch {
        imageBuffer = await sharp(imageBuffer).png().toBuffer()
      }

      const base64 = imageBuffer.toString('base64')
      const pageNum = pageFile.match(/page-(\d+)/)?.[1] ?? '0'
      results.push({
        id: randomUUID(),
        name: `${name} - page ${pageNum}`,
        type: 'image',
        mimeType: 'image/png',
        size: imageBuffer.length,
        base64,
        imageFormat: 'png',
      })
    }
  } catch {
    if (textContent) {
      return [{
        id: randomUUID(),
        name,
        type: 'text',
        mimeType: 'application/pdf',
        size: pdfBuffer.length,
        textContent: textContent || '[PDF document - unable to extract content]',
      }]
    }
  } finally {
    try {
      if (existsSync(pageDir)) {
        const files = readdirSync(pageDir)
        for (const f of files) unlinkSync(join(pageDir, f))
        rmSync(pageDir, { recursive: true })
      }
    } catch { /* ignore cleanup errors */ }
  }

  if (results.length === 0) {
    return [{
      id: randomUUID(),
      name,
      type: 'text',
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
      textContent: textContent || '[PDF document - unable to extract content]',
    }]
  }

  return results
}

async function processDocxFile(filePath: string, name: string): Promise<FileContext> {
  try {
    const result = await mammoth.convertToHtml({ path: filePath })
    const html = result.value
    const textContent = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      id: randomUUID(),
      name,
      type: 'text',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: readFileSync(filePath).length,
      textContent: textContent || '[Word document - no extractable text]',
    }
  } catch {
    return {
      id: randomUUID(),
      name,
      type: 'text',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: readFileSync(filePath).length,
      textContent: '[Word document - unable to extract content]',
    }
  }
}

async function processDocFile(filePath: string, name: string): Promise<FileContext> {
  try {
    const extractor = new WordExtractor()
    const extracted = await extractor.extract(filePath)
    const textContent = extracted.getBody().trim() || '[Word document - no extractable text]'

    return {
      id: randomUUID(),
      name,
      type: 'text',
      mimeType: 'application/msword',
      size: readFileSync(filePath).length,
      textContent,
    }
  } catch {
    return {
      id: randomUUID(),
      name,
      type: 'text',
      mimeType: 'application/msword',
      size: readFileSync(filePath).length,
      textContent: '[Word document - unable to extract content]',
    }
  }
}

export async function processUploadedFile(filePath: string, originalName: string): Promise<FileContext[]> {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const stats = statSync(filePath)
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds maximum size of 20MB')
  }

  const ext = extname(originalName).toLowerCase()
  const name = originalName

  if (TEXT_EXTENSIONS.has(ext)) {
    return [readTextFile(filePath, name)]
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    return [await processImageFile(filePath, name)]
  }

  if (ext === PDF_EXTENSION) {
    return processPdfFile(filePath, name)
  }

  if (ext === DOCX_EXTENSION) {
    return [await processDocxFile(filePath, name)]
  }

  if (ext === DOC_EXTENSION) {
    return [await processDocFile(filePath, name)]
  }

  throw new Error(`Unsupported file type: ${ext}`)
}

export function buildMultimodalContent(
  userInput: string,
  fileContexts: FileContext[],
): ContentPart[] {
  if (fileContexts.length === 0) {
    return [{ type: 'text', text: userInput }]
  }

  const parts: ContentPart[] = [
    { type: 'text', text: userInput },
    { type: 'text', text: '\n\n--- Attached Files ---' },
  ]

  for (const fc of fileContexts) {
    if (fc.type === 'image' && fc.base64) {
      parts.push({
        type: 'text',
        text: `\n[File: ${fc.name}]`,
      })
      parts.push({
        type: 'image_url',
        image_url: {
          url: `data:${fc.mimeType};base64,${fc.base64}`,
        },
      })
    } else if (fc.textContent) {
      parts.push({
        type: 'text',
        text: `\n--- ${fc.name} ---\n${fc.textContent}\n`,
      })
    }
  }

  return parts
}

export function cleanupFile(filePath: string): void {
  try {
    if (existsSync(filePath)) unlinkSync(filePath)
  } catch { /* ignore */ }
}
