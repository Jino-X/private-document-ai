import * as pdfjs from 'pdfjs-dist'
import mammoth from 'mammoth'

// PDF.js worker setup - we'll configure it lazily when needed
// This avoids hydration issues and COEP problems
let workerConfigured = false

async function configurePdfWorker() {
  if (workerConfigured || typeof window === 'undefined') return
  
  try {
    // Fetch worker script and create blob URL to bypass COEP restrictions
    const version = pdfjs.version
    const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
    
    const response = await fetch(workerUrl)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    
    pdfjs.GlobalWorkerOptions.workerSrc = blobUrl
    workerConfigured = true
  } catch (error) {
    console.warn('Failed to load PDF.js worker, falling back to main thread:', error)
    // Worker will run on main thread if this fails
    workerConfigured = true
  }
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
  // Configure worker before first use
  await configurePdfWorker()
  
  const arrayBuffer = await file.arrayBuffer()
  
  // Load PDF document
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
  })
  
  const pdf = await loadingTask.promise
  
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
