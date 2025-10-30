import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/web/',
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // 忽略 TypeScript 相关警告
        if (warning.code === 'UNRESOLVED_IMPORT') return
        warn(warning)
      },
    },
  },
  server: {
    proxy: {
      // 代理工作流API到本地API Gateway
      '/api/workflows': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false,
      },
      // 代理签到统计API到本地API Gateway
      '/api/icalink': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false,
      },
      // 代理认证API到本地API Gateway
      '/api/auth': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false,
      },
      // 代理其他API请求到生产环境，保持Cookie
      '/api': {
        target: 'https://kwps.jlufe.edu.cn',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
        headers: {
          Origin: 'https://kwps.jlufe.edu.cn',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),

      // fix loading all icon chunks in dev mode
      // https://github.com/tabler/tabler-icons/issues/1233
      '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  optimizeDeps: {
    esbuildOptions: {
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
  },
})
