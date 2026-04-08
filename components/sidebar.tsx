'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Plus, 
  Trash2, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Shield,
  Wifi,
  WifiOff,
  LogOut,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/lib/store'
import { useAuth } from '@/lib/auth/context'
import { cn, formatFileSize, formatDate, truncateText } from '@/lib/utils'
import { Document } from '@/lib/db'

interface SidebarProps {
  onUpload: () => void
  onSelectDocument: (doc: Document) => void
  onDeleteDocument: (id: string) => void
  onOpenSettings: () => void
}

export function Sidebar({ 
  onUpload, 
  onSelectDocument, 
  onDeleteDocument,
  onOpenSettings 
}: SidebarProps) {
  const { 
    documents, 
    currentDocumentId, 
    sidebarOpen, 
    toggleSidebar,
    modelLoaded 
  } = useAppStore()
  
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [loggingOut, setLoggingOut] = useState(false)
  
  // Listen for online/offline events
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => setIsOnline(true))
    window.addEventListener('offline', () => setIsOnline(false))
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    router.push('/login')
  }

  return (
    <>
      {/* Toggle button when collapsed */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50"
          >
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleSidebar}
              className="rounded-l-none shadow-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-screen border-r bg-card flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-semibold text-sm">Private Doc AI</h1>
                  <p className="text-xs text-muted-foreground">100% Offline</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* Status indicators */}
            <div className="px-4 py-2 flex items-center gap-2 text-xs border-b">
              <div className={cn(
                "flex items-center gap-1",
                isOnline ? "text-green-600" : "text-muted-foreground"
              )}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? "Online" : "Offline"}
              </div>
              <span className="text-muted-foreground">•</span>
              <div className={cn(
                "flex items-center gap-1",
                modelLoaded ? "text-green-600" : "text-yellow-600"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  modelLoaded ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                )} />
                {modelLoaded ? "Model Ready" : "Model Loading"}
              </div>
            </div>

            {/* New Document Button */}
            <div className="p-4">
              <Button onClick={onUpload} className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>

            {/* Documents List */}
            <ScrollArea className="flex-1 px-2">
              <div className="space-y-1 pb-4">
                {documents.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No documents yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a PDF, TXT, or DOCX file to get started
                    </p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "group relative p-3 rounded-lg cursor-pointer transition-colors",
                        currentDocumentId === doc.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted"
                      )}
                      onClick={() => onSelectDocument(doc)}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className={cn(
                          "h-5 w-5 mt-0.5 shrink-0",
                          currentDocumentId === doc.id 
                            ? "text-primary" 
                            : "text-muted-foreground"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {truncateText(doc.name, 25)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatFileSize(doc.size)} • {doc.type.toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(doc.createdAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteDocument(doc.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t space-y-3">
              {/* User Profile */}
              {user && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  className="flex-1 justify-start" 
                  size="sm"
                  onClick={onOpenSettings}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-xs text-center text-muted-foreground pt-1">
                <p className="flex items-center justify-center gap-1">
                  <Shield className="h-3 w-3" />
                  Your data never leaves your device
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
