'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Chrome, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { checkWebGPUSupport } from '@/lib/webllm'

interface WebGPUCheckProps {
  children: React.ReactNode
}

export function WebGPUCheck({ children }: WebGPUCheckProps) {
  const [checking, setChecking] = useState(true)
  const [supported, setSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const result = await checkWebGPUSupport()
      setSupported(result.supported)
      setError(result.error || null)
      setChecking(false)
    }
    check()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking device compatibility...</p>
        </div>
      </div>
    )
  }

  if (!supported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <div className="p-4 rounded-full bg-destructive/10 w-fit mx-auto mb-6">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">WebGPU Not Supported</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'Your browser or device does not support WebGPU, which is required for running AI models locally.'}
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted text-left">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Chrome className="h-4 w-4" />
                Supported Browsers
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Chrome 113+ (recommended)</li>
                <li>• Edge 113+</li>
                <li>• Chrome Canary</li>
                <li>• Firefox Nightly (with flags)</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-muted text-left">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                System Requirements
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Modern GPU (2018 or newer recommended)</li>
                <li>• 8GB+ RAM</li>
                <li>• macOS 13+, Windows 10+, or Linux</li>
              </ul>
            </div>

            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Check Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
