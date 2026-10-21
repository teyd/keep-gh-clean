import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The token never leaves the browser except to api.github.com. Only applied to
// production builds because the dev server needs inline scripts and websockets.
const CSP = [
  "default-src 'self'",
  'connect-src https://api.github.com',
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function csp(): Plugin {
  return {
    name: 'csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend',
      },
    ],
  }
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), csp()],
})
