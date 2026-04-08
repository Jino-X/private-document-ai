import { Chunk } from '@/lib/db'
import { generateId } from '@/lib/utils'

export interface ChunkingOptions {
  chunkSize: number
  chunkOverlap: number
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  chunkSize: 500,
  chunkOverlap: 100,
}

export function chunkText(
  text: string,
  documentId: string,
  options: Partial<ChunkingOptions> = {}
): Chunk[] {
  const { chunkSize, chunkOverlap } = { ...DEFAULT_OPTIONS, ...options }
  const chunks: Chunk[] = []
  
  // Clean and normalize text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  
  if (!cleanedText) return chunks
  
  // Split by paragraphs first for better semantic chunking
  const paragraphs = cleanedText.split(/\n\n+/)
  
  let currentChunk = ''
  let currentStartOffset = 0
  let chunkIndex = 0
  let textPosition = 0
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim()
    if (!paragraph) {
      textPosition += 2 // Account for \n\n
      continue
    }
    
    // If adding this paragraph exceeds chunk size
    if (currentChunk.length + paragraph.length + 1 > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        id: generateId(),
        documentId,
        content: currentChunk.trim(),
        index: chunkIndex,
        startOffset: currentStartOffset,
        endOffset: textPosition - 1,
      })
      chunkIndex++
      
      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, chunkOverlap)
      currentChunk = overlapText + (overlapText ? ' ' : '') + paragraph
      currentStartOffset = textPosition - overlapText.length
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
    
    textPosition += paragraph.length + 2 // +2 for \n\n
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      id: generateId(),
      documentId,
      content: currentChunk.trim(),
      index: chunkIndex,
      startOffset: currentStartOffset,
      endOffset: cleanedText.length,
    })
  }
  
  return chunks
}

function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) return text
  
  // Try to break at word boundary
  const lastPart = text.slice(-overlapSize)
  const wordBoundary = lastPart.indexOf(' ')
  
  if (wordBoundary > 0 && wordBoundary < overlapSize / 2) {
    return lastPart.slice(wordBoundary + 1)
  }
  
  return lastPart
}

// Sentence-based chunking for more precise retrieval
export function chunkBySentences(
  text: string,
  documentId: string,
  options: Partial<ChunkingOptions> = {}
): Chunk[] {
  const { chunkSize, chunkOverlap } = { ...DEFAULT_OPTIONS, ...options }
  const chunks: Chunk[] = []
  
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  
  let currentChunk = ''
  let currentStartOffset = 0
  let chunkIndex = 0
  let textPosition = 0
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    
    if (currentChunk.length + trimmedSentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        id: generateId(),
        documentId,
        content: currentChunk.trim(),
        index: chunkIndex,
        startOffset: currentStartOffset,
        endOffset: textPosition,
      })
      chunkIndex++
      
      const overlapText = getOverlapText(currentChunk, chunkOverlap)
      currentChunk = overlapText + ' ' + trimmedSentence
      currentStartOffset = textPosition - overlapText.length
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence
    }
    
    textPosition += sentence.length
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      id: generateId(),
      documentId,
      content: currentChunk.trim(),
      index: chunkIndex,
      startOffset: currentStartOffset,
      endOffset: text.length,
    })
  }
  
  return chunks
}

// Estimate token count (rough approximation)
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4)
}

// Chunk by token count
export function chunkByTokens(
  text: string,
  documentId: string,
  maxTokens: number = 500,
  overlapTokens: number = 100
): Chunk[] {
  const charsPerToken = 4
  return chunkText(text, documentId, {
    chunkSize: maxTokens * charsPerToken,
    chunkOverlap: overlapTokens * charsPerToken,
  })
}
