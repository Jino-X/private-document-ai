'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { parseDocument, validateFile, ParseProgress } from '@/lib/documents'
import { chunkText } from '@/lib/rag'
import { saveDocument, saveChunks, Document, Chunk } from '@/lib/db'
import { useAppStore } from '@/lib/store'
import { generateId, formatFileSize } from '@/lib/utils'

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: (document: Document) => void
}

type UploadState = 'idle' | 'validating' | 'parsing' | 'chunking' | 'saving' | 'complete' | 'error'

export function UploadDialog({ open, onOpenChange, onUploadComplete }: UploadDialogProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { settings, addDocument } = useAppStore()

  const resetState = () => {
    setFile(null)
    setUploadState('idle')
    setProgress(0)
    setStatusText('')
    setError(null)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFile(droppedFile)
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFile(selectedFile)
    }
  }

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)

    // Validate
    setUploadState('validating')
    setStatusText('Validating file...')
    const validation = validateFile(selectedFile)

    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      setUploadState('error')
      return
    }

    try {
      // Parse document
      setUploadState('parsing')
      setProgress(0)

      const parseResult = await parseDocument(selectedFile, (p: ParseProgress) => {
        setProgress((p.current / p.total) * 50)
        setStatusText(p.status)
      })

      // Chunk text
      setUploadState('chunking')
      setStatusText('Processing text into chunks...')
      setProgress(60)

      const documentId = generateId()
      const chunks = chunkText(parseResult.content, documentId, {
        chunkSize: settings.chunkSize,
        chunkOverlap: settings.chunkOverlap,
      })

      setProgress(80)

      // Save to IndexedDB
      setUploadState('saving')
      setStatusText('Saving to local storage...')

      const document: Document = {
        id: documentId,
        name: selectedFile.name,
        type: selectedFile.name.split('.').pop()?.toLowerCase() as 'pdf' | 'txt' | 'docx',
        size: selectedFile.size,
        content: parseResult.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await saveDocument(document)
      await saveChunks(chunks)

      setProgress(100)
      setUploadState('complete')
      setStatusText(`Successfully processed ${chunks.length} chunks`)

      // Add to store
      addDocument(document)

      // Notify parent
      setTimeout(() => {
        onUploadComplete(document)
        onOpenChange(false)
        resetState()
      }, 1500)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process document')
      setUploadState('error')
    }
  }

  const handleClose = () => {
    if (uploadState !== 'parsing' && uploadState !== 'chunking' && uploadState !== 'saving') {
      onOpenChange(false)
      resetState()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF, TXT, or DOCX file to chat with your AI assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          {uploadState === 'idle' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.txt,.docx,.doc"
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload className={cn(
                "h-10 w-10 mx-auto mb-4",
                dragActive ? "text-primary" : "text-muted-foreground"
              )} />
              <p className="text-sm font-medium mb-1">
                {dragActive ? "Drop your file here" : "Drag & drop or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, TXT, DOCX (max 50MB)
              </p>
            </div>
          )}

          {/* Processing State */}
          {uploadState !== 'idle' && uploadState !== 'error' && (
            <div className="space-y-4">
              {file && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <FileText className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  {uploadState === 'complete' && (
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{statusText}</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {uploadState === 'complete' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-green-600 text-sm"
                >
                  <CheckCircle className="h-4 w-4" />
                  Document processed successfully!
                </motion.div>
              )}
            </div>
          )}

          {/* Error State */}
          {uploadState === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Upload Failed</p>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
              <Button onClick={resetState} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
