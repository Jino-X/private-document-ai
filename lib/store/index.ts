import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Document, ChatMessage, Settings, ChunkSource } from '@/lib/db'

interface AppState {
  // Documents
  documents: Document[]
  currentDocumentId: string | null
  setDocuments: (docs: Document[]) => void
  addDocument: (doc: Document) => void
  removeDocument: (id: string) => void
  setCurrentDocument: (id: string | null) => void
  
  // Chat
  messages: ChatMessage[]
  isGenerating: boolean
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  updateLastMessage: (content: string) => void
  setIsGenerating: (generating: boolean) => void
  clearMessages: () => void
  
  // Highlighted sources
  highlightedSources: ChunkSource[]
  setHighlightedSources: (sources: ChunkSource[]) => void
  clearHighlightedSources: () => void
  
  // LLM
  modelLoaded: boolean
  modelLoading: boolean
  modelProgress: number
  modelStatus: string
  setModelLoaded: (loaded: boolean) => void
  setModelLoading: (loading: boolean) => void
  setModelProgress: (progress: number, status: string) => void
  
  // Settings
  settings: Settings
  setSettings: (settings: Partial<Settings>) => void
  
  // UI
  sidebarOpen: boolean
  documentViewerOpen: boolean
  settingsOpen: boolean
  toggleSidebar: () => void
  toggleDocumentViewer: () => void
  toggleSettings: () => void
  setSidebarOpen: (open: boolean) => void
  setDocumentViewerOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
}

const defaultSettings: Settings = {
  id: 'default',
  modelId: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
  chunkSize: 500,
  chunkOverlap: 100,
  topK: 5,
  temperature: 0.7,
  maxTokens: 2048,
  theme: 'system',
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Documents
      documents: [],
      currentDocumentId: null,
      setDocuments: (documents) => set({ documents }),
      addDocument: (doc) => set((state) => ({ 
        documents: [...state.documents, doc] 
      })),
      removeDocument: (id) => set((state) => ({
        documents: state.documents.filter(d => d.id !== id),
        currentDocumentId: state.currentDocumentId === id ? null : state.currentDocumentId,
      })),
      setCurrentDocument: (id) => set({ currentDocumentId: id }),
      
      // Chat
      messages: [],
      isGenerating: false,
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message],
      })),
      updateLastMessage: (content) => set((state) => {
        const messages = [...state.messages]
        if (messages.length > 0) {
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            content,
          }
        }
        return { messages }
      }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      clearMessages: () => set({ messages: [] }),
      
      // Highlighted sources
      highlightedSources: [],
      setHighlightedSources: (sources) => set({ highlightedSources: sources }),
      clearHighlightedSources: () => set({ highlightedSources: [] }),
      
      // LLM
      modelLoaded: false,
      modelLoading: false,
      modelProgress: 0,
      modelStatus: '',
      setModelLoaded: (modelLoaded) => set({ modelLoaded }),
      setModelLoading: (modelLoading) => set({ modelLoading }),
      setModelProgress: (modelProgress, modelStatus) => set({ modelProgress, modelStatus }),
      
      // Settings
      settings: defaultSettings,
      setSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),
      
      // UI
      sidebarOpen: true,
      documentViewerOpen: false,
      settingsOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleDocumentViewer: () => set((state) => ({ documentViewerOpen: !state.documentViewerOpen })),
      toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setDocumentViewerOpen: (documentViewerOpen) => set({ documentViewerOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
    }),
    {
      name: 'private-doc-ai-store',
      partialize: (state) => ({
        settings: state.settings,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
