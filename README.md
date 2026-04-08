# 🔒 Private Document AI

> **100% Offline AI Document Assistant** - Chat with your documents using AI that runs entirely in your browser. No data ever leaves your device.

![Private Document AI](https://img.shields.io/badge/Privacy-First-green) ![Offline](https://img.shields.io/badge/Works-Offline-blue) ![WebGPU](https://img.shields.io/badge/Powered%20by-WebGPU-orange) ![Next.js](https://img.shields.io/badge/Next.js-14-black)

## ✨ Features

### 🛡️ Privacy First
- **100% Local Processing** - All AI inference happens in your browser
- **No Server Required** - Works completely offline after initial model download
- **Your Data Stays Yours** - Documents never leave your device
- **IndexedDB Storage** - All data stored locally in your browser

### � Authentication
- **User Accounts** - Secure login/signup with email and password
- **JWT Sessions** - Cookie-based authentication with 7-day expiry
- **Protected Routes** - Chat interface requires authentication
- **User Profiles** - Display user info in sidebar with logout option

### � Document Support
- **PDF** - Full text extraction with page-by-page processing
- **DOCX** - Microsoft Word document support
- **TXT** - Plain text files
- **Drag & Drop** - Easy file upload interface with progress tracking

### 🤖 AI Capabilities
- **WebLLM Integration** - Run LLMs directly in your browser using WebGPU
- **Multiple Models** - Choose from Llama 3.2, Phi-3.5, Gemma 2, Qwen 2.5, and more
- **Streaming Responses** - Real-time typing effect as AI generates answers
- **Context-Aware** - RAG system retrieves relevant document sections

### 💬 Chat Interface
- **Modern UI** - Beautiful, production-ready chat experience
- **Source Citations** - Clickable source references showing relevance scores
- **Markdown Support** - Rich text formatting in responses
- **Conversation History** - Chat history saved per document
- **Smart Suggestions** - Quick-start prompts for new conversations

### ⚙️ Customization
- **Model Selection** - Choose the best model for your hardware
- **Chunk Settings** - Configure text processing parameters (size, overlap, top-k)
- **Temperature Control** - Adjust AI creativity (0.0 - 2.0)
- **Max Tokens** - Control response length
- **Dark/Light Mode** - System-aware theme support

### 🎨 UI/UX
- **Responsive Design** - Works on desktop and tablet
- **Collapsible Sidebar** - More space for chat when needed
- **Confirmation Dialogs** - Safe delete operations with modal confirmations
- **Loading States** - Progress indicators for model loading and document processing
- **Animations** - Smooth transitions powered by Framer Motion

## 🚀 Quick Start

### Prerequisites

- **Browser**: Chrome 113+ or Edge 113+ (WebGPU required)
- **Hardware**: Modern GPU (2018+), 8GB+ RAM recommended
- **Node.js**: 18+ for development

### Installation

```bash
# Clone the repository
git clone https://github.com/Jino-X/private-document-ai.git
cd private-document-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to use the application.

### Production Build

```bash
npm run build
npm start
```

## 🏗️ Architecture

```
private-document-ai/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx           # Auth layout
│   │   └── login/page.tsx       # Login/Signup page
│   ├── (app)/
│   │   ├── layout.tsx           # App layout
│   │   └── chat/page.tsx        # Protected chat page
│   ├── api/auth/
│   │   ├── login/route.ts       # POST /api/auth/login
│   │   ├── signup/route.ts      # POST /api/auth/signup
│   │   ├── logout/route.ts      # POST /api/auth/logout
│   │   └── session/route.ts     # GET /api/auth/session
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Redirect based on auth
│   └── globals.css              # Global styles + CSS variables
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── select.tsx
│   │   ├── slider.tsx
│   │   ├── progress.tsx
│   │   ├── scroll-area.tsx
│   │   └── switch.tsx
│   ├── chat/
│   │   └── chat-interface.tsx   # Chat UI with messages
│   ├── sidebar.tsx              # Document list + user profile
│   ├── upload-dialog.tsx        # File upload modal
│   ├── settings-dialog.tsx      # Settings panel
│   ├── confirm-dialog.tsx       # Reusable confirmation modal
│   ├── webgpu-check.tsx         # WebGPU compatibility check
│   └── providers.tsx            # Theme + Auth providers
├── lib/
│   ├── auth/
│   │   ├── index.ts             # JWT, bcrypt, session utils
│   │   └── context.tsx          # React auth context + hooks
│   ├── db/index.ts              # IndexedDB helpers
│   ├── rag/
│   │   ├── chunking.ts          # Text chunking with overlap
│   │   ├── retrieval.ts         # BM25 search + context building
│   │   └── index.ts
│   ├── documents/
│   │   ├── parser.ts            # PDF, DOCX, TXT parsing
│   │   └── index.ts
│   ├── webllm/index.ts          # WebLLM engine + streaming
│   ├── store/index.ts           # Zustand state management
│   └── utils.ts                 # Utility functions
└── public/
    └── pdf.worker.min.mjs       # PDF.js worker (local)
```

## 🔧 Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui + Radix UI |
| AI Runtime | WebLLM (WebGPU) |
| State Management | Zustand (persisted) |
| Local Storage | IndexedDB (idb) |
| Authentication | JWT + bcrypt (jose) |
| PDF Parsing | pdf.js |
| DOCX Parsing | mammoth.js |
| Animations | Framer Motion |
| Theme | next-themes |
| Icons | Lucide React |
| Markdown | react-markdown + remark-gfm |

## 📱 Supported Models

| Model | Size | Best For |
|-------|------|----------|
| Llama 3.2 3B | ~2GB | Balanced quality & speed |
| Llama 3.2 1B | ~1GB | Fast inference |
| Phi 3.5 Mini | ~2.3GB | Good reasoning |
| Gemma 2 2B | ~1.5GB | Low-end devices |
| Qwen 2.5 1.5B | ~1GB | Fastest |
| Qwen 2.5 3B | ~2GB | Better quality |

## 🔒 Privacy Guarantees

1. **No Network Calls** - After model download, zero external network requests
2. **Local Storage Only** - All data in browser's IndexedDB
3. **No Analytics** - Zero tracking or telemetry
4. **Auth Cookies Only** - Only httpOnly session cookies for authentication
5. **Open Source** - Fully auditable code
6. **No Cloud Dependencies** - Everything runs in your browser

## ⚡ Performance Tips

- **First Load**: Model download may take a few minutes (cached after)
- **GPU Memory**: Close other GPU-intensive apps for best performance
- **Document Size**: Large documents (>50MB) may take longer to process
- **Chunk Size**: Smaller chunks = faster search, larger = better context

## 🛠️ Development

### Running Tests

```bash
npm run test
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npx tsc --noEmit
```

## 📦 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

For production, set the following environment variable:

```env
# Required for JWT signing (min 32 characters)
JWT_SECRET=your-super-secret-key-change-in-production
```

## 🔑 Authentication Notes

The current implementation uses **in-memory user storage** for simplicity. For production use, consider:

- **Database Integration** - PostgreSQL, MongoDB, or SQLite for persistent user storage
- **OAuth Providers** - Add Google, GitHub login via NextAuth.js
- **Password Reset** - Email-based password recovery flow

The authentication system is designed to be easily extensible while maintaining the privacy-first approach.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 🙏 Acknowledgments

- [WebLLM](https://github.com/mlc-ai/web-llm) - Browser-based LLM runtime
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
- [pdf.js](https://mozilla.github.io/pdf.js/) - PDF parsing
- [mammoth.js](https://github.com/mwilliamson/mammoth.js) - DOCX parsing
- [Lucide](https://lucide.dev/) - Beautiful icons
- [Framer Motion](https://www.framer.com/motion/) - Animations

---

<p align="center">
  <strong>🔒 Your documents. Your AI. Your privacy.</strong>
  <br />
  <sub>Built with ❤️ for privacy-conscious users</sub>
</p>
