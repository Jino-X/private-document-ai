import { Chunk, ChunkSource } from '@/lib/db'

export interface RetrievalResult {
  chunk: Chunk
  score: number
}

// Simple keyword-based similarity search
export function searchChunks(
  query: string,
  chunks: Chunk[],
  topK: number = 5
): RetrievalResult[] {
  const queryTerms = tokenize(query.toLowerCase())
  
  const results: RetrievalResult[] = chunks.map(chunk => {
    const score = calculateBM25Score(queryTerms, chunk.content.toLowerCase())
    return { chunk, score }
  })
  
  // Sort by score descending and take top K
  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

// Tokenize text into terms
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 2 && !STOP_WORDS.has(term))
}

// BM25 scoring algorithm
function calculateBM25Score(queryTerms: string[], document: string): number {
  const docTerms = tokenize(document)
  const docLength = docTerms.length
  const avgDocLength = 500 // Approximate average
  
  const k1 = 1.5
  const b = 0.75
  
  let score = 0
  const termFreq = new Map<string, number>()
  
  // Calculate term frequencies
  for (const term of docTerms) {
    termFreq.set(term, (termFreq.get(term) || 0) + 1)
  }
  
  for (const queryTerm of queryTerms) {
    const tf = termFreq.get(queryTerm) || 0
    if (tf === 0) continue
    
    // Simplified IDF (assuming single document context)
    const idf = Math.log(1 + 1)
    
    // BM25 term score
    const numerator = tf * (k1 + 1)
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength))
    
    score += idf * (numerator / denominator)
  }
  
  return score
}

// TF-IDF based similarity
export function calculateTFIDFSimilarity(query: string, document: string): number {
  const queryTerms = tokenize(query)
  const docTerms = tokenize(document)
  
  if (queryTerms.length === 0 || docTerms.length === 0) return 0
  
  const queryVector = new Map<string, number>()
  const docVector = new Map<string, number>()
  
  // Build term frequency vectors
  for (const term of queryTerms) {
    queryVector.set(term, (queryVector.get(term) || 0) + 1)
  }
  
  for (const term of docTerms) {
    docVector.set(term, (docVector.get(term) || 0) + 1)
  }
  
  // Calculate cosine similarity
  let dotProduct = 0
  let queryMagnitude = 0
  let docMagnitude = 0
  
  const allTerms = new Set([...queryVector.keys(), ...docVector.keys()])
  
  for (const term of allTerms) {
    const qVal = queryVector.get(term) || 0
    const dVal = docVector.get(term) || 0
    
    dotProduct += qVal * dVal
    queryMagnitude += qVal * qVal
    docMagnitude += dVal * dVal
  }
  
  if (queryMagnitude === 0 || docMagnitude === 0) return 0
  
  return dotProduct / (Math.sqrt(queryMagnitude) * Math.sqrt(docMagnitude))
}

// Convert retrieval results to chunk sources for chat
export function toChunkSources(results: RetrievalResult[]): ChunkSource[] {
  return results.map(r => ({
    chunkId: r.chunk.id,
    content: r.chunk.content,
    score: r.score,
    startOffset: r.chunk.startOffset,
    endOffset: r.chunk.endOffset,
  }))
}

// Build context from retrieved chunks
export function buildContext(sources: ChunkSource[], maxLength: number = 4000): string {
  let context = ''
  
  for (const source of sources) {
    const addition = `[Source ${sources.indexOf(source) + 1}]:\n${source.content}\n\n`
    if (context.length + addition.length > maxLength) break
    context += addition
  }
  
  return context.trim()
}

// Common English stop words
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
  'have', 'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'than', 'too', 'very', 'can', 'just', 'should', 'now',
])

// Highlight matching terms in text
export function highlightMatches(text: string, query: string): string {
  const queryTerms = tokenize(query)
  let highlighted = text
  
  for (const term of queryTerms) {
    const regex = new RegExp(`\\b(${term})\\b`, 'gi')
    highlighted = highlighted.replace(regex, '<mark>$1</mark>')
  }
  
  return highlighted
}

// Find best matching position in original document
export function findBestMatch(
  query: string,
  documentContent: string,
  chunks: Chunk[]
): { startOffset: number; endOffset: number } | null {
  const results = searchChunks(query, chunks, 1)
  
  if (results.length === 0) return null
  
  const bestChunk = results[0].chunk
  return {
    startOffset: bestChunk.startOffset,
    endOffset: bestChunk.endOffset,
  }
}
