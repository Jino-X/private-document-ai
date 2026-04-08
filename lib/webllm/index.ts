import * as webllm from '@mlc-ai/web-llm'

export interface ModelInfo {
  id: string
  name: string
  size: string
  description: string
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.1 8B',
    size: '~4.5GB',
    description: 'Best quality, requires more VRAM',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.2 3B',
    size: '~2GB',
    description: 'Good balance of quality and speed',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f32_1-MLC',
    name: 'Phi 3.5 Mini',
    size: '~2.3GB',
    description: 'Fast and efficient',
  },
  {
    id: 'gemma-2-2b-it-q4f32_1-MLC',
    name: 'Gemma 2 2B',
    size: '~1.5GB',
    description: 'Lightweight, good for low-end devices',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    name: 'Qwen 2.5 1.5B',
    size: '~1GB',
    description: 'Smallest model, fastest inference',
  },
]

export interface LLMProgress {
  stage: 'loading' | 'ready' | 'generating' | 'error'
  progress?: number
  text?: string
}

export interface GenerateOptions {
  maxTokens?: number
  temperature?: number
  topP?: number
  stream?: boolean
  onToken?: (token: string) => void
}

let engineInstance: webllm.MLCEngine | null = null
let currentModelId: string | null = null

export async function initializeEngine(
  modelId: string,
  onProgress?: (progress: LLMProgress) => void
): Promise<webllm.MLCEngine> {
  // Return existing engine if same model
  if (engineInstance && currentModelId === modelId) {
    onProgress?.({ stage: 'ready' })
    return engineInstance
  }
  
  // Cleanup existing engine
  if (engineInstance) {
    await engineInstance.unload()
    engineInstance = null
  }
  
  onProgress?.({ stage: 'loading', progress: 0, text: 'Initializing...' })
  
  const engine = new webllm.MLCEngine()
  
  engine.setInitProgressCallback((report) => {
    onProgress?.({
      stage: 'loading',
      progress: report.progress,
      text: report.text,
    })
  })
  
  await engine.reload(modelId)
  
  engineInstance = engine
  currentModelId = modelId
  
  onProgress?.({ stage: 'ready' })
  
  return engine
}

export async function generateResponse(
  prompt: string,
  systemPrompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  if (!engineInstance) {
    throw new Error('Engine not initialized. Call initializeEngine first.')
  }
  
  const {
    maxTokens = 2048,
    temperature = 0.7,
    topP = 0.95,
    stream = true,
    onToken,
  } = options
  
  const messages: webllm.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ]
  
  if (stream && onToken) {
    let fullResponse = ''
    
    const asyncChunkGenerator = await engineInstance.chat.completions.create({
      messages,
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      stream: true,
    })
    
    for await (const chunk of asyncChunkGenerator) {
      const delta = chunk.choices[0]?.delta?.content || ''
      fullResponse += delta
      onToken(delta)
    }
    
    return fullResponse
  } else {
    const response = await engineInstance.chat.completions.create({
      messages,
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      stream: false,
    })
    
    return response.choices[0]?.message?.content || ''
  }
}

export async function generateWithContext(
  query: string,
  context: string,
  options: GenerateOptions = {}
): Promise<string> {
  const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided document context. 
                        Your answers should be:
                        - Accurate and based only on the provided context
                        - Clear and well-structured
                        - Include relevant quotes when appropriate
                        - Acknowledge if the context doesn't contain enough information to fully answer the question

                        If the context doesn't contain relevant information, say so clearly and provide what help you can.`

  const prompt = `Context from documents:
  ${context}

  User Question: ${query}

  Please provide a helpful answer based on the context above.`

  return generateResponse(prompt, systemPrompt, options)
}

export function isEngineReady(): boolean {
  return engineInstance !== null
}

export function getCurrentModel(): string | null {
  return currentModelId
}

export async function unloadEngine(): Promise<void> {
  if (engineInstance) {
    await engineInstance.unload()
    engineInstance = null
    currentModelId = null
  }
}

// Check WebGPU support
export async function checkWebGPUSupport(): Promise<{
  supported: boolean
  error?: string
}> {
  if (typeof navigator === 'undefined') {
    return { supported: false, error: 'Not running in browser' }
  }
  
  if (!('gpu' in navigator)) {
    return {
      supported: false,
      error: 'WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+.',
    }
  }
  
  try {
    const adapter = await (navigator as any).gpu.requestAdapter()
    if (!adapter) {
      return {
        supported: false,
        error: 'No WebGPU adapter found. Your GPU may not be supported.',
      }
    }
    
    const device = await adapter.requestDevice()
    if (!device) {
      return {
        supported: false,
        error: 'Could not initialize WebGPU device.',
      }
    }
    
    return { supported: true }
  } catch (error) {
    return {
      supported: false,
      error: `WebGPU initialization failed: ${error}`,
    }
  }
}

// Get model info
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId)
}
