# Nginx静态文件部署指南

## 快速开始

### 方式一：使用自动化脚本（推荐）

```bash
# 进入项目目录
cd apps/agenda_web

# 本地Nginx部署
./deploy-static.sh prod --local

# 上传到服务器
./deploy-static.sh prod --upload --server=your-server.com --user=ubuntu

# 仅构建静态文件
./deploy-static.sh prod --build-only
```

### 方式二：手动部署

#### 1. 构建应用

```bash
# 安装依赖
pnpm install

# 构建生产版本
pnpm run build:prod
```

#### 2. 部署到本地Nginx

```bash
# 复制文件到Nginx目录
sudo cp -r dist/* /var/www/html/

# 复制Nginx配置
sudo cp nginx-simple.conf /etc/nginx/sites-available/agendaedu-web
sudo ln -sf /etc/nginx/sites-available/agendaedu-web /etc/nginx/sites-enabled/

# 测试并重载配置
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. 部署到远程服务器

```bash
# 上传文件
rsync -avz dist/ user@server:/var/www/html/

# 上传配置
scp nginx-simple.conf user@server:/tmp/

# 在服务器上配置
ssh user@server "
    sudo mv /tmp/nginx-simple.conf /etc/nginx/sites-available/agendaedu-web &&
    sudo ln -sf /etc/nginx/sites-available/agendaedu-web /etc/nginx/sites-enabled/ &&
    sudo nginx -t &&
    sudo systemctl reload nginx
"
```

## 配置说明

### 目录结构

```
/var/www/html/
├── index.html          # 主页面
├── assets/            # 静态资源
│   ├── *.js          # JavaScript文件
│   ├── *.css         # CSS文件
│   └── *.woff2       # 字体文件
├── favicon.ico        # 网站图标
└── vite.svg          # Vite图标
```

### Nginx配置要点

1. **SPA路由支持**: `try_files $uri $uri/ /index.html;`
2. **静态资源缓存**: 1年缓存期，immutable标记
3. **Gzip压缩**: 自动压缩文本文件
4. **API代理**: 转发到 `https://chat.whzhsc.cn/api/`

### 环境变量配置

构建时会自动注入以下环境变量：

```bash
# 生产环境
VITE_API_URL=https://chat.whzhsc.cn/api
VITE_APP_TITLE=AgendaEdu Web
VITE_ENABLE_DEBUG=false

# 测试环境
VITE_API_URL=https://chat.whzhsc.cn/api/api
VITE_APP_TITLE=AgendaEdu Web (Staging)
VITE_ENABLE_DEBUG=true
```

## 性能优化

### 1. 启用预压缩

```bash
# 生成Gzip压缩文件
find dist -name "*.js" -o -name "*.css" -o -name "*.html" | xargs gzip -k9

# 在nginx配置中启用
gzip_static on;
```

### 2. 启用Brotli压缩

```bash
# 安装Brotli
sudo apt install brotli

# 生成Brotli文件
find dist -name "*.js" -o -name "*.css" -o -name "*.html" | xargs brotli -k

# Nginx配置
brotli_static on;
```

### 3. HTTP/2支持

```nginx
server {
    listen 443 ssl http2;
    # ... 其他配置
}
```

## 监控和维护

### 查看访问日志

```bash
# 实时查看访问日志
sudo tail -f /var/log/nginx/access.log

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### 性能测试

```bash
# 使用curl测试
curl -I http://localhost/

# 使用ab压力测试
ab -n 1000 -c 10 http://localhost/

# 使用Lighthouse测试
npx lighthouse http://localhost/
```

### 缓存清理

```bash
# 清理浏览器缓存（通过版本号）
# Vite会自动为文件添加hash，无需手动清理

# 清理CDN缓存（如果使用）
# 根据CDN提供商的API进行清理
```

## 故障排除

### 常见问题

#### 1. 404错误
```bash
# 检查文件是否存在
ls -la /var/www/html/

# 检查Nginx配置
sudo nginx -t

# 检查权限
sudo chown -R www-data:www-data /var/www/html/
```

#### 2. API请求失败
```bash
# 检查代理配置
curl -I http://localhost/api/health

# 检查上游服务
curl -I https://chat.whzhsc.cn/api/
```

#### 3. 静态资源加载失败
```bash
# 检查MIME类型
curl -I http://localhost/assets/index.js

# 检查Gzip压缩
curl -H "Accept-Encoding: gzip" -I http://localhost/assets/index.js
```

### 调试技巧

#### 开启调试日志
```nginx
error_log /var/log/nginx/debug.log debug;
```

#### 检查配置语法
```bash
sudo nginx -t -c /etc/nginx/nginx.conf
```

#### 重载配置
```bash
sudo systemctl reload nginx
```

## 安全配置

### 基础安全头

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

### 隐藏敏感信息

```nginx
# 隐藏Nginx版本
server_tokens off;

# 禁止访问隐藏文件
location ~ /\. {
    deny all;
}
```

### SSL/TLS配置

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
}
```

## 自动化部署

### GitHub Actions示例

```yaml
name: Deploy to Nginx

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          
      - name: Install pnpm
        run: corepack enable pnpm
        
      - name: Build application
        run: |
          cd apps/agenda_web
          pnpm install
          pnpm run build:prod
          
      - name: Deploy to server
        run: |
          cd apps/agenda_web
          ./deploy-static.sh prod --upload --server=${{ secrets.SERVER_HOST }} --user=${{ secrets.SERVER_USER }}
```

### 定时备份

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/agendaedu-web"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份网站文件
tar -czf $BACKUP_DIR/website_$DATE.tar.gz -C /var/www/html .

# 备份Nginx配置
cp /etc/nginx/sites-available/agendaedu-web $BACKUP_DIR/nginx_$DATE.conf

# 清理旧备份（保留7天）
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.conf" -mtime +7 -delete
```

## 联系支持

如遇到部署问题，请联系：
- 技术支持: tech@company.com
- 运维团队: devops@company.com 