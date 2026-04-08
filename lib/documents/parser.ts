import * as pdfjs from 'pdfjs-dist'
import mammoth from 'mammoth'

// Initialize PDF.js worker using CDN (unpkg)
if (typeof window !== 'undefined') {
  const pdfjsVersion = pdfjs.version
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`
}

export type SupportedFileType = 'pdf' | 'txt' | 'docx'

export interface ParseResult {
  content: string
  pageCount?: number
  metadata?: Record<string, string>
}

export interface ParseProgress {
  current: number
  total: number
  status: string
}

export async function parseDocument(
  file: File,
  onProgress?: (progress: ParseProgress) => void
): Promise<ParseResult> {
  const fileType = getFileType(file.name)
  
  switch (fileType) {
    case 'pdf':
      return parsePDF(file, onProgress)
    case 'docx':
      return parseDOCX(file, onProgress)
    case 'txt':
      return parseTXT(file, onProgress)
    default:
      throw new Error(`Unsupported file type: ${file.name}`)
  }
}

export function getFileType(fileName: string): SupportedFileType | null {
  const ext = fileName.toLowerCase().split('.').pop()
  
  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'txt':
      return 'txt'
    case 'docx':
    case 'doc':
      return 'docx'
    default:
      return null
  }
}

export function isSupported(fileName: string): boolean {
  return getFileType(fileName) !== null
}

async function parsePDF(
  file: File,
  onProgress?: (progress: ParseProgress) => void
): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  
  const pageCount = pdf.numPages
  let content = ''
  
  for (let i = 1; i <= pageCount; i++) {
    onProgress?.({
      current: i,
      total: pageCount,
      status: `Extracting page ${i} of ${pageCount}...`,
    })
    
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
    
    content += pageText + '\n\n'
  }
  
  return {
    content: content.trim(),
    pageCount,
    metadata: {
      title: file.name,
    },
  }
}

async function parseDOCX(
  file: File,
  onProgress?: (progress: ParseProgress) => void
): Promise<ParseResult> {
  onProgress?.({
    current: 0,
    total: 1,
    status: 'Reading DOCX file...',
  })
  
  const arrayBuffer = await file.arrayBuffer()
  
  onProgress?.({
    current: 0.5,
    total: 1,
    status: 'Extracting text...',
  })
  
  const result = await mammoth.extractRawText({ arrayBuffer })
  
  onProgress?.({
    current: 1,
    total: 1,
    status: 'Complete',
  })
  
  return {
    content: result.value.trim(),
    metadata: {
      title: file.name,
    },
  }
}

async function parseTXT(
  file: File,
  onProgress?: (progress: ParseProgress) => void
): Promise<ParseResult> {
  onProgress?.({
    current: 0,
    total: 1,
    status: 'Reading text file...',
  })
  
  const content = await file.text()
  
  onProgress?.({
    current: 1,
    total: 1,
    status: 'Complete',
  })
  
  return {
    content: content.trim(),
    metadata: {
      title: file.name,
    },
  }
}

// Validate file before processing
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024 // 50MB
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    }
  }
  
  if (!isSupported(file.name)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload PDF, TXT, or DOCX files.',
    }
  }
  
  return { valid: true }
}
