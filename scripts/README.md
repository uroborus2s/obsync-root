# 包管理脚本使用说明

本项目提供了便捷的脚本来管理 monorepo 中的包构建和发布，直接使用原生的 turbo 和 changeset 命令。

## 可用命令

### 1. 构建指定包

```bash
# 构建指定包（包括其依赖）
pnpm run build:pkg --pkg=@stratix/core
pnpm run build:pkg --pkg=@stratix/utils

# 构建所有包
pnpm run build:all
```

### 2. 开发指定包

```bash
# 开发模式运行指定包
pnpm run dev:pkg --pkg=@stratix/core
```

### 3. 测试指定包

```bash
# 测试指定包
pnpm run test:pkg --pkg=@stratix/core

# 清理指定包
pnpm run clean:pkg --pkg=@stratix/core

# 检查指定包
pnpm run lint:pkg --pkg=@stratix/core
```

### 4. Changeset 操作

```bash
# 创建 changeset（交互式）
pnpm run changeset:add

# 应用 changeset（更新版本号）
pnpm run changeset:version

# 发布包
pnpm run changeset:publish
```

### 5. 发布包

#### 发布指定包（changeset管理）
```bash
# 构建指定包 → 更新版本 → 重新构建 → 发布所有有变更的包
pnpm run publish --pkg=@stratix/core

# 更新版本 → 重新安装依赖 → 构建指定包 → 发布所有有变更的包
pnpm run release --pkg=@stratix/core

# 完整流程 + 推送git标签
pnpm run release:full --pkg=@stratix/core
```

#### 发布单个包（直接发布）
```bash
# 构建指定包 → 直接发布该包（不通过changeset）
pnpm run publish:single --pkg=@stratix/core
```

**重要区别**：
- **`publish`/`release` 系列**：使用 `changeset publish`，会发布**所有有版本变更的包**
- **`publish:single`**：使用 `pnpm publish`，只发布**指定的单个包**

#### 发布所有包
```bash
# 更新版本 → 重新安装依赖 → 构建所有包 → 发布
pnpm run release

# 完整流程 + 推送git标签  
pnpm run release:full
```

## 参数传递方式

### 方式一：使用 --pkg 参数（推荐）

```bash
pnpm run build:pkg --pkg=@stratix/core
pnpm run publish:pkg --pkg=@stratix/core
```

### 方式二：使用环境变量

```bash
npm_config_pkg=@stratix/core pnpm run build:pkg
npm_config_pkg=@stratix/core pnpm run publish:pkg
```

## 使用流程

### 完整发布流程

1. **开发完成后，创建 changeset**：
   ```bash
   pnpm run changeset:add
   ```
   - 选择要发布的包
   - 选择版本类型（patch/minor/major）
   - 描述变更内容

2. **提交代码**：
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```

3. **发布包**：
   ```bash
   # 选择其中一种方式
   pnpm run publish --pkg=@stratix/core        # changeset管理：发布所有有变更的包
   pnpm run release --pkg=@stratix/core        # 推荐：完整发布流程
   pnpm run publish:single --pkg=@stratix/core # 直接发布：只发布指定包
   ```

### 仅构建流程

如果只想构建包而不发布：

```bash
pnpm run build:pkg --pkg=@stratix/core
```

### 开发流程

```bash
# 开发模式运行指定包
pnpm run dev:pkg --pkg=@stratix/core

# 测试指定包
pnpm run test:pkg --pkg=@stratix/core
```

## 脚本说明

### build-package.js
- 用于构建单个包
- 自动处理依赖关系
- 提供友好的错误提示

### publish-package.js
- 完整的发布流程自动化
- 包含安全检查（git状态、changeset存在性）
- 自动处理版本更新和依赖安装
- 发布后推送 git 标签

## 注意事项

1. **发布前必须创建 changeset**：
   - 运行 `pnpm changeset` 创建变更记录
   - 没有 changeset 文件时发布会失败

2. **git 状态检查**：
   - 发布前会检查是否有未提交的变更
   - 确保代码已提交到 git

3. **包验证**：
   - 自动验证包是否存在
   - 私有包无法发布

4. **依赖处理**：
   - turbo 会自动构建依赖包
   - changeset 会自动更新内部依赖版本

## 错误处理

脚本包含完善的错误处理：
- 包不存在时提示正确路径
- git 状态异常时提示解决方案
- 构建失败时显示详细错误信息
- 发布失败时自动回滚

## 示例

### 开发和测试
```bash
# 构建 core 包
pnpm run build:pkg --pkg=@stratix/core

# 开发 core 包
pnpm run dev:pkg --pkg=@stratix/core

# 测试 utils 包
pnpm run test:pkg --pkg=@stratix/utils

# 构建所有包
pnpm run build:all
```

### 发布流程
```bash
# 1. 创建 changeset
pnpm run changeset:add

# 2. 一条命令完成发布（推荐）
pnpm run release:full:pkg --pkg=@stratix/core

# 或者分步骤
pnpm run release:pkg --pkg=@stratix/utils      # 发布指定包
pnpm run release:full                          # 发布所有包+推送标签
```

## 原生命令对照

| 新命令 | 等价的原生命令 |
|--------|----------------|
| `pnpm run build:pkg --pkg=@stratix/core` | `turbo run build --filter="@stratix/core"` |
| `pnpm run dev:pkg --pkg=@stratix/core` | `turbo run dev --filter="@stratix/core"` |
| `pnpm run changeset:add` | `changeset add` |
| `pnpm run changeset:version` | `changeset version` |
| `pnpm run changeset:publish` | `changeset publish` |
| `pnpm run release:pkg --pkg=@stratix/core` | `changeset version && pnpm install && turbo run build --filter="@stratix/core" && changeset publish` |
| `pnpm run release:full:pkg --pkg=@stratix/core` | `changeset version && pnpm install && turbo run build --filter="@stratix/core" && changeset publish && git push --follow-tags` |

## 命令选择指南

### 发布单个包
- **`release:full:pkg`** - 🌟 推荐：完整发布流程 + git推送
- **`release:pkg`** - 完整发布流程（不推送git）
- **`publish:pkg`** - 先构建再发布（适合已经更新过版本的情况）

### 发布所有包
- **`release:full`** - 🌟 推荐：发布所有包 + git推送
- **`release`** - 发布所有包（不推送git）
- **`publish`** - 传统方式：先构建所有包再发布 