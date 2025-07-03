# WPS协作JSAPI集成指南

## 概述

agendaedu-app 已成功集成 WPS协作JSAPI，支持在WPS协作环境中进行智能打卡，包括位置获取、位置验证、拍照打卡等功能。

## 功能特性

### ✅ 已实现功能

1. **WPS协作鉴权**
   - 自动检测WPS协作环境
   - 权限申请和验证
   - 支持 location、image、share、device、ui 权限

2. **智能位置获取**
   - 使用WPS协作API获取精确位置
   - 支持gcj02坐标系（国测局坐标系）
   - 自动降级到浏览器原生API

3. **位置验证打卡**
   - 计算与目标位置的距离
   - 可配置允许的最大距离（默认100米）
   - 位置验证失败时的友好提示

4. **可选拍照功能**
   - 支持相册选择和相机拍照
   - 与打卡流程无缝集成
   - 拍照失败不影响打卡流程

5. **UI交互增强**
   - WPS原生Toast提示
   - 确认对话框
   - 错误处理和用户反馈

## 技术实现

### 核心文件

1. **`src/lib/wps-auth-service.ts`** - WPS协作鉴权服务
2. **`src/config/wps-config.ts`** - WPS配置文件
3. **`src/pages/CheckIn.tsx`** - 集成了WPS功能的打卡页面

### 架构设计

```typescript
// WPS鉴权服务架构
WPSAuthService
├── 环境检测 (isWPSEnvironment)
├── 权限申请 (initialize)
├── 位置获取 (getCurrentLocation)
├── 设备信息 (getDeviceInfo)
├── 图片选择 (chooseImage)
├── UI交互 (showToast, showConfirm)
└── 智能打卡 (performCheckIn)
```

## 使用方式

### 1. 基础配置

在 `src/config/wps-config.ts` 中配置应用信息：

```typescript
export const WPS_CONFIG = {
  appId: process.env.VITE_WPS_APP_ID || 'agendaedu-checkin-app',
  scope: ['location', 'image', 'share', 'device', 'ui'],
  // ...
};
```

### 2. 环境变量

创建 `.env` 文件：

```bash
# WPS协作配置
VITE_WPS_APP_ID=your-actual-app-id
```

### 3. 在组件中使用

```typescript
import { wpsAuthService } from '@/lib/wps-auth-service';

// 初始化鉴权
const authResult = await wpsAuthService.initialize();

// 获取位置
const location = await wpsAuthService.getCurrentLocation();

// 智能打卡
const checkInResult = await wpsAuthService.performCheckIn(
  { latitude: 39.9042, longitude: 116.4074 }, // 目标位置
  100, // 最大距离（米）
  false // 是否需要拍照
);
```

## API参考

### WPSAuthService 主要方法

#### `initialize(config?: Partial<WPSAuthConfig>): Promise<AuthResult>`
初始化WPS协作JSAPI并请求权限

#### `getCurrentLocation(): Promise<LocationInfo>`
获取当前位置信息

#### `performCheckIn(targetLocation, maxDistance, requirePhoto): Promise<CheckInLocationResult>`
执行完整的智能打卡流程

#### `validateCheckInLocation(targetLocation, maxDistance): Promise<CheckInLocationResult>`
验证打卡位置是否在允许范围内

#### `chooseImage(count): Promise<string[]>`
选择图片（相册或拍照）

#### `showToast(title, icon, duration): Promise<void>`
显示Toast提示

## 部署配置

### 1. WPS协作应用注册

1. 访问 [WPS开放平台](https://open-xz.wps.cn/)
2. 注册开发者账号并完成企业认证
3. 创建应用并获取AppID
4. 配置应用权限和回调地址

### 2. 权限配置

需要申请的权限：
- `location` - 地理位置权限
- `image` - 图片选择和拍照权限
- `share` - 分享权限
- `device` - 设备信息权限
- `ui` - UI交互权限

### 3. 域名配置

在WPS开放平台配置允许的域名：
- 开发环境：`http://localhost:5173`
- 生产环境：您的实际域名

## 兼容性说明

### WPS协作环境
- ✅ 完整功能支持
- ✅ 精确位置获取
- ✅ 原生UI交互
- ✅ 拍照功能

### 非WPS环境
- ✅ 自动降级模式
- ✅ 浏览器位置API
- ✅ 模拟数据支持
- ⚠️ 功能受限

## 测试指南

### 1. 开发环境测试

```bash
# 启动开发服务器
npm run dev

# 访问打卡页面
http://localhost:5173/app/checkin/{attendanceId}
```

### 2. WPS协作环境测试

1. 将应用部署到可访问的域名
2. 在WPS协作中打开应用
3. 测试位置获取和打卡功能

### 3. 功能验证清单

- [ ] WPS环境检测
- [ ] 权限申请流程
- [ ] 位置获取功能
- [ ] 位置距离计算
- [ ] 拍照选择功能
- [ ] Toast提示显示
- [ ] 打卡成功流程
- [ ] 错误处理机制

## 故障排除

### 常见问题

1. **权限申请失败**
   - 检查AppID配置
   - 确认权限范围设置
   - 验证域名配置

2. **位置获取失败**
   - 检查位置权限
   - 确认用户授权
   - 网络连接状态

3. **拍照功能异常**
   - 检查图片权限
   - 设备相机可用性
   - 浏览器兼容性

### 调试技巧

1. 开启控制台日志查看详细信息
2. 使用WPS开发者工具调试
3. 检查网络请求和响应

## 更新日志

### v1.0.0 (2025-01-27)
- ✅ 初始版本发布
- ✅ 完整的WPS协作JSAPI集成
- ✅ 智能打卡功能实现
- ✅ 位置验证和拍照支持

## 技术支持

如有问题，请参考：
1. [WPS协作开发文档](https://open-xz.wps.cn/pages/client/web-apps/JSAPI-authentic/)
2. 项目Issue页面
3. 开发团队技术支持

---

**注意**: 本集成严格遵循WPS协作JSAPI官方规范，确保功能稳定性和安全性。 