'use client'

import { useState, useEffect } from 'react'
import { Settings, Trash2, HardDrive, Cpu, Moon, Sun, Monitor } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useAppStore } from '@/lib/store'
import { AVAILABLE_MODELS, getModelInfo } from '@/lib/webllm'
import { clearAllData, getStorageUsage } from '@/lib/db'
import { formatFileSize } from '@/lib/utils'
import { useTheme } from 'next-themes'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, setSettings, setDocuments, clearMessages } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [storageUsed, setStorageUsed] = useState(0)
  const [storageQuota, setStorageQuota] = useState(0)
  const [clearing, setClearing] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  useEffect(() => {
    if (open) {
      getStorageUsage().then(({ used, quota }) => {
        setStorageUsed(used)
        setStorageQuota(quota)
      })
    }
  }, [open])

  const handleClearData = async () => {
    setClearing(true)
    try {
      await clearAllData()
      setDocuments([])
      clearMessages()
      const { used, quota } = await getStorageUsage()
      setStorageUsed(used)
      setStorageQuota(quota)
      setConfirmClearOpen(false)
    } catch (error) {
      console.error('Failed to clear data:', error)
    } finally {
      setClearing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your AI assistant and manage local data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 pr-2">
          {/* Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">AI Model</h3>
            </div>
            <Select
              value={settings.modelId}
              onValueChange={(value) => setSettings({ modelId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.size} - {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Larger models provide better quality but require more memory.
            </p>
          </div>

          {/* Theme */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Theme</h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="flex-1"
              >
                <Sun className="h-4 w-4 mr-2" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="flex-1"
              >
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="flex-1"
              >
                <Monitor className="h-4 w-4 mr-2" />
                System
              </Button>
            </div>
          </div>

          {/* Chunk Settings */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Text Processing</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Chunk Size: {settings.chunkSize} chars
                </label>
              </div>
              <Slider
                value={[settings.chunkSize]}
                onValueChange={([value]) => setSettings({ chunkSize: value })}
                min={200}
                max={2000}
                step={100}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Chunk Overlap: {settings.chunkOverlap} chars
                </label>
              </div>
              <Slider
                value={[settings.chunkOverlap]}
                onValueChange={([value]) => setSettings({ chunkOverlap: value })}
                min={0}
                max={500}
                step={50}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Top K Results: {settings.topK}
                </label>
              </div>
              <Slider
                value={[settings.topK]}
                onValueChange={([value]) => setSettings({ topK: value })}
                min={1}
                max={10}
                step={1}
              />
            </div>
          </div>

          {/* Generation Settings */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Generation</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Temperature: {settings.temperature.toFixed(1)}
                </label>
              </div>
              <Slider
                value={[settings.temperature * 10]}
                onValueChange={([value]) => setSettings({ temperature: value / 10 })}
                min={0}
                max={20}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Lower = more focused, Higher = more creative
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Max Tokens: {settings.maxTokens}
                </label>
              </div>
              <Slider
                value={[settings.maxTokens]}
                onValueChange={([value]) => setSettings({ maxTokens: value })}
                min={256}
                max={4096}
                step={256}
              />
            </div>
          </div>

          {/* Storage */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Local Storage</h3>
            </div>
            
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Storage Used</span>
                <span className="text-sm font-medium">
                  {formatFileSize(storageUsed)} / {formatFileSize(storageQuota)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-background overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(storageUsed / storageQuota) * 100}%` }}
                />
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmClearOpen(true)}
              disabled={clearing}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              This will delete all documents and chat history.
            </p>
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Clear All Data"
        description="Are you sure you want to delete all documents and chat history? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
        variant="destructive"
        loading={clearing}
        onConfirm={handleClearData}
      />
    </Dialog>
  )
}
