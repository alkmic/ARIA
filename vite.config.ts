import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy pour OpenAI — leur API ne supporte pas CORS depuis le navigateur.
      // En dev, les requêtes vers /llm-proxy/openai/* sont relayées par le
      // serveur Vite, contournant la restriction Same-Origin du navigateur.
      '/llm-proxy/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/llm-proxy\/openai/, ''),
      },
    },
  },
})
