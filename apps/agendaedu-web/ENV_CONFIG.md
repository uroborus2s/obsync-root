# agendaedu-web 环境变量配置指南

## 📋 环境变量文件

### 已创建的环境变量文件

1. **`.env.example`** - 示例配置文件
   ```bash
   # API配置
   # 开发环境: http://localhost:8090
   # 生产环境: https://kwps.jlufe.edu.cn
   VITE_API_BASE_URL=http://localhost:8090
   ```

2. **`.env.development`** - 开发环境配置
   ```bash
   # 开发环境配置
   VITE_API_BASE_URL=http://localhost:8090
   ```

3. **`.env.production`** - 生产环境配置
   ```bash
   # 生产环境配置
   VITE_API_BASE_URL=https://kwps.jlufe.edu.cn
   ```

## 🚀 使用方法

### 开发环境
```bash
# 启动开发服务器（自动使用 .env.development）
pnpm run dev

# 开发环境构建
pnpm run build:dev
```

### 生产环境
```bash
# 生产环境构建（使用 .env.production）
pnpm run build:prod

# 预览生产构建
pnpm run preview:prod
```

### 本地自定义配置
如需覆盖默认配置，创建 `.env.local` 文件：
```bash
# .env.local (优先级最高，不会被提交到git)
VITE_API_BASE_URL=http://your-custom-api-url
```

## 🔧 配置说明

### API地址配置
- **开发环境**: `http://localhost:8090` - 本地测试服务器
- **生产环境**: `https://kwps.jlufe.edu.cn` - 生产服务器

### 环境变量优先级
1. `.env.local` (最高优先级，本地开发用)
2. `.env.production` / `.env.development` (环境特定)
3. `.env.example` (示例文件，不会被加载)

## ⚙️ 配置文件修复

已修复 `src/lib/config.ts` 中的问题：
- 确保环境变量 `VITE_API_BASE_URL` 优先级最高
- 开发模式下正确使用本地API地址
- 生产模式下使用生产API地址

## 📦 构建脚本

新增的构建脚本：
- `dev`: 开发服务器
- `build`: 默认构建
- `build:dev`: 开发环境构建
- `build:prod`: 生产环境构建
- `preview:prod`: 生产环境预览

## 🔍 验证配置

运行验证脚本检查配置：
```bash
node verify-env.cjs
```

## 📝 注意事项

1. **不要提交 `.env.local`** - 此文件包含本地配置，应添加到 `.gitignore`
2. **环境变量必须以 `VITE_` 开头** - 这是Vite的要求
3. **修改环境变量后需要重启开发服务器** - 环境变量在构建时读取
4. **生产部署时确保使用正确的环境文件** - 使用 `build:prod` 命令
