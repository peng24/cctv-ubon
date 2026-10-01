import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/stream': {
        target: 'https://ubonwaterlevel.duckdns.org',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/stream/, '/wowza'),
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Fix duplicate Access-Control-Allow-Origin from Wowza/Nginx
            delete proxyRes.headers['access-control-allow-origin'];
            delete proxyRes.headers['access-control-allow-methods'];
            delete proxyRes.headers['access-control-allow-headers'];
            delete proxyRes.headers['access-control-allow-credentials'];
            
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, HEAD, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = '*';
          });
        }
      }
    }
  }
});
