'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { ChatInterface } from '@/components/chat/chat-interface'
import { UploadDialog } from '@/components/upload-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { WebGPUCheck } from '@/components/webgpu-check'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/context'
import { 
  getAllDocuments, 
  getChunksByDocument, 
  deleteDocument as deleteDocFromDB,
  saveMessage,
  getMessagesByDocument,
  Document,
  ChatMessage,
  ChunkSource,
} from '@/lib/db'
import { searchChunks, toChunkSources, buildContext } from '@/lib/rag'
import { 
  initializeEngine, 
  generateWithContext, 
  isEngineReady,
  LLMProgress 
} from '@/lib/webllm'
import { generateId } from '@/lib/utils'

export default function ChatPage() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const {
    documents,
    currentDocumentId,
    settings,
    modelLoaded,
    modelLoading,
    modelProgress,
    modelStatus,
    setDocuments,
    setCurrentDocument,
    removeDocument,
    setMessages,
    addMessage,
    updateLastMessage,
    setIsGenerating,
    setModelLoaded,
    setModelLoading,
    setModelProgress,
    setHighlightedSources,
  } = useAppStore()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load documents from IndexedDB on mount
  useEffect(() => {
    const loadDocuments = async () => {
      const docs = await getAllDocuments()
      setDocuments(docs.reverse())
      setInitialized(true)
    }
    if (user) {
      loadDocuments()
    }
  }, [setDocuments, user])

  // Load messages when document changes
  useEffect(() => {
    const loadMessages = async () => {
      if (currentDocumentId) {
        const msgs = await getMessagesByDocument(currentDocumentId)
        setMessages(msgs)
      } else {
        setMessages([])
      }
    }
    loadMessages()
  }, [currentDocumentId, setMessages])

  // Initialize WebLLM engine
  useEffect(() => {
    if (!initialized || modelLoaded || modelLoading) return

    const initEngine = async () => {
      setModelLoading(true)
      try {
        await initializeEngine(settings.modelId, (progress: LLMProgress) => {
          if (progress.stage === 'loading') {
            setModelProgress(
              (progress.progress || 0) * 100,
              progress.text || 'Loading model...'
            )
          } else if (progress.stage === 'ready') {
            setModelLoaded(true)
            setModelLoading(false)
          }
        })
      } catch (error) {
        console.error('Failed to initialize WebLLM:', error)
        setModelLoading(false)
      }
    }

    initEngine()
  }, [initialized, modelLoaded, modelLoading, settings.modelId, setModelLoaded, setModelLoading, setModelProgress])

  const handleSelectDocument = useCallback(async (doc: Document) => {
    setCurrentDocument(doc.id)
  }, [setCurrentDocument])

  const handleDeleteDocument = useCallback((id: string) => {
    setDocumentToDelete(id)
    setDeleteConfirmOpen(true)
  }, [])

  const confirmDeleteDocument = useCallback(async () => {
    if (!documentToDelete) return
    
    setDeleting(true)
    try {
      await deleteDocFromDB(documentToDelete)
      removeDocument(documentToDelete)
      
      if (currentDocumentId === documentToDelete) {
        setCurrentDocument(null)
        setMessages([])
      }
      setDeleteConfirmOpen(false)
      setDocumentToDelete(null)
    } finally {
      setDeleting(false)
    }
  }, [documentToDelete, currentDocumentId, removeDocument, setCurrentDocument, setMessages])

  const handleUploadComplete = useCallback((doc: Document) => {
    setCurrentDocument(doc.id)
  }, [setCurrentDocument])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentDocumentId || !isEngineReady()) return

    const userMessage: ChatMessage = {
      id: generateId(),
      documentId: currentDocumentId,
      role: 'user',
      content,
      createdAt: new Date(),
    }
    addMessage(userMessage)
    await saveMessage(userMessage)

    const assistantMessage: ChatMessage = {
      id: generateId(),
      documentId: currentDocumentId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }
    addMessage(assistantMessage)
    setIsGenerating(true)

    try {
      const chunks = await getChunksByDocument(currentDocumentId)
      const results = searchChunks(content, chunks, settings.topK)
      const sources = toChunkSources(results)
      const context = buildContext(sources)
      
      setHighlightedSources(sources)

      let fullResponse = ''
      await generateWithContext(content, context, {
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
        stream: true,
        onToken: (token) => {
          fullResponse += token
          updateLastMessage(fullResponse)
        },
      })

      const finalMessage: ChatMessage = {
        ...assistantMessage,
        content: fullResponse,
        sources,
      }
      await saveMessage(finalMessage)
      updateLastMessage(fullResponse)

    } catch (error) {
      console.error('Error generating response:', error)
      updateLastMessage('Sorry, I encountered an error while processing your request. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [
    currentDocumentId, 
    settings, 
    addMessage, 
    updateLastMessage, 
    setIsGenerating,
    setHighlightedSources,
  ])

  const handleSourceClick = useCallback((source: ChunkSource) => {
    setHighlightedSources([source])
  }, [setHighlightedSources])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <WebGPUCheck>
      <div className="flex h-screen bg-background">
        <Sidebar
          onUpload={() => setUploadOpen(true)}
          onSelectDocument={handleSelectDocument}
          onDeleteDocument={handleDeleteDocument}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="flex-1 flex flex-col min-w-0">
          {modelLoading && (
            <div className="border-b p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Loading AI Model</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(modelProgress)}%
                  </span>
                </div>
                <Progress value={modelProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {modelStatus}
                </p>
              </div>
            </div>
          )}

          <ChatInterface
            onSendMessage={handleSendMessage}
            onSourceClick={handleSourceClick}
          />
        </main>

        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUploadComplete={handleUploadComplete}
        />
        
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={(open) => {
            setDeleteConfirmOpen(open)
            if (!open) setDocumentToDelete(null)
          }}
          title="Delete Document"
          description="Are you sure you want to delete this document? All associated chat history will also be removed. This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          loading={deleting}
          onConfirm={confirmDeleteDocument}
        />
      </div>
    </WebGPUCheck>
  )
}
