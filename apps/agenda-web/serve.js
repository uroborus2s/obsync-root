#!/usr/bin/env node

const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');

// 静态文件服务
app.use(
  express.static(distPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      // HTML文件不缓存
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // 静态资源长期缓存
      else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  })
);

// API代理
app.use(
  '/api',
  createProxyMiddleware({
    target: 'https://chat.whzhsc.cn',
    changeOrigin: true,
    pathRewrite: {
      '^/api': '/api'
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).json({ error: 'Proxy error' });
    }
  })
);

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).send('healthy');
});

// SPA路由处理 - 所有其他路由都返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 AgendaEdu Web server running on port ${port}`);
  console.log(`📁 Serving files from: ${distPath}`);
  console.log(`🌐 Local: http://localhost:${port}`);
  console.log(
    `🔗 API Proxy: http://localhost:${port}/api -> https://chat.whzhsc.cn/api`
  );
  console.log(`❤️  Health check: http://localhost:${port}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});
