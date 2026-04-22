import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/binance-api': {
        target: 'https://testnet.binance.vision',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/binance-api/, ''),
      },
      '/coinbase-api': {
        target: 'https://api.exchange.coinbase.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/coinbase-api/, ''),
      },
      /** Browser → same-origin WS → Vite → Binance Spot Testnet combined stream */
      '/ws-binance': {
        target: 'wss://stream.testnet.binance.vision',
        changeOrigin: true,
        ws: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/ws-binance/, ''),
      },
    },
  },
})
