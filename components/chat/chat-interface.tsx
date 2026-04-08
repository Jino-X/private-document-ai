'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Bot, User, Sparkles, FileText, MessageSquare, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ChatMessage, ChunkSource } from '@/lib/db'

interface ChatInterfaceProps {
  onSendMessage: (message: string) => Promise<void>
  onSourceClick?: (source: ChunkSource) => void
}

export function ChatInterface({ onSendMessage, onSourceClick }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const { messages, isGenerating, modelLoaded, currentDocumentId } = useAppStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isGenerating || !modelLoaded) return

    const message = input.trim()
    setInput('')
    await onSendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  if (!currentDocumentId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-b from-background to-muted/20">
        <div className="text-center max-w-lg">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-150" />
              <div className="relative p-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 w-fit mx-auto border border-primary/20">
                <FileText className="h-12 w-12 text-primary" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-3">Welcome to Private Doc AI</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Upload a document to start an AI-powered conversation. 
              Your data stays 100% private - everything runs locally in your browser.
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: FileText, label: 'PDF, TXT, DOCX', desc: 'Supported formats' },
                { icon: Zap, label: 'Instant', desc: 'Local processing' },
                { icon: MessageSquare, label: 'Natural', desc: 'AI conversations' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                  className="p-4 rounded-xl bg-card border text-center"
                >
                  <item.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground">
              Click <span className="font-medium text-primary">Upload Document</span> in the sidebar to get started
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Ask any question about your document. The AI will analyze the content and provide relevant answers.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {[
                  "What is this document about?",
                  "Summarize the key points",
                  "What are the main topics?"
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                  isGenerating={isGenerating && index === messages.length - 1}
                  onSourceClick={onSourceClick}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4 bg-gradient-to-t from-muted/30 to-background">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative bg-background rounded-2xl border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !modelLoaded 
                  ? "Loading AI model..." 
                  : "Ask a question about your document..."
              }
              disabled={!modelLoaded || isGenerating}
              className="min-h-[56px] max-h-[200px] pr-14 resize-none border-0 focus-visible:ring-0 bg-transparent rounded-2xl"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isGenerating || !modelLoaded}
              className="absolute right-2 bottom-2 rounded-xl h-10 w-10 shadow-md"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {!modelLoaded && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-2 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 py-2 px-4 rounded-lg"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading AI model... This may take a few minutes on first load.
            </motion.p>
          )}
        </form>
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  isLast: boolean
  isGenerating: boolean
  onSourceClick?: (source: ChunkSource) => void
}

function MessageBubble({ message, isLast, isGenerating, onSourceClick }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-primary" : "bg-muted"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 max-w-[80%]",
        isUser ? "text-right" : "text-left"
      )}>
        <div className={cn(
          "inline-block rounded-2xl px-4 py-3",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-muted rounded-tl-sm"
        )}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || (isGenerating && isLast ? '...' : '')}
              </ReactMarkdown>
              {isGenerating && isLast && (
                <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
              )}
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {message.sources.map((source, idx) => (
                <button
                  key={source.chunkId}
                  onClick={() => onSourceClick?.(source)}
                  className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  [{idx + 1}] Score: {(source.score * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
