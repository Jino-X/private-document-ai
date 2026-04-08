import { openDB, DBSchema, IDBPDatabase } from 'idb'

export interface Document {
  id: string
  name: string
  type: 'pdf' | 'txt' | 'docx'
  size: number
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface Chunk {
  id: string
  documentId: string
  content: string
  index: number
  startOffset: number
  endOffset: number
  embedding?: number[]
}

export interface ChatMessage {
  id: string
  documentId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: ChunkSource[]
  createdAt: Date
}

export interface ChunkSource {
  chunkId: string
  content: string
  score: number
  startOffset: number
  endOffset: number
}

export interface ChatSession {
  id: string
  documentId: string
  title: string
  createdAt: Date
  updatedAt: Date
}

export interface Settings {
  id: string
  modelId: string
  chunkSize: number
  chunkOverlap: number
  topK: number
  temperature: number
  maxTokens: number
  theme: 'light' | 'dark' | 'system'
}

interface PrivateDocAIDB extends DBSchema {
  documents: {
    key: string
    value: Document
    indexes: { 'by-date': Date }
  }
  chunks: {
    key: string
    value: Chunk
    indexes: { 'by-document': string }
  }
  messages: {
    key: string
    value: ChatMessage
    indexes: { 'by-document': string; 'by-date': Date }
  }
  sessions: {
    key: string
    value: ChatSession
    indexes: { 'by-document': string; 'by-date': Date }
  }
  settings: {
    key: string
    value: Settings
  }
}

const DB_NAME = 'private-doc-ai'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<PrivateDocAIDB> | null = null

export async function getDB(): Promise<IDBPDatabase<PrivateDocAIDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<PrivateDocAIDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Documents store
      if (!db.objectStoreNames.contains('documents')) {
        const docStore = db.createObjectStore('documents', { keyPath: 'id' })
        docStore.createIndex('by-date', 'createdAt')
      }

      // Chunks store
      if (!db.objectStoreNames.contains('chunks')) {
        const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' })
        chunkStore.createIndex('by-document', 'documentId')
      }

      // Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' })
        msgStore.createIndex('by-document', 'documentId')
        msgStore.createIndex('by-date', 'createdAt')
      }

      // Sessions store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' })
        sessionStore.createIndex('by-document', 'documentId')
        sessionStore.createIndex('by-date', 'createdAt')
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' })
      }
    },
  })

  return dbInstance
}

// Document operations
export async function saveDocument(doc: Document): Promise<void> {
  const db = await getDB()
  await db.put('documents', doc)
}

export async function getDocument(id: string): Promise<Document | undefined> {
  const db = await getDB()
  return db.get('documents', id)
}

export async function getAllDocuments(): Promise<Document[]> {
  const db = await getDB()
  return db.getAllFromIndex('documents', 'by-date')
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB()
  
  // Delete document
  await db.delete('documents', id)
  
  // Delete associated chunks
  const chunks = await db.getAllFromIndex('chunks', 'by-document', id)
  for (const chunk of chunks) {
    await db.delete('chunks', chunk.id)
  }
  
  // Delete associated messages
  const messages = await db.getAllFromIndex('messages', 'by-document', id)
  for (const msg of messages) {
    await db.delete('messages', msg.id)
  }
  
  // Delete associated sessions
  const sessions = await db.getAllFromIndex('sessions', 'by-document', id)
  for (const session of sessions) {
    await db.delete('sessions', session.id)
  }
}

// Chunk operations
export async function saveChunks(chunks: Chunk[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('chunks', 'readwrite')
  await Promise.all([
    ...chunks.map(chunk => tx.store.put(chunk)),
    tx.done,
  ])
}

export async function getChunksByDocument(documentId: string): Promise<Chunk[]> {
  const db = await getDB()
  return db.getAllFromIndex('chunks', 'by-document', documentId)
}

export async function getChunk(id: string): Promise<Chunk | undefined> {
  const db = await getDB()
  return db.get('chunks', id)
}

// Message operations
export async function saveMessage(message: ChatMessage): Promise<void> {
  const db = await getDB()
  await db.put('messages', message)
}

export async function getMessagesByDocument(documentId: string): Promise<ChatMessage[]> {
  const db = await getDB()
  const messages = await db.getAllFromIndex('messages', 'by-document', documentId)
  return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export async function deleteMessagesByDocument(documentId: string): Promise<void> {
  const db = await getDB()
  const messages = await db.getAllFromIndex('messages', 'by-document', documentId)
  const tx = db.transaction('messages', 'readwrite')
  await Promise.all([
    ...messages.map(msg => tx.store.delete(msg.id)),
    tx.done,
  ])
}

// Session operations
export async function saveSession(session: ChatSession): Promise<void> {
  const db = await getDB()
  await db.put('sessions', session)
}

export async function getSessionsByDocument(documentId: string): Promise<ChatSession[]> {
  const db = await getDB()
  return db.getAllFromIndex('sessions', 'by-document', documentId)
}

// Settings operations
export async function getSettings(): Promise<Settings> {
  const db = await getDB()
  const settings = await db.get('settings', 'default')
  
  if (!settings) {
    const defaultSettings: Settings = {
      id: 'default',
      modelId: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
      chunkSize: 500,
      chunkOverlap: 100,
      topK: 5,
      temperature: 0.7,
      maxTokens: 2048,
      theme: 'system',
    }
    await db.put('settings', defaultSettings)
    return defaultSettings
  }
  
  return settings
}

export async function updateSettings(settings: Partial<Settings>): Promise<void> {
  const db = await getDB()
  const current = await getSettings()
  await db.put('settings', { ...current, ...settings })
}

// Clear all data
export async function clearAllData(): Promise<void> {
  const db = await getDB()
  await db.clear('documents')
  await db.clear('chunks')
  await db.clear('messages')
  await db.clear('sessions')
}

// Get storage usage estimate
export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    }
  }
  return { used: 0, quota: 0 }
}
