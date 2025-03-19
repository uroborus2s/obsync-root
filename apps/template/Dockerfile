# 构建阶段
FROM node:20-alpine AS builder

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制 package.json 和锁文件
COPY package.json pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 运行阶段
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production

# 复制package.json和锁文件
COPY package.json package-lock.json* yarn.lock* ./

# 仅安装生产依赖
RUN npm ci --only=production install --production --frozen-lockfile

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/stratix.config.js ./stratix.config.js

# 应用启动命令
CMD ["node", "dist/index.js"]