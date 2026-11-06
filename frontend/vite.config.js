import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    // Force a single copy of React. Without this, a stale
    // node_modules/.vite cache (from a previous build) can bundle a second
    // React instance, which breaks hooks with "Invalid hook call".
    resolve: {
        dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand']
    },

    optimizeDeps: {
        include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', 'zustand']
    },

    server: {
        host: '0.0.0.0',
        port: 3000,
        // Allow requests proxied through Caddy with the public domain
        allowedHosts: [
            'inferx.qzz.io',
            'app.inferx.qzz.io',
            'ml.inferx.qzz.io',
            'localhost',
            '127.0.0.1'
        ],
        watch: {
            usePolling: true,
            interval: 1000
        },
        proxy: {
            '/api': {
                target: 'http://backend:5000',
                changeOrigin: true
            }
        }
    }
})
