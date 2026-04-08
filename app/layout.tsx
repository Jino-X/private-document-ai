import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Private Document AI - 100% Offline AI Assistant',
  description: 'Chat with your documents using AI that runs entirely in your browser. No data leaves your device.',
  keywords: ['AI', 'document', 'chat', 'offline', 'privacy', 'WebLLM', 'RAG'],
  authors: [{ name: 'Private Document AI' }],
  openGraph: {
    title: 'Private Document AI',
    description: 'Chat with your documents using AI that runs entirely in your browser.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
