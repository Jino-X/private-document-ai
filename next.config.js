const CopyPlugin = require('copy-webpack-plugin')
const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Required for pdfjs-dist
    config.resolve.alias.canvas = false
    
    // Ignore node-specific modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
      
      // Copy pdf.js worker to public folder
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: path.join(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
              to: path.join(__dirname, 'public/pdf.worker.min.mjs'),
            },
          ],
        })
      )
    }

    return config
  },
  images: {
    unoptimized: true,
  },
  // Headers for SharedArrayBuffer (required for WebLLM)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
